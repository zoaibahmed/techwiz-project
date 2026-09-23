import { categorySchema } from '../validation/market.schema.js';
import {
  listCategoriesService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from '../services/category.service.js';

export async function listCategories(req, res, next) {
  try {
    const categories = await listCategoriesService();
    res.status(200).json({
      data: categories,
      meta: {
        total: categories.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createCategoryAdmin(req, res, next) {
  try {
    const validated = categorySchema.parse(req.body);
    const result = await createCategoryService(req.user.id, validated);

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

export async function updateCategoryAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const validated = categorySchema.partial().parse(req.body);
    const result = await updateCategoryService(req.user.id, id, validated);

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

export async function deleteCategoryAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const result = await deleteCategoryService(req.user.id, id);

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
