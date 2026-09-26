import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { createNotification } from './notification.service.js';

export async function createReviewService(customerId, data) {
  const db = getDB();
  const cId = new ObjectId(customerId);
  const tId = new ObjectId(data.targetId);

  const customer = await db.collection('users').findOne({ _id: cId });
  if (!customer || customer.isActive === false) {
    throw reviewError('Your account cannot post reviews right now.', 'ACCOUNT_INACTIVE', 403);
  }

  let order = null;
  let farmerProfile = null;
  if (data.orderId) {
    // 1. A review tied to an order: the order must be this customer's and collected.
    order = await db.collection('orders').findOne({ _id: new ObjectId(data.orderId), customerId: cId });
    if (!order) throw reviewError('Order not found or does not belong to you.', 'ORDER_NOT_FOUND', 404);
    if (order.status !== 'completed') {
      throw reviewError('Only completed orders can be reviewed. Physical pickup must be completed first.', 'ORDER_NOT_COMPLETED', 400);
    }
    if (data.targetType === 'farmer') {
      const isTargetFarmer = order.farmerId?.toString() === data.targetId || order.farmerProfileId?.toString() === data.targetId;
      if (!isTargetFarmer) throw reviewError('The specified farmer does not match the farmer for this order.', 'INVALID_REVIEW_TARGET', 400);
    } else if (!order.items.some((i) => i.productId.toString() === data.targetId)) {
      throw reviewError('The specified product was not purchased in this order.', 'INVALID_REVIEW_TARGET', 400);
    }
  } else if (data.targetType !== 'farmer') {
    throw reviewError('Product reviews need a collected order.', 'ORDER_REQUIRED', 400);
  }

  // 2. Farmer reviews always point at the grower's profile, whichever id was sent.
  let targetId = tId;
  let farmerId = order?.farmerId ?? null;
  if (data.targetType === 'farmer') {
    farmerProfile = await findFarmerProfile(db, tId);
    if (!farmerProfile || farmerProfile.approvalStatus !== 'approved') {
      throw reviewError('This grower is not accepting reviews.', 'INVALID_REVIEW_TARGET', 404);
    }
    targetId = farmerProfile._id;
    farmerId = farmerProfile.userId ?? farmerId;
  }

  // 3. One review per order and target; without an order, one open review per grower.
  const duplicate = await db.collection('reviews').findOne(
    order
      ? { orderId: order._id, customerId: cId, targetType: data.targetType, targetId: { $in: [targetId, tId] } }
      : { orderId: null, customerId: cId, targetType: 'farmer', targetId, moderationStatus: { $in: ['pending', 'approved'] } }
  );
  if (duplicate) {
    const waiting = duplicate.moderationStatus === 'pending';
    throw reviewError(
      waiting ? 'Your review is waiting for approval.' : `You have already reviewed this ${data.targetType}${order ? ' for this order' : ''}.`,
      'DUPLICATE_REVIEW',
      409
    );
  }

  // Verified when the customer has actually collected an order from this grower.
  const verified = order
    ? true
    : !!(await db.collection('orders').findOne({
        customerId: cId,
        status: 'completed',
        $or: [{ farmerProfileId: targetId }, { farmerId }],
      }));

  const customerName = customer?.name || [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || 'Customer';
  const now = new Date();
  const reviewDoc = {
    orderId: order?._id ?? null,
    customerId: cId,
    customerName,
    farmerId,
    targetType: data.targetType,
    targetId,
    rating: data.rating,
    comment: data.comment,
    verified,
    // Every review waits for an administrator before it is published or counted.
    moderationStatus: 'pending',
    farmerReply: null,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection('reviews').insertOne(reviewDoc);

  // 4. Tell administrators there is a review to moderate.
  const admins = await db
    .collection('users')
    .find({ role: 'admin', isActive: { $ne: false } }, { projection: { _id: 1 } })
    .toArray();
  const subject = data.targetType === 'farmer' ? farmerProfile?.businessName || 'a grower' : 'a product';
  await Promise.all(
    admins.map((a) =>
      createNotification(
        a._id.toString(),
        'review_pending',
        'Review waiting for approval',
        `${customerName} left a ${data.rating}-star review for ${subject}.`,
        { reviewId: result.insertedId.toString() }
      )
    )
  );

  return formatReviewDoc({ _id: result.insertedId, ...reviewDoc });
}

function reviewError(message, code, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

/** A farmer profile by its own id or by its owner's user id. */
async function findFarmerProfile(db, id) {
  return db.collection('farmerProfiles').findOne({ $or: [{ _id: id }, { userId: id }] });
}

async function updateTargetRatings(db, targetType, targetId) {
  try {
    if (targetType === 'farmer') {
      const profile = await findFarmerProfile(db, targetId);
      if (!profile) return;
      const ids = [profile._id, profile.userId].filter(Boolean);
      const [stats] = await db
        .collection('reviews')
        .aggregate([
          { $match: { targetType: 'farmer', targetId: { $in: ids }, moderationStatus: 'approved' } },
          { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
        ])
        .toArray();
      // A grower's stars are the average of their approved reviews only.
      await db.collection('farmerProfiles').updateOne(
        { _id: profile._id },
        {
          $set: {
            'metrics.rating': stats ? Math.round(stats.avgRating * 10) / 10 : 0,
            'metrics.reviewCount': stats?.count ?? 0,
            updatedAt: new Date(),
          },
        }
      );
    } else if (targetType === 'product') {
      const [stats] = await db
        .collection('reviews')
        .aggregate([
          { $match: { targetType: 'product', targetId, moderationStatus: 'approved' } },
          { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
        ])
        .toArray();
      await db.collection('products').updateOne(
        { _id: targetId },
        {
          $set: {
            rating: stats ? Math.round(stats.avgRating * 10) / 10 : 0,
            reviewCount: stats?.count ?? 0,
            updatedAt: new Date(),
          },
        }
      );
    }
  } catch (err) {
    console.error('[Rating Update Error]:', err.message);
  }
}

export async function getReviewsForTargetService(targetType, targetId) {
  const db = getDB();
  const tId = new ObjectId(targetId);
  let ids = [tId];
  if (targetType === 'farmer') {
    const profile = await findFarmerProfile(db, tId);
    if (profile) ids = [profile._id, profile.userId].filter(Boolean);
  }

  const reviews = await db
    .collection('reviews')
    .find({ targetType, targetId: { $in: ids }, moderationStatus: 'approved' })
    .sort({ createdAt: -1 })
    .toArray();

  const total = reviews.length;
  const avgRating = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;

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
  if (!review) throw reviewError('Review not found.', 'NOT_FOUND', 404);

  const now = new Date();
  await db.collection('reviews').updateOne(
    { _id: rId },
    { $set: { moderationStatus, moderationReason, moderatedAt: now, updatedAt: now } }
  );

  // Stars only change when a review enters or leaves the approved set.
  const wasApproved = review.moderationStatus === 'approved';
  const isApproved = moderationStatus === 'approved';
  if (wasApproved !== isApproved) await updateTargetRatings(db, review.targetType, review.targetId);

  if (isApproved && !wasApproved) {
    if (review.farmerId) {
      await createNotification(
        review.farmerId.toString(),
        'review_received',
        `New ${review.rating}-star review on your stall`,
        `${review.customerName || 'A customer'} left a ${review.rating}-star review. It is now public.`,
        { reviewId: reviewId.toString() }
      );
    }
    await createNotification(
      review.customerId.toString(),
      'review_approved',
      'Your review is published',
      "Thank you. Your review now appears on the grower's stall.",
      {
        reviewId: reviewId.toString(),
        ...(review.targetType === 'farmer' ? { farmerProfileId: review.targetId.toString() } : {}),
      }
    );
  } else if (moderationStatus === 'rejected' && review.moderationStatus === 'pending') {
    await createNotification(
      review.customerId.toString(),
      'review_rejected',
      'Your review was not published',
      moderationReason ? `Reason: ${moderationReason}` : 'It did not meet our review guidelines.',
      { reviewId: reviewId.toString() }
    );
  }

  const updated = await db.collection('reviews').findOne({ _id: rId });
  return formatReviewDoc(updated);
}

export async function deleteReviewService(reviewId) {
  const db = getDB();
  const rId = new ObjectId(reviewId);
  const review = await db.collection('reviews').findOne({ _id: rId });
  if (!review) throw reviewError('Review not found.', 'NOT_FOUND', 404);
  await db.collection('reviews').deleteOne({ _id: rId });
  if (review.moderationStatus === 'approved') await updateTargetRatings(db, review.targetType, review.targetId);
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
    moderationReason: doc.moderationReason || '',
    verified: doc.verified ?? !!doc.orderId,
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
