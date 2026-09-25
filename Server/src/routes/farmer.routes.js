import { Router } from 'express';
import {
  getPublicFarmerProfile,
  getMyFarmerProfile,
  updateMyFarmerProfile,
  getFarmerReports,
  getFarmerOnboarding,
  saveFarmerOnboardingStep,
  submitFarmerOnboarding,
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
import { csrfProtection } from '../middleware/csrf.js';

const router = Router();

// 1. Authenticated Farmer operations (Must be defined BEFORE /:id to avoid route collision!)
router.get('/profile', authenticateToken, requireRole(['farmer']), getMyFarmerProfile);
router.patch('/profile', authenticateToken, requireRole(['farmer']), csrfProtection, updateMyFarmerProfile);
router.get('/reports', authenticateToken, requireRole(['farmer']), getFarmerReports);
router.get('/insights', authenticateToken, requireRole(['farmer']), getFarmerReports); // SRS alias
router.get('/analytics', authenticateToken, requireRole(['farmer']), getFarmerReports); // Analytics alias

// Guided Multi-Step Onboarding Wizard (Accessible to all registered farmers)
router.get('/onboarding', authenticateToken, requireRole(['farmer']), getFarmerOnboarding);
router.put('/onboarding', authenticateToken, requireRole(['farmer']), csrfProtection, saveFarmerOnboardingStep);
router.post('/onboarding/submit', authenticateToken, requireRole(['farmer']), csrfProtection, submitFarmerOnboarding);



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
