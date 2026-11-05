import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, prisma, resetDatabase, loginAs, findUser } from './helpers.js';

beforeAll(resetDatabase);
afterAll(() => prisma.$disconnect());

const ajax = { 'X-Requested-With': 'XMLHttpRequest' };

describe('authentication', () => {
  it('logs in with correct credentials without exposing the password hash', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set(ajax)
      .send({ email: 'maya@flowops.test', password: 'Password123!' });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('maya@flowops.test');
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  });

  it('rejects an incorrect password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set(ajax)
      .send({ email: 'maya@flowops.test', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Incorrect email or password.');
  });

  it('rejects an invalid email format', async () => {
    const response = await request(app).post('/api/auth/login').set(ajax).send({ email: 'maya', password: 'x' });
    expect(response.status).toBe(400);
    expect(response.body.fields.email).toBeDefined();
  });

  it('blocks state-changing requests without the AJAX header', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maya@flowops.test', password: 'Password123!' });
    expect(response.status).toBe(403);
  });

  it('requires a session for protected endpoints', async () => {
    const response = await request(app).get('/api/tasks');
    expect(response.status).toBe(401);
  });

  it('ends the session on logout', async () => {
    const agent = await loginAs('maya@flowops.test');
    expect((await agent.get('/api/auth/me')).status).toBe(200);

    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('lets a user update their profile and change their password', async () => {
    const agent = await loginAs('alex@flowops.test');

    const profile = await agent.patch('/api/auth/me').send({ name: 'Alex Morgan', jobTitle: 'Senior Sales Associate' });
    expect(profile.status).toBe(200);
    expect(profile.body.user.jobTitle).toBe('Senior Sales Associate');

    const wrong = await agent.post('/api/auth/change-password').send({ currentPassword: 'nope', newPassword: 'NewPassword1!' });
    expect(wrong.status).toBe(400);

    const changed = await agent
      .post('/api/auth/change-password')
      .send({ currentPassword: 'Password123!', newPassword: 'NewPassword1!' });
    expect(changed.status).toBe(200);
    await expect(loginAs('alex@flowops.test', 'NewPassword1!')).resolves.toBeDefined();
  });
});

describe('user management', () => {
  it('blocks employees and managers from the user list', async () => {
    const employee = await loginAs('maya@flowops.test');
    const manager = await loginAs('daniel@flowops.test');
    expect((await employee.get('/api/users')).status).toBe(403);
    expect((await manager.get('/api/users')).status).toBe(403);
  });

  it('lets an admin create a user and assign a role', async () => {
    const admin = await loginAs('admin@flowops.test');
    const response = await admin.post('/api/users').send({
      name: 'Nina Patel',
      email: 'nina@flowops.test',
      password: 'Welcome123!',
      role: 'MANAGER',
      departmentId: 1,
    });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('MANAGER');
    expect(response.body.user.passwordHash).toBeUndefined();

    const duplicate = await admin
      .post('/api/users')
      .send({ name: 'Nina Again', email: 'nina@flowops.test', password: 'Welcome123!', role: 'EMPLOYEE' });
    expect(duplicate.status).toBe(409);
  });

  it('prevents deactivated users from logging in or using an existing session', async () => {
    const elenaSession = await loginAs('elena@flowops.test');
    const admin = await loginAs('admin@flowops.test');
    const elena = await findUser('elena@flowops.test');

    const response = await admin.patch(`/api/users/${elena.id}`).send({
      name: elena.name,
      email: elena.email,
      role: elena.role,
      departmentId: elena.departmentId,
      isActive: false,
    });
    expect(response.status).toBe(200);

    expect((await elenaSession.get('/api/tasks')).status).toBe(401);
    const login = await request(app)
      .post('/api/auth/login')
      .set(ajax)
      .send({ email: 'elena@flowops.test', password: 'Password123!' });
    expect(login.status).toBe(403);
  });

  it('stops an admin from deactivating their own account', async () => {
    const admin = await loginAs('admin@flowops.test');
    const self = await findUser('admin@flowops.test');
    const response = await admin
      .patch(`/api/users/${self.id}`)
      .send({ name: self.name, email: self.email, role: 'ADMIN', isActive: false });
    expect(response.status).toBe(400);
  });
});
