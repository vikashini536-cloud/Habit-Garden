// Date helpers. Dates are plain "YYYY-MM-DD" strings everywhere in the backend.
// Working with calendar-date strings (instead of timestamps) avoids timezone shifts.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const { y, m, d } = parseDateParts(value);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function parseDateParts(value) {
  const [y, m, d] = value.split('-').map(Number);
  return { y, m, d };
}

// Adds days to a date string. Negative numbers go backwards. Month and leap-year rules are handled by Date.UTC.
export function addDays(dateString, days) {
  const { y, m, d } = parseDateParts(dateString);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// The calendar date ("YYYY-MM-DD") that it currently is in the given IANA timezone.
// Example: 20:30 UTC on Nov 24 is already Nov 25 in Asia/Kolkata.
export function todayInTimezone(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
