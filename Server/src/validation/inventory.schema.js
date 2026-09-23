import { z } from 'zod';

export const createStockOfferSchema = z.object({
  marketId: z.string().min(1, 'Market ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  priceMinor: z.number().int().positive('Price must be a positive integer in minor units'),
  totalQuantity: z.number().positive('Total quantity must be greater than 0'),
  unit: z.enum(['kg', 'g', 'bunch', 'box', 'dozen', 'litre', 'item']),
  currency: z.string().default('PKR'),
});

export const updateStockOfferStatusSchema = z.object({
  status: z.enum(['available', 'sold_out', 'unavailable']),
});

export const updateWeeklyTemplateSchema = z.object({
  marketId: z.string().min(1, 'Market ID is required'),
  dayOfWeek: z.number().int().min(0).max(6),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      defaultQuantity: z.number().positive(),
      defaultPriceMinor: z.number().int().positive(),
      unit: z.enum(['kg', 'g', 'bunch', 'box', 'dozen', 'litre', 'item']),
    })
  ),
});

export const createPickupWindowSchema = z.object({
  marketId: z.string().min(1, 'Market ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM'),
  cutoffAt: z.string().datetime({ message: 'Cutoff must be a valid ISO 8601 UTC datetime string' }),
  maxCapacity: z.number().int().positive().default(20),
});
