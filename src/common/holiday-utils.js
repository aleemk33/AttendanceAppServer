import { getPrisma } from "../config/database.js";
import { dateRange } from "./date-utils.js";

/**
 * Fetches holidays that overlap with the given date range.
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {object} db - Optional Prisma client/transaction
 * @returns {Promise<Array>} Array of holiday records
 */
export async function getHolidaysInRange(startDate, endDate, db = getPrisma()) {
  return db.holiday.findMany({
    where: {
      isDeleted: false,
      startDate: { lte: new Date(endDate) },
      endDate: { gte: new Date(startDate) },
    },
  });
}

/**
 * Expands holiday rows to a day-level Map.
 * Key: YYYY-MM-DD string
 * Value: { id, title } object for response payloads
 * @param {Array} holidays - Array of holiday records
 * @returns {Map<string, {id: string, title: string}>}
 */
export function buildHolidayDateMap(holidays) {
  const map = new Map();
  for (const holiday of holidays) {
    const dates = dateRange(
      toDateKey(holiday.startDate),
      toDateKey(holiday.endDate),
    );
    for (const date of dates) {
      map.set(date, { id: holiday.id, title: holiday.title });
    }
  }
  return map;
}

/**
 * Returns a Set of date strings (YYYY-MM-DD) for all holiday days in range.
 * Useful for fast membership checks without needing holiday metadata.
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {object} db - Optional Prisma client/transaction
 * @returns {Promise<Set<string>>}
 */
export async function getHolidayDatesInRange(
  startDate,
  endDate,
  db = getPrisma(),
) {
  const holidays = await getHolidaysInRange(startDate, endDate, db);
  const set = new Set();
  for (const holiday of holidays) {
    const dates = dateRange(
      toDateKey(holiday.startDate),
      toDateKey(holiday.endDate),
    );
    for (const date of dates) {
      set.add(date);
    }
  }
  return set;
}

/**
 * Converts a Date object or ISO string to a YYYY-MM-DD string.
 * @param {Date|string} value - Date object or ISO string
 * @returns {string} YYYY-MM-DD formatted string
 */
export function toDateKey(value) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}
