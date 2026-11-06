import prisma from '../utils/prisma.js';
import { userSummary } from '../utils/selects.js';
import {
  getStatusPermissionCheck,
  getTeamUserIds,
  getVisibleRequestFilter,
  getVisibleTaskFilter,
} from '../services/accessService.js';
import { getActivityFilter } from '../services/activityScope.js';
import { badRequest } from '../utils/httpError.js';
import { addDays, localToday, parseDay } from '../utils/dates.js';

const DEADLINE_WINDOW_DAYS = 14;
const RECENT_ACTIVITY_LIMIT = 5;
const FOCUS_WINDOW_DAYS = 2;
const REQUEST_LINES_LIMIT = 6;
const RECENTLY_DECIDED_DAYS = 14;
const TIMELINE_DAYS = 7;
const TIMELINE_TASK_LIMIT = 300;

const requestLineInclude = {
  requester: { select: userSummary },
  reviewer: { select: userSummary },
  decidedBy: { select: userSummary },
  task: { select: { id: true, title: true, status: true, completedAt: true, assignee: { select: userSummary } } },
};

// Whose tasks appear on the dashboard deadline views: your own as an employee,
// your team's (and your own) as a manager, and everyone's as an admin.
async function getDeadlineScope(user) {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'MANAGER') return { assignedTo: { in: [...(await getTeamUserIds(user.id)), user.id] } };
  return { assignedTo: user.id };
}
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
  const deadlineScope = await getDeadlineScope(user);
  const deadlineLimit = new Date(Date.now() + DEADLINE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const today = localToday(req.utcOffset);

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
    approvalQueue,
    focusTasks,
    openRequestLines,
    decidedRequestLines,
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
    // Requests waiting on this manager's decision, longest-waiting first.
    isManager
      ? prisma.request.findMany({
          where: { reviewerId: user.id, status: 'PENDING' },
          include: { requester: { select: userSummary } },
          orderBy: { createdAt: 'asc' },
          take: 10,
        })
      : [],
    // Open work that is late or due within the next two days.
    prisma.task.findMany({
      where: { ...deadlineScope, status: { not: 'COMPLETED' }, dueDate: { not: null, lte: addDays(today, FOCUS_WINDOW_DAYS) } },
      include: { assignee: { select: userSummary } },
      orderBy: { dueDate: 'asc' },
      take: 8,
    }),
    prisma.request.findMany({
      where: { AND: [requestChartScope, { status: 'PENDING' }] },
      include: requestLineInclude,
      orderBy: { createdAt: 'asc' },
      take: REQUEST_LINES_LIMIT,
    }),
    prisma.request.findMany({
      where: { AND: [requestChartScope, { status: { not: 'PENDING' } }, { reviewedAt: { gte: addDays(today, -RECENTLY_DECIDED_DAYS) } }] },
      include: requestLineInclude,
      orderBy: { reviewedAt: 'desc' },
      take: REQUEST_LINES_LIMIT,
    }),
  ]);

  res.json({
    counts: { assignedTasks, inProgressTasks, overdueTasks, pendingRequests, pendingApprovals },
    taskStatusCounts: toStatusCounts(taskGroups, TASK_STATUSES),
    requestStatusCounts: toStatusCounts(requestGroups, REQUEST_STATUSES),
    upcomingDeadlines,
    recentActivity,
    approvalQueue,
    focusTasks,
    // Pending requests first, then the most recently decided ones.
    requestLines: [...openRequestLines, ...decidedRequestLines].slice(0, REQUEST_LINES_LIMIT),
  });
}

// Tasks due in one week, for the dashboard's week line map. Uses the same people as the
// deadline views above, and says which tasks the user may move to another status.
export async function getTimeline(req, res) {
  const start = parseDay(req.query.start);
  if (!start) throw badRequest('Choose a start date as YYYY-MM-DD.');
  const end = addDays(start, TIMELINE_DAYS);
  const today = localToday(req.utcOffset);

  const [scope, canUpdateStatus] = await Promise.all([getDeadlineScope(req.user), getStatusPermissionCheck(req.user)]);
  const select = {
    id: true,
    title: true,
    status: true,
    priority: true,
    dueDate: true,
    completedAt: true,
    assignedTo: true,
    createdBy: true,
    requestId: true,
    assignee: { select: userSummary },
  };

  const [tasks, earlierOverdue] = await Promise.all([
    prisma.task.findMany({
      where: { ...scope, dueDate: { gte: start, lt: end } },
      select,
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      take: TIMELINE_TASK_LIMIT,
    }),
    // Late work from before this week, so it is never hidden by the week view.
    prisma.task.findMany({
      where: { ...scope, status: { not: 'COMPLETED' }, dueDate: { lt: start < today ? start : today } },
      select,
      orderBy: { dueDate: 'asc' },
      take: 50,
    }),
  ]);

  const withPermission = (task) => ({ ...task, canUpdateStatus: canUpdateStatus(task) });
  res.json({
    start: start.toISOString().slice(0, 10),
    days: TIMELINE_DAYS,
    tasks: tasks.map(withPermission),
    earlierOverdue: earlierOverdue.filter((task) => task.dueDate < start).map(withPermission),
  });
}
