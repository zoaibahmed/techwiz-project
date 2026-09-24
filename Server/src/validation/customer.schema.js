import { z } from 'zod';

export const customerPreferencesSchema = z.object({
  preferredMarketId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid market ID').optional().nullable(),
  dietaryPreferences: z.array(z.string()).optional(),
  defaultPickupNotes: z.string().max(300).optional(),
  phone: z.string().max(20).optional(),
});

export const customerProfileUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  preferredMarketId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid market ID').optional().nullable(),
  dietaryPreferences: z.array(z.string()).optional(),
  defaultPickupNotes: z.string().max(300).optional(),
});
