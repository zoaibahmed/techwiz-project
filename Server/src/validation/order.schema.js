import { z } from 'zod';

export const checkoutSchema = z.object({
  marketId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid market ID'),
  marketDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  pickupWindowId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid pickup window ID'),
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
        quantity: z.number().positive('Quantity must be greater than zero'),
      })
    )
    .min(1, 'Cart must contain at least one item'),
  idempotencyKey: z.string().min(8).max(128).optional(),
  customerNotes: z.string().max(500).optional().default(''),
});

export const modifyOrderItemsSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
        quantity: z.number().positive('Quantity must be greater than zero'),
      })
    )
    .min(1, 'Order must contain at least one item'),
});

export const farmerStatusTransitionSchema = z.object({
  status: z.preprocess(
    (val) => (val === 'confirmed' ? 'accepted' : val),
    z.enum(['accepted', 'declined', 'ready_for_pickup', 'completed'])
  ),
  reason: z.string().max(250).optional(),
});
