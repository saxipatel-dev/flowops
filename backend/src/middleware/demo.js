import { forbidden } from '../utils/httpError.js';

// The public demo shares a handful of seeded accounts. Anything that could lock
// other visitors out of those accounts is switched off when DEMO_MODE is on.
export const isDemoMode = () => process.env.DEMO_MODE === 'true';

export function blockInDemo(req, res, next) {
  if (isDemoMode()) {
    return next(forbidden('This action is turned off in the public demo.'));
  }
  next();
}
