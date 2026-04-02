import { Role, OverrideStatus, LeaveStatus } from "@prisma/client";
import { getPrisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../common/errors.js";
import {
  businessToday,
  businessMonthStart,
  isWeeklyOff,
  dateRange,
  clampEndDate,
  isToday,
  isPast,
  haversineMeters,
} from "../../common/index.js";
// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getHolidaysInRange(startDate, endDate) {
  const prisma = getPrisma();
  return prisma.holiday.findMany({
    where: {
      isDeleted: false,
      startDate: { lte: new Date(endDate) },
      endDate: { gte: new Date(startDate) },
    },
  });
}
/**
 * Expands holiday rows to a day-level map:
 * key   -> YYYY-MM-DD
 * value -> holiday identity used in response payload
 */
function buildHolidayDateMap(holidays) {
  const map = new Map();
  for (const h of holidays) {
    // Expand each holiday span to day-level lookup for O(1) checks later.
    const dates = dateRange(
      h.startDate.toISOString().slice(0, 10),
      h.endDate.toISOString().slice(0, 10),
    );
    for (const d of dates) {
      map.set(d, { id: h.id, title: h.title });
    }
  }
  return map;
}
function buildAttendanceScopeWhere(callerRoles, callerId, search) {
  const where = {
    isActive: true,
    // Admin accounts are out of scope for attendance reporting.
    NOT: { roles: { has: Role.ADMIN } },
  };
  if (callerRoles.includes(Role.MANAGER) && !callerRoles.includes(Role.ADMIN)) {
    where.managerUserId = callerId;
  }
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  return where;
}
function buildApprovedLeaveDateMap(leaves, holidayMap) {
  const map = new Map();
  for (const leave of leaves) {
    if (leave.status !== LeaveStatus.APPROVED) {
      continue;
    }
    const leaveDates = dateRange(
      leave.startDate.toISOString().slice(0, 10),
      leave.endDate.toISOString().slice(0, 10),
    );
    for (const date of leaveDates) {
      if (!isWeeklyOff(date) && !holidayMap.has(date)) {
        map.set(date, { id: leave.id, status: leave.status });
      }
    }
  }
  return map;
}
function buildDateKeyedMap(records) {
  return new Map(
    records.map((record) => [
      record.attendanceDate.toISOString().slice(0, 10),
      record,
    ]),
  );
}
function buildDateKeyedMapsByUserId(records) {
  const map = new Map();
  for (const record of records) {
    const date = record.attendanceDate.toISOString().slice(0, 10);
    if (!map.has(record.userId)) {
      map.set(record.userId, new Map());
    }
    map.get(record.userId).set(date, record);
  }
  return map;
}
function buildApprovedLeaveDateMapsByUserId(leaves, holidayMap) {
  const map = new Map();
  for (const leave of leaves) {
    if (leave.status !== LeaveStatus.APPROVED) {
      continue;
    }
    const leaveDates = dateRange(
      leave.startDate.toISOString().slice(0, 10),
      leave.endDate.toISOString().slice(0, 10),
    );
    if (!map.has(leave.userId)) {
      map.set(leave.userId, new Map());
    }
    const userLeaveMap = map.get(leave.userId);
    for (const date of leaveDates) {
      if (!isWeeklyOff(date) && !holidayMap.has(date)) {
        userLeaveMap.set(date, { id: leave.id, status: leave.status });
      }
    }
  }
  return map;
}
function serializeAttendanceProfileLocation(profile) {
  if (
    !profile ||
    profile.officeLatitude == null ||
    profile.officeLongitude == null
  ) {
    return null;
  }
  return {
    latitude: Number(profile.officeLatitude),
    longitude: Number(profile.officeLongitude),
  };
}
function buildAttendanceDay(
  date,
  punch,
  reg,
  holiday,
  leave,
  fullDayMinutes,
  options = {},
) {
  const flags = [];
  let dayType = "workingDay";
  let attendanceState;
  // Rule precedence is intentional; keep ordering when changing logic.
  // 1) weekly off / holiday
  if (isWeeklyOff(date)) {
    dayType = "weeklyOff";
    attendanceState = "weeklyOff";
  } else if (holiday) {
    dayType = "holiday";
    attendanceState = "holiday";
  }
  // 2) approved leave
  else if (leave) {
    attendanceState = "onLeave";
  }
  // 3) regularization override (manager/admin correction)
  else if (reg) {
    attendanceState = "regularized";
    if (reg.overrideStatus === OverrideStatus.PRESENT) {
      attendanceState = "present";
    } else if (reg.overrideStatus === OverrideStatus.HALF_DAY) {
      attendanceState = "halfDay";
      flags.push("regularized");
    } else if (reg.overrideStatus === OverrideStatus.ABSENT) {
      attendanceState = "absent";
      flags.push("regularized");
    }
  }
  // 4) raw punch records
  else if (punch) {
    // Past day with partial punch data is treated as half day with flags.
    if (isToday(date)) {
      if (punch.punchInAt && !punch.punchOutAt) {
        attendanceState = "working";
      } else if (punch.punchInAt && punch.punchOutAt) {
        attendanceState =
          punch.workedMinutes != null && punch.workedMinutes >= fullDayMinutes
            ? "present"
            : "halfDay";
      } else {
        attendanceState = "working";
      }
    } else if (punch.punchInAt && punch.punchOutAt) {
      attendanceState =
        punch.workedMinutes != null && punch.workedMinutes >= fullDayMinutes
          ? "present"
          : "halfDay";
    } else if (punch.punchInAt && !punch.punchOutAt) {
      attendanceState = "halfDay";
      punch.workedMinutes = 4.5 * 60; // Assume half day worked for incomplete punches.
      flags.push("missingPunchOut");
    } else if (!punch.punchInAt && punch.punchOutAt) {
      attendanceState = "halfDay";
      flags.push("missingPunchIn");
    } else {
      attendanceState = "absent";
    }
  }
  // 5) no record on closed past day => absent
  else if (isPast(date)) {
    attendanceState = "absent";
  }
  // 6) current day with no data yet (currently represented as absent in day detail)
  else {
    attendanceState = "absent";
  }
  const day = {
    date,
    dayType,
    attendanceState,
    punchInAt:
      punch?.punchInAt?.toISOString() ??
      reg?.overridePunchInAt?.toISOString() ??
      null,
    punchOutAt:
      punch?.punchOutAt?.toISOString() ??
      reg?.overridePunchOutAt?.toISOString() ??
      null,
    workedMinutes: punch?.workedMinutes ?? reg?.overrideWorkedMinutes ?? null,
    flags,
    holiday: holiday ? { id: holiday.id, title: holiday.title } : null,
    leaveRequest: leave ? { id: leave.id, status: leave.status } : null,
    regularization: reg
      ? { id: reg.id, overrideStatus: reg.overrideStatus, reason: reg.reason }
      : null,
  };
  if (options.includeLocation) {
    day.location = options.location ?? null;
  }
  return day;
}
function matchesAttendanceStatus(day, status) {
  if (!status) {
    return true;
  }
  if (status === "regularized") {
    return Boolean(day.regularization);
  }
  return day.attendanceState === status;
}
function computeSummary(days) {
  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let weeklyOffDays = 0;
  for (const d of days) {
    switch (d.attendanceState) {
      case "present":
      case "regularized":
        if (d.regularization?.overrideStatus === "HALF_DAY") halfDays++;
        else if (d.regularization?.overrideStatus === "ABSENT") absentDays++;
        else presentDays++;
        break;
      case "halfDay":
        halfDays++;
        break;
      case "absent":
        absentDays++;
        break;
      case "onLeave":
        leaveDays++;
        break;
      case "holiday":
        holidayDays++;
        break;
      case "weeklyOff":
        weeklyOffDays++;
        break;
      // 'working' (in-progress day) is intentionally excluded from aggregate metrics.
    }
  }
  const denominator = presentDays + halfDays + absentDays;
  const numerator = presentDays + halfDays * 0.5;
  const attendancePercentage =
    denominator > 0 ? Math.round((numerator / denominator) * 10000) / 100 : 0;
  return {
    presentDays,
    halfDays,
    absentDays,
    leaveDays,
    holidayDays,
    weeklyOffDays,
    attendancePercentage,
  };
}
// ─── Punch In/Out ────────────────────────────────────────────────────────────
/**
 * Punch-in transaction for mobile app.
 *
 * Validation order is intentionally strict:
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
  // Calendar checks prevent accidental attendance creation on non-working days.
  // Check weekly off
  if (isWeeklyOff(today)) {
    throw new BadRequestError("Cannot punch in on a weekly off");
  }
  // A same-day holiday blocks attendance irrespective of punch availability.
  // Check holiday
  const holidays = await getHolidaysInRange(today, today);
  const holidayMap = buildHolidayDateMap(holidays);
  if (holidayMap.has(today)) {
    throw new BadRequestError("Cannot punch in on a holiday");
  }
  // Approved leave supersedes attendance marking for that day.
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
  // Geofence uses configured office center/radius from attendance profile.
  // Geofence
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
  // Allow create-or-update semantics because record might exist without punchIn (rare/manual flows).
  const existing = await prisma.attendancePunch.findUnique({
    where: {
      userId_attendanceDate: { userId, attendanceDate: new Date(today) },
    },
  });
  if (existing?.punchInAt) {
    throw new ConflictError("Already punched in for today");
  }
  const now = new Date();
  if (existing) {
    return prisma.attendancePunch.update({
      where: { id: existing.id },
      data: {
        punchInAt: now,
      },
    });
  }
  return prisma.attendancePunch.create({
    data: {
      userId,
      attendanceDate: new Date(today),
      punchInAt: now,
    },
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
  const punch = await prisma.attendancePunch.findUnique({
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
  // Worked minutes are persisted once at punch-out; reporting reuses this value.
  const workedMinutes = Math.floor(
    (now.getTime() - punch.punchInAt.getTime()) / 60000,
  );
  return prisma.attendancePunch.update({
    where: { id: punch.id },
    data: { punchOutAt: now, workedMinutes },
  });
}
// ─── Attendance Overview (for a single user) ─────────────────────────────────
/**
 * Builds day-wise attendance timeline + summary for one user.
 *
 * Response has:
 * - `range`: requested/effective dates + whether current day excluded from summary
 * - `summary`: aggregate counters and percentage
 * - `days`: chronological day-level state objects
 * - optional `holidayHistory`
 */
