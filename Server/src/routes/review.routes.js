import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  createReview,
  getFarmerReviewsPublic,
  getProductReviewsPublic,
  getFarmerReviews,
  replyToReview,
  listAdminReviews,
  moderateReview,
  deleteReview,
} from '../controllers/review.controller.js';

export const reviewRouter = Router();

// Public routes for reading reviews
reviewRouter.get('/reviews/farmer/:id', getFarmerReviewsPublic);
reviewRouter.get('/reviews/product/:id', getProductReviewsPublic);

// Customer routes: submit review on completed order
reviewRouter.post('/reviews', authenticate, requireRole('customer'), csrfProtection, createReview);

// Farmer routes: view reviews and reply
reviewRouter.get('/farmer/reviews', authenticate, requireRole('farmer'), getFarmerReviews);
reviewRouter.post(
  '/farmer/reviews/:id/reply',
  authenticate,
  requireRole('farmer'),
  csrfProtection,
  replyToReview
);

// Admin routes: moderation
reviewRouter.get('/admin/reviews', authenticate, requireRole('admin'), listAdminReviews);
reviewRouter.patch(
  '/admin/reviews/:id/status',
  authenticate,
  requireRole('admin'),
  csrfProtection,
  moderateReview
);
reviewRouter.delete('/admin/reviews/:id', authenticate, requireRole('admin'), csrfProtection, deleteReview);
