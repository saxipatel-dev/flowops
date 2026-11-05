import prisma from '../utils/prisma.js';
import { HttpError, forbidden } from '../utils/httpError.js';
import { userDetails } from '../utils/selects.js';

// Loads the logged-in user on every request so deactivated users lose access immediately.
export async function requireAuth(req, res, next) {
  const userId = req.session.userId;
  if (!userId) {
    throw new HttpError(401, 'Please log in to continue.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: userDetails });
  if (!user || !user.isActive) {
    req.session.destroy(() => {});
    throw new HttpError(401, 'Your session has ended. Please log in again.');
  }

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw forbidden();
    }
    next();
  };
}
