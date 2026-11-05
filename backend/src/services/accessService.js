import prisma from '../utils/prisma.js';

// A manager's team is everyone in the departments they manage.
export async function getTeamUserIds(managerId) {
  const members = await prisma.user.findMany({
    where: { department: { managerId } },
    select: { id: true },
  });
  return members.map((member) => member.id);
}

export async function isInTeam(managerId, userId) {
  const count = await prisma.user.count({
    where: { id: userId, department: { managerId } },
  });
  return count > 0;
}

export async function canViewTask(user, task) {
  if (user.role === 'ADMIN') return true;
  if (task.assignedTo === user.id || task.createdBy === user.id) return true;
  if (user.role === 'MANAGER') return isInTeam(user.id, task.assignedTo);
  return false;
}

// Managers can edit tasks they created or that belong to their team. Admins can edit any task.
export async function canManageTask(user, task) {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'MANAGER') return false;
  if (task.createdBy === user.id) return true;
  return isInTeam(user.id, task.assignedTo);
}

export async function canViewRequest(user, request) {
  if (user.role === 'ADMIN') return true;
  if (request.requestedBy === user.id || request.reviewerId === user.id) return true;
  if (user.role === 'MANAGER' && (await isInTeam(user.id, request.requestedBy))) return true;

  // The person fulfilling the follow-up task needs to see the original request.
  const followUpTask = await prisma.task.count({ where: { requestId: request.id, assignedTo: user.id } });
  return followUpTask > 0;
}

// Managers may assign work to themselves or their team. Admins may assign to anyone active.
export async function canAssignTo(user, assigneeId) {
  const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!assignee || !assignee.isActive) return false;
  if (user.role === 'ADMIN' || assigneeId === user.id) return true;
  return user.role === 'MANAGER' && isInTeam(user.id, assigneeId);
}
