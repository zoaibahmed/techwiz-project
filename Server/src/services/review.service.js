import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { createNotification } from './notification.service.js';

export async function createReviewService(customerId, data) {
  const db = getDB();
  const cId = new ObjectId(customerId);
  const oId = new ObjectId(data.orderId);
  const tId = new ObjectId(data.targetId);

  // 1. Verify order exists and belongs to customer
  const order = await db.collection('orders').findOne({ _id: oId, customerId: cId });
  if (!order) {
    const err = new Error('Order not found or does not belong to you.');
    err.code = 'ORDER_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  // 2. Order must be completed
  if (order.status !== 'completed') {
    const err = new Error('Only completed orders can be reviewed. Physical pickup must be completed first.');
    err.code = 'ORDER_NOT_COMPLETED';
    err.statusCode = 400;
    throw err;
  }

  // 3. Verify target matches the order contents
  let farmerId = order.farmerId;
  if (data.targetType === 'farmer') {
    const isTargetFarmer =
      order.farmerId?.toString() === data.targetId ||
      order.farmerProfileId?.toString() === data.targetId;

    if (!isTargetFarmer) {
      const err = new Error('The specified farmer does not match the farmer for this order.');
      err.code = 'INVALID_REVIEW_TARGET';
      err.statusCode = 400;
      throw err;
    }
  } else if (data.targetType === 'product') {
    const itemInOrder = order.items.find((i) => i.productId.toString() === data.targetId);
    if (!itemInOrder) {
      const err = new Error('The specified product was not purchased in this order.');
      err.code = 'INVALID_REVIEW_TARGET';
      err.statusCode = 400;
      throw err;
    }
  }

  // 4. Duplicate check via compound query
  const existingReview = await db.collection('reviews').findOne({
    orderId: oId,
    customerId: cId,
    targetType: data.targetType,
    targetId: tId,
  });

  if (existingReview) {
    const err = new Error(`You have already reviewed this ${data.targetType} for this order.`);
    err.code = 'DUPLICATE_REVIEW';
    err.statusCode = 409;
    throw err;
  }

  // 5. Fetch customer details
  const customer = await db.collection('users').findOne({ _id: cId });
  const customerName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Customer';

  const reviewDoc = {
    orderId: oId,
    customerId: cId,
    customerName,
    farmerId: order.farmerId,
    targetType: data.targetType,
    targetId: tId,
    rating: data.rating,
    comment: data.comment,
    moderationStatus: 'approved',
    farmerReply: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('reviews').insertOne(reviewDoc);

  // 6. Recalculate average rating for target
  await updateTargetRatings(db, data.targetType, tId, farmerId);

  // 7. Notify farmer
  if (order.farmerId) {
    await createNotification(
      order.farmerId.toString(),
      'review_received',
      `New ${data.rating}★ Review Received`,
      `${customerName} left a ${data.rating}-star review for ${data.targetType === 'farmer' ? 'your farm' : 'one of your products'}.`,
      { reviewId: result.insertedId.toString(), orderId: oId.toString() }
    );
  }

  return {
    id: result.insertedId.toString(),
    ...reviewDoc,
    orderId: oId.toString(),
    customerId: cId.toString(),
    targetId: tId.toString(),
    farmerId: farmerId ? farmerId.toString() : null,
    createdAt: reviewDoc.createdAt.toISOString(),
    updatedAt: reviewDoc.updatedAt.toISOString(),
  };
}

async function updateTargetRatings(db, targetType, targetId, farmerId) {
  try {
    if (targetType === 'farmer') {
      const stats = await db.collection('reviews').aggregate([
        { $match: { targetType: 'farmer', targetId, moderationStatus: 'approved' } },
        {
          $group: {
            _id: '$targetId',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      if (stats.length > 0) {
        const rating = Math.round(stats[0].avgRating * 10) / 10;
        await db.collection('farmerProfiles').updateOne(
          { $or: [{ userId: targetId }, { _id: targetId }] },
          { $set: { 'metrics.rating': rating, 'metrics.reviewCount': stats[0].count, updatedAt: new Date() } }
        );
      }
    } else if (targetType === 'product') {
      const stats = await db.collection('reviews').aggregate([
        { $match: { targetType: 'product', targetId, moderationStatus: 'approved' } },
        {
          $group: {
            _id: '$targetId',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      if (stats.length > 0) {
        const rating = Math.round(stats[0].avgRating * 10) / 10;
        await db.collection('products').updateOne(
          { _id: targetId },
          { $set: { rating, reviewCount: stats[0].count, updatedAt: new Date() } }
        );
      }
    }
  } catch (err) {
    console.error('[Rating Update Error]:', err.message);
  }
}

export async function getReviewsForTargetService(targetType, targetId) {
  const db = getDB();
  const tId = new ObjectId(targetId);

  const reviews = await db
    .collection('reviews')
    .find({ targetType, targetId: tId, moderationStatus: 'approved' })
    .sort({ createdAt: -1 })
    .toArray();

  const total = reviews.length;
  const avgRating = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 5.0;

  return {
    targetType,
    targetId: targetId.toString(),
    averageRating: Math.round(avgRating * 10) / 10,
    totalReviews: total,
    reviews: reviews.map(formatReviewDoc),
  };
}

export async function getFarmerReviewsService(farmerUserId) {
  const db = getDB();
  const fId = new ObjectId(farmerUserId);
  const profile = await db.collection('farmerProfiles').findOne({ userId: fId });
  const possibleIds = [fId];
  if (profile) possibleIds.push(profile._id);

  const reviews = await db
    .collection('reviews')
    .find({
      $or: [{ farmerId: { $in: possibleIds } }, { targetId: { $in: possibleIds } }],
      moderationStatus: 'approved',
    })
    .sort({ createdAt: -1 })
    .toArray();

  return reviews.map(formatReviewDoc);
}

export async function replyToReviewService(farmerUserId, reviewId, replyText) {
  const db = getDB();
  const fId = new ObjectId(farmerUserId);
  const rId = new ObjectId(reviewId);
  const profile = await db.collection('farmerProfiles').findOne({ userId: fId });
  const possibleIds = [fId];
  if (profile) possibleIds.push(profile._id);

  const review = await db.collection('reviews').findOne({
    _id: rId,
    $or: [{ farmerId: { $in: possibleIds } }, { targetId: { $in: possibleIds } }],
  });

  if (!review) {
    const err = new Error('Review not found or you are not authorised to reply.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const reply = {
    text: replyText,
    repliedAt: new Date(),
    farmerUserId: fId,
  };

  await db.collection('reviews').updateOne(
    { _id: rId },
    { $set: { farmerReply: reply, updatedAt: new Date() } }
  );

  // Notify customer
  await createNotification(
    review.customerId.toString(),
    'review_reply',
    'Farmer Replied to Your Review',
    `The farmer responded: "${replyText.substring(0, 100)}${replyText.length > 100 ? '...' : ''}"`,
    { reviewId: reviewId.toString() }
  );

  const updated = await db.collection('reviews').findOne({ _id: rId });
  return formatReviewDoc(updated);
}

export async function listAdminReviewsService(query = {}) {
  const db = getDB();
  const filter = {};
  if (query.status) filter.moderationStatus = query.status;

  const reviews = await db
    .collection('reviews')
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return reviews.map(formatReviewDoc);
}

export async function moderateReviewService(reviewId, moderationStatus, moderationReason = '') {
  const db = getDB();
  const rId = new ObjectId(reviewId);

  const review = await db.collection('reviews').findOne({ _id: rId });
  if (!review) {
    const err = new Error('Review not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  await db.collection('reviews').updateOne(
    { _id: rId },
    {
      $set: {
        moderationStatus,
        moderationReason,
        updatedAt: new Date(),
      },
    }
  );

  const updated = await db.collection('reviews').findOne({ _id: rId });
  return formatReviewDoc(updated);
}

export async function deleteReviewService(reviewId) {
  const db = getDB();
  const rId = new ObjectId(reviewId);
  const result = await db.collection('reviews').deleteOne({ _id: rId });
  if (result.deletedCount === 0) {
    const err = new Error('Review not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }
  return true;
}

function formatReviewDoc(doc) {
  return {
    id: doc._id.toString(),
    orderId: doc.orderId ? doc.orderId.toString() : null,
    customerId: doc.customerId ? doc.customerId.toString() : null,
    customerName: doc.customerName || 'Anonymous',
    farmerId: doc.farmerId ? doc.farmerId.toString() : null,
    targetType: doc.targetType,
    targetId: doc.targetId ? doc.targetId.toString() : null,
    rating: doc.rating,
    comment: doc.comment,
    moderationStatus: doc.moderationStatus || 'approved',
    farmerReply: doc.farmerReply
      ? {
          text: doc.farmerReply.text,
          repliedAt:
            doc.farmerReply.repliedAt instanceof Date
              ? doc.farmerReply.repliedAt.toISOString()
              : doc.farmerReply.repliedAt,
        }
      : null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}
