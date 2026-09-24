import { z } from 'zod';

export const saveFarmerOnboardingStepSchema = z.object({
  step: z.number().int().min(1).max(8),
  data: z.record(z.string(), z.any()),
});

export const step1AccountSchema = z.object({
  contactPerson: z.string().min(2, 'Contact person name is required').max(100),
  phone: z.string().min(5, 'Valid phone number is required').max(25),
  secondaryPhone: z.string().max(25).optional(),
});

export const step2LocationSchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
  countryName: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  address: z.string().min(5).max(250),
  postalCode: z.string().max(20).optional(),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

export const step3ProfileSchema = z.object({
  businessName: z.string().min(2, 'Farm or business name is required').max(100),
  bio: z.string().min(10, 'Please provide a brief description of your farm').max(1000),
  story: z.string().max(3000).optional(),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  farmingPractices: z.array(z.string()).optional().default([]),
});

export const step4MarketsSchema = z.object({
  requestedMarketIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1, 'Please select at least one market'),
});

export const step5ProductsSchema = z.object({
  primaryCategories: z.array(z.string()).optional().default([]),
  sampleProducts: z
    .array(
      z.object({
        name: z.string().min(2),
        category: z.string().optional(),
        unit: z.string().optional(),
        estimatedPriceMinor: z.number().optional(),
      })
    )
    .optional()
    .default([]),
});

export const step6ScheduleSchema = z.object({
  operatingDays: z.array(z.number().int().min(0).max(6)).optional().default([]),
  preferredDeliveryHours: z.string().max(100).optional(),
});

export const step7PickupSchema = z.object({
  defaultStallNotes: z.string().max(500).optional(),
  stallNumber: z.string().max(50).optional(),
  paymentMethodsAccepted: z.array(z.string()).optional().default(['cash_at_pickup']),
});

export const step8ReviewSchema = z.object({
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to MarketLink seller terms before submitting.' }),
  }),
});
