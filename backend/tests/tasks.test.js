import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, resetDatabase, loginAs, findUser } from './helpers.js';

beforeAll(resetDatabase);
afterAll(() => prisma.$disconnect());

const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe('tasks', () => {
  it('shows employees only their own tasks', async () => {
    const maya = await findUser('maya@flowops.test');
    const agent = await loginAs('maya@flowops.test');
    const response = await agent.get('/api/tasks?scope=mine');

    expect(response.status).toBe(200);
    expect(response.body.tasks.length).toBeGreaterThan(0);
    expect(response.body.tasks.every((task) => task.assignedTo === maya.id)).toBe(true);
  });

  it('filters tasks by status and search text', async () => {
    const agent = await loginAs('daniel@flowops.test');
    const byStatus = await agent.get('/api/tasks?scope=all&status=IN_PROGRESS');
    expect(byStatus.body.tasks.every((task) => task.status === 'IN_PROGRESS')).toBe(true);

    const bySearch = await agent.get('/api/tasks?scope=all&search=onboarding');
    expect(bySearch.body.tasks).toHaveLength(1);
    expect(bySearch.body.tasks[0].title).toBe('Update onboarding guide');
  });

  it('does not allow employees to create tasks', async () => {
    const agent = await loginAs('maya@flowops.test');
    const response = await agent.post('/api/tasks').send({ title: 'Sneaky task', assignedTo: 4 });
    expect(response.status).toBe(403);
  });

  it('lets a manager create and assign a task to a team member', async () => {
    const maya = await findUser('maya@flowops.test');
    const manager = await loginAs('daniel@flowops.test');

    const response = await manager.post('/api/tasks').send({
      title: 'Order new visitor badges',
      description: 'We are running low on visitor badges at reception.',
      priority: 'HIGH',
      assignedTo: maya.id,
      dueDate: nextWeek,
    });

    expect(response.status).toBe(201);
    expect(response.body.task.assignee.name).toBe('Maya Chen');

    const notification = await prisma.notification.findFirst({
      where: { userId: maya.id, message: { contains: 'Order new visitor badges' } },
    });
    expect(notification).not.toBeNull();

    const activity = await prisma.activityLog.findMany({
      where: { entityType: 'task', entityId: response.body.task.id },
    });
    expect(activity.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['created task', 'assigned task']),
    );
  });

  it('rejects invalid task input', async () => {
    const manager = await loginAs('daniel@flowops.test');
    const response = await manager.post('/api/tasks').send({ title: 'ab', priority: 'URGENT', assignedTo: 4 });
    expect(response.status).toBe(400);
    expect(response.body.fields.title).toBeDefined();
    expect(response.body.fields.priority).toBeDefined();

    const pastDate = await manager.post('/api/tasks').send({ title: 'Old task', assignedTo: 4, dueDate: '2020-01-01' });
    expect(pastDate.status).toBe(400);
  });

  it('stops a manager from assigning tasks outside their team', async () => {
    const jordan = await findUser('jordan@flowops.test');
    const manager = await loginAs('daniel@flowops.test');
    const response = await manager.post('/api/tasks').send({ title: 'Fix the printer', assignedTo: jordan.id });
    expect(response.status).toBe(403);
  });

  it('lets the assignee update status and saves it', async () => {
    const maya = await findUser('maya@flowops.test');
    const task = await prisma.task.findFirst({ where: { assignedTo: maya.id, status: 'TODO' } });
    const agent = await loginAs('maya@flowops.test');

    const response = await agent.patch(`/api/tasks/${task.id}`).send({ status: 'IN_PROGRESS' });
    expect(response.status).toBe(200);

    const saved = await prisma.task.findUnique({ where: { id: task.id } });
    expect(saved.status).toBe('IN_PROGRESS');

    const log = await prisma.activityLog.findFirst({
      where: { entityType: 'task', entityId: task.id, action: 'changed task status' },
      orderBy: { id: 'desc' },
    });
    expect(log.details).toContain('To Do → In Progress');
  });

  it('rejects an invalid status value', async () => {
    const maya = await findUser('maya@flowops.test');
    const task = await prisma.task.findFirst({ where: { assignedTo: maya.id } });
    const agent = await loginAs('maya@flowops.test');
    const response = await agent.patch(`/api/tasks/${task.id}`).send({ status: 'DONE_ISH' });
    expect(response.status).toBe(400);
  });

  it('rejects changing a task due date to the past', async () => {
    const maya = await findUser('maya@flowops.test');
    const task = await prisma.task.findFirst({ where: { assignedTo: maya.id } });
    const manager = await loginAs('daniel@flowops.test');
    const response = await manager.patch(`/api/tasks/${task.id}`).send({ dueDate: '2020-01-01' });
    expect(response.status).toBe(400);
  });

  it('lets an assignee change only the status', async () => {
    const maya = await findUser('maya@flowops.test');
    const task = await prisma.task.findFirst({ where: { assignedTo: maya.id } });
    const agent = await loginAs('maya@flowops.test');
    const response = await agent.patch(`/api/tasks/${task.id}`).send({ title: 'Renamed by employee' });
    expect(response.status).toBe(403);
  });

  it('blocks other employees from viewing or editing a task', async () => {
    const maya = await findUser('maya@flowops.test');
    const task = await prisma.task.findFirst({ where: { assignedTo: maya.id } });
    const agent = await loginAs('jordan@flowops.test');

    expect((await agent.get(`/api/tasks/${task.id}`)).status).toBe(403);
    expect((await agent.patch(`/api/tasks/${task.id}`).send({ status: 'COMPLETED' })).status).toBe(403);
  });

  it('returns 404 for a task that does not exist', async () => {
    const agent = await loginAs('admin@flowops.test');
    expect((await agent.get('/api/tasks/99999')).status).toBe(404);
    expect((await agent.get('/api/tasks/abc')).status).toBe(404);
  });

  it('adds comments to a task and notifies the other people involved', async () => {
    const maya = await findUser('maya@flowops.test');
    const task = await prisma.task.findFirst({ where: { title: 'Update onboarding guide' } });
    const manager = await loginAs('daniel@flowops.test');

    const response = await manager.post('/api/comments').send({ taskId: task.id, content: 'Looks good so far.' });
    expect(response.status).toBe(201);

    const empty = await manager.post('/api/comments').send({ taskId: task.id, content: '   ' });
    expect(empty.status).toBe(400);

    const notification = await prisma.notification.findFirst({
      where: { userId: maya.id, message: { contains: 'commented on "Update onboarding guide"' } },
    });
    expect(notification).not.toBeNull();
  });

  it('only lets the creator or an admin delete a task', async () => {
    const task = await prisma.task.findFirst({ where: { title: 'Set up laptops for new hires' } });
    const otherManager = await loginAs('daniel@flowops.test');
    expect((await otherManager.delete(`/api/tasks/${task.id}`)).status).toBe(403);

    const creator = await loginAs('priya@flowops.test');
    expect((await creator.delete(`/api/tasks/${task.id}`)).status).toBe(200);
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
  });
});
