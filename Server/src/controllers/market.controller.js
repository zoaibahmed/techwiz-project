import {
  createMarketSchema,
  updateMarketSchema,
} from '../validation/market.schema.js';
import {
  listMarketsService,
  getMarketByIdService,
  createMarketService,
  updateMarketService,
  deleteMarketService,
} from '../services/market.service.js';

export async function listMarkets(req, res, next) {
  try {
    const { day, search, lat, lng, radiusKm, page, limit } = req.query;
    const result = await listMarketsService({ day, search, lat, lng, radiusKm, page, limit });

    res.status(200).json({
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasNext: result.hasNext,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMarketById(req, res, next) {
  try {
    const { id } = req.params;
    const market = await getMarketByIdService(id);

    res.status(200).json({
      data: market,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createMarketAdmin(req, res, next) {
  try {
    const validated = createMarketSchema.parse(req.body);
    const result = await createMarketService(req.user.id, validated);

    res.status(201).json({
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMarketAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const validated = updateMarketSchema.parse(req.body);
    const result = await updateMarketService(req.user.id, id, validated);

    res.status(200).json({
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteMarketAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const result = await deleteMarketService(req.user.id, id);

    res.status(200).json({
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}
