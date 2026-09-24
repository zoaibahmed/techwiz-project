import { z } from 'zod';

export const favouriteSchema = z.object({
  targetType: z.enum(['farmer', 'product', 'market'], {
    errorMap: () => ({ message: 'targetType must be "farmer", "product", or "market"' }),
  }),
  targetId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid target ID'),
});
