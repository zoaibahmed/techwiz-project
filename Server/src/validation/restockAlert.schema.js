import { z } from 'zod';

export const createRestockAlertSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  marketId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid market ID'),
});