export async function getUserAttendanceOverview(
  userId,
  startDate,
  endDate,
  includeHolidayHistory = false,
) {
  const prisma = getPrisma();
  const today = businessToday();
  // Fetch user to get their createdAt date - we should not count days before user was created
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  const userCreatedDate = userRecord?.createdAt
    ? userRecord.createdAt.toISOString().slice(0, 10)
    : null;
  const requestedStart = startDate || businessMonthStart();
  // Only consider dates from user's creation date onwards
  const effectiveStart =
    userCreatedDate && userCreatedDate > requestedStart
      ? userCreatedDate
      : requestedStart;
  let effectiveEnd =
    endDate == null ? clampEndDate(today) : clampEndDate(endDate);
  const { appliedEndDate, currentDateExcluded } = clampEndDate(effectiveEnd);
  /**
   * We show "today" in detailed timeline for live UX,
   * but aggregate summary excludes current date to avoid volatile percentages.
   */
  const displayEndDate = effectiveEnd >= today ? today : effectiveEnd;
  const aggregateEndDate = appliedEndDate;
  // Fetch data
  const dates = dateRange(effectiveStart, displayEndDate);
  // Data loaded in bulk once, then reduced into maps for fast per-day lookup.
  const [punches, regularizations, leaves, holidays] = await Promise.all([
    prisma.attendancePunch.findMany({
      where: {
        userId,
        attendanceDate: {
          gte: new Date(effectiveStart),
          lte: new Date(displayEndDate),
        },
      },
    }),
    prisma.attendanceRegularization.findMany({
      where: {
        userId,
        attendanceDate: {
          gte: new Date(effectiveStart),
          lte: new Date(displayEndDate),
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId,
        status: { in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] },
        startDate: { lte: new Date(displayEndDate) },
        endDate: { gte: new Date(effectiveStart) },
      },
    }),
    getHolidaysInRange(effectiveStart, displayEndDate),
  ]);
  const punchMap = buildDateKeyedMap(punches);
  const regMap = buildDateKeyedMap(regularizations);
  const holidayMap = buildHolidayDateMap(holidays);
  const leaveDateMap = buildApprovedLeaveDateMap(leaves, holidayMap);
  const { FULL_DAY_MINUTES } = env();
  const days = dates.map((date) =>
    buildAttendanceDay(
      date,
      punchMap.get(date),
      regMap.get(date),
      holidayMap.get(date),
      leaveDateMap.get(date),
      FULL_DAY_MINUTES,
    ),
  );
  // Summary through applied end date (normally yesterday if query reaches today/future).
  const summaryDays = days.filter((d) => d.date <= aggregateEndDate);
  const summary = computeSummary(summaryDays);
  const result = {
    range: {
      startDate: effectiveStart,
      endDate: displayEndDate,
      appliedEndDate: aggregateEndDate,
      currentDateExcluded,
    },
    summary,
    days,
  };
  if (includeHolidayHistory) {
    const holidayChangeLogs = await prisma.holidayChangeLog.findMany({
      where: {
        holiday: {
          startDate: { lte: new Date(displayEndDate) },
          endDate: { gte: new Date(effectiveStart) },
        },
      },
      include: {
        changedBy: { select: { id: true, fullName: true } },
        holiday: { select: { id: true, title: true } },
      },
      orderBy: { changedAt: "desc" },
    });
    result.holidayHistory = holidayChangeLogs;
  }
  return result;
}
// ─── Web: Attendance Overview (multi-user) ───────────────────────────────────
/**
 * Multi-user attendance overview used by web portal tables.
 *
 * Output includes:
 * - paginated user summaries
 * - organization/team aggregate
 * - effective range metadata
 */
