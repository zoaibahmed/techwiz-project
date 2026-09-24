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
    const reports = await getFarmerReportsService(req.user.id);
    res.status(200).json({
      data: reports,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

