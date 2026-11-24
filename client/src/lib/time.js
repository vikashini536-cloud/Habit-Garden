// Display-only helpers. The server decides what "today" really is for check-ins.
// These use the timezone saved on the user, so the greeting matches their local time.

function partsIn(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function todayInTimezone(timeZone, now) {
  const p = partsIn(timeZone, now);
  return `${p.year}-${p.month}-${p.day}`;
}

export function hourInTimezone(timeZone, now) {
  return Number(partsIn(timeZone, now).hour);
}

export function greetingFor(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// "Mon, 24 Nov 2026" for a "YYYY-MM-DD" date string. Formatted in UTC so the day never shifts.
export function formatDay(dateString) {
  return new Date(`${dateString}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
