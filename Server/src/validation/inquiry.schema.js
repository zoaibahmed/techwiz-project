import { z } from 'zod';

export const contactInquirySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(1, 'Message is required').max(2000),
});

export const updateInquirySchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved']),
  adminNotes: z.string().max(1000).optional(),
});
