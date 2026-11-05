import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { HttpError, badRequest } from '../utils/httpError.js';
import { userDetails } from '../utils/selects.js';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  jobTitle: z.string().trim().max(80).optional().default(''),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100),
});

export async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    throw new HttpError(401, 'Incorrect email or password.');
  }
  if (!user.isActive) {
    throw new HttpError(403, 'This account has been deactivated. Contact an administrator.');
  }

  // A new session ID on login prevents session fixation.
  await new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
  req.session.userId = user.id;

  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: userDetails });
  res.json({ user: profile });
}

export function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('flowops.sid');
    res.json({ message: 'Logged out.' });
  });
}

export function getCurrentUser(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  const data = profileSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name: data.name, jobTitle: data.jobTitle || null },
    select: userDetails,
  });
  res.json({ user });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = passwordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    throw badRequest('Current password is incorrect.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ message: 'Password updated.' });
}
