import prisma from '../utils/prisma.js';
import { userSummary } from '../utils/selects.js';
import { getTeamUserIds, getVisibleTaskFilter, getVisibleRequestFilter } from '../services/accessService.js';
import { getActivityFilter } from '../services/activityScope.js';

const DEADLINE_WINDOW_DAYS = 14;
const RECENT_ACTIVITY_LIMIT = 5;
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

// Turns a Prisma groupBy result into { STATUS: count }, including statuses with no rows.
function toStatusCounts(groups, statuses) {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}

export async function getSummary(req, res) {
  const user = req.user;
  const isManager = user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  // Managers and admins see deadlines for their whole team; employees see their own.
  let deadlineScope = { assignedTo: user.id };
  if (isAdmin) deadlineScope = {};
  if (isManager) deadlineScope = { assignedTo: { in: [...(await getTeamUserIds(user.id)), user.id] } };
  const deadlineLimit = new Date(Date.now() + DEADLINE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const today = new Date(new Date().toISOString().slice(0, 10));

  // The status charts use the same visibility rules as the Tasks and Requests pages:
  // employees see their own items, managers their team's, and admins everything.
  const taskChartScope = isManager || isAdmin ? await getVisibleTaskFilter(user, 'all') : { assignedTo: user.id };
  const requestChartScope = await getVisibleRequestFilter(user, isManager || isAdmin ? 'team' : undefined);

  const [
    assignedTasks,
    inProgressTasks,
    overdueTasks,
    pendingRequests,
    pendingApprovals,
    taskGroups,
    requestGroups,
    upcomingDeadlines,
    recentActivity,
  ] = await Promise.all([
    prisma.task.count({ where: { assignedTo: user.id, status: { not: 'COMPLETED' } } }),
    prisma.task.count({ where: { assignedTo: user.id, status: 'IN_PROGRESS' } }),
    prisma.task.count({ where: { assignedTo: user.id, status: { not: 'COMPLETED' }, dueDate: { lt: today } } }),
    prisma.request.count({ where: { requestedBy: user.id, status: 'PENDING' } }),
    isManager ? prisma.request.count({ where: { reviewerId: user.id, status: 'PENDING' } }) : null,
    prisma.task.groupBy({ by: ['status'], where: taskChartScope, _count: { _all: true } }),
    prisma.request.groupBy({ by: ['status'], where: requestChartScope, _count: { _all: true } }),
    prisma.task.findMany({
      where: { ...deadlineScope, status: { not: 'COMPLETED' }, dueDate: { not: null, lte: deadlineLimit } },
      include: { assignee: { select: userSummary } },
      orderBy: { dueDate: 'asc' },
      take: 6,
    }),
    prisma.activityLog.findMany({
      where: await getActivityFilter(user),
      include: { user: { select: userSummary } },
      orderBy: { createdAt: 'desc' },
      take: RECENT_ACTIVITY_LIMIT,
    }),
  ]);

  res.json({
    counts: { assignedTasks, inProgressTasks, overdueTasks, pendingRequests, pendingApprovals },
    taskStatusCounts: toStatusCounts(taskGroups, TASK_STATUSES),
    requestStatusCounts: toStatusCounts(requestGroups, REQUEST_STATUSES),
    upcomingDeadlines,
    recentActivity,
  });
}
