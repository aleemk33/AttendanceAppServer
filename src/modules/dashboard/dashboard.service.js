import {
  Role,
  LeaveStatus,
  DeviceChangeStatus,
  OverrideStatus,
} from "@prisma/client";
import { getPrisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import {
  businessToday,
  businessYesterday,
  businessMonthStart,
  dateRange,
  isWeeklyOff,
  clampEndDate,
} from "../../common/index.js";
// ─── Mobile Dashboard ────────────────────────────────────────────────────────
/**
 * Mobile dashboard aggregation for a single employee.
 *
 * Includes:
 * - profile card
 * - today's live status
 * - month-to-date closed summary
 * - recent 7 closed working days
 * - pending leave + upcoming holidays
 */
export async function getMobileDashboard(userId) {
  const prisma = getPrisma();
  const today = businessToday();
  const yesterday = businessYesterday();
  const monthStart = businessMonthStart();
  // Basic profile card shown at top of mobile dashboard.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      roles: true,
      createdAt: true,
      manager: { select: { id: true, fullName: true } },
    },
  });
  // Only consider dates from user's creation date onwards
  const userCreatedDate = user?.createdAt
    ? user.createdAt.toISOString().slice(0, 10)
    : null;
  // Today's live status takes precedence order: punch -> weekly off -> holiday -> leave.
  const todayPunch = await prisma.attendancePunch.findUnique({
    where: {
      userId_attendanceDate: { userId, attendanceDate: new Date(today) },
    },
  });
  // Status precedence is applied sequentially; later checks overwrite earlier status.
  let todayStatus = { date: today, status: "notPunchedIn" };
  if (todayPunch) {
    if (todayPunch.punchInAt && !todayPunch.punchOutAt) {
      todayStatus = {
        date: today,
        status: "working",
        punchInAt: todayPunch.punchInAt.toISOString(),
      };
    } else if (todayPunch.punchInAt && todayPunch.punchOutAt) {
      todayStatus = {
        date: today,
        status: "completed",
        punchInAt: todayPunch.punchInAt.toISOString(),
        punchOutAt: todayPunch.punchOutAt.toISOString(),
        workedMinutes: todayPunch.workedMinutes,
      };
    }
  }
  // This sequence ensures calendar status can supersede raw punch state when applicable.
  if (isWeeklyOff(today)) {
    todayStatus = { date: today, status: "weeklyOff" };
  }
  // Check if today is a holiday
  const todayHoliday = await prisma.holiday.findFirst({
    where: {
      isDeleted: false,
      startDate: { lte: new Date(today) },
      endDate: { gte: new Date(today) },
    },
  });
  if (todayHoliday) {
    todayStatus = {
      date: today,
      status: "holiday",
      holiday: todayHoliday.title,
    };
  }
  // Check if today is on approved leave
  const todayLeave = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: LeaveStatus.APPROVED,
      startDate: { lte: new Date(today) },
      endDate: { gte: new Date(today) },
    },
  });
  if (todayLeave) {
    todayStatus = { date: today, status: "onLeave" };
  }
  // Month summary is closed through yesterday so percentages don't oscillate during the day.
  // Closed-day window avoids counting in-progress day in monthly metrics.
  const { appliedEndDate } = clampEndDate(today);
  // Only consider dates from user's creation date onwards
  const summaryStartDate =
    userCreatedDate && userCreatedDate > monthStart
      ? userCreatedDate
      : monthStart;
  const summaryDates = dateRange(summaryStartDate, appliedEndDate);
  const [punches, regularizations, leaves, holidays] = await Promise.all([
    prisma.attendancePunch.findMany({
      where: {
        userId,
        attendanceDate: {
          gte: new Date(monthStart),
          lte: new Date(appliedEndDate),
        },
      },
    }),
    prisma.attendanceRegularization.findMany({
      where: {
        userId,
        attendanceDate: {
          gte: new Date(monthStart),
          lte: new Date(appliedEndDate),
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId,
        status: LeaveStatus.APPROVED,
        startDate: { lte: new Date(appliedEndDate) },
        endDate: { gte: new Date(monthStart) },
      },
    }),
    prisma.holiday.findMany({
      where: {
        isDeleted: false,
        startDate: { lte: new Date(appliedEndDate) },
        endDate: { gte: new Date(monthStart) },
      },
    }),
  ]);
  const punchMap = new Map(
    punches.map((p) => [p.attendanceDate.toISOString().slice(0, 10), p]),
  );
  const regMap = new Map(
    regularizations.map((r) => [
      r.attendanceDate.toISOString().slice(0, 10),
      r,
    ]),
  );
  // Expand holiday ranges into date-level lookup.
  const holidayDateSet = new Set();
  for (const h of holidays) {
    const hDates = dateRange(
      h.startDate.toISOString().slice(0, 10),
      h.endDate.toISOString().slice(0, 10),
    );
    for (const d of hDates) holidayDateSet.add(d);
  }
  // Expand approved leave ranges, excluding non-working dates.
  const leaveDateSet = new Set();
  for (const l of leaves) {
    const lDates = dateRange(
      l.startDate.toISOString().slice(0, 10),
      l.endDate.toISOString().slice(0, 10),
    );
    for (const d of lDates) {
      if (!isWeeklyOff(d) && !holidayDateSet.has(d)) leaveDateSet.add(d);
    }
  }
  const { FULL_DAY_MINUTES } = env();
  let presentDays = 0,
    halfDays = 0,
    absentDays = 0,
    leaveDays = 0,
    holidayDays = 0,
    weeklyOffDays = 0,
    totalWorkMinutes = 0;
  for (const date of summaryDates) {
    if (isWeeklyOff(date)) {
      weeklyOffDays++;
      continue;
    }
    if (holidayDateSet.has(date)) {
      holidayDays++;
      continue;
    }
    if (leaveDateSet.has(date)) {
      leaveDays++;
      continue;
    }
    const reg = regMap.get(date);
    if (reg) {
      if (reg.overrideStatus === OverrideStatus.PRESENT) {
        presentDays++;
        totalWorkMinutes += reg.overrideWorkedMinutes || 0;
      } else if (reg.overrideStatus === OverrideStatus.HALF_DAY) {
        halfDays++;
        totalWorkMinutes += reg.overrideWorkedMinutes || 0;
      } else {
        absentDays++;
      }
      continue;
    }
    const punch = punchMap.get(date);
    if (punch && punch.punchInAt && punch.punchOutAt) {
      if (
        punch.workedMinutes != null &&
        punch.workedMinutes >= FULL_DAY_MINUTES
      ) {
        presentDays++;
        totalWorkMinutes += punch.workedMinutes || 0;
      } else {
        halfDays++;
        totalWorkMinutes += punch.workedMinutes || 0;
      }
    } else if (punch && (punch.punchInAt || punch.punchOutAt)) {
      halfDays++;
      totalWorkMinutes += punch.workedMinutes || 0;
    } else {
      absentDays++;
    }
  }
  // Attendance percentage considers present + half-day weighting only.
  // const denominator = presentDays + halfDays + absentDays;
  const expectedWorkMinutes = (presentDays + halfDays + absentDays) * 9 * 60;
  const attendancePercentage =
    totalWorkMinutes > 0 ? (expectedWorkMinutes / totalWorkMinutes) * 100 : 0;
  const monthSummary = {
    presentDays,
    halfDays,
    absentDays,
    leaveDays,
    holidayDays,
    weeklyOffDays,
    attendancePercentage,
  };
  // Last 7 closed working days (for quick trend card on mobile home).
  // Cursor walks backwards day-by-day; only working/non-holiday days are collected.
  const last7 = [];
  let cursor = yesterday;
  let count = 0;
  // Stop at user's creation date or 2020-01-01
  const earliestDate =
    userCreatedDate && userCreatedDate > "2020-01-01"
      ? userCreatedDate
      : "2020-01-01";
  while (count < 7 && cursor >= earliestDate) {
    if (!isWeeklyOff(cursor) && !holidayDateSet.has(cursor)) {
      const p = punchMap.get(cursor);
      const r = regMap.get(cursor);
      let status = "absent";
      let wm = null;
      if (leaveDateSet.has(cursor)) {
        status = "onLeave";
      } else if (r) {
        status = r.overrideStatus.toLowerCase();
        wm = r.overrideWorkedMinutes;
      } else if (p && p.punchInAt && p.punchOutAt) {
        status =
          p.workedMinutes != null && p.workedMinutes >= FULL_DAY_MINUTES
            ? "present"
            : "halfDay";
        wm = p.workedMinutes;
      } else if (p) {
        status = "halfDay";
        wm = p.workedMinutes;
      }
      last7.push({ date: cursor, status, workedMinutes: wm });
      count++;
    }
    // Decrement cursor
    const dt = new Date(cursor);
    dt.setDate(dt.getDate() - 1);
    cursor = dt.toISOString().slice(0, 10);
  }
  // Short list to drive "pending approvals" UI chips.
  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: { userId, status: { in: [LeaveStatus.PENDING] } },
    orderBy: { startDate: "asc" },
    take: 5,
  });
  // Upcoming holidays list for quick awareness.
  const upcomingHolidays = await prisma.holiday.findMany({
    where: { isDeleted: false, endDate: { gte: new Date(today) } },
    orderBy: { startDate: "asc" },
    take: 5,
    select: { id: true, title: true, startDate: true, endDate: true },
  });
  return {
    user,
    todayStatus,
    monthSummary,
    last7ClosedDays: last7,
    pendingLeaves,
    upcomingHolidays,
  };
}
// ─── Web Dashboard ───────────────────────────────────────────────────────────
/**
 * Web dashboard aggregation for manager/admin.
 *
 * Provides:
 * - scoped headcount
 * - pending approvals counts
 * - upcoming holidays
 * - aggregate attendance counters for selected range
 */
