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
} from '../services/auth.service.js';
import { getAuthCookieOptions, getCsrfCookieOptions, generateCsrfToken } from '../utils/token.js';

export async function registerCustomer(req, res, next) {
  try {
    const validatedData = registerCustomerSchema.parse(req.body);
    const result = await registerCustomerService(validatedData);

    // 1. Set strict HTTP-Only cookie for JWT (no JavaScript access)
    res.cookie('token', result.token, getAuthCookieOptions());

    // 2. Issue fresh CSRF cookie
    const csrfToken = generateCsrfToken();
    res.cookie('marketlink_csrf', csrfToken, getCsrfCookieOptions());

    // 3. Return user profile without exposing raw JWT in JSON
    res.status(201).json({
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

export async function registerFarmer(req, res, next) {
  try {
    const validatedData = registerFarmerSchema.parse(req.body);
    const result = await registerFarmerService(validatedData);

    // 1. Set strict HTTP-Only cookie for JWT
    res.cookie('token', result.token, getAuthCookieOptions());

    // 2. Issue fresh CSRF cookie
    const csrfToken = generateCsrfToken();
    res.cookie('marketlink_csrf', csrfToken, getCsrfCookieOptions());

    // 3. Return user & farmer profile without exposing raw JWT
    res.status(201).json({
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
    const { status } = req.query;
    const farmers = await listFarmersForAdminService(status);
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

