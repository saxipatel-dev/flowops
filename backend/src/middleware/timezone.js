import { parseUtcOffset } from '../utils/dates.js';

// The browser sends its offset from UTC (in minutes) so "today" means the user's own
// calendar day: for overdue work, past due dates and the dashboard. Without the header
// the server falls back to UTC, which is how it behaved before.
export function readUtcOffset(req, res, next) {
  req.utcOffset = parseUtcOffset(req.get('X-UTC-Offset'));
  next();
}
