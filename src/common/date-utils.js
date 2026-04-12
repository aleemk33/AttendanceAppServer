import { DateTime } from "luxon";
import { env } from "../config/env.js";
/**
 * Date helpers for business logic.
 * NOTE: date-only strings are in ISO `YYYY-MM-DD` so lexical comparisons are safe.
 */
/** Get current datetime in business timezone */
export function businessNow() {
  return DateTime.now().setZone(env().BUSINESS_TIMEZONE);
}
/** Get today's date string (YYYY-MM-DD) in business timezone */
export function businessToday() {
  return businessNow().toISODate();
}
/** Get yesterday's date string (YYYY-MM-DD) in business timezone */
export function businessYesterday() {
  return businessNow().minus({ days: 1 }).toISODate();
}
/** Get first day of current month in business timezone */
export function businessMonthStart() {
  return businessNow().startOf("month").toISODate();
}

/** Get last day of current month in business timezone */
export function businessMonthEnd() {
  return businessNow().endOf("month").toISODate();
}

/** Parse a YYYY-MM-DD string as a Luxon DateTime in business timezone */
export function parseBusinessDate(dateStr) {
  return DateTime.fromISO(dateStr, { zone: env().BUSINESS_TIMEZONE });
}
/** Check if a date is a Sunday */
function isSunday(dateStr) {
  const dt = parseBusinessDate(dateStr);
  return dt.weekday === 7;
}
/**
 * Check if a date is a 2nd or 4th Saturday.
 * The Nth Saturday is determined by the ordinal position of Saturdays in the month.
 */
function isSecondOrFourthSaturday(dateStr) {
  const dt = parseBusinessDate(dateStr);
  if (dt.weekday !== 6) return false;
  // Count which Saturday of the month this is
  const dayOfMonth = dt.day;
  const saturdayNumber = Math.ceil(dayOfMonth / 7);
  return saturdayNumber === 2 || saturdayNumber === 4;
}
/** Check if a date is a weekly off (Sunday or 2nd/4th Saturday) */
export function isWeeklyOff(dateStr) {
  return isSunday(dateStr) || isSecondOrFourthSaturday(dateStr);
}
/**
 * Generate all dates between startDate and endDate inclusive.
 * Returns array of YYYY-MM-DD strings.
 */
export function dateRange(startDate, endDate) {
  const dates = [];
  let current = parseBusinessDate(startDate);
  const end = parseBusinessDate(endDate);
  while (current <= end) {
    dates.push(current.toISODate());
    current = current.plus({ days: 1 });
  }
  return dates;
}
/**
 * Return the inclusive overlap between two date ranges.
 * Accepts either Date objects or YYYY-MM-DD strings.
 */
export function intersectDateRanges(
  firstStartDate,
  firstEndDate,
  secondStartDate,
  secondEndDate,
) {
  const normalizedFirstStartDate = toDateString(firstStartDate);
  const normalizedFirstEndDate = toDateString(firstEndDate);
  const normalizedSecondStartDate = toDateString(secondStartDate);
  const normalizedSecondEndDate = toDateString(secondEndDate);

  const startDate =
    normalizedFirstStartDate > normalizedSecondStartDate
      ? normalizedFirstStartDate
      : normalizedSecondStartDate;
  const endDate =
    normalizedFirstEndDate < normalizedSecondEndDate
      ? normalizedFirstEndDate
      : normalizedSecondEndDate;

  if (startDate > endDate) {
    return null;
  }

  return { startDate, endDate };
}
/**
 * Clamp an end date to yesterday if it's today or future.
 * Returns { appliedEndDate, currentDateExcluded }
 */
export function clampEndDate(endDate) {
  const today = businessToday();
  if (endDate >= today) {
    // Exclude current day from aggregate math because the day may still be in progress.
    return { appliedEndDate: businessYesterday(), currentDateExcluded: true };
  }
  return { appliedEndDate: endDate, currentDateExcluded: false };
}
/**
 * Count working days in a date range, excluding weekly offs and holidays.
 * holidayDates should be a Set of YYYY-MM-DD strings for active holidays.
 */
export function countWorkingDays(startDate, endDate, holidayDates) {
  const dates = dateRange(startDate, endDate);
  const workingDates = [];
  for (const d of dates) {
    if (!isWeeklyOff(d) && !holidayDates.has(d)) {
      workingDates.push(d);
    }
  }
  return { count: workingDates.length, workingDates };
}
/** Check if a date is today in business timezone */
export function isToday(dateStr) {
  return dateStr === businessToday();
}
/** Check if a date is in the past (before today in business timezone) */
export function isPast(dateStr) {
  return dateStr < businessToday();
}
/**
 * Convert Date or ISO string to YYYY-MM-DD format.
 * @param {Date|string} value
 * @returns {string}
 */
export function toDateString(value) {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}
//# sourceMappingURL=date-utils.js.map
