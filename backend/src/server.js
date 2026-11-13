import 'dotenv/config';
import { createApp } from './app.js';
import prisma from './utils/prisma.js';
import { isDemoMode } from './middleware/demo.js';
import { seedDatabase } from '../prisma/seed.js';

const port = process.env.PORT || 4000;

async function start() {
  await prisma.$connect();
  // The free host sleeps the demo when nobody is using it, so every wake-up starts
  // from fresh demo data with due dates relative to today.
  if (isDemoMode()) {
    await seedDatabase(prisma);
    console.log('Demo data reset.');
  }
  const app = createApp();
  app.listen(port, () => {
    console.log(`FlowOps API running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
