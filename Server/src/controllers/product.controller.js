import {
  createProductSchema,
  updateProductSchema,
} from '../validation/product.schema.js';
import {
  listProductsPublicService,
  getProductByIdPublicService,
  listFarmerProductsService,
  createFarmerProductService,
  updateFarmerProductService,
  archiveFarmerProductService,
  listProductsAdminService,
  moderateProductAdminService,
} from '../services/product.service.js';

export async function listProductsPublic(req, res, next) {
  try {
    const { categoryId, marketId, day, search, minPrice, maxPrice, sort, page, limit } = req.query;
    const result = await listProductsPublicService({
      categoryId,
      marketId,
      day,
      search,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    });

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

export async function getProductByIdPublic(req, res, next) {
  try {
    const { id } = req.params;
    const product = await getProductByIdPublicService(id);

    res.status(200).json({
      data: product,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listFarmerProducts(req, res, next) {
  try {
    const products = await listFarmerProductsService(req.farmerProfile.id);

    res.status(200).json({
      data: products,
      meta: {
        total: products.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createFarmerProduct(req, res, next) {
  try {
    const validated = createProductSchema.parse(req.body);
    const result = await createFarmerProductService(req.farmerProfile.id, validated);

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

export async function updateFarmerProduct(req, res, next) {
  try {
    const { id } = req.params;
    const validated = updateProductSchema.parse(req.body);
    const result = await updateFarmerProductService(req.farmerProfile.id, id, validated);

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

export async function archiveFarmerProduct(req, res, next) {
  try {
    const { id } = req.params;
    const result = await archiveFarmerProductService(req.farmerProfile.id, id);

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

export async function listProductsAdmin(req, res, next) {
  try {
    const products = await listProductsAdminService(req.query);
    res.status(200).json({
      data: products,
      meta: {
        total: products.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function moderateProductAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { status, moderationReason } = req.body;
    const result = await moderateProductAdminService(req.user.id, id, { status, moderationReason });
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
