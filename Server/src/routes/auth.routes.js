import { Router } from 'express';
import {
  registerCustomer,
  registerFarmer,
  login,
  logout,
  getMe,
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register/customer', registerCustomer);
router.post('/register/farmer', registerFarmer);
router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);

export default router;
