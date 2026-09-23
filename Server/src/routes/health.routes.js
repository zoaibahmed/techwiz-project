import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health - System and database connectivity check
router.get('/', healthCheck);

export default router;
