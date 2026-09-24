import { z } from 'zod';

export const createReviewSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid order ID'),
  targetType: z.enum(['farmer', 'product'], {
    errorMap: () => ({ message: 'targetType must be either "farmer" or "product"' }),
  }),
  targetId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid target ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().min(3, 'Comment must be at least 3 characters').max(1000, 'Comment too long'),
});

export const replyReviewSchema = z.object({
  replyText: z.string().min(2, 'Reply text must be at least 2 characters').max(1000, 'Reply text too long'),
});

export const updateReviewModerationSchema = z.object({
  moderationStatus: z.enum(['approved', 'hidden', 'flagged']),
  moderationReason: z.string().max(250).optional(),
});
