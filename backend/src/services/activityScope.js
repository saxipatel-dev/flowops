import prisma from '../utils/prisma.js';
import { getTeamUserIds } from './accessService.js';

// Admins see everything, managers see their team's actions, and employees see
// their own actions plus anything that happened to their tasks and requests.
export async function getActivityFilter(user) {
  if (user.role === 'ADMIN') return {};

  if (user.role === 'MANAGER') {
    const teamIds = await getTeamUserIds(user.id);
    return { userId: { in: [...teamIds, user.id] } };
  }

  const [tasks, requests] = await Promise.all([
    prisma.task.findMany({ where: { assignedTo: user.id }, select: { id: true } }),
    prisma.request.findMany({ where: { requestedBy: user.id }, select: { id: true } }),
  ]);
  return {
    OR: [
      { userId: user.id },
      { entityType: 'task', entityId: { in: tasks.map((task) => task.id) } },
      { entityType: 'request', entityId: { in: requests.map((request) => request.id) } },
    ],
  };
}
