import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getCatalogueService, getWorkspaceService, getPulseService } from '../services/workspace.service.js';
import { listFarmersPublicService } from '../services/farmer.service.js';

export const workspaceRouter = Router();

/** Everything a visitor can see: markets, growers, produce, pickup windows, reviews. */
workspaceRouter.get('/catalogue', async (req, res, next) => {
  try {
    const data = await getCatalogueService();
    res.set('Cache-Control', 'no-store');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** The signed-in user's role-scoped workspace, including consistent metrics. */
workspaceRouter.get('/workspace', authenticateToken, async (req, res, next) => {
  try {
    const { period, from, to } = req.query;
    const data = await getWorkspaceService(req.user, { period, from, to });
    res.set('Cache-Control', 'no-store');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** Public list of approved growers. */
workspaceRouter.get('/farmers', async (req, res, next) => {
  try {
    const data = await listFarmersPublicService({ search: req.query.search, marketId: req.query.marketId });
    res.json({ data, meta: { total: data.length } });
  } catch (err) {
    next(err);
  }
});

/** Anonymised live platform activity for the homepage. */
workspaceRouter.get('/pulse', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ data: await getPulseService() });
  } catch (err) {
    next(err);
  }
});
