import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, resetDatabase, loginAs, findUser } from './helpers.js';
import { getTeamUserIds } from '../src/services/accessService.js';

beforeAll(resetDatabase);
afterAll(() => prisma.$disconnect());

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
const utcDay = (key) => new Date(`${key}T00:00:00.000Z`);

// A week that starts three days before a due date of one of these people's tasks.
async function weekAroundTaskOf(userIds) {
  const task = await prisma.task.findFirst({ where: { assignedTo: { in: userIds }, dueDate: { not: null } }, orderBy: { dueDate: 'asc' } });
  return new Date(task.dueDate.getTime() - 3 * DAY).toISOString().slice(0, 10);
}

describe('dashboard timeline', () => {
  it('shows employees only their own tasks for the requested week', async () => {
    const maya = await findUser('maya@flowops.test');
    const start = await weekAroundTaskOf([maya.id]);
    const response = await (await loginAs('maya@flowops.test')).get(`/api/dashboard/timeline?start=${start}`);

    expect(response.status).toBe(200);
    expect(response.body.start).toBe(start);
    const expected = await prisma.task.count({
      where: { assignedTo: maya.id, dueDate: { gte: utcDay(start), lt: new Date(utcDay(start).getTime() + 7 * DAY) } },
    });
    expect(expected).toBeGreaterThan(0);
    expect(response.body.tasks).toHaveLength(expected);
    expect(response.body.tasks.every((task) => task.assignedTo === maya.id && task.canUpdateStatus)).toBe(true);
  });

  it('shows managers their team, admins everyone, and never another team to a manager', async () => {
    const priya = await findUser('priya@flowops.test');
    const team = [...(await getTeamUserIds(priya.id)), priya.id];
    const start = await weekAroundTaskOf(team);
    const range = { gte: utcDay(start), lt: new Date(utcDay(start).getTime() + 7 * DAY) };

    const manager = await (await loginAs('priya@flowops.test')).get(`/api/dashboard/timeline?start=${start}`);
    expect(manager.body.tasks.length).toBeGreaterThan(0);
    expect(manager.body.tasks).toHaveLength(await prisma.task.count({ where: { assignedTo: { in: team }, dueDate: range } }));
    expect(manager.body.tasks.every((task) => team.includes(task.assignedTo))).toBe(true);

    const admin = await (await loginAs('admin@flowops.test')).get(`/api/dashboard/timeline?start=${start}`);
    expect(admin.body.tasks).toHaveLength(await prisma.task.count({ where: { dueDate: range } }));
  });

  it('marks movable tasks the same way the task detail endpoint does', async () => {
    const priya = await findUser('priya@flowops.test');
    const start = await weekAroundTaskOf([...(await getTeamUserIds(priya.id)), priya.id]);
    const agent = await loginAs('priya@flowops.test');
    const { body } = await agent.get(`/api/dashboard/timeline?start=${start}`);
    const all = [...body.tasks, ...body.earlierOverdue];
    expect(all.length).toBeGreaterThan(0);
    for (const task of all) {
      const detail = await agent.get(`/api/tasks/${task.id}`);
      expect(task.canUpdateStatus).toBe(detail.body.permissions.canUpdateStatus);
    }
  });

  it('lists open late work from before the week separately', async () => {
    const start = dayKey(30);
    const { body } = await (await loginAs('admin@flowops.test')).get(`/api/dashboard/timeline?start=${start}`);
    const today = utcDay(dayKey(0));
    expect(body.earlierOverdue.length).toBe(await prisma.task.count({ where: { status: { not: 'COMPLETED' }, dueDate: { lt: today } } }));
    expect(body.earlierOverdue.every((task) => task.status !== 'COMPLETED' && new Date(task.dueDate) < today)).toBe(true);
  });

  it('rejects a missing or invalid start date', async () => {
    const agent = await loginAs('maya@flowops.test');
    expect((await agent.get('/api/dashboard/timeline')).status).toBe(400);
    expect((await agent.get('/api/dashboard/timeline?start=2026-02-30')).status).toBe(400);
  });
});

