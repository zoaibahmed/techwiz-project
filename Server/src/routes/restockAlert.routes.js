import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  createRestockAlert,
  listRestockAlerts,
  cancelRestockAlert,
} from '../controllers/restockAlert.controller.js';

export const restockAlertRouter = Router();

restockAlertRouter.get('/restock-alerts', authenticate, requireRole('customer'), listRestockAlerts);
restockAlertRouter.get('/customer/restock-alerts', authenticate, requireRole('customer'), listRestockAlerts);
restockAlertRouter.post(
  '/restock-alerts',
  authenticate,
  requireRole('customer'),
  csrfProtection,
  createRestockAlert
);
restockAlertRouter.post(
  '/customer/restock-alerts',
  authenticate,
  requireRole('customer'),
  csrfProtection,
  createRestockAlert
);
restockAlertRouter.delete(
  '/restock-alerts/:id',
  authenticate,
  requireRole('customer'),
  csrfProtection,
  cancelRestockAlert
);
restockAlertRouter.delete(
  '/customer/restock-alerts/:id',
  authenticate,
  requireRole('customer'),
  csrfProtection,
  cancelRestockAlert
);

