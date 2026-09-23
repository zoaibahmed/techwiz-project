import { Router } from 'express';
import { listMarkets, getMarketById } from '../controllers/market.controller.js';

const router = Router();

router.get('/', listMarkets);
router.get('/:id', getMarketById);

export default router;
