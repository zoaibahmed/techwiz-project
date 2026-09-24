import { Router } from 'express';
import {
  registerCustomer,
  registerFarmer,
  login,
  logout,
  getMe,
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateCsrfToken, getCsrfCookieOptions } from '../utils/token.js';

const router = Router();

// Universal register endpoint that routes by role
router.post('/register', (req, res, next) => {
  if (req.body?.role === 'farmer') {
    return registerFarmer(req, res, next);
  }
  return registerCustomer(req, res, next);
});

router.post('/register/customer', registerCustomer);
router.post('/register/farmer', registerFarmer);
router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);

// CSRF token bootstrap endpoint
router.get('/csrf-token', (req, res) => {
  let csrfCookie = req.cookies?.marketlink_csrf;
  if (!csrfCookie) {
    csrfCookie = generateCsrfToken();
    res.cookie('marketlink_csrf', csrfCookie, getCsrfCookieOptions());
  }
  res.status(200).json({
    data: { csrfToken: csrfCookie },
    meta: { timestamp: new Date().toISOString() },
  });
});

export default router;

