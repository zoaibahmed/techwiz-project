import { Router } from 'express';
import { listProductsPublic, getProductByIdPublic } from '../controllers/product.controller.js';

const router = Router();

router.get('/', listProductsPublic);
router.get('/:id', getProductByIdPublic);

export default router;
