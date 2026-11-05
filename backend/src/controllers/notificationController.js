import prisma from '../utils/prisma.js';
import { notFound } from '../utils/httpError.js';
import { parseId } from '../utils/parseId.js';

export async function listNotifications(req, res) {
  const where = { userId: req.user.id };
  if (req.query.unread === 'true') where.isRead = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);
  res.json({ notifications, unreadCount });
}

export async function markAsRead(req, res) {
  const id = parseId(req.params.id);
  const { count } = await prisma.notification.updateMany({
    where: { id, userId: req.user.id },
    data: { isRead: true },
  });
  if (count === 0) throw notFound('Notification not found.');
  res.json({ message: 'Notification marked as read.' });
}

export async function markAllAsRead(req, res) {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: 'All notifications marked as read.' });
}
