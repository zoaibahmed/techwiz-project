import {
  getPlatformAnalyticsAdminService,
  getMostActiveFarmersService,
} from '../services/analytics.service.js';

export async function getPlatformAnalyticsAdmin(req, res, next) {
  try {
    const data = await getPlatformAnalyticsAdminService(req.query);
    res.status(200).json({
      data,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMostActiveFarmersAdmin(req, res, next) {
  try {
    const { limit, sortBy } = req.query;
    const farmers = await getMostActiveFarmersService({ limit, sortBy });
    res.status(200).json({
      data: farmers,
      meta: { total: farmers.length, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}
