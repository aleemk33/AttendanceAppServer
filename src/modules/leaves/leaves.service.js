import { LeaveStatus, Role } from "@prisma/client";
import { getPrisma } from "../../config/database.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors.js";
import {
  businessToday,
  countWorkingDays,
  dateRange,
  isWeeklyOff,
} from "../../common/index.js";
import { paginate, paginationMeta } from "../../common/pagination.js";
// Expands holidays in range into a date set for fast leave-day calculations.
async function getHolidayDatesInRange(startDate, endDate) {
  const prisma = getPrisma();
  const holidays = await prisma.holiday.findMany({
    where: {
      isDeleted: false,
      startDate: { lte: new Date(endDate) },
      endDate: { gte: new Date(startDate) },
    },
  });
  const set = new Set();
  for (const h of holidays) {
    const dates = dateRange(
      h.startDate.toISOString().slice(0, 10),
      h.endDate.toISOString().slice(0, 10),
    );
    for (const d of dates) set.add(d);
  }
  return set;
}
/**
 * Creates a leave request for future dates.
 *
 * Important behavior:
 * - only future-or-today starts are allowed
 * - working-day count excludes weekly offs + holidays
 * - overlap detection is performed on working dates only
 */
export async function createLeaveRequest(userId, data) {
  const prisma = getPrisma();
  const today = businessToday();
  if (data.startDate > data.endDate) {
    throw new BadRequestError("startDate must be <= endDate");
  }
  if (data.startDate < today) {
    throw new BadRequestError("Leave cannot start in the past");
  }
  if (data.startDate === today) {
    // check the punch-in status to prevent same-day leave abuse
    const attendance = await prisma.attendancePunch.findUnique({
      where: { userId_date: { userId, date: new Date(today) } },
    });
    if (attendance?.punchInTime) {
      throw new BadRequestError("Cannot start leave today after punching in");
    }
  }
  // Compute only working days; weekly offs/holidays do not consume leave balance.
  // This set is reused for both working-day counting and overlap checks.
  const holidayDates = await getHolidayDatesInRange(
    data.startDate,
    data.endDate,
  );
  const { count, workingDates } = countWorkingDays(
    data.startDate,
    data.endDate,
    holidayDates,
  );
  if (count === 0) {
    throw new BadRequestError("No working days in the selected range");
  }
  // Prevent overlap only on effective working dates, not on non-working dates.
  const overlapping = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      startDate: { lte: new Date(data.endDate) },
      endDate: { gte: new Date(data.startDate) },
    },
  });
  if (overlapping.length > 0) {
    // Check if any working days actually overlap
    for (const existing of overlapping) {
      const existingDates = dateRange(
        existing.startDate.toISOString().slice(0, 10),
        existing.endDate.toISOString().slice(0, 10),
      );
      const existingWorkingDates = existingDates.filter(
        (d) => !isWeeklyOff(d) && !holidayDates.has(d),
      );
      const overlap = workingDates.filter((d) =>
        existingWorkingDates.includes(d),
      );
      if (overlap.length > 0) {
        throw new ConflictError(
          "Leave request overlaps with an existing pending/approved leave",
        );
      }
    }
  }
  // Persist computed workingDayCount so approvers can see impact immediately.
  const leave = await prisma.leaveRequest.create({
    data: {
      userId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      workingDayCount: count,
      reason: data.reason,
      status: LeaveStatus.PENDING,
    },
  });
  return { ...leave, workingDates };
}
/**
 * Employee self-view list endpoint with status filter + pagination.
 */
export async function getMyLeaveRequests(userId, filters) {
  const prisma = getPrisma();
  const where = { userId };
  if (filters.status) {
    where.status = filters.status;
  }
  const [total, items] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { actionBy: { select: { id: true, fullName: true } } },
      ...paginate(filters.page, filters.limit),
    }),
  ]);
  return { items, meta: paginationMeta(total, filters.page, filters.limit) };
}
/**
 * Returns leave request details.
 * If `userId` is provided, ownership is enforced (employee self endpoints).
 */
export async function getLeaveRequestById(userId, leaveRequestId) {
  const prisma = getPrisma();
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      actionBy: { select: { id: true, fullName: true } },
    },
  });
  if (!leave) throw new NotFoundError("Leave request");
  if (userId && leave.userId !== userId)
    throw new ForbiddenError("Not your leave request");
  return leave;
}
/**
 * Employee cancellation endpoint.
 * Only pending requests are cancellable.
 */
