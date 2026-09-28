import {beginRegistration,finishRegistration} from '../services/registration.service.js';
import {strongPasswordSchema} from '../validation/auth.schema.js';
import {
  registerCustomerSchema,
  registerFarmerSchema,
  loginSchema,
  farmerStatusUpdateSchema,
} from '../validation/auth.schema.js';
import {
  registerCustomerService,
  registerFarmerService,
  loginService,
  getCurrentUserService,
  updateFarmerApprovalService,
  listFarmersForAdminService,
  listCustomersAdminService,
  updateCustomerStatusAdminService,
  getCustomerDetailsAdminService,
  forgotPasswordService,
  resetPasswordService,
  sendLoginOtpService,
  verifyLoginOtpService,
} from '../services/auth.service.js';
import { env } from '../config/env.js';
import { getAuthCookieOptions, getCsrfCookieOptions, generateCsrfToken } from '../utils/token.js';

export async function registerCustomer(req,res,next){try{res.status(202).json({data:await beginRegistration(registerCustomerSchema.parse(req.body),'customer')})}catch(e){next(e)}}
export async function registerFarmer(req,res,next){try{res.status(202).json({data:await beginRegistration(registerFarmerSchema.parse(req.body),'farmer')})}catch(e){next(e)}}
export async function verifyRegistration(req,res,next){try{
 const result=await finishRegistration(req.body.challengeId,req.body.code);
 res.cookie('token',result.token,getAuthCookieOptions());
 res.cookie('marketlink_csrf',generateCsrfToken(),getCsrfCookieOptions());
 res.status(201).json({data:{user:result.user}});
}catch(e){next(e)}}

export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginService(email, password);

    // 1. Set strict HTTP-Only cookie for JWT
    res.cookie('token', result.token, getAuthCookieOptions());

    // 2. Issue fresh CSRF cookie
    const csrfToken = generateCsrfToken();
    res.cookie('marketlink_csrf', csrfToken, getCsrfCookieOptions());

    // 3. Return user profile without exposing raw JWT in JSON
    res.status(200).json({
      data: {
        user: result.user,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res) {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('marketlink_csrf', { path: '/' });

  res.status(200).json({
    data: { loggedOut: true },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

export async function getMe(req, res, next) {
  try {
    const user = await getCurrentUserService(req.user.id);
    res.status(200).json({
      data: { user },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listFarmersAdmin(req, res, next) {
  try {
    const farmers = await listFarmersForAdminService(req.query);
    res.status(200).json({
      data: farmers,
      meta: {
        total: farmers.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFarmerStatusAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { approvalStatus, reason } = farmerStatusUpdateSchema.parse(req.body);
    const result = await updateFarmerApprovalService(id, approvalStatus, req.user.id, reason);

    res.status(200).json({
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listCustomersAdmin(req, res, next) {
  try {
    const customers = await listCustomersAdminService(req.query);
    res.status(200).json({
      data: customers,
      meta: {
        total: customers.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomerStatusAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;
    const result = await updateCustomerStatusAdminService(id, isActive, req.user.id, reason);
    res.status(200).json({
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerDetailsAdmin(req, res, next) {
  try {
    const customer = await getCustomerDetailsAdminService(req.params.id);
    res.status(200).json({
      data: customer,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Forgot / Reset Password ────────────────────────────────────────────────

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: { code: 'VALIDATION', message: 'Email is required.' } });
    const result = await forgotPasswordService(email);
    // Unknown addresses receive the explicit registration error requested by the product.
    res.status(200).json({
      data: { sent: true },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'email, otp, and newPassword are required.' } });
    }
    strongPasswordSchema.parse(newPassword);
    await resetPasswordService(email, otp, newPassword);
    res.status(200).json({ data: { reset: true }, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
}

// ─── 2-Step Login with OTP ──────────────────────────────────────────────────

export async function sendLoginOtp(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'Email and password are required.' } });
    }
    const result = await sendLoginOtpService(email, password);
    if (result.token && result.user) {
      res.cookie('token', result.token, getAuthCookieOptions());
      res.cookie('marketlink_csrf', generateCsrfToken(), getCsrfCookieOptions());
      return res.status(200).json({data:{otpSent:false,email:result.email,user:result.user},meta:{timestamp:new Date().toISOString()}});
    }
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyLoginOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'Email and verification code are required.' } });
    }
    const result = await verifyLoginOtpService(email, otp);

    // 1. Set strict HTTP-Only cookie for JWT
    res.cookie('token', result.token, getAuthCookieOptions());

    // 2. Issue fresh CSRF cookie
    const csrfToken = generateCsrfToken();
    res.cookie('marketlink_csrf', csrfToken, getCsrfCookieOptions());

    // 3. Return user profile
    res.status(200).json({
      data: {
        user: result.user,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── CAPTCHA Verification (server-side) ─────────────────────────────────────

export async function verifyCaptcha(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: { code: 'CAPTCHA_MISSING', message: 'CAPTCHA token is required.' } });

    // If no secret key configured, allow in dev mode
    if (!env.RECAPTCHA_SECRET_KEY || env.RECAPTCHA_SECRET_KEY === 'your_recaptcha_secret_key_here') {
      return res.status(200).json({ data: { success: true, dev: true }, meta: { timestamp: new Date().toISOString() } });
    }

    const params = new URLSearchParams();
    params.append('secret', env.RECAPTCHA_SECRET_KEY);
    params.append('response', token);

    const gRes = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body: params });
    const gData = await gRes.json();

    if (!gData.success) {
      return res.status(400).json({ error: { code: 'CAPTCHA_FAILED', message: 'CAPTCHA verification failed. Please try again.' } });
    }

    res.status(200).json({ data: { success: true }, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
}
