const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_UTC_OFFSET_MINUTES = 14 * 60;

// "2026-11-09" -> Date at UTC midnight, or null when the text is not a real calendar date.
// Due dates are stored at UTC midnight, so this compares like with like.
export function parseDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

// The browser's offset from UTC in minutes (e.g. -300 for New York in winter). Defaults to UTC.
export function parseUtcOffset(value) {
  const minutes = Number.parseInt(value, 10);
  if (Number.isNaN(minutes)) return 0;
  return Math.max(-MAX_UTC_OFFSET_MINUTES, Math.min(MAX_UTC_OFFSET_MINUTES, minutes));
}

// The calendar day an instant falls on for someone at the given UTC offset.
export function localDayKey(instant, utcOffset) {
  return new Date(instant.getTime() + utcOffset * 60 * 1000).toISOString().slice(0, 10);
}

// The UTC instant at which a local calendar day starts.
export function localDayStart(dayKey, utcOffset) {
  return new Date(Date.parse(`${dayKey}T00:00:00.000Z`) - utcOffset * 60 * 1000);
}

// The user's calendar day as a Date at UTC midnight, matching how due dates are stored.
export function localToday(utcOffset = 0) {
  return new Date(`${localDayKey(new Date(), utcOffset)}T00:00:00.000Z`);
}

export const DAY_IN_MS = DAY_MS;
