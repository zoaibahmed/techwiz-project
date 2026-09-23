import { Router } from 'express';
import { listPickupWindows } from '../controllers/inventory.controller.js';

const router = Router();

router.get('/', listPickupWindows);

export default router;
