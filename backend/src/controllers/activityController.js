import prisma from '../utils/prisma.js';
import { userSummary } from '../utils/selects.js';
import { getPage, PAGE_SIZE } from '../utils/pagination.js';
import { getActivityFilter } from '../services/activityScope.js';

const entityTypes = ['task', 'request', 'user'];

export async function listActivity(req, res) {
  const where = { AND: [await getActivityFilter(req.user)] };
  if (entityTypes.includes(req.query.entityType)) {
    where.AND.push({ entityType: req.query.entityType });
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
