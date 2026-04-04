import {
  Role,
  LeaveStatus,
  DeviceChangeStatus,
  AttendanceSummaryStatus,
} from "@prisma/client";
import { getPrisma } from "../../config/database.js";
import {
  businessToday,
  businessYesterday,
  businessMonthStart,
  businessMonthEnd,
  dateRange,
  isWeeklyOff,
  clampEndDate,
} from "../../common/index.js";
import {
  getAggregateWorkedMinutes,
  getEffectiveSummaryWorkedMinutes,
} from "../attendance/attendance-summary.service.js";
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
  const monthEnd = businessMonthEnd();
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
  // Today's live status - check today's summary row first
  const todaySummary = await prisma.attendanceSummary.findUnique({
    where: { userId_attendanceDate: { userId, attendanceDate: new Date(today) } },
  });
  // Status precedence is applied sequentially; later checks overwrite earlier status.
  let todayStatus = { date: today, status: "notPunchedIn" };
  if (todaySummary) {
    if (todaySummary.status === AttendanceSummaryStatus.WORKING) {
      todayStatus = {
        date: today,
        status: "working",
        punchInAt: todaySummary.punchInAt?.toISOString(),
      };
    } else if (todaySummary.punchInAt && todaySummary.punchOutAt) {
      todayStatus = {
        date: today,
        status: "completed",
        punchInAt: todaySummary.punchInAt.toISOString(),
        punchOutAt: todaySummary.punchOutAt.toISOString(),
        workedMinutes: getEffectiveSummaryWorkedMinutes(today, todaySummary),
      };
    } else if (todaySummary.status === AttendanceSummaryStatus.ON_LEAVE) {
      todayStatus = { date: today, status: "onLeave" };
    }
  }
  // Calendar status supersedes raw punch state when applicable.
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
  // Preserve the current server behavior: approved leave has the final precedence for today's status.
  const todayLeave =
    todaySummary?.status === AttendanceSummaryStatus.ON_LEAVE
      ? true
      : await prisma.leaveRequest.findFirst({
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
  const { appliedEndDate } = clampEndDate(today);
  const summaryStartDate =
    userCreatedDate && userCreatedDate > monthStart
      ? userCreatedDate
      : monthStart;
  const summaryDates = dateRange(summaryStartDate, appliedEndDate);
  // Fetch summary rows and holidays for the month
  const [summaries, holidays] = await Promise.all([
    prisma.attendanceSummary.findMany({
      where: {
        userId,
        attendanceDate: {
          gte: new Date(summaryStartDate),
          lte: new Date(appliedEndDate),
        },
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
  const summaryMap = new Map(
    summaries.map((s) => [s.attendanceDate.toISOString().slice(0, 10), s]),
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
    const summary = summaryMap.get(date);
    if (summary) {
      switch (summary.status) {
        case AttendanceSummaryStatus.PRESENT:
          presentDays++;
          totalWorkMinutes += getAggregateWorkedMinutes(date, summary);
          break;
        case AttendanceSummaryStatus.HALF_DAY:
        case AttendanceSummaryStatus.WORKING:
          halfDays++;
          totalWorkMinutes += getAggregateWorkedMinutes(date, summary);
          break;
        case AttendanceSummaryStatus.ABSENT:
          absentDays++;
          break;
        case AttendanceSummaryStatus.ON_LEAVE:
          leaveDays++;
          break;
      }
    } else {
      absentDays++;
    }
  }
  const expectedWorkMinutes = (presentDays + halfDays + absentDays) * 9 * 60;
  const attendancePercentage =
    expectedWorkMinutes > 0
      ? Math.round((totalWorkMinutes / expectedWorkMinutes) * 10000) / 100
      : 0;
  const monthSummary = {
    presentDays: presentDays + halfDays,
    absentDays,
    leaveDays,
    holidayDays,
    weeklyOffDays,
    attendancePercentage,
  };
  // Last 7 closed working days (for quick trend card on mobile home).
  const last7 = [];
  let cursor = yesterday;
  let count = 0;
  const earliestDate =
    userCreatedDate && userCreatedDate > "2020-01-01"
      ? userCreatedDate
      : "2020-01-01";
  while (count < 7 && cursor >= earliestDate) {
    if (!isWeeklyOff(cursor) && !holidayDateSet.has(cursor)) {
      const summary = summaryMap.get(cursor);
      let status = "absent";
      let wm = null;
      if (summary) {
        wm = getEffectiveSummaryWorkedMinutes(cursor, summary);
        switch (summary.status) {
          case AttendanceSummaryStatus.PRESENT:
            status = "present";
            break;
          case AttendanceSummaryStatus.HALF_DAY:
          case AttendanceSummaryStatus.WORKING:
            status = "halfDay";
            break;
          case AttendanceSummaryStatus.ABSENT:
            status = "absent";
            break;
          case AttendanceSummaryStatus.ON_LEAVE:
            status = "onLeave";
            break;
        }
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
  const attendanceUserWhere = {
    ...userWhere,
    // Admin accounts are not part of attendance aggregates.
    NOT: { roles: { has: Role.ADMIN } },
  };
  const headcount = await prisma.user.count({ where: attendanceUserWhere });
  // Pending leave count
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
  // Aggregate attendance summary through appliedEndDate using summary table.
  const users = await prisma.user.findMany({
    where: attendanceUserWhere,
    select: { id: true, createdAt: true },
  });
  const userIds = users.map((u) => u.id);
  const userCreatedDateMap = new Map(
    users.map((u) => [
      u.id,
      u.createdAt ? u.createdAt.toISOString().slice(0, 10) : null,
    ]),
  );
  const dates = dateRange(effectiveStart, appliedEndDate);
  const [summaries, holidays] = await Promise.all([
    prisma.attendanceSummary.findMany({
      where: {
        userId: { in: userIds },
        attendanceDate: {
          gte: new Date(effectiveStart),
          lte: new Date(appliedEndDate),
        },
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
  // Expand holidays into date set
  const holidayDateSet = new Set();
  for (const h of holidays) {
    const hd = dateRange(
      h.startDate.toISOString().slice(0, 10),
      h.endDate.toISOString().slice(0, 10),
    );
    for (const d of hd) holidayDateSet.add(d);
  }
  // Build summary lookup by userId -> date -> summary
  const summariesByUserId = new Map();
  for (const s of summaries) {
    if (!summariesByUserId.has(s.userId)) {
      summariesByUserId.set(s.userId, new Map());
    }
    summariesByUserId.get(s.userId).set(s.attendanceDate.toISOString().slice(0, 10), s);
  }
  let totalPresent = 0,
    totalHalf = 0,
    totalAbsent = 0,
    totalLeave = 0,
    totalHoliday = 0,
    totalWeeklyOff = 0;
  for (const uid of userIds) {
    const userCreatedDate = userCreatedDateMap.get(uid);
    const userSummaries = summariesByUserId.get(uid) || new Map();
    for (const date of dates) {
      if (userCreatedDate && date < userCreatedDate) continue;
      if (isWeeklyOff(date)) {
        totalWeeklyOff++;
        continue;
      }
      if (holidayDateSet.has(date)) {
        totalHoliday++;
        continue;
      }
      const summary = userSummaries.get(date);
      if (summary) {
        switch (summary.status) {
          case AttendanceSummaryStatus.PRESENT:
            totalPresent++;
            break;
          case AttendanceSummaryStatus.HALF_DAY:
          case AttendanceSummaryStatus.WORKING:
            totalHalf++;
            break;
          case AttendanceSummaryStatus.ABSENT:
            totalAbsent++;
            break;
          case AttendanceSummaryStatus.ON_LEAVE:
            totalLeave++;
            break;
        }
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
