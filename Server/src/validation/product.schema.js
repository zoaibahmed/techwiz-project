import { z } from 'zod';
import { SELLING_UNITS } from './units.js';

const baseProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(150),
  description: z.string().max(5000).optional().default(''),
  categoryId: z.string().optional().default(''),
  category: z.string().optional(),
  unit: z
    .string()
    .trim()
    .min(1)
    .default('kg')
    .transform((u) => u.toLowerCase()),
  basePriceMinor: z.coerce
    .number()
    .min(1, 'Base price must be a positive value in minor units')
    .transform((n) => Math.round(n)),
  currency: z.string().default('PKR'),
  imageUrl: z.string().optional().default(''),
  image: z.string().optional(),
});

const normalizeProductData = (data) => ({
  ...data,
  ...(data.name ? { name: data.name.trim() } : {}),
  categoryId: data.categoryId || data.category || '',
  imageUrl: data.imageUrl || data.image || '',
});

export const createProductSchema = baseProductSchema.transform(normalizeProductData);
export const updateProductSchema = baseProductSchema.partial().transform(normalizeProductData);

export const updateFarmerProfileSchema = z.object({
  businessName:z.string().trim().min(2).max(100).optional(),
  contactPerson:z.string().trim().min(2).max(100).optional(),
  stallNumber:z.string().trim().max(50).optional(),
  profileImageUrl:z.string().refine(v=>v===''||/^https?:\/\//.test(v)||v.startsWith('/uploads/'),'Use a valid image URL').optional(),
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
  operatingDays: z.array(z.number().int().min(0).max(6)).optional(),
});
