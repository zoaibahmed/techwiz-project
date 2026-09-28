import { Router } from 'express';
import {
  verifyRegistration,
  registerCustomer,
  registerFarmer,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyCaptcha,
  sendLoginOtp,
  verifyLoginOtp,
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateCsrfToken, getCsrfCookieOptions } from '../utils/token.js';

const router = Router();

// Bound repeated authentication attempts without logging credentials or codes.
const attempts = new Map();
router.use((req,res,next)=>{
 if(req.method!=='POST'||req.path==='/logout')return next();
 const now=Date.now(),key=req.ip;
 for(const [ip,entry] of attempts)if(entry.until<=now)attempts.delete(ip);
 const entry=attempts.get(key)||{count:0,until:now+15*60*1000};
 if(entry.count>=30){res.set('Retry-After',String(Math.ceil((entry.until-now)/1000)));return res.status(429).json({error:{code:'AUTH_RATE_LIMIT',message:'Too many attempts. Please wait before trying again.'}})}
 if(attempts.size>=10000&&!attempts.has(key))return res.status(503).json({error:{message:'Please try again shortly.'}});
 entry.count++;attempts.set(key,entry);next();
});

// Universal register endpoint that routes by role
router.post('/register', (req, res, next) => {
  if (req.body?.role === 'farmer') {
    return registerFarmer(req, res, next);
  }
  return registerCustomer(req, res, next);
});

router.post('/register/verify', verifyRegistration);
router.post('/register/customer', registerCustomer);
router.post('/register/farmer', registerFarmer);
router.post('/login', (req,res)=>res.status(409).json({error:{code:'OTP_REQUIRED',message:'Sign in using email verification.'}}));
router.post('/login-otp/send', sendLoginOtp);
router.post('/login-otp/verify', verifyLoginOtp);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);

// Forgot & reset password (OTP-based, no auth required)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// CAPTCHA server-side verification
router.post('/verify-captcha', verifyCaptcha);

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
