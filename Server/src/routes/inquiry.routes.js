import { Router } from 'express';
import {
  submitContactInquiry,
  listInquiriesAdmin,
  updateInquiryStatusAdmin,
} from '../controllers/inquiry.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';

export const inquiryRouter = Router();

// Public: Contact form submission
inquiryRouter.post('/contact', submitContactInquiry);

// Admin: Review and manage customer inquiries
inquiryRouter.get(
  '/admin/inquiries',
  authenticateToken,
  requireRole(['admin']),
  listInquiriesAdmin
);

inquiryRouter.patch(
  '/admin/inquiries/:id',
  authenticateToken,
  requireRole(['admin']),
  csrfProtection,
  updateInquiryStatusAdmin
);
