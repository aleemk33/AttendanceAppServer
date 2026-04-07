import { LeaveStatus, AttendanceSummaryStatus } from "@prisma/client";
import { getPrisma } from "../../config/database.js";
import {
  businessToday,
  businessYesterday,
  businessMonthStart,
  dateRange,
  isWeeklyOff,
  clampEndDate,
  toDateString,
} from "../../common/index.js";
import { getEffectiveSummaryWorkedMinutes } from "../attendance/attendance-summary.service.js";
import {
  buildHolidayDateSet,
  computeUserMonthSummary,
} from "./dashboard.helpers.js";

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

  // Basic profile card
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

  const userCreatedDate = user?.createdAt
    ? toDateString(user.createdAt)
    : null;

  // Today's live status
  const todaySummary = await prisma.attendanceSummary.findUnique({
    where: { userId_attendanceDate: { userId, attendanceDate: new Date(today) } },
  });

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

  // Calendar status supersedes raw punch state
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

  // Approved leave has final precedence
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

  // Month summary through yesterday
  const { appliedEndDate } = clampEndDate(today);
  const summaryStartDate =
    userCreatedDate && userCreatedDate > monthStart
      ? userCreatedDate
      : monthStart;
  const summaryDates = dateRange(summaryStartDate, appliedEndDate);

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
    summaries.map((s) => [toDateString(s.attendanceDate), s]),
  );
  const holidayDateSet = buildHolidayDateSet(holidays);
  const monthSummary = computeUserMonthSummary(
    summaryDates,
    summaryMap,
    holidayDateSet,
  );

  // Pending leaves
  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: { userId, status: { in: [LeaveStatus.PENDING] } },
    orderBy: { startDate: "asc" },
    take: 5,
  });

  // Upcoming holidays
  const upcomingHolidays = await prisma.holiday.findMany({
    where: { isDeleted: false, endDate: { gte: new Date(today) } },
    orderBy: { startDate: "asc" },
    take: 2,
    select: { id: true, title: true, startDate: true, endDate: true },
  });

  return {
    user,
    todayStatus,
    monthSummary,
    pendingLeaves,
    upcomingHolidays,
  };
}
