import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional().default(''),
  categoryId: z.string().min(1, 'Category is required'),
  unit: z.enum(['kg', 'g', 'bunch', 'box', 'dozen', 'litre', 'item']),
  basePriceMinor: z.number().int().positive('Base price must be a positive integer in minor units'),
  currency: z.string().default('PKR'),
  imageUrl: z.string().optional().default(''),
});

export const updateProductSchema = createProductSchema.partial();

export const updateFarmerProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  phone: z.string().min(7).max(20).optional(),
  address: z.string().min(5).max(250).optional(),
  stallCoordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .nullable()
    .optional(),
  marketIds: z.array(z.string()).optional(),
  operatingDays: z.array(z.number().int().min(0).max(6)).optional(),
});
