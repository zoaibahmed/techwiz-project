import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const startConversationSchema = z.object({
  farmerId: z
    .string({ required_error: 'farmerId is required.' })
    .trim()
    .min(1, 'farmerId cannot be empty.'),
  productId: z
    .string()
    .trim()
    .optional()
    .nullable(),
  orderId: z
    .string()
    .trim()
    .optional()
    .nullable(),
  message: z
    .string({ required_error: 'Initial message is required.' })
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(2000, 'Message cannot exceed 2000 characters.'),
});

export const sendMessageSchema = z.object({
  message: z
    .string({ required_error: 'Message is required.' })
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(2000, 'Message cannot exceed 2000 characters.'),
});

export const listConversationsQuerySchema = z.object({
  filter: z
    .enum(['all', 'unread', 'order-linked', 'archived'])
    .optional()
    .default('all'),
  search: z.string().optional().default(''),
});