describe('dashboard summary additions', () => {
  it('gives managers their approval queue, oldest first, and employees none', async () => {
    const daniel = await findUser('daniel@flowops.test');
    const manager = await (await loginAs('daniel@flowops.test')).get('/api/dashboard/summary');
    const queue = manager.body.approvalQueue;
    expect(queue).toHaveLength(Math.min(10, await prisma.request.count({ where: { reviewerId: daniel.id, status: 'PENDING' } })));
    expect(queue.every((request) => request.reviewerId === daniel.id && request.status === 'PENDING')).toBe(true);
    const times = queue.map((request) => new Date(request.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));

    const employee = await (await loginAs('maya@flowops.test')).get('/api/dashboard/summary');
    expect(employee.body.approvalQueue).toEqual([]);
  });

  it('lists focus tasks that are open and due within two days', async () => {
    const maya = await findUser('maya@flowops.test');
    const { body } = await (await loginAs('maya@flowops.test')).get('/api/dashboard/summary');
    const limit = new Date(utcDay(dayKey(0)).getTime() + 2 * DAY);
    expect(body.focusTasks.every((task) => task.assignedTo === maya.id && task.status !== 'COMPLETED' && new Date(task.dueDate) <= limit)).toBe(true);
    expect(body.focusTasks.length).toBe(
      Math.min(8, await prisma.task.count({ where: { assignedTo: maya.id, status: { not: 'COMPLETED' }, dueDate: { not: null, lte: limit } } })),
    );
  });

  it('shows request lines only for requests the user can see', async () => {
    const maya = await findUser('maya@flowops.test');
    const employee = await (await loginAs('maya@flowops.test')).get('/api/dashboard/summary');
    expect(employee.body.requestLines.length).toBeGreaterThan(0);
    expect(employee.body.requestLines.every((request) => request.requestedBy === maya.id)).toBe(true);

    const priya = await findUser('priya@flowops.test');
    const team = [...(await getTeamUserIds(priya.id)), priya.id];
    const manager = await (await loginAs('priya@flowops.test')).get('/api/dashboard/summary');
    expect(manager.body.requestLines.every((request) => team.includes(request.requestedBy) || request.reviewerId === priya.id)).toBe(true);
    // Pending requests come before decided ones.
    const statuses = manager.body.requestLines.map((request) => request.status);
    expect(statuses.slice(0, statuses.lastIndexOf('PENDING') + 1).every((status) => status === 'PENDING')).toBe(true);
  });
});

describe('local calendar day', () => {
  it("counts overdue work against the user's own today", async () => {
    const maya = await findUser('maya@flowops.test');
    const agent = await loginAs('maya@flowops.test');
    for (const offset of [-720, 0, 840]) {
      const localToday = new Date(new Date(Date.now() + offset * 60 * 1000).toISOString().slice(0, 10));
      const { body } = await agent.get('/api/dashboard/summary').set('X-UTC-Offset', String(offset));
      expect(body.counts.overdueTasks).toBe(
        await prisma.task.count({ where: { assignedTo: maya.id, status: { not: 'COMPLETED' }, dueDate: { lt: localToday } } }),
      );
    }
  });

  it('treats a missing or nonsense offset as UTC', async () => {
    const agent = await loginAs('maya@flowops.test');
    const utc = await agent.get('/api/dashboard/summary');
    const nonsense = await agent.get('/api/dashboard/summary').set('X-UTC-Offset', 'abc');
    expect(nonsense.status).toBe(200);
    expect(nonsense.body.counts).toEqual(utc.body.counts);
  });
});

describe('activity summary', () => {
  it('counts every visible event per day and includes empty days', async () => {
    const admin = await loginAs('admin@flowops.test');
    const { body } = await admin.get('/api/activity/summary?days=180&utcOffset=0');
    expect(body.days).toHaveLength(180);
    expect(body.days.at(-1).date).toBe(dayKey(0));
    expect(body.days.some((day) => day.count === 0)).toBe(true);
    expect(body.total).toBe(body.days.reduce((sum, day) => sum + day.count, 0));
    expect(body.total).toBe(await prisma.activityLog.count());
  });

  it('follows the same visibility as the activity list', async () => {
    const agent = await loginAs('jordan@flowops.test');
    const summary = await agent.get('/api/activity/summary?days=180');
    const list = await agent.get('/api/activity');
    expect(summary.body.total).toBe(list.body.total);
  });

  it('defaults to 91 days and keeps the range within limits', async () => {
    const agent = await loginAs('maya@flowops.test');
    expect((await agent.get('/api/activity/summary')).body.days).toHaveLength(91);
    expect((await agent.get('/api/activity/summary?days=5000')).body.days).toHaveLength(180);
    expect((await agent.get('/api/activity/summary?days=1')).body.days).toHaveLength(7);
  });

  it('filters the activity list to one day in the browser time zone', async () => {
    const agent = await loginAs('admin@flowops.test');
    const { body } = await agent.get('/api/activity/summary?days=90&utcOffset=-300');
    const busy = body.days.find((day) => day.count > 0);
    const list = await agent.get(`/api/activity?date=${busy.date}&utcOffset=-300`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(busy.count);
    expect((await agent.get('/api/activity?date=not-a-date')).status).toBe(400);
  });

  it('requires a signed-in user', async () => {
    const { default: request } = await import('supertest');
    const { app } = await import('./helpers.js');
    expect((await request(app).get('/api/activity/summary')).status).toBe(401);
  });
});
