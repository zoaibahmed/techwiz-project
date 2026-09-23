import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller.js';

export const notificationRouter = Router();

notificationRouter.get('/notifications', authenticate, listNotifications);
notificationRouter.patch('/notifications/read-all', authenticate, csrfProtection, markAllAsRead);
notificationRouter.patch('/notifications/:id/read', authenticate, csrfProtection, markAsRead);