export async function cancelLeaveRequest(userId, leaveRequestId) {
  const prisma = getPrisma();
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
  });
  if (!leave) throw new NotFoundError("Leave request");
  if (leave.userId !== userId)
    throw new ForbiddenError("Not your leave request");
  if (leave.status !== LeaveStatus.PENDING) {
    throw new BadRequestError("Only pending leave requests can be cancelled");
  }
  return prisma.leaveRequest.update({
    where: { id: leaveRequestId },
    data: {
      status: LeaveStatus.CANCELLED,
      actionByUserId: userId,
      actionAt: new Date(),
    },
  });
}
/**
 * Web list endpoint for manager/admin workflows.
 * Managers are restricted to direct-report leaves.
 */
export async function listLeaveRequestsWeb(callerRoles, callerId, filters) {
  const prisma = getPrisma();
  const where = {};
  // Managers can act only on direct reports; admins get organization-wide view.
  if (callerRoles.includes(Role.MANAGER) && !callerRoles.includes(Role.ADMIN)) {
    where.user = { managerUserId: callerId };
  }
  if (filters.status) where.status = filters.status;
  if (filters.startDate) where.startDate = { gte: new Date(filters.startDate) };
  if (filters.endDate) where.endDate = { lte: new Date(filters.endDate) };
  if (filters.search) {
    where.user = {
      ...where.user,
      OR: [
        { fullName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ],
    };
  }
  const [total, items] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        actionBy: { select: { id: true, fullName: true } },
      },
      ...paginate(filters.page, filters.limit),
    }),
  ]);
  return { items, meta: paginationMeta(total, filters.page, filters.limit) };
}
/**
 * Approves one pending leave request.
 * Self-approval is blocked; manager scope is enforced.
 */
export async function approveLeaveRequest(
  callerRoles,
  callerId,
  leaveRequestId,
  actionNote,
) {
  const prisma = getPrisma();
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { user: true },
  });
  if (!leave) throw new NotFoundError("Leave request");
  if (leave.status !== LeaveStatus.PENDING) {
    throw new BadRequestError("Only pending leave requests can be approved");
  }
  // Avoid self-approval, even if user has manager/admin role.
  if (leave.userId === callerId) {
    throw new ForbiddenError("Cannot approve your own leave request");
  }
  // Manager scope
  if (callerRoles.includes(Role.MANAGER) && !callerRoles.includes(Role.ADMIN)) {
    if (leave.user.managerUserId !== callerId) {
      throw new ForbiddenError("You can only approve direct reports' leave");
    }
  }
  return prisma.leaveRequest.update({
    where: { id: leaveRequestId },
    data: {
      status: LeaveStatus.APPROVED,
      actionByUserId: callerId,
      actionAt: new Date(),
      actionNote: actionNote || null,
    },
    include: {
      user: { select: { id: true, fullName: true } },
      actionBy: { select: { id: true, fullName: true } },
    },
  });
}
/**
 * Rejects one pending leave request.
 * Requires actionNote to support explicit approval audit trail.
 */
export async function rejectLeaveRequest(
  callerRoles,
  callerId,
  leaveRequestId,
  actionNote,
) {
  const prisma = getPrisma();
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { user: true },
  });
  if (!leave) throw new NotFoundError("Leave request");
  if (leave.status !== LeaveStatus.PENDING) {
    throw new BadRequestError("Only pending leave requests can be rejected");
  }
  if (leave.userId === callerId) {
    throw new ForbiddenError("Cannot reject your own leave request");
  }
  if (callerRoles.includes(Role.MANAGER) && !callerRoles.includes(Role.ADMIN)) {
    if (leave.user.managerUserId !== callerId) {
      throw new ForbiddenError("You can only reject direct reports' leave");
    }
  }
  return prisma.leaveRequest.update({
    where: { id: leaveRequestId },
    data: {
      status: LeaveStatus.REJECTED,
      actionByUserId: callerId,
      actionAt: new Date(),
      actionNote,
    },
    include: {
      user: { select: { id: true, fullName: true } },
      actionBy: { select: { id: true, fullName: true } },
    },
  });
}
//# sourceMappingURL=leaves.service.js.map
