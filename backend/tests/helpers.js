import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { seedDatabase, DEMO_PASSWORD } from '../prisma/seed.js';

export const prisma = new PrismaClient();
export const app = createApp();

export async function resetDatabase() {
  await seedDatabase(prisma);
}

// Returns a supertest agent that keeps the session cookie and sends the CSRF header.
export async function loginAs(email, password = DEMO_PASSWORD) {
  const agent = request.agent(app);
  agent.set('X-Requested-With', 'XMLHttpRequest');
  const response = await agent.post('/api/auth/login').send({ email, password });
  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${response.status}`);
  }
  return agent;
}

export function findUser(email) {
  return prisma.user.findUnique({ where: { email } });
}