export async function getWebAttendanceOverview(callerRoles, callerId, filters) {
  const prisma = getPrisma();
  const today = businessToday();
  const effectiveStart = filters.startDate || businessMonthStart();
  const rawEnd = filters.endDate || today;
  const { appliedEndDate, currentDateExcluded } = clampEndDate(rawEnd);
  const where = buildAttendanceScopeWhere(
    callerRoles,
    callerId,
    filters.search,
  );
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        roles: true,
        createdAt: true,
      },
      orderBy: { fullName: "asc" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
  ]);
  // If page is empty, these IN clauses naturally return zero rows.
  const userIds = users.map((u) => u.id);
  // Bulk-fetch once and derive per-user summaries in memory to reduce query count.
  const [punches, regularizations, leaves, holidays] = await Promise.all([
    prisma.attendancePunch.findMany({
      where: {
        userId: { in: userIds },
        attendanceDate: {
          gte: new Date(effectiveStart),
          lte: new Date(appliedEndDate),
        },
      },
    }),
    prisma.attendanceRegularization.findMany({
      where: {
        userId: { in: userIds },
        attendanceDate: {
          gte: new Date(effectiveStart),
          lte: new Date(appliedEndDate),
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId: { in: userIds },
        status: LeaveStatus.APPROVED,
        startDate: { lte: new Date(appliedEndDate) },
        endDate: { gte: new Date(effectiveStart) },
      },
    }),
    getHolidaysInRange(effectiveStart, appliedEndDate),
  ]);
  const holidayMap = buildHolidayDateMap(holidays);
  const punchesByUserId = buildDateKeyedMapsByUserId(punches);
  const regularizationsByUserId = buildDateKeyedMapsByUserId(regularizations);
  const leaveDatesByUserId = buildApprovedLeaveDateMapsByUserId(
    leaves,
    holidayMap,
  );
  const dates = dateRange(effectiveStart, appliedEndDate);
  // Build per-user summaries using same precedence used by single-user overview.
  // User summaries are independent and computed in-memory from the same bulk datasets.
  const items = users.map((user) => {
    const userPunches = punchesByUserId.get(user.id) || new Map();
    const userRegs = regularizationsByUserId.get(user.id) || new Map();
    const userLeaveDates = leaveDatesByUserId.get(user.id) || new Map();
    // Only consider dates from user's creation date onwards
    const userCreatedDate = user.createdAt
      ? user.createdAt.toISOString().slice(0, 10)
      : null;
    let presentDays = 0,
      halfDays = 0,
      absentDays = 0,
      leaveDays = 0,
      holidayDays = 0,
      weeklyOffDays = 0,
      totalWorkedMinutes = 0;
    const { FULL_DAY_MINUTES } = env();
    for (const date of dates) {
      // Skip dates before user was created
      if (userCreatedDate && date < userCreatedDate) {
        continue;
      }
      if (isWeeklyOff(date)) {
        weeklyOffDays++;
        continue;
      }
      if (holidayMap.has(date)) {
        holidayDays++;
        continue;
      }
      if (userLeaveDates.has(date)) {
        leaveDays++;
        continue;
      }
      const reg = userRegs.get(date);
      if (reg) {
        totalWorkedMinutes += reg.overrideWorkedMinutes ?? 0;
        if (reg.overrideStatus === OverrideStatus.PRESENT) presentDays++;
        else if (reg.overrideStatus === OverrideStatus.HALF_DAY) halfDays++;
        else absentDays++;
        continue;
      }
      const punch = userPunches.get(date);
      if (punch) {
        if (punch.punchInAt && punch.punchOutAt) {
          totalWorkedMinutes += punch.workedMinutes ?? 0;
          if (
            punch.workedMinutes != null &&
            punch.workedMinutes >= FULL_DAY_MINUTES
          )
            presentDays++;
          else halfDays++;
        } else {
          // Incomplete punch record is treated as half day by policy.
          totalWorkedMinutes += 4.5 * 60;
          halfDays++;
        }
      } else {
        absentDays++;
      }
    }
    const expectedWorkMinutes = (presentDays + halfDays + absentDays) * 9 * 60;
    const attendancePercentage =
      expectedWorkMinutes > 0
        ? Math.round((totalWorkedMinutes / expectedWorkMinutes) * 10000) / 100
        : 0;
    return {
      user: { id: user.id, fullName: user.fullName, email: user.email },
      summary: {
        presentDays,
        halfDays,
        absentDays,
        leaveDays,
        holidayDays,
        weeklyOffDays,
        totalWorkedMinutes,
        attendancePercentage,
      },
    };
  });
  // Cross-user aggregate shown in web dashboard tables/cards.
  const aggregate = {
    presentDays: items.reduce((s, i) => s + i.summary.presentDays, 0),
    halfDays: items.reduce((s, i) => s + i.summary.halfDays, 0),
    absentDays: items.reduce((s, i) => s + i.summary.absentDays, 0),
    leaveDays: items.reduce((s, i) => s + i.summary.leaveDays, 0),
    holidayDays: items.reduce((s, i) => s + i.summary.holidayDays, 0),
    weeklyOffDays: items.reduce((s, i) => s + i.summary.weeklyOffDays, 0),
    totalWorkedMinutes: items.reduce(
      (s, i) => s + i.summary.totalWorkedMinutes,
      0,
    ),
    attendancePercentage: 0,
  };
  const aggDenom =
    aggregate.presentDays + aggregate.halfDays + aggregate.absentDays;
  aggregate.attendancePercentage =
    aggDenom > 0
      ? Math.round(
          ((aggregate.presentDays + aggregate.halfDays * 0.5) / aggDenom) *
            10000,
        ) / 100
      : 0;
  return {
    range: {
      startDate: effectiveStart,
      endDate: rawEnd,
      appliedEndDate,
      currentDateExcluded,
    },
    aggregate,
    items,
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}
/**
 * Paginated row-level attendance records used by the legacy web attendance table.
 *
 * Each row represents one `user + date` combination within the requested range.
 * Rows can be filtered by derived attendance status and searched by user identity.
 */
export async function getWebAttendanceRecords(callerRoles, callerId, filters) {
  const prisma = getPrisma();
  const today = businessToday();
  const effectiveStart = filters.startDate || businessMonthStart();
  const requestedEndDate = filters.endDate || today;
  // Unlike overview endpoints, the records table can show in-progress attendance
  // rows for today once the user has at least punched in.
  const effectiveEnd = requestedEndDate > today ? today : requestedEndDate;
  const where = buildAttendanceScopeWhere(
    callerRoles,
    callerId,
    filters.search,
  );
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      email: true,
      createdAt: true,
      attendanceProfile: {
        select: {
          officeLatitude: true,
          officeLongitude: true,
        },
      },
    },
    orderBy: { fullName: "asc" },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0 || effectiveStart > effectiveEnd) {
    return {
      range: {
        startDate: effectiveStart,
        endDate: effectiveEnd,
        requestedEndDate,
        futureDatesTrimmed: requestedEndDate > today,
      },
      items: [],
      meta: {
        total: 0,
        page: filters.page,
        limit: filters.limit,
        totalPages: 0,
      },
    };
  }
  const [punches, regularizations, leaves, holidays] = await Promise.all([
    prisma.attendancePunch.findMany({
      where: {
        userId: { in: userIds },
        attendanceDate: {
          gte: new Date(effectiveStart),
          lte: new Date(effectiveEnd),
        },
      },
    }),
    prisma.attendanceRegularization.findMany({
      where: {
        userId: { in: userIds },
        attendanceDate: {
          gte: new Date(effectiveStart),
          lte: new Date(effectiveEnd),
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId: { in: userIds },
        status: { in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] },
        startDate: { lte: new Date(effectiveEnd) },
        endDate: { gte: new Date(effectiveStart) },
      },
    }),
    getHolidaysInRange(effectiveStart, effectiveEnd),
  ]);
  const holidayMap = buildHolidayDateMap(holidays);
  const punchesByUserId = buildDateKeyedMapsByUserId(punches);
  const regularizationsByUserId = buildDateKeyedMapsByUserId(regularizations);
  const leaveDatesByUserId = buildApprovedLeaveDateMapsByUserId(
    leaves,
    holidayMap,
  );
  const dates = dateRange(effectiveStart, effectiveEnd);
  const { FULL_DAY_MINUTES } = env();
  const rows = [];
  for (const user of users) {
    const userPunches = punchesByUserId.get(user.id) || new Map();
    const userRegularizations =
      regularizationsByUserId.get(user.id) || new Map();
    const userLeaveDates = leaveDatesByUserId.get(user.id) || new Map();
    const userLocation = serializeAttendanceProfileLocation(
      user.attendanceProfile,
    );
    // Only consider dates from user's creation date onwards
    const userCreatedDate = user.createdAt
      ? user.createdAt.toISOString().slice(0, 10)
      : null;
    for (const date of dates) {
      // Skip dates before user was created
      if (userCreatedDate && date < userCreatedDate) {
        continue;
      }
      const day = buildAttendanceDay(
        date,
        userPunches.get(date),
        userRegularizations.get(date),
        holidayMap.get(date),
        userLeaveDates.get(date),
        FULL_DAY_MINUTES,
        {
          includeLocation: true,
          location: userLocation,
        },
      );
      // Avoid returning empty "today" rows for every user before they punch in.
      if (date === today && !day.punchInAt) {
        continue;
      }
      if (!matchesAttendanceStatus(day, filters.status)) {
        continue;
      }
      rows.push({
        user: { id: user.id, fullName: user.fullName, email: user.email },
        ...day,
      });
    }
  }
  rows.sort(
    (left, right) =>
      right.date.localeCompare(left.date) ||
      left.user.fullName.localeCompare(right.user.fullName) ||
      left.user.email.localeCompare(right.user.email),
  );
  const total = rows.length;
  const startIndex = (filters.page - 1) * filters.limit;
  const items = rows.slice(startIndex, startIndex + filters.limit);
  return {
    range: {
      startDate: effectiveStart,
      endDate: effectiveEnd,
      requestedEndDate,
      futureDatesTrimmed: requestedEndDate > today,
    },
    items,
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}
// ─── Regularizations ─────────────────────────────────────────────────────────
/**
 * Creates or updates attendance regularization for a past working day.
 * Used by manager/admin to correct inaccurate punch-derived status.
 */
