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

  describe('completion time', () => {
    async function mayaTodoTask() {
      const maya = await findUser('maya@flowops.test');
      return prisma.task.findFirst({ where: { assignedTo: maya.id, status: 'TODO' } });
    }

    it('sets completedAt when a task is completed and clears it when reopened', async () => {
      const task = await mayaTodoTask();
      expect(task.completedAt).toBeNull();
      const agent = await loginAs('maya@flowops.test');

      const before = Date.now();
      const done = await agent.patch(`/api/tasks/${task.id}`).send({ status: 'COMPLETED' });
      expect(done.status).toBe(200);
      const completedAt = new Date(done.body.task.completedAt).getTime();
      expect(completedAt).toBeGreaterThanOrEqual(before);
      expect(completedAt).toBeLessThanOrEqual(Date.now());

      const reopened = await agent.patch(`/api/tasks/${task.id}`).send({ status: 'IN_PROGRESS' });
      expect(reopened.status).toBe(200);
      expect(reopened.body.task.completedAt).toBeNull();
      expect((await prisma.task.findUnique({ where: { id: task.id } })).completedAt).toBeNull();
    });

    it('records a new time when a reopened task is completed again', async () => {
      const task = await prisma.task.findFirst({ where: { title: 'Update onboarding guide' } });
      const agent = await loginAs('daniel@flowops.test');

      const first = await agent.patch(`/api/tasks/${task.id}`).send({ status: 'COMPLETED' });
      await agent.patch(`/api/tasks/${task.id}`).send({ status: 'TODO' });
      const second = await agent.patch(`/api/tasks/${task.id}`).send({ status: 'COMPLETED' });

      expect(second.status).toBe(200);
      expect(new Date(second.body.task.completedAt).getTime()).toBeGreaterThan(
        new Date(first.body.task.completedAt).getTime(),
      );
    });

    it('keeps completedAt when a completed task is saved without a status change', async () => {
      const task = await prisma.task.findFirst({ where: { title: 'Update onboarding guide' } });
      const agent = await loginAs('daniel@flowops.test');
      await agent.patch(`/api/tasks/${task.id}`).send({ status: 'COMPLETED' });
      const stored = (await prisma.task.findUnique({ where: { id: task.id } })).completedAt;
      expect(stored).not.toBeNull();

      await agent.patch(`/api/tasks/${task.id}`).send({ status: 'COMPLETED' });
      await agent.patch(`/api/tasks/${task.id}`).send({ title: 'Update onboarding guide (v2)' });

      const after = await prisma.task.findUnique({ where: { id: task.id } });
      expect(after.completedAt.getTime()).toBe(stored.getTime());
    });

    it('sets completedAt on a task created as completed', async () => {
      const maya = await findUser('maya@flowops.test');
      const agent = await loginAs('daniel@flowops.test');
      const response = await agent
        .post('/api/tasks')
        .send({ title: 'Already finished task', assignedTo: maya.id, status: 'COMPLETED', priority: 'LOW' });
      expect(response.status).toBe(201);
      expect(response.body.task.completedAt).not.toBeNull();
    });

    it('leaves completedAt empty for tasks completed before the column existed', async () => {
      // The migration leaves existing completed rows with no completion time.
      const [maya, daniel] = await Promise.all([findUser('maya@flowops.test'), findUser('daniel@flowops.test')]);
      const legacy = await prisma.task.create({
        data: { title: 'Completed before tracking', status: 'COMPLETED', assignedTo: maya.id, createdBy: daniel.id },
      });
      expect(legacy.completedAt).toBeNull();

      const agent = await loginAs('daniel@flowops.test');
      expect((await agent.get(`/api/tasks/${legacy.id}`)).body.task.completedAt).toBeNull();

      await agent.patch(`/api/tasks/${legacy.id}`).send({ title: 'Completed before tracking (renamed)' });
      expect((await prisma.task.findUnique({ where: { id: legacy.id } })).completedAt).toBeNull();
    });

    it('includes the follow-up task completion time on the request', async () => {
      const task = await prisma.task.findFirst({ where: { title: 'Fulfil request: Office supplies restock' } });
      expect(task.completedAt).not.toBeNull();

      const requester = await loginAs('maya@flowops.test');
      const response = await requester.get(`/api/requests/${task.requestId}`);
      expect(response.status).toBe(200);
      expect(new Date(response.body.request.task.completedAt).getTime()).toBe(task.completedAt.getTime());
    });
  });
});
