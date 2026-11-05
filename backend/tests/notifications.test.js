import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, resetDatabase, loginAs, findUser } from './helpers.js';

beforeAll(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('notifications', () => {
  it('lists the current user’s notifications with an unread count', async () => {
    const agent = await loginAs('daniel@flowops.test');
    const response = await agent.get('/api/notifications');
    expect(response.status).toBe(200);
    expect(response.body.unreadCount).toBeGreaterThan(0);
  });

  it('marks one notification and then all notifications as read', async () => {
    const daniel = await findUser('daniel@flowops.test');
    const agent = await loginAs('daniel@flowops.test');
    const unread = await prisma.notification.findFirst({ where: { userId: daniel.id, isRead: false } });

    expect((await agent.patch(`/api/notifications/${unread.id}/read`)).status).toBe(200);
    expect((await prisma.notification.findUnique({ where: { id: unread.id } })).isRead).toBe(true);

    await agent.patch('/api/notifications/read-all');
    expect(await prisma.notification.count({ where: { userId: daniel.id, isRead: false } })).toBe(0);
  });

  it('does not let users mark someone else’s notification', async () => {
    const maya = await findUser('maya@flowops.test');
    const notification = await prisma.notification.findFirst({ where: { userId: maya.id } });
    const agent = await loginAs('alex@flowops.test');
    expect((await agent.patch(`/api/notifications/${notification.id}/read`)).status).toBe(404);
  });
});

describe('activity and dashboard', () => {
  it('shows admins all activity and employees only related activity', async () => {
    const admin = await loginAs('admin@flowops.test');
    const all = await admin.get('/api/activity');
    expect(all.body.total).toBe(await prisma.activityLog.count());

    const jordan = await findUser('jordan@flowops.test');
    const employee = await loginAs('jordan@flowops.test');
    const own = await employee.get('/api/activity?entityType=request');
    const jordanRequestIds = (await prisma.request.findMany({ where: { requestedBy: jordan.id } })).map((r) => r.id);
    expect(own.body.activity.every((entry) => jordanRequestIds.includes(entry.entityId))).toBe(true);
  });

  it('returns dashboard counts that match the database', async () => {
    const maya = await findUser('maya@flowops.test');
    const agent = await loginAs('maya@flowops.test');
    const response = await agent.get('/api/dashboard/summary');

    expect(response.body.counts.assignedTasks).toBe(
      await prisma.task.count({ where: { assignedTo: maya.id, status: { not: 'COMPLETED' } } }),
    );
    expect(response.body.counts.pendingRequests).toBe(
      await prisma.request.count({ where: { requestedBy: maya.id, status: 'PENDING' } }),
    );
    expect(response.body.counts.pendingApprovals).toBeNull();

    const daniel = await findUser('daniel@flowops.test');
    const manager = await loginAs('daniel@flowops.test');
    const managerSummary = await manager.get('/api/dashboard/summary');
    expect(managerSummary.body.counts.pendingApprovals).toBe(
      await prisma.request.count({ where: { reviewerId: daniel.id, status: 'PENDING' } }),
    );
  });
});
