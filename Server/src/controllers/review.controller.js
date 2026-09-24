import {
  createReviewSchema,
  replyReviewSchema,
  updateReviewModerationSchema,
} from '../validation/review.schema.js';
import {
  createReviewService,
  getReviewsForTargetService,
  getFarmerReviewsService,
  replyToReviewService,
  listAdminReviewsService,
  moderateReviewService,
  deleteReviewService,
} from '../services/review.service.js';

export async function createReview(req, res, next) {
  try {
    const validatedData = createReviewSchema.parse(req.body);
    const review = await createReviewService(req.user.id, validatedData);
    res.status(201).json({
      data: review,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getFarmerReviewsPublic(req, res, next) {
  try {
    const data = await getReviewsForTargetService('farmer', req.params.id);
    res.status(200).json({
      data,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductReviewsPublic(req, res, next) {
  try {
    const data = await getReviewsForTargetService('product', req.params.id);
    res.status(200).json({
      data,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function getFarmerReviews(req, res, next) {
  try {
    const reviews = await getFarmerReviewsService(req.user.id);
    res.status(200).json({
      data: reviews,
      meta: { total: reviews.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function replyToReview(req, res, next) {
  try {
    const { replyText } = replyReviewSchema.parse(req.body);
    const review = await replyToReviewService(req.user.id, req.params.id, replyText);
    res.status(200).json({
      data: review,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function listAdminReviews(req, res, next) {
  try {
    const reviews = await listAdminReviewsService(req.query);
    res.status(200).json({
      data: reviews,
      meta: { total: reviews.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function moderateReview(req, res, next) {
  try {
    const { moderationStatus, moderationReason } = updateReviewModerationSchema.parse(req.body);
    const review = await moderateReviewService(req.params.id, moderationStatus, moderationReason);
    res.status(200).json({
      data: review,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteReview(req, res, next) {
  try {
    await deleteReviewService(req.params.id);
    res.status(200).json({
      data: { success: true, message: 'Review deleted successfully.' },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
}
