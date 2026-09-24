import { Router } from 'express';
import { handleImageUpload } from '../controllers/upload.controller.js';
import { uploadProductImage } from '../middleware/upload.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';

export const uploadRouter = Router();

uploadRouter.post(
  '/uploads/image',
  authenticateToken,
  requireRole(['farmer', 'admin', 'customer']),
  csrfProtection,
  uploadProductImage.single('image'),
  handleImageUpload
);
