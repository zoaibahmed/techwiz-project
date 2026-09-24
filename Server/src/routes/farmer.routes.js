import { Router } from 'express';
import {
  getPublicFarmerProfile,
  getMyFarmerProfile,
  updateMyFarmerProfile,
  getFarmerReports,
} from '../controllers/farmer.controller.js';
import {
  listFarmerProducts,
  createFarmerProduct,
  updateFarmerProduct,
  archiveFarmerProduct,
} from '../controllers/product.controller.js';
import {
  getWeeklyTemplate,
  updateWeeklyTemplate,
  listStockOffers,
  createOrUpdateStockOffer,
  updateStockOfferStatus,
  listPickupWindows,
  createPickupWindow,
} from '../controllers/inventory.controller.js';
import { authenticateToken, requireRole, requireApprovedFarmer } from '../middleware/auth.js';

const router = Router();

// 1. Authenticated Farmer operations (Must be defined BEFORE /:id to avoid route collision!)
router.get('/profile', authenticateToken, requireRole(['farmer']), getMyFarmerProfile);
router.patch('/profile', authenticateToken, requireRole(['farmer']), updateMyFarmerProfile);
router.get('/reports', authenticateToken, requireRole(['farmer']), getFarmerReports);
router.get('/insights', authenticateToken, requireRole(['farmer']), getFarmerReports); // SRS alias


// Product CRUD (Requires Approved Farmer)
router.get('/products', authenticateToken, requireApprovedFarmer, listFarmerProducts);
router.post('/products', authenticateToken, requireApprovedFarmer, createFarmerProduct);
router.patch('/products/:id', authenticateToken, requireApprovedFarmer, updateFarmerProduct);
router.delete('/products/:id', authenticateToken, requireApprovedFarmer, archiveFarmerProduct);

// Weekly Templates
router.get('/stock-templates', authenticateToken, requireApprovedFarmer, getWeeklyTemplate);
router.put('/stock-templates', authenticateToken, requireApprovedFarmer, updateWeeklyTemplate);

// Dated Stock Offers
router.get('/stock-offers', authenticateToken, requireApprovedFarmer, listStockOffers);
router.post('/stock-offers', authenticateToken, requireApprovedFarmer, createOrUpdateStockOffer);
router.patch('/stock-offers/:id/status', authenticateToken, requireApprovedFarmer, updateStockOfferStatus);

// Pickup Windows
router.get('/pickup-windows', authenticateToken, requireApprovedFarmer, listPickupWindows);
router.post('/pickup-windows', authenticateToken, requireApprovedFarmer, createPickupWindow);

// 2. Public Farmer Profile
router.get('/:id', getPublicFarmerProfile);

export default router;
