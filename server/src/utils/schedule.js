import { addDays, parseDateParts } from './dates.js';

// Habit frequency. Stored as text in the habits table.
export const FREQUENCY = { DAILY: 'daily', WEEKDAYS: 'weekdays', CUSTOM: 'custom' };

// Weekday bitmask: Monday=1, Tuesday=2, ... Saturday=32, Sunday=64.
// A habit's schedule is the OR of its selected days.
export const EVERY_DAY = 127;
export const MON_TO_FRI = 31;

// Bit for the weekday of a date string. JavaScript counts Sunday as 0, so we translate.
export function weekdayBit(dateString) {
  const { y, m, d } = parseDateParts(dateString);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return jsDay === 0 ? 64 : 1 << (jsDay - 1);
}

export function isScheduled(weekdaysMask, dateString) {
  return (weekdaysMask & weekdayBit(dateString)) !== 0;
}

// Every scheduled date from startDate to endDate, inclusive. Empty if startDate is after endDate.
export function scheduledDatesBetween(startDate, endDate, weekdaysMask) {
  const dates = [];
  for (let day = startDate; day <= endDate; day = addDays(day, 1)) {
    if (isScheduled(weekdaysMask, day)) dates.push(day);
  }
  return dates;
}

// The API uses ISO numbers: 1 = Monday ... 7 = Sunday.
export function weekdaysToMask(isoDays) {
  return isoDays.reduce((mask, n) => mask | (1 << (n - 1)), 0);
}

export function maskToWeekdays(mask) {
  return [1, 2, 3, 4, 5, 6, 7].filter((n) => (mask & (1 << (n - 1))) !== 0);
}
