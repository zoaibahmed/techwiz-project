import {
  createStockOfferSchema,
  updateStockOfferStatusSchema,
  updateWeeklyTemplateSchema,
  createPickupWindowSchema,
} from '../validation/inventory.schema.js';
import {
  getWeeklyTemplateService,
  updateWeeklyTemplateService,
  listStockOffersService,
  createOrUpdateStockOfferService,
  updateStockOfferStatusService,
  listPickupWindowsService,
  createPickupWindowService,
} from '../services/inventory.service.js';

export async function getWeeklyTemplate(req, res, next) {
  try {
    const { marketId, dayOfWeek } = req.query;
    if (!marketId || dayOfWeek === undefined) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARAMS',
          message: 'Both marketId and dayOfWeek are required query parameters.',
          fields: [],
        },
      });
    }

    const template = await getWeeklyTemplateService(req.farmerProfile.id, marketId, dayOfWeek);
    res.status(200).json({
      data: template,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateWeeklyTemplate(req, res, next) {
  try {
    const validated = updateWeeklyTemplateSchema.parse(req.body);
    const result = await updateWeeklyTemplateService(req.farmerProfile.id, validated);

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

export async function listStockOffers(req, res, next) {
  try {
    const { date, marketId } = req.query;
    const offers = await listStockOffersService(req.farmerProfile.id, { date, marketId });

    res.status(200).json({
      data: offers,
      meta: {
        total: offers.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createOrUpdateStockOffer(req, res, next) {
  try {
    const validated = createStockOfferSchema.parse(req.body);
    const result = await createOrUpdateStockOfferService(req.farmerProfile.id, validated);

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

export async function updateStockOfferStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = updateStockOfferStatusSchema.parse(req.body);
    const result = await updateStockOfferStatusService(req.farmerProfile.id, id, status);

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

export async function listPickupWindows(req, res, next) {
  try {
    const { farmerId, marketId, date } = req.query;
    const windows = await listPickupWindowsService({ farmerId, marketId, date });

    res.status(200).json({
      data: windows,
      meta: {
        total: windows.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createPickupWindow(req, res, next) {
  try {
    const validated = createPickupWindowSchema.parse(req.body);
    const result = await createPickupWindowService(req.farmerProfile.id, validated);

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
