import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { login, logout, getCurrentUser, updateProfile, changePassword } from '../controllers/authController.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' },
});

// Limits guessing of the current password from a signed-in session.
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many password change attempts. Please wait a few minutes and try again.' },
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getCurrentUser);
router.patch('/me', requireAuth, updateProfile);
router.post('/change-password', requireAuth, passwordLimiter, changePassword);

export default router;
