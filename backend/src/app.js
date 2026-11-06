import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import prisma from './utils/prisma.js';
import { requireAjaxHeader } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { readUtcOffset } from './middleware/timezone.js';

const PgSession = connectPgSimple(session);

export function createApp() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set. Copy .env.example to .env first.');
  }

  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(
    session({
      name: 'flowops.sid',
      store: new PgSession({ conString: process.env.DATABASE_URL, tableName: 'session' }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 8 * 60 * 60 * 1000,
      },
    }),
  );
  app.use('/api', requireAjaxHeader);
  app.use('/api', readUtcOffset);

  app.get('/api/health', async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
