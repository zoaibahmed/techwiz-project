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
  acceptFarmerOrder,
  declineFarmerOrder,
  readyFarmerOrder,
  completeFarmerOrder,
  reorderCustomerOrder,
} from '../controllers/order.controller.js';

export const orderRouter = Router();

// Customer Order Endpoints
orderRouter.post('/orders/checkout', authenticate, csrfProtection, checkout);
orderRouter.post('/orders', authenticate, csrfProtection, checkout); // Canonical alias
orderRouter.get('/orders', authenticate, listCustomerOrders);
orderRouter.get('/orders/:id', authenticate, getCustomerOrder);
orderRouter.patch('/orders/:id/items', authenticate, csrfProtection, modifyCustomerOrder);
orderRouter.put('/orders/:id/items', authenticate, csrfProtection, modifyCustomerOrder); // PUT alias
orderRouter.patch('/orders/:id/cancel', authenticate, csrfProtection, cancelCustomerOrder);
orderRouter.post('/orders/:id/cancel', authenticate, csrfProtection, cancelCustomerOrder); // POST alias
orderRouter.post('/orders/:id/reorder', authenticate, csrfProtection, reorderCustomerOrder);

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
orderRouter.put(
  '/farmer/orders/:id/status',
  authenticate,
  requireRole('farmer'),
  csrfProtection,
  updateFarmerOrderStatus
);
orderRouter.post('/farmer/orders/:id/accept', authenticate, requireRole('farmer'), csrfProtection, acceptFarmerOrder);
orderRouter.post('/farmer/orders/:id/decline', authenticate, requireRole('farmer'), csrfProtection, declineFarmerOrder);
orderRouter.post('/farmer/orders/:id/ready', authenticate, requireRole('farmer'), csrfProtection, readyFarmerOrder);
orderRouter.post('/farmer/orders/:id/complete', authenticate, requireRole('farmer'), csrfProtection, completeFarmerOrder);

