import { Router } from 'express';
import {
  listFarmersAdmin,
  updateFarmerStatusAdmin,
} from '../controllers/auth.controller.js';
import {
  createMarketAdmin,
  updateMarketAdmin,
  deleteMarketAdmin,
} from '../controllers/market.controller.js';
import {
  createCategoryAdmin,
  updateCategoryAdmin,
  deleteCategoryAdmin,
} from '../controllers/category.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Protect all admin routes
router.use(authenticateToken, requireRole(['admin']));

// 1. Farmer approval & status management
router.get('/farmers', listFarmersAdmin);
router.patch('/farmers/:id/status', updateFarmerStatusAdmin);

// 2. Market Management
router.post('/markets', createMarketAdmin);
router.patch('/markets/:id', updateMarketAdmin);
router.delete('/markets/:id', deleteMarketAdmin);

// 3. Category Management
router.post('/categories', createCategoryAdmin);
router.patch('/categories/:id', updateCategoryAdmin);
router.delete('/categories/:id', deleteCategoryAdmin);

export default router;
