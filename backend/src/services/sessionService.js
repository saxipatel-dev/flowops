import prisma from '../utils/prisma.js';

// Removes a user's stored sessions (connect-pg-simple keeps them in the "session" table),
// optionally keeping one, so those cookies stop working immediately.
export async function endUserSessions(userId, keepSessionId = null) {
  if (keepSessionId) {
    return prisma.$executeRaw`DELETE FROM "session" WHERE sess->>'userId' = ${String(userId)} AND sid <> ${keepSessionId}`;
  }
  return prisma.$executeRaw`DELETE FROM "session" WHERE sess->>'userId' = ${String(userId)}`;
}

// Gives the current request a new session ID while keeping the user signed in.
export function regenerateSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      resolve();
    });
  });
}
