import { Router } from 'express';
import {
  listActiveAnnouncements,
  listAllAnnouncementsAdmin,
  createAnnouncementAdmin,
  updateAnnouncementAdmin,
  deleteAnnouncementAdmin,
} from '../controllers/announcement.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';

export const announcementRouter = Router();

// Public: View active announcements
announcementRouter.get('/announcements', listActiveAnnouncements);

// Admin: Manage announcements
announcementRouter.get(
  '/admin/announcements',
  authenticateToken,
  requireRole(['admin']),
  listAllAnnouncementsAdmin
);
announcementRouter.post(
  '/admin/announcements',
  authenticateToken,
  requireRole(['admin']),
  csrfProtection,
  createAnnouncementAdmin
);
announcementRouter.patch(
  '/admin/announcements/:id',
  authenticateToken,
  requireRole(['admin']),
  csrfProtection,
  updateAnnouncementAdmin
);
announcementRouter.delete(
  '/admin/announcements/:id',
  authenticateToken,
  requireRole(['admin']),
  csrfProtection,
  deleteAnnouncementAdmin
);
