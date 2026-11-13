import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { prisma, resetDatabase, loginAs, findUser } from './helpers.js';

beforeAll(resetDatabase);
afterEach(() => {
  delete process.env.DEMO_MODE;
});
afterAll(() => prisma.$disconnect());

describe('public demo mode', () => {
  it('blocks changes that could lock visitors out of the shared demo accounts', async () => {
    process.env.DEMO_MODE = 'true';
    const maya = await loginAs('maya@flowops.test');
    const admin = await loginAs('admin@flowops.test');
    const daniel = await findUser('daniel@flowops.test');

    const password = await maya.post('/api/auth/change-password').send({ currentPassword: 'Password123!', newPassword: 'NewPassword1!' });
    const profile = await maya.patch('/api/auth/me').send({ name: 'Someone Else' });
    const deactivate = await admin.patch(`/api/users/${daniel.id}`).send({ isActive: false });
    const create = await admin.post('/api/users').send({ name: 'New Person', email: 'new@flowops.test', password: 'Password123!', role: 'EMPLOYEE' });

    for (const response of [password, profile, deactivate, create]) {
      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/turned off in the public demo/);
    }
    expect((await findUser('daniel@flowops.test')).isActive).toBe(true);
  });

  it('still allows normal work like reading tasks', async () => {
    process.env.DEMO_MODE = 'true';
    const maya = await loginAs('maya@flowops.test');
    const tasks = await maya.get('/api/tasks');
    expect(tasks.status).toBe(200);
  });

  it('leaves account changes on outside the demo', async () => {
    const maya = await loginAs('maya@flowops.test');
    const profile = await maya.patch('/api/auth/me').send({ name: 'Maya Chen' });
    expect(profile.status).not.toBe(403);
  });
});
