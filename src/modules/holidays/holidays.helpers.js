import { getPrisma } from "../../config/database.js";
import { dateRange, toDateString } from "../../common/index.js";

/**
 * Fetches holidays within a date range from database.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {PrismaClient} [db] - Optional Prisma client/transaction
 * @returns {Promise<Holiday[]>}
 */
export async function getHolidaysInRange(startDate, endDate, db = getPrisma()) {
  const days = await db.holiday.findMany({
    where: {
      isDeleted: false,
      startDate: { lte: new Date(endDate) },
      endDate: { gte: new Date(startDate) },
    },
  });

  const individualDates = [];
  for (const h of days) {
    const dates = dateRange(toDateString(h.startDate), toDateString(h.endDate));
    for (const d of dates) {
      // d must be within the requested range, otherwise we might include holidays that only partially overlap
      if (d >= startDate && d <= endDate) {
        individualDates.push({ ...h, date: d });
      }
    }
  }
  return individualDates;
}

/**
 * Expands holiday records to a Set of date strings.
 * @param {Holiday[]} holidays
 * @returns {Set<string>}
 */
export function buildHolidayDateSet(holidays) {
  const set = new Set();
  for (const h of holidays) {
    const dates = dateRange(toDateString(h.startDate), toDateString(h.endDate));
    for (const d of dates) {
      set.add(d);
    }
  }
  return set;
}

/**
 * Expands holiday records to a Map with metadata.
 * @param {Holiday[]} holidays
 * @returns {Map<string, {id: string, title: string}>}
 */
export function buildHolidayDateMap(holidays) {
  const map = new Map();
  for (const h of holidays) {
    const dates = dateRange(toDateString(h.startDate), toDateString(h.endDate));
    for (const d of dates) {
      map.set(d, { id: h.id, title: h.title });
    }
  }
  return map;
}

/**
 * Convenience function: fetches holidays and returns date Set.
 * @param {string} startDate
 * @param {string} endDate
 * @param {PrismaClient} [db]
 * @returns {Promise<Set<string>>}
 */
export async function getHolidayDatesInRange(startDate, endDate, db = getPrisma()) {
  const holidays = await getHolidaysInRange(startDate, endDate, db);
  return buildHolidayDateSet(holidays);
}
