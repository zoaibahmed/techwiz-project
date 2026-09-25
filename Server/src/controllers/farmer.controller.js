import { updateFarmerProfileSchema } from '../validation/product.schema.js';
import {
  getPublicFarmerProfileService,
  getMyFarmerProfileService,
  updateMyFarmerProfileService,
} from '../services/farmer.service.js';

export async function getPublicFarmerProfile(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await getPublicFarmerProfileService(id);

    res.status(200).json({
      data: profile,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyFarmerProfile(req, res, next) {
  try {
    const profile = await getMyFarmerProfileService(req.user.id);

    res.status(200).json({
      data: profile,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMyFarmerProfile(req, res, next) {
  try {
    const validated = updateFarmerProfileSchema.parse(req.body);
    const updated = await updateMyFarmerProfileService(req.user.id, validated);

    res.status(200).json({
      data: updated,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getFarmerReports(req, res, next) {
  try {
    const { getFarmerReportsService } = await import('../services/farmer.service.js');
    const reports = await getFarmerReportsService(req.user.id, req.query);
    res.status(200).json({
      data: reports,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function getFarmerOnboarding(req, res, next) {
  try {
    const { getFarmerOnboardingService } = await import('../services/farmer.service.js');
    const onboarding = await getFarmerOnboardingService(req.user.id);
    res.status(200).json({
      data: onboarding,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function saveFarmerOnboardingStep(req, res, next) {
  try {
    const { saveFarmerOnboardingStepSchema } = await import('../validation/farmerOnboarding.schema.js');
    const { saveFarmerOnboardingStepService } = await import('../services/farmer.service.js');
    const validated = saveFarmerOnboardingStepSchema.parse(req.body);
    const result = await saveFarmerOnboardingStepService(req.user.id, validated);
    res.status(200).json({
      data: result,
      message: `Step ${validated.step} saved successfully.`,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function submitFarmerOnboarding(req, res, next) {
  try {
    const { submitFarmerOnboardingService } = await import('../services/farmer.service.js');
    const result = await submitFarmerOnboardingService(req.user.id);
    res.status(200).json({
      data: result,
      message: 'Onboarding application submitted successfully for administrator review.',
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}


