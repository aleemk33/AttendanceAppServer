import { LeaveStatus } from "@prisma/client";
import { getPrisma } from "../../config/database.js";
import {
  BadRequestError,
  ForbiddenError,
  ConflictError,
} from "../../common/errors.js";
import {
  businessToday,
  isWeeklyOff,
  haversineMeters,
} from "../../common/index.js";
import { upsertSummaryFromPunch } from "./attendance-summary.service.js";
import { getHolidaysInRange, buildHolidayDateMap } from "./attendance.helpers.js";

/**
 * Punch-in transaction for mobile app.
 *
 * Validation order:
 * 1) bound device check
 * 2) calendar eligibility (weekly off / holiday / approved leave)
 * 3) geofence check
 * 4) duplicate prevention
 */
export async function punchIn(userId, latitude, longitude, deviceId) {
  const prisma = getPrisma();
  const today = businessToday();

  // Check device binding
  const profile = await prisma.attendanceProfile.findUnique({
    where: { userId },
  });
  if (!profile || !profile.boundDeviceId) {
    throw new BadRequestError("No device bound. Please contact admin.");
  }
  if (profile.boundDeviceId !== deviceId) {
    throw new ForbiddenError("Device mismatch");
  }

  // Check weekly off
  if (isWeeklyOff(today)) {
    throw new BadRequestError("Cannot punch in on a weekly off");
  }

  // Check holiday
  const holidays = await getHolidaysInRange(today, today);
  const holidayMap = buildHolidayDateMap(holidays);
  if (holidayMap.has(today)) {
    throw new BadRequestError("Cannot punch in on a holiday");
  }

  // Check approved leave
  const leave = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: LeaveStatus.APPROVED,
      startDate: { lte: new Date(today) },
      endDate: { gte: new Date(today) },
    },
  });
  if (leave) {
    throw new BadRequestError("Cannot punch in while on approved leave");
  }

  // Geofence check
  if (
    profile.officeLatitude == null ||
    profile.officeLongitude == null ||
    profile.officeRadiusMeters == null
  ) {
    throw new BadRequestError("Attendance profile geofence not configured");
  }
  const distance = haversineMeters(
    Number(profile.officeLatitude),
    Number(profile.officeLongitude),
    latitude,
    longitude,
  );
  if (distance > profile.officeRadiusMeters) {
    throw new BadRequestError(
      `You are ${Math.round(distance)}m from office. Max allowed: ${profile.officeRadiusMeters}m`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.attendancePunch.findUnique({
      where: {
        userId_attendanceDate: { userId, attendanceDate: new Date(today) },
      },
    });
    if (existing?.punchInAt) {
      throw new ConflictError("Already punched in for today");
    }

    const now = new Date();
    const punch = existing
      ? await tx.attendancePunch.update({
          where: { id: existing.id },
          data: { punchInAt: now },
        })
      : await tx.attendancePunch.create({
          data: {
            userId,
            attendanceDate: new Date(today),
            punchInAt: now,
          },
        });

    await upsertSummaryFromPunch(userId, today, punch, tx);
    return punch;
  });
}

/**
 * Punch-out for current business date.
 * Requires existing punch-in and same bound device.
 */
export async function punchOut(userId, deviceId) {
  const prisma = getPrisma();
  const today = businessToday();

  // Check device binding
  const profile = await prisma.attendanceProfile.findUnique({
    where: { userId },
  });
  if (!profile || !profile.boundDeviceId) {
    throw new BadRequestError("No device bound");
  }
  if (profile.boundDeviceId !== deviceId) {
    throw new ForbiddenError("Device mismatch");
  }

  return prisma.$transaction(async (tx) => {
    const punch = await tx.attendancePunch.findUnique({
      where: {
        userId_attendanceDate: { userId, attendanceDate: new Date(today) },
      },
    });
    if (!punch || !punch.punchInAt) {
      throw new BadRequestError("No punch-in record for today");
    }
    if (punch.punchOutAt) {
      throw new ConflictError("Already punched out for today");
    }

    const now = new Date();
    const workedMinutes = Math.floor(
      (now.getTime() - punch.punchInAt.getTime()) / 60000,
    );
    const updatedPunch = await tx.attendancePunch.update({
      where: { id: punch.id },
      data: { punchOutAt: now, workedMinutes },
    });

    await upsertSummaryFromPunch(userId, today, updatedPunch, tx);
    return updatedPunch;
  });
}
