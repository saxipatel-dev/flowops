import 'dotenv/config';
import { createApp } from './app.js';
import prisma from './utils/prisma.js';

const port = process.env.PORT || 4000;

async function start() {
  await prisma.$connect();
  const app = createApp();
  app.listen(port, () => {
    console.log(`FlowOps API running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
