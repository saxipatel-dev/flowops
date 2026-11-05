import { forbidden } from '../utils/httpError.js';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// Browsers cannot attach custom headers to cross-site form posts, so requiring
// this header on state-changing requests blocks basic CSRF attacks.
export function requireAjaxHeader(req, res, next) {
  if (SAFE_METHODS.includes(req.method) || req.get('X-Requested-With') === 'XMLHttpRequest') {
    return next();
  }
  next(forbidden('Missing request header.'));
}
