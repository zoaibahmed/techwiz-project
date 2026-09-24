import {
  customerPreferencesSchema,
  customerProfileUpdateSchema,
} from '../validation/customer.schema.js';
import {
  getCustomerPreferencesService,
  updateCustomerPreferencesService,
  getCustomerProfileService,
  updateCustomerProfileService,
} from '../services/customer.service.js';

export async function getProfile(req, res, next) {
  try {
    const profile = await getCustomerProfileService(req.user.id);
    res.status(200).json({
      data: profile,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const validated = customerProfileUpdateSchema.parse(req.body);
    const profile = await updateCustomerProfileService(req.user.id, validated);
    res.status(200).json({
      data: profile,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPreferences(req, res, next) {
  try {
    const preferences = await getCustomerPreferencesService(req.user.id);
    res.status(200).json({
      data: preferences,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const validated = customerPreferencesSchema.parse(req.body);
    const preferences = await updateCustomerPreferencesService(req.user.id, validated);
    res.status(200).json({
      data: preferences,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}
