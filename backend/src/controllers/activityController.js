import prisma from '../utils/prisma.js';
import { userSummary } from '../utils/selects.js';
import { getPage, PAGE_SIZE } from '../utils/pagination.js';
import { getActivityFilter } from '../services/activityScope.js';
import { badRequest } from '../utils/httpError.js';
import { DAY_IN_MS, localDayKey, localDayStart, parseDay, parseUtcOffset } from '../utils/dates.js';

const entityTypes = ['task', 'request', 'user'];
const SUMMARY_DEFAULT_DAYS = 91;
const SUMMARY_MIN_DAYS = 7;
const SUMMARY_MAX_DAYS = 180;

export async function listActivity(req, res) {
  const where = { AND: [await getActivityFilter(req.user)] };
  if (entityTypes.includes(req.query.entityType)) {
    where.AND.push({ entityType: req.query.entityType });
  }
  // Optional: only one calendar day, in the browser's time zone.
  if (req.query.date !== undefined) {
    const day = parseDay(req.query.date);
    if (!day) throw badRequest('Choose a date as YYYY-MM-DD.');
    const offset = req.query.utcOffset !== undefined ? parseUtcOffset(req.query.utcOffset) : req.utcOffset;
    const from = localDayStart(req.query.date, offset);
    where.AND.push({ createdAt: { gte: from, lt: new Date(from.getTime() + DAY_IN_MS) } });
  }

  const { page, skip, take } = getPage(req.query);
  const [activity, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: { user: { select: userSummary } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.activityLog.count({ where }),
  ]);

  res.json({ activity, total, page, pageSize: PAGE_SIZE });
}

// Events per day for the Operations Pulse heatmap, in the browser's time zone.
// Every day in the range is listed, including days with no events.
export async function getActivitySummary(req, res) {
  const requested = Number.parseInt(req.query.days, 10) || SUMMARY_DEFAULT_DAYS;
  const days = Math.max(SUMMARY_MIN_DAYS, Math.min(SUMMARY_MAX_DAYS, requested));
  const utcOffset = req.query.utcOffset !== undefined ? parseUtcOffset(req.query.utcOffset) : req.utcOffset;

  const todayKey = localDayKey(new Date(), utcOffset);
  const firstKey = new Date(Date.parse(`${todayKey}T00:00:00.000Z`) - (days - 1) * DAY_IN_MS).toISOString().slice(0, 10);
  const from = localDayStart(firstKey, utcOffset);

  const entries = await prisma.activityLog.findMany({
    where: { AND: [await getActivityFilter(req.user), { createdAt: { gte: from, lt: new Date(from.getTime() + days * DAY_IN_MS) } }] },
    select: { createdAt: true },
  });

  const counts = new Map();
  for (const { createdAt } of entries) {
    const key = localDayKey(createdAt, utcOffset);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.parse(`${firstKey}T00:00:00.000Z`) + index * DAY_IN_MS).toISOString().slice(0, 10);
    return { date, count: counts.get(date) || 0 };
  });

  res.json({ days: series, total: entries.length, utcOffset });
}