export async function getWebDashboard(
  callerRoles,
  callerId,
  startDate,
  endDate,
) {
  const prisma = getPrisma();
  const today = businessToday();
  const effectiveStart = startDate || businessMonthStart();
  const rawEnd = endDate || today;
  const { appliedEndDate, currentDateExcluded } = clampEndDate(rawEnd);
  // Manager vs admin scope.
  const userWhere = { isActive: true };
  if (callerRoles.includes(Role.MANAGER) && !callerRoles.includes(Role.ADMIN)) {
    userWhere.managerUserId = callerId;
  }
  const headcount = await prisma.user.count({ where: userWhere });
  // Pending leave count
  // Pending queues are separately counted for high-signal dashboard cards.
  const pendingLeaveWhere = { status: LeaveStatus.PENDING };
  if (userWhere.managerUserId) {
    pendingLeaveWhere.user = { managerUserId: userWhere.managerUserId };
  }
  const pendingLeaveCount = await prisma.leaveRequest.count({
    where: pendingLeaveWhere,
  });
  // Pending device change count
  const pendingDCWhere = { status: DeviceChangeStatus.PENDING };
  if (userWhere.managerUserId) {
    pendingDCWhere.user = { managerUserId: userWhere.managerUserId };
  }
  const pendingDeviceChangeCount = await prisma.deviceChangeRequest.count({
    where: pendingDCWhere,
  });
  // Upcoming holidays
  const upcomingHolidays = await prisma.holiday.findMany({
    where: { isDeleted: false, endDate: { gte: new Date(today) } },
    orderBy: { startDate: "asc" },
    take: 5,
    select: { id: true, title: true, startDate: true, endDate: true },
  });
  // Aggregate attendance summary through appliedEndDate (usually yesterday).
  const users = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, createdAt: true },
  });
  // If team size is zero, downstream aggregations naturally resolve to zero values.
  const userIds = users.map((u) => u.id);
  // Build a map of userId -> createdAt for filtering dates per user
  const userCreatedDateMap = new Map(
    users.map((u) => [
      u.id,
      u.createdAt ? u.createdAt.toISOString().slice(0, 10) : null,
    ]),
  );
  const dates = dateRange(effectiveStart, appliedEndDate);
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
    prisma.holiday.findMany({
      where: {
        isDeleted: false,
        startDate: { lte: new Date(appliedEndDate) },
        endDate: { gte: new Date(effectiveStart) },
      },
    }),
  ]);
  // Shared holiday lookup for all users in selected date range.
  const holidayDateSet = new Set();
  for (const h of holidays) {
    const hd = dateRange(
      h.startDate.toISOString().slice(0, 10),
      h.endDate.toISOString().slice(0, 10),
    );
    for (const d of hd) holidayDateSet.add(d);
  }
  const { FULL_DAY_MINUTES } = env();
  let totalPresent = 0,
    totalHalf = 0,
    totalAbsent = 0,
    totalLeave = 0,
    totalHoliday = 0,
    totalWeeklyOff = 0;
  // Aggregate per-user day states into organization/team totals.
  for (const uid of userIds) {
    const userCreatedDate = userCreatedDateMap.get(uid);
    const uPunches = new Map(
      punches
        .filter((p) => p.userId === uid)
        .map((p) => [p.attendanceDate.toISOString().slice(0, 10), p]),
    );
    const uRegs = new Map(
      regularizations
        .filter((r) => r.userId === uid)
        .map((r) => [r.attendanceDate.toISOString().slice(0, 10), r]),
    );
    const uLeaves = leaves.filter((l) => l.userId === uid);
    const uLeaveDates = new Set();
    for (const l of uLeaves) {
      const ld = dateRange(
        l.startDate.toISOString().slice(0, 10),
        l.endDate.toISOString().slice(0, 10),
      );
      for (const d of ld)
        if (!isWeeklyOff(d) && !holidayDateSet.has(d)) uLeaveDates.add(d);
    }
    for (const date of dates) {
      // Skip dates before user was created
      if (userCreatedDate && date < userCreatedDate) {
        continue;
      }
      if (isWeeklyOff(date)) {
        totalWeeklyOff++;
        continue;
      }
      if (holidayDateSet.has(date)) {
        totalHoliday++;
        continue;
      }
      if (uLeaveDates.has(date)) {
        totalLeave++;
        continue;
      }
      const reg = uRegs.get(date);
      if (reg) {
        if (reg.overrideStatus === OverrideStatus.PRESENT) totalPresent++;
        else if (reg.overrideStatus === OverrideStatus.HALF_DAY) totalHalf++;
        else totalAbsent++;
        continue;
      }
      const punch = uPunches.get(date);
      if (punch && punch.punchInAt && punch.punchOutAt) {
        if (
          punch.workedMinutes != null &&
          punch.workedMinutes >= FULL_DAY_MINUTES
        )
          totalPresent++;
        else totalHalf++;
      } else if (punch) {
        totalHalf++;
      } else {
        totalAbsent++;
      }
    }
  }
  const denom = totalPresent + totalHalf + totalAbsent;
  const attendancePercentage =
    denom > 0
      ? Math.round(((totalPresent + totalHalf * 0.5) / denom) * 10000) / 100
      : 0;
  return {
    range: {
      startDate: effectiveStart,
      endDate: rawEnd,
      appliedEndDate,
      currentDateExcluded,
    },
    headcount,
    attendanceSummary: {
      presentDays: totalPresent,
      halfDays: totalHalf,
      absentDays: totalAbsent,
      leaveDays: totalLeave,
      holidayDays: totalHoliday,
      weeklyOffDays: totalWeeklyOff,
      attendancePercentage,
    },
    pendingLeaveCount,
    pendingDeviceChangeCount,
    upcomingHolidays,
  };
}
//# sourceMappingURL=dashboard.service.js.map
