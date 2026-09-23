import { getHealthStatus } from '../services/health.service.js';

export async function healthCheck(req, res, next) {
  try {
    const health = await getHealthStatus();
    const httpStatus = health.status === 'ok' ? 200 : 503;
    res.status(httpStatus).json(health);
  } catch (error) {
    next(error);
  }
}
