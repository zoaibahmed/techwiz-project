import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  checkout,
  listCustomerOrders,
  getCustomerOrder,
  modifyCustomerOrder,
  cancelCustomerOrder,
  listFarmerOrders,
  getFarmerOrder,
  updateFarmerOrderStatus,
} from '../controllers/order.controller.js';

export const orderRouter = Router();

// Customer Order Endpoints
orderRouter.post('/orders/checkout', authenticate, csrfProtection, checkout);
orderRouter.get('/orders', authenticate, listCustomerOrders);
orderRouter.get('/orders/:id', authenticate, getCustomerOrder);
orderRouter.patch('/orders/:id/items', authenticate, csrfProtection, modifyCustomerOrder);
orderRouter.patch('/orders/:id/cancel', authenticate, csrfProtection, cancelCustomerOrder);

// Farmer Order Endpoints
orderRouter.get('/farmer/orders', authenticate, requireRole('farmer'), listFarmerOrders);
orderRouter.get('/farmer/orders/:id', authenticate, requireRole('farmer'), getFarmerOrder);
orderRouter.patch(
  '/farmer/orders/:id/status',
  authenticate,
  requireRole('farmer'),
  csrfProtection,
  updateFarmerOrderStatus
);
