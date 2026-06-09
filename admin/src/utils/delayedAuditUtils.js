/**
 * Count working days (Mon–Sat, exclude Sunday) between two dates, inclusive.
 */
export const countWorkingDays = (start, end) => {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  while (cur <= endDate) {
    if (cur.getDay() !== 0) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

/**
 * Compute delayed audits for a calendar month.
 *
 * - Future month  → 0 (nothing can be delayed yet)
 * - Past month    → max(0, target − done)  (full shortfall)
 * - Current month → max(0, floor(elapsedWorkingDays/totalWorkingDays × target) − done)
 *
 * @param {number} year   Full year, e.g. 2026
 * @param {number} month  1-indexed month, e.g. 7 for July
 * @param {number} target Total target for the month
 * @param {number} done   Audits actually completed in the month
 */
export const computeMonthDelayed = (year, month, target, done) => {
  if (!target || target <= 0) return 0;

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  if (year > nowYear || (year === nowYear && month > nowMonth)) return 0;

  if (year < nowYear || (year === nowYear && month < nowMonth)) {
    return Math.max(0, target - done);
  }

  // Current month: pro-rate by working days elapsed
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0); // last day of month at 00:00
  const totalWD = countWorkingDays(firstDay, lastDay);
  const elapsedWD = countWorkingDays(firstDay, now);
  if (totalWD === 0) return 0;
  const expected = Math.floor((elapsedWD / totalWD) * target);
  return Math.max(0, expected - done);
};

/**
 * Compute delayed audits for an arbitrary date window (any start/end, not just calendar months).
 * Used on the employees list where targetAudit can span any custom date range.
 *
 * - Future window  (startDate > today)        → 0
 * - Past window    (endDate   < today)         → max(0, target − done)
 * - Current window (startDate ≤ today ≤ end)  → max(0, floor(elapsedWD/totalWD × target) − done)
 *
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {number} target
 * @param {number} done
 */
export const computeWindowDelayed = (startDate, endDate, target, done) => {
  if (!target || target <= 0 || !startDate || !endDate) return 0;

  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (now < start) return 0;

  if (now > end) {
    return Math.max(0, target - done);
  }

  // Current window: pro-rate by working days elapsed
  const totalWD = countWorkingDays(start, end);
  const elapsedWD = countWorkingDays(start, now);
  if (totalWD === 0) return 0;
  const expected = Math.floor((elapsedWD / totalWD) * target);
  return Math.max(0, expected - done);
};

/**
 * Parse a monthly chart label like "Jan.26" into { year, month } (month 0-indexed).
 * Returns null if the label doesn't match the expected format.
 */
const MONTH_LABEL_MAP = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export const parseMonthlyLabel = (label) => {
  if (typeof label !== "string") return null;
  const parts = label.split(".");
  if (parts.length !== 2) return null;
  const month = MONTH_LABEL_MAP[parts[0]];
  const year = 2000 + parseInt(parts[1], 10);
  if (month === undefined || isNaN(year)) return null;
  return { year, month }; // month is 0-indexed
};

/**
 * Compute delayed audits for a single chart period entry.
 * For monthly timeframe, applies the accurate pro-rated formula for the current month.
 * For all other timeframes (daily, weekly, yearly), uses the simple shortfall formula.
 *
 * @param {{ target: number, actual: number, month: string }} period
 * @param {"monthly"|"daily"|"weekly"|"yearly"} timeframe
 */
export const computeChartDelayed = (period, timeframe) => {
  if (!period.target || period.target <= 0) return 0;

  if (timeframe === "monthly") {
    const parsed = parseMonthlyLabel(period.month);
    if (parsed) {
      return computeMonthDelayed(parsed.year, parsed.month + 1, period.target, period.actual);
    }
  }

  // Fallback for daily / weekly / yearly: full shortfall
  return Math.max(0, Math.round(period.target) - period.actual);
};
