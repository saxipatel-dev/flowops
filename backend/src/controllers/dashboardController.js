import prisma from '../utils/prisma.js';
import { userSummary } from '../utils/selects.js';
import { getTeamUserIds } from '../services/accessService.js';
import { getActivityFilter } from '../services/activityScope.js';

const DEADLINE_WINDOW_DAYS = 14;

export async function getSummary(req, res) {
  const user = req.user;
  const isManager = user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  // Managers and admins see deadlines for their whole team; employees see their own.
  let deadlineScope = { assignedTo: user.id };
  if (isAdmin) deadlineScope = {};
  if (isManager) deadlineScope = { assignedTo: { in: [...(await getTeamUserIds(user.id)), user.id] } };

  const deadlineLimit = new Date(Date.now() + DEADLINE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [assignedTasks, inProgressTasks, pendingRequests, pendingApprovals, upcomingDeadlines, recentActivity] =
    await Promise.all([
      prisma.task.count({ where: { assignedTo: user.id, status: { not: 'COMPLETED' } } }),
      prisma.task.count({ where: { assignedTo: user.id, status: 'IN_PROGRESS' } }),
      prisma.request.count({ where: { requestedBy: user.id, status: 'PENDING' } }),
      isManager ? prisma.request.count({ where: { reviewerId: user.id, status: 'PENDING' } }) : null,
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
        take: 8,
      }),
    ]);

  res.json({
    counts: { assignedTasks, inProgressTasks, pendingRequests, pendingApprovals },
    upcomingDeadlines,
    recentActivity,
  });
}
