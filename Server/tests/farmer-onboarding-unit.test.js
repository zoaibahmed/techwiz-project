import { describe, it, expect } from 'vitest';
import {
  saveFarmerOnboardingStepSchema,
  step1AccountSchema,
  step2LocationSchema,
  step3ProfileSchema,
  step4MarketsSchema,
  step8ReviewSchema,
} from '../src/validation/farmerOnboarding.schema.js';

describe('Farmer Guided Onboarding Schema & Validation Tests', () => {
  it('Validates Step 1 Account & Contact', () => {
    // Valid
    const valid = step1AccountSchema.safeParse({
      contactPerson: 'Zohaib Ahmed',
      phone: '+92 300 9876543',
      secondaryPhone: '+92 42 35789012',
    });
    expect(valid.success).toBe(true);

    // Invalid: missing contactPerson
    const invalid = step1AccountSchema.safeParse({
      phone: '+92 300 9876543',
    });
    expect(invalid.success).toBe(false);
  });

  it('Validates Step 2 Multi-Country Location', () => {
    const validPK = step2LocationSchema.safeParse({
      countryCode: 'pk',
      countryName: 'Pakistan',
      region: 'Punjab',
      city: 'Lahore',
      address: 'Bedian Road, Cantt, Lahore',
      postalCode: '54000',
    });
    expect(validPK.success).toBe(true);
    if (validPK.success) {
      expect(validPK.data.countryCode).toBe('PK');
    }

    const validUK = step2LocationSchema.safeParse({
      countryCode: 'GB',
      countryName: 'United Kingdom',
      region: 'Surrey',
      city: 'Guildford',
      address: 'Manor Farm, High Street',
      postalCode: 'GU1 1AA',
    });
    expect(validUK.success).toBe(true);

    // Invalid country code
    const invalidCountry = step2LocationSchema.safeParse({
      countryCode: 'PAKISTAN', // Must be 2 chars
      countryName: 'Pakistan',
      region: 'Punjab',
      city: 'Lahore',
      address: 'Test Address',
    });
    expect(invalidCountry.success).toBe(false);
  });

  it('Validates Step 3 Profile & Farming Practices', () => {
    const valid = step3ProfileSchema.safeParse({
      businessName: 'Greenfield Organic Orchards',
      bio: 'Cultivating heritage citrus and organic seasonal vegetables for Lahore markets.',
      story: 'Family owned farm established in 1988 focusing on soil regeneration.',
      farmingPractices: ['pesticide_free', 'organic_compost', 'drip_irrigation'],
    });
    expect(valid.success).toBe(true);

    // Invalid: bio too short
    const shortBio = step3ProfileSchema.safeParse({
      businessName: 'Greenfield',
      bio: 'Citrus',
    });
    expect(shortBio.success).toBe(false);
  });

  it('Validates Step 4 Market Participation Request', () => {
    const valid = step4MarketsSchema.safeParse({
      requestedMarketIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    });
    expect(valid.success).toBe(true);

    // Invalid: empty array
    const emptyMarkets = step4MarketsSchema.safeParse({
      requestedMarketIds: [],
    });
    expect(emptyMarkets.success).toBe(false);
  });

  it('Validates Step 8 Terms Agreement', () => {
    const valid = step8ReviewSchema.safeParse({ agreedToTerms: true });
    expect(valid.success).toBe(true);

    const invalid = step8ReviewSchema.safeParse({ agreedToTerms: false });
    expect(invalid.success).toBe(false);
  });

  it('Validates Save Step Generic Payload', () => {
    const valid = saveFarmerOnboardingStepSchema.safeParse({
      step: 2,
      data: { countryCode: 'PK', city: 'Lahore' },
    });
    expect(valid.success).toBe(true);

    const invalidStep = saveFarmerOnboardingStepSchema.safeParse({
      step: 9, // Clamped 1-8
      data: {},
    });
    expect(invalidStep.success).toBe(false);
  });
});
