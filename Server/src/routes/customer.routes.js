import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
} from '../controllers/customer.controller.js';

export const customerRouter = Router();

// Customer Profile
customerRouter.get('/customer/profile', authenticate, requireRole('customer'), getProfile);
customerRouter.get('/customers/profile', authenticate, requireRole('customer'), getProfile);
customerRouter.patch('/customer/profile', authenticate, requireRole('customer'), csrfProtection, updateProfile);
customerRouter.put('/customer/profile', authenticate, requireRole('customer'), csrfProtection, updateProfile);
customerRouter.patch('/customers/profile', authenticate, requireRole('customer'), csrfProtection, updateProfile);
customerRouter.get('/me/profile', authenticate, requireRole('customer'), getProfile);
customerRouter.patch('/me/profile', authenticate, requireRole('customer'), csrfProtection, updateProfile);

// Customer Preferences
customerRouter.get('/customers/preferences', authenticate, requireRole('customer'), getPreferences);
customerRouter.get('/customer/preferences', authenticate, requireRole('customer'), getPreferences);
customerRouter.patch(
  '/customers/preferences',
  authenticate,
  requireRole('customer'),
  csrfProtection,
  updatePreferences
);
customerRouter.put(
  '/customers/preferences',
  authenticate,
  requireRole('customer'),
  csrfProtection,
  updatePreferences
);
customerRouter.patch(
  '/customer/preferences',
  authenticate,
  requireRole('customer'),
  csrfProtection,
  updatePreferences
);

// Convenient alias for /me/preferences
customerRouter.get('/me/preferences', authenticate, requireRole('customer'), getPreferences);
customerRouter.patch(
  '/me/preferences',
  authenticate,
  requireRole('customer'),
  csrfProtection,
  updatePreferences
);
