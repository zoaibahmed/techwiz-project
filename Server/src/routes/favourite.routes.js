import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  addFavourite,
  removeFavourite,
  checkFavouriteStatus,
  listFavourites,
} from '../controllers/favourite.controller.js';

export const favouriteRouter = Router();

// Customer Favourites
favouriteRouter.get('/favourites', authenticate, requireRole('customer'), listFavourites);
favouriteRouter.get('/favourites/check', authenticate, requireRole('customer'), checkFavouriteStatus);
favouriteRouter.post('/favourites', authenticate, requireRole('customer'), csrfProtection, addFavourite);
favouriteRouter.delete(
  '/favourites/:targetType/:targetId',
  authenticate,
  requireRole('customer'),
  csrfProtection,
  removeFavourite
);

// Convenient alias for /me/favourites
favouriteRouter.get('/me/favourites', authenticate, requireRole('customer'), listFavourites);
