import { createRestockAlertSchema } from '../validation/restockAlert.schema.js';
import {
  createRestockAlertService,
  listRestockAlertsService,
  cancelRestockAlertService,
} from '../services/restockAlert.service.js';

export async function createRestockAlert(req, res, next) {
  try {
    const validated = createRestockAlertSchema.parse(req.body);
    const result = await createRestockAlertService(req.user.id, validated);
    res.status(201).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function listRestockAlerts(req, res, next) {
  try {
    const alerts = await listRestockAlertsService(req.user.id);
    res.status(200).json({
      data: alerts,
      meta: { total: alerts.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelRestockAlert(req, res, next) {
  try {
    const result = await cancelRestockAlertService(req.user.id, req.params.id);
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}
