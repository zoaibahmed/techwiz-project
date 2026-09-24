import { z } from 'zod';

export const createMarketSchema = z.object({
  name: z.string().min(2).max(100),
  countryCode: z.string().length(2).toUpperCase().default('PK'),
  countryName: z.string().min(2).max(100).default('Pakistan'),
  region: z.string().min(2).max(100).optional().default('Punjab'),
  city: z.string().min(2).max(100).default('Lahore'),
  locality: z.string().max(100).optional().default(''),
  address: z.string().min(5).max(250),
  timezone: z.string().min(2).max(50).default('Asia/Karachi'),
  currency: z.string().length(3).toUpperCase().default('PKR'),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  operatingDays: z.array(z.number().int().min(0).max(6)).min(1),
  operatingHours: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM'),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM'),
  }),
  scheduleExceptions: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
        type: z.enum(['closed', 'special_hours']),
        reason: z.string().max(200).optional(),
        operatingHours: z
          .object({
            open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          })
          .optional(),
      })
    )
    .optional()
    .default([]),
  mapProvider: z.enum(['google', 'osm']).default('google'),
});

export const updateMarketSchema = createMarketSchema.partial();


export const categorySchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be kebab-case'),
  description: z.string().max(250).optional().default(''),
  icon: z.string().max(50).optional().default(''),
});
