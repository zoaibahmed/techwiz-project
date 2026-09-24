import { generateCsrfToken, getCsrfCookieOptions } from '../utils/token.js';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const EXEMPT_PATHS = [
  '/api/v1/auth/login',
  '/api/auth/login',
  '/api/v1/auth/register',
  '/api/auth/register',
  '/api/v1/auth/register/customer',
  '/api/auth/register/customer',
  '/api/v1/auth/register/farmer',
  '/api/auth/register/farmer',
  '/api/v1/contact',
  '/api/contact',
];

/**
 * Double-submit cookie CSRF protection middleware.
 * Issues a CSRF token cookie and verifies the x-csrf-token header on mutating requests.
 */
export function csrfProtection(req, res, next) {
  let csrfCookie = req.cookies?.marketlink_csrf;

  // Ensure CSRF cookie is present
  if (!csrfCookie) {
    csrfCookie = generateCsrfToken();
    res.cookie('marketlink_csrf', csrfCookie, getCsrfCookieOptions());
  }

  // Safe read-only methods bypass header check
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // Auth bootstrap paths are exempt
  if (EXEMPT_PATHS.includes(req.path)) {
    return next();
  }

  const clientCsrfHeader = req.headers['x-csrf-token'];

  if (!clientCsrfHeader || clientCsrfHeader !== csrfCookie) {
    return res.status(403).json({
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid or missing CSRF token. State-modifying requests require a matching X-CSRF-Token header.',
        fields: [],
        requestId: req.id || 'csrf_req',
      },
    });
  }

  next();
}
