import { z } from 'zod';

export const createMarketSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(250),
  timezone: z.string().default('Asia/Karachi'),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  operatingDays: z.array(z.number().int().min(0).max(6)).min(1),
  operatingHours: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM'),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM'),
  }),
  mapProvider: z.enum(['google', 'osm']).default('google'),
});

export const updateMarketSchema = createMarketSchema.partial();

export const categorySchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be kebab-case'),
  description: z.string().max(250).optional().default(''),
  icon: z.string().max(50).optional().default(''),
});
