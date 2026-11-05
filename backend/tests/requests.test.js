import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, resetDatabase, loginAs, findUser } from './helpers.js';

beforeAll(resetDatabase);
afterAll(() => prisma.$disconnect());

async function submitRequest(agent, overrides = {}) {
  return agent.post('/api/requests').send({
    title: 'New keyboard',
    description: 'Several keys on my keyboard have stopped working.',
    category: 'EQUIPMENT',
    priority: 'MEDIUM',
    estimatedCost: 60,
    ...overrides,
  });
}

describe('requests', () => {
  it('lets an employee submit a request that goes to their department manager', async () => {
    const daniel = await findUser('daniel@flowops.test');
    const agent = await loginAs('maya@flowops.test');

    const response = await submitRequest(agent);
    expect(response.status).toBe(201);
    expect(response.body.request.status).toBe('PENDING');
    expect(response.body.request.reviewerId).toBe(daniel.id);

    const saved = await prisma.request.findUnique({ where: { id: response.body.request.id } });
    expect(saved.title).toBe('New keyboard');
    expect(Number(saved.estimatedCost)).toBe(60);

    const notification = await prisma.notification.findFirst({
      where: { userId: daniel.id, message: { contains: 'New keyboard' } },
    });
    expect(notification).not.toBeNull();
  });

  it('sends a manager’s own request to a different manager', async () => {
    const priya = await findUser('priya@flowops.test');
    const agent = await loginAs('daniel@flowops.test');
    const response = await submitRequest(agent, { title: 'Desk chair' });
    expect(response.body.request.reviewerId).toBe(priya.id);
  });

  it('rejects a blank title and an invalid amount', async () => {
    const agent = await loginAs('maya@flowops.test');
    const response = await submitRequest(agent, { title: '', estimatedCost: 'abc', category: 'TRAVEL' });
    expect(response.status).toBe(400);
    expect(Object.keys(response.body.fields)).toEqual(expect.arrayContaining(['title', 'estimatedCost', 'category']));

    const negative = await submitRequest(agent, { estimatedCost: -5 });
    expect(negative.status).toBe(400);
  });

  it('shows employees only their own requests', async () => {
    const maya = await findUser('maya@flowops.test');
    const agent = await loginAs('maya@flowops.test');

    const response = await agent.get('/api/requests?scope=team');
    expect(response.body.requests.every((item) => item.requestedBy === maya.id)).toBe(true);

    const otherRequest = await prisma.request.findFirst({ where: { requestedBy: { not: maya.id } } });
    expect((await agent.get(`/api/requests/${otherRequest.id}`)).status).toBe(403);
  });
});