export async function upsertRegularization(
  callerRoles,
  callerId,
  targetUserId,
  date,
  data,
) {
  const prisma = getPrisma();
  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!targetUser) throw new NotFoundError("User");
  // Manager scope
  if (callerRoles.includes(Role.MANAGER) && !callerRoles.includes(Role.ADMIN)) {
    if (targetUser.managerUserId !== callerId) {
      throw new ForbiddenError("You can only regularize direct reports");
    }
  }
  // Cannot regularize on holiday or weekly off
  // Prevent edits on weekly off/holiday because these are not attendance-working days.
  if (isWeeklyOff(date)) {
    throw new BadRequestError("Cannot regularize on a weekly off");
  }
  const holidays = await getHolidaysInRange(date, date);
  if (buildHolidayDateMap(holidays).has(date)) {
    throw new BadRequestError("Cannot regularize on a holiday");
  }
  // Regularization is only for already closed days to avoid live-day conflicts.
  if (!isPast(date)) {
    throw new BadRequestError("Can only regularize past dates");
  }
  let overrideWorkedMinutes = null;
  if (data.overridePunchInAt && data.overridePunchOutAt) {
    // Derived minutes keep reporting consistent with punch-based calculations.
    overrideWorkedMinutes = Math.floor(
      (new Date(data.overridePunchOutAt).getTime() -
        new Date(data.overridePunchInAt).getTime()) /
        60000,
    );
  }
  return prisma.attendanceRegularization.upsert({
    where: {
      userId_attendanceDate: {
        userId: targetUserId,
        attendanceDate: new Date(date),
      },
    },
    create: {
      userId: targetUserId,
      attendanceDate: new Date(date),
      overrideStatus: data.overrideStatus,
      overridePunchInAt: data.overridePunchInAt
        ? new Date(data.overridePunchInAt)
        : null,
      overridePunchOutAt: data.overridePunchOutAt
        ? new Date(data.overridePunchOutAt)
        : null,
      overrideWorkedMinutes: overrideWorkedMinutes,
      reason: data.reason,
      actionByUserId: callerId,
    },
    update: {
      overrideStatus: data.overrideStatus,
      overridePunchInAt: data.overridePunchInAt
        ? new Date(data.overridePunchInAt)
        : null,
      overridePunchOutAt: data.overridePunchOutAt
        ? new Date(data.overridePunchOutAt)
        : null,
      overrideWorkedMinutes: overrideWorkedMinutes,
      reason: data.reason,
      actionByUserId: callerId,
    },
    include: { actionBy: { select: { id: true, fullName: true } } },
  });
}
/**
 * Deletes an existing regularization record.
 * Scope restrictions match regularization create/update.
 */
export async function deleteRegularization(
  callerRoles,
  callerId,
  targetUserId,
  date,
) {
  const prisma = getPrisma();
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!targetUser) throw new NotFoundError("User");
  if (callerRoles.includes(Role.MANAGER) && !callerRoles.includes(Role.ADMIN)) {
    if (targetUser.managerUserId !== callerId) {
      throw new ForbiddenError("You can only manage direct reports");
    }
  }
  const existing = await prisma.attendanceRegularization.findUnique({
    where: {
      userId_attendanceDate: {
        userId: targetUserId,
        attendanceDate: new Date(date),
      },
    },
  });
  if (!existing) throw new NotFoundError("Regularization");
  // Hard delete is acceptable since audit action is represented by who removed it (request actor).
  await prisma.attendanceRegularization.delete({ where: { id: existing.id } });
  return { deleted: true };
}
//# sourceMappingURL=attendance.service.js.map
