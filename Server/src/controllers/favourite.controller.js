import { favouriteSchema } from '../validation/favourite.schema.js';
import {
  addFavouriteService,
  removeFavouriteService,
  checkFavouriteStatusService,
  listFavouritesService,
} from '../services/favourite.service.js';

export async function addFavourite(req, res, next) {
  try {
    const validated = favouriteSchema.parse(req.body);
    const result = await addFavouriteService(req.user.id, validated);
    res.status(201).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function removeFavourite(req, res, next) {
  try {
    const { targetType, targetId } = req.params;
    const result = await removeFavouriteService(req.user.id, targetType, targetId);
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function checkFavouriteStatus(req, res, next) {
  try {
    const { targetType, targetId } = req.query;
    if (!targetType || !targetId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARAMS',
          message: 'Both targetType and targetId query parameters are required.',
        },
      });
    }
    const result = await checkFavouriteStatusService(req.user.id, targetType, targetId);
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function listFavourites(req, res, next) {
  try {
    const favourites = await listFavouritesService(req.user.id);
    res.status(200).json({
      data: favourites,
      meta: { total: favourites.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}
