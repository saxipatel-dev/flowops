import prisma from '../utils/prisma.js';

// Both helpers accept a transaction client so they can run inside prisma.$transaction.
export function logActivity({ userId, action, entityType, entityId, details }, db = prisma) {
  return db.activityLog.create({
    data: { userId, action, entityType, entityId, details },
  });
}

export function notify({ userId, message, link }, db = prisma) {
  return db.notification.create({ data: { userId, message, link } });
}
