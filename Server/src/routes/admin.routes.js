import {marketRequests,decideMarket} from '../services/marketParticipation.service.js';
import { Router } from 'express';
import {
  listFarmersAdmin,
  updateFarmerStatusAdmin,
  listCustomersAdmin,
  updateCustomerStatusAdmin,
  getCustomerDetailsAdmin,
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
import {
  listProductsAdmin,
  moderateProductAdmin,
} from '../controllers/product.controller.js';
import {
  getPlatformAnalyticsAdmin,
  getMostActiveFarmersAdmin,
} from '../controllers/analytics.controller.js';
import {
  listInquiriesAdmin,
  updateInquiryStatusAdmin,
} from '../controllers/inquiry.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Protect all admin routes
router.use(authenticateToken, requireRole(['admin']));

// 1. Farmer approval & status management
router.get('/farmers', listFarmersAdmin);
router.patch('/farmers/:id/status', updateFarmerStatusAdmin);

router.get('/farmers/:id/market-requests', async(req,res,next)=>{try{res.json({data:await marketRequests(req.params.id)})}catch(e){next(e)}});
router.patch('/farmers/:id/market-requests/:marketId', async(req,res,next)=>{try{res.json({data:await decideMarket(req.params.id,req.params.marketId,req.body.status,req.body.reason,req.user.id)})}catch(e){next(e)}});

// 2. Customer management
router.get('/customers', listCustomersAdmin);
router.get('/customers/:id', getCustomerDetailsAdmin);
router.patch('/customers/:id/status', updateCustomerStatusAdmin);

// 3. Market Management
router.post('/markets', createMarketAdmin);
router.patch('/markets/:id', updateMarketAdmin);
router.delete('/markets/:id', deleteMarketAdmin);

// 4. Category Management
router.post('/categories', createCategoryAdmin);
router.patch('/categories/:id', updateCategoryAdmin);
router.delete('/categories/:id', deleteCategoryAdmin);

// 5. Product Moderation
router.get('/products', listProductsAdmin);
router.patch('/products/:id/status', moderateProductAdmin);

// 6. Analytics & Intelligence Reports
router.get('/analytics', getPlatformAnalyticsAdmin);
router.get('/reports/farmers', getMostActiveFarmersAdmin);

// 7. Contact Inquiries Management
router.get('/inquiries', listInquiriesAdmin);
router.patch('/inquiries/:id', updateInquiryStatusAdmin);

export default router;

