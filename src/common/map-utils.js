import { toDateKey } from "./holiday-utils.js";

/**
 * Builds a Map keyed by date string from records with attendanceDate field.
 * @param {Array} records - Records with attendanceDate field
 * @returns {Map<string, object>} Map of date string to record
 */
export function buildDateKeyedMap(records) {
  return new Map(
    records.map((record) => [toDateKey(record.attendanceDate), record]),
  );
}

/**
 * Builds a nested Map structure: userId -> (date -> record).
 * Useful for multi-user attendance queries.
 * @param {Array} records - Records with userId and attendanceDate fields
 * @returns {Map<string, Map<string, object>>}
 */
export function buildDateKeyedMapsByUserId(records) {
  const map = new Map();
  for (const record of records) {
    const date = toDateKey(record.attendanceDate);
    if (!map.has(record.userId)) {
      map.set(record.userId, new Map());
    }
    map.get(record.userId).set(date, record);
  }
  return map;
}

/**
 * Builds a Map of userId to Array of dates from leave records.
 * Filters out weekly offs and holidays.
 * @param {Array} leaves - Leave request records with userId, startDate, endDate, status
 * @param {Map|Set} holidayMap - Holiday dates (Map or Set)
 * @param {Function} isWeeklyOff - Function to check if date is weekly off
 * @param {Function} dateRange - Function to generate date range
 * @param {string} requiredStatus - Optional status filter (e.g., 'APPROVED')
 * @returns {Map<string, Map<string, object>>}
 */
export function buildApprovedLeaveDateMapsByUserId(
  leaves,
  holidayMap,
  isWeeklyOff,
  dateRange,
  requiredStatus = null,
) {
  const map = new Map();
  for (const leave of leaves) {
    if (requiredStatus && leave.status !== requiredStatus) {
      continue;
    }
    const leaveDates = dateRange(
      toDateKey(leave.startDate),
      toDateKey(leave.endDate),
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

/**
 * Builds a Map of dates to leave info for a single user.
 * @param {Array} leaves - Leave request records
 * @param {Map|Set} holidayMap - Holiday dates
 * @param {Function} isWeeklyOff - Function to check weekly off
 * @param {Function} dateRange - Function to generate date range
 * @param {string} requiredStatus - Optional status filter
 * @returns {Map<string, object>}
 */
export function buildApprovedLeaveDateMap(
  leaves,
  holidayMap,
  isWeeklyOff,
  dateRange,
  requiredStatus = null,
) {
  const map = new Map();
  for (const leave of leaves) {
    if (requiredStatus && leave.status !== requiredStatus) {
      continue;
    }
    const leaveDates = dateRange(
      toDateKey(leave.startDate),
      toDateKey(leave.endDate),
    );
    for (const date of leaveDates) {
      if (!isWeeklyOff(date) && !holidayMap.has(date)) {
        map.set(date, { id: leave.id, status: leave.status });
      }
    }
  }
  return map;
}