describe('approvals', () => {
  it('does not let an employee use the approval endpoint', async () => {
    const request = await prisma.request.findFirst({ where: { status: 'PENDING' } });
    const agent = await loginAs('maya@flowops.test');
    const response = await agent.post(`/api/requests/${request.id}/decision`).send({ decision: 'approve' });
    expect(response.status).toBe(403);
  });

  it('does not let a manager decide a request assigned to another manager', async () => {
    const priya = await findUser('priya@flowops.test');
    const request = await prisma.request.findFirst({ where: { status: 'PENDING', reviewerId: priya.id } });
    const agent = await loginAs('daniel@flowops.test');
    const response = await agent.post(`/api/requests/${request.id}/decision`).send({ decision: 'approve' });
    expect(response.status).toBe(403);
  });

  it('approves an equipment request, creates one follow-up task, and refuses a second decision', async () => {
    const request = await prisma.request.findFirst({ where: { title: 'Replacement laptop' } });
    const maya = await findUser('maya@flowops.test');
    const manager = await loginAs('daniel@flowops.test');

    const response = await manager
      .post(`/api/requests/${request.id}/decision`)
      .send({ decision: 'approve', reason: 'Approved, order the standard model.', assigneeId: maya.id });

    expect(response.status).toBe(200);
    expect(response.body.request.status).toBe('APPROVED');
    expect(response.body.task.requestId).toBe(request.id);
    expect(response.body.task.assignedTo).toBe(maya.id);

    const second = await manager.post(`/api/requests/${request.id}/decision`).send({ decision: 'reject', reason: 'Changed my mind' });
    expect(second.status).toBe(409);

    expect(await prisma.task.count({ where: { requestId: request.id } })).toBe(1);
    const saved = await prisma.request.findUnique({ where: { id: request.id } });
    expect(saved.status).toBe('APPROVED');
    expect(saved.reviewedAt).not.toBeNull();

    const actions = await prisma.activityLog.findMany({ where: { entityType: 'request', entityId: request.id } });
    expect(actions.filter((entry) => entry.action === 'approved request')).toHaveLength(1);

    const notification = await prisma.notification.findFirst({
      where: { userId: maya.id, message: 'Your request "Replacement laptop" was approved' },
    });
    expect(notification).not.toBeNull();
  });

  it('handles two approvals sent at the same time', async () => {
    const maya = await loginAs('maya@flowops.test');
    const created = await submitRequest(maya, { title: 'Docking station' });
    const manager = await loginAs('daniel@flowops.test');
    const url = `/api/requests/${created.body.request.id}/decision`;

    const results = await Promise.all([
      manager.post(url).send({ decision: 'approve' }),
      manager.post(url).send({ decision: 'approve' }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await prisma.task.count({ where: { requestId: created.body.request.id } })).toBe(1);
  });

  it('requires a reason to reject a request', async () => {
    const request = await prisma.request.findFirst({ where: { title: 'Team supplies for regional sales event' } });
    const manager = await loginAs('daniel@flowops.test');

    const missing = await manager.post(`/api/requests/${request.id}/decision`).send({ decision: 'reject' });
    expect(missing.status).toBe(400);
    expect(missing.body.fields.reason).toBeDefined();

    const response = await manager
      .post(`/api/requests/${request.id}/decision`)
      .send({ decision: 'reject', reason: 'Please use the existing event kit first.' });
    expect(response.status).toBe(200);
    expect(response.body.request.status).toBe('REJECTED');
    expect(response.body.request.reviewComment).toBe('Please use the existing event kit first.');
    expect(response.body.task).toBeNull();
  });

  it('does not create a task when approving an IT support request', async () => {
    const request = await prisma.request.findFirst({ where: { title: 'VPN access for new contractor' } });
    const manager = await loginAs('priya@flowops.test');
    const response = await manager.post(`/api/requests/${request.id}/decision`).send({ decision: 'approve' });
    expect(response.status).toBe(200);
    expect(response.body.task).toBeNull();
  });

  it('lists pending approvals for the reviewing manager', async () => {
    const daniel = await findUser('daniel@flowops.test');
    const manager = await loginAs('daniel@flowops.test');
    const response = await manager.get('/api/requests?scope=review&status=PENDING');
    expect(response.status).toBe(200);
    expect(response.body.requests.every((item) => item.reviewerId === daniel.id && item.status === 'PENDING')).toBe(true);
  });

  it('rejects a follow-up task due date in the past', async () => {
    const maya = await loginAs('maya@flowops.test');
    const created = await submitRequest(maya, { title: 'Headset' });
    const manager = await loginAs('daniel@flowops.test');

    const response = await manager
      .post(`/api/requests/${created.body.request.id}/decision`)
      .send({ decision: 'approve', dueDate: '2020-01-01' });
    expect(response.status).toBe(400);
    expect(await prisma.task.count({ where: { requestId: created.body.request.id } })).toBe(0);
  });

  it('does not send new requests to a department manager who is no longer a manager', async () => {
    const daniel = await findUser('daniel@flowops.test');
    await prisma.user.update({ where: { id: daniel.id }, data: { role: 'EMPLOYEE' } });

    const maya = await loginAs('maya@flowops.test');
    const response = await submitRequest(maya, { title: 'Monitor arm' });
    expect(response.status).toBe(201);
    expect(response.body.request.reviewerId).not.toBe(daniel.id);

    await prisma.user.update({ where: { id: daniel.id }, data: { role: 'MANAGER' } });
  });
});
