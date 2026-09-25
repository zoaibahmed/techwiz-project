import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { getDB } from '../config/db.js';
import { createNotification } from './notification.service.js';

/**
 * Generate formatted order reference number: ML-YYYYMMDD-HEX
 */
function generateOrderNumber(dateStr) {
  const cleanDate = dateStr.replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ML-${cleanDate}-${rand}`;
}

/**
 * Customer Cart-to-Checkout with Concurrency Control & Multi-Farmer Grouping
 */
export async function checkoutService(customerId, data) {
  const db = getDB();
  const cId = new ObjectId(customerId);
  const mId = new ObjectId(data.marketId);
  const pwId = new ObjectId(data.pickupWindowId);

  // 1. Idempotency Check
  if (data.idempotencyKey) {
    const existingOrders = await db
      .collection('orders')
      .find({
        customerId: cId,
        $or: [
          { checkoutKey: data.idempotencyKey },
          { idempotencyKey: { $regex: new RegExp(`^${data.idempotencyKey}`) } },
        ],
      })
      .toArray();

    if (existingOrders.length > 0) {
      return {
        isIdempotentReplay: true,
        checkoutGroupId: existingOrders[0].checkoutGroupId,
        orders: existingOrders.map(formatOrderDoc),
      };
    }
  }

  // 2. Validate Market
  const market = await db.collection('markets').findOne({ _id: mId, isActive: true });
  if (!market) {
    const err = new Error('Market not found or is currently inactive.');
    err.code = 'MARKET_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  // 3. Validate Pickup Window & Cutoff
  const pickupWindow = await db.collection('pickupWindows').findOne({
    _id: pwId,
    marketId: mId,
    date: data.marketDate,
  });

  if (!pickupWindow) {
    const err = new Error('Selected pickup window does not exist for this market date.');
    err.code = 'PICKUP_WINDOW_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  const cutoffTime = new Date(pickupWindow.cutoffAt);
  if (now >= cutoffTime) {
    const err = new Error('The pre-order cutoff time for this pickup window has passed.');
    err.code = 'CUTOFF_PASSED';
    err.statusCode = 400;
    throw err;
  }

  const capacity = pickupWindow.capacity ?? pickupWindow.maxCapacity ?? 50;
  const currentReservations = pickupWindow.reservedOrdersCount ?? pickupWindow.currentReservations ?? 0;
  if (currentReservations >= capacity) {
    const err = new Error('The selected pickup window is fully booked.');
    err.code = 'PICKUP_WINDOW_FULL';
    err.statusCode = 400;
    throw err;
  }

  // 4. Validate Products & Dated Stock Availability
  const productIds = data.items.map((i) => new ObjectId(i.productId));
  const products = await db
    .collection('products')
    .find({ _id: { $in: productIds } })
    .toArray();

  if (products.length !== productIds.length) {
    const err = new Error('One or more selected products are inactive or no longer available.');
    err.code = 'INVALID_PRODUCTS';
    err.statusCode = 400;
    throw err;
  }

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // Verify farmer approval (matches either farmerProfile._id or farmerProfile.userId)
  const rawFarmerIds = [...new Set(products.map((p) => p.farmerId.toString()))].map((id) => new ObjectId(id));
  const farmerProfiles = await db
    .collection('farmerProfiles')
    .find({
      $or: [{ _id: { $in: rawFarmerIds } }, { userId: { $in: rawFarmerIds } }],
      approvalStatus: 'approved',
    })
    .toArray();

  if (farmerProfiles.length === 0) {
    const err = new Error('One or more farmers supplying items are not currently approved.');
    err.code = 'FARMER_NOT_APPROVED';
    err.statusCode = 400;
    throw err;
  }

  const farmerProfileMap = new Map();
  for (const fp of farmerProfiles) {
    farmerProfileMap.set(fp._id.toString(), fp);
    farmerProfileMap.set(fp.userId.toString(), fp);
  }

  // Check stock offers for each item
  const stockOffers = await db
    .collection('stockOffers')
    .find({
      marketId: mId,
      productId: { $in: productIds },
      date: data.marketDate,
      status: 'available',
    })
    .toArray();

  const stockOfferMap = new Map(stockOffers.map((so) => [so.productId.toString(), so]));

  for (const item of data.items) {
    const offer = stockOfferMap.get(item.productId);
    if (!offer || offer.availableQuantity < item.quantity) {
      const p = productMap.get(item.productId);
      const err = new Error(`Insufficient stock for "${p.name}". Available: ${offer ? offer.availableQuantity : 0} ${p.unit}`);
      err.code = 'INSUFFICIENT_STOCK';
      err.statusCode = 400;
      err.details = {
        productId: item.productId,
        productName: p.name,
        requestedQuantity: item.quantity,
        availableQuantity: offer ? offer.availableQuantity : 0,
      };
      throw err;
    }
  }

  // 5. Atomic Stock Reservation with Rollback on Contention
  const reservedOfferUpdates = [];
  try {
    for (const item of data.items) {
      const offer = stockOfferMap.get(item.productId);
      const res = await db.collection('stockOffers').updateOne(
        {
          _id: offer._id,
          availableQuantity: { $gte: item.quantity },
        },
        {
          $inc: {
            reservedQuantity: item.quantity,
            availableQuantity: -item.quantity,
          },
          $set: { updatedAt: new Date() },
        }
      );

      if (res.modifiedCount === 0) {
        // Contention: another customer took the stock between check and reserve
        const p = productMap.get(item.productId);
        const err = new Error(`Stock contention: "${p.name}" was just reserved by another buyer.`);
        err.code = 'INSUFFICIENT_STOCK';
        err.statusCode = 409;
        throw err;
      }

      reservedOfferUpdates.push({ offerId: offer._id, quantity: item.quantity });
    }
  } catch (reservationError) {
    // Rollback any successfully reserved offers in this failed attempt
    for (const rollback of reservedOfferUpdates) {
      await db.collection('stockOffers').updateOne(
        { _id: rollback.offerId },
        {
          $inc: {
            reservedQuantity: -rollback.quantity,
            availableQuantity: rollback.quantity,
          },
          $set: { updatedAt: new Date() },
        }
      );
    }
    throw reservationError;
  }

  // 6. Group Items by Farmer
  const checkoutGroupId = `CG-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const farmerGroups = new Map();

  for (const item of data.items) {
    const product = productMap.get(item.productId);
    const farmerProfile = farmerProfileMap.get(product.farmerId.toString());
    if (!farmerProfile) {
      const err = new Error('Farmer profile not found for product.');
      err.code = 'FARMER_NOT_APPROVED';
      err.statusCode = 400;
      throw err;
    }
    const farmerUserIdStr = farmerProfile.userId.toString();
    const offer = stockOfferMap.get(item.productId);

    if (!farmerGroups.has(farmerUserIdStr)) {
      farmerGroups.set(farmerUserIdStr, []);
    }

    const unitPriceMinor = offer.priceMinor || product.basePriceMinor;
    const subtotalMinor = Math.round(unitPriceMinor * item.quantity);

    farmerGroups.get(farmerUserIdStr).push({
      productId: product._id,
      name: product.name,
      unit: product.unit,
      unitPriceMinor,
      quantity: item.quantity,
      subtotalMinor,
    });
  }

  // 7. Create Orders in MongoDB
  const createdOrders = [];
  const customerUser = await db.collection('users').findOne({ _id: cId });

  for (const [farmerUserIdStr, items] of farmerGroups.entries()) {
    const farmerProfile = farmerProfileMap.get(farmerUserIdStr);
    const totalAmountMinor = items.reduce((sum, i) => sum + i.subtotalMinor, 0);
    const orderNumber = generateOrderNumber(data.marketDate);

    const cutoffIso = pickupWindow.cutoffAt instanceof Date
      ? pickupWindow.cutoffAt.toISOString()
      : new Date(pickupWindow.cutoffAt).toISOString();

    const orderDoc = {
      orderNumber,
      checkoutGroupId,
      customerId: cId,
      customerSnapshot: {
        name: customerUser ? customerUser.name : 'Valued Customer',
        phone: customerUser ? customerUser.phone : '',
        email: customerUser ? customerUser.email : '',
      },
      farmerId: new ObjectId(farmerUserIdStr),
      farmerProfileId: farmerProfile._id,
      farmerSnapshot: {
        businessName: farmerProfile.businessName,
        contactPerson: farmerProfile.contactPerson,
        stallNumber: farmerProfile.stallNumber || 'Assigned on Market Day',
        phone: farmerProfile.phone || '',
      },
      marketId: mId,
      marketSnapshot: {
        name: market.name,
        address: market.address,
        city: market.city || '',
        countryCode: market.countryCode || 'PK',
        timezone: market.timezone || 'Asia/Karachi',
        currency: market.currency || 'PKR',
      },
      marketDate: data.marketDate,
      pickupWindow: {
        id: pickupWindow._id.toString(),
        startTime: pickupWindow.startTime || '',
        endTime: pickupWindow.endTime || '',
        cutoffAt: cutoffIso,
      },
      items,
      totalAmountMinor,
      currency: market.currency || 'PKR',
      status: 'placed',
      payment: {
        method: 'pay_at_pickup',
        status: 'pending_pickup',
        paidAmountMinor: 0,
      },
      ...(data.idempotencyKey
        ? {
            checkoutKey: data.idempotencyKey,
            idempotencyKey: `${data.idempotencyKey}:${farmerUserIdStr}`,
          }
        : {}),
      customerNotes: data.customerNotes || '',
      statusHistory: [
        {
          status: 'placed',
          changedBy: cId,
          role: 'customer',
          note: 'Order placed by customer via pre-order checkout.',
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertRes = await db.collection('orders').insertOne(orderDoc);
    orderDoc._id = insertRes.insertedId;
    createdOrders.push(orderDoc);

    // Increment pickup window reserved orders count
    await db.collection('pickupWindows').updateOne(
      { _id: pwId },
      {
        $inc: { reservedOrdersCount: 1, currentReservations: 1 },
        $set: { updatedAt: new Date() },
      }
    );

    // Notify Farmer of new pre-order
    await createNotification(
      farmerUserIdStr,
      'order_received',
      'New Market Pre-Order Received',
      `Order ${orderNumber} placed for ${data.marketDate} (${items.length} items, PKR ${(totalAmountMinor / 100).toFixed(2)}).`,
      { orderId: orderDoc._id.toString(), orderNumber }
    );
  }

  // Notify Customer of confirmed reservation
  await createNotification(
    customerId,
    'order_placed',
    'Pre-Order Confirmed for Market Pickup',
    `Your order has been reserved for pickup at ${market.name} on ${data.marketDate}. Pay at pickup.`,
    { checkoutGroupId, orderCount: createdOrders.length }
  );

  return {
    isIdempotentReplay: false,
    checkoutGroupId,
    orders: createdOrders.map(formatOrderDoc),
  };
}

/**
 * Customer Order History
 */
export async function listCustomerOrdersService(customerId, filters = {}) {
  const db = getDB();
  const query = { customerId: new ObjectId(customerId) };

  if (filters.status) {
    if (['accepted', 'confirmed'].includes(filters.status)) {
      query.status = { $in: ['accepted', 'confirmed'] };
    } else {
      query.status = filters.status;
    }
  }
  if (filters.marketDate) query.marketDate = filters.marketDate;
  if (filters.marketId) query.marketId = new ObjectId(filters.marketId);

  const orders = await db
    .collection('orders')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return orders.map(formatOrderDoc);
}

/**
 * Customer Order Detail
 */
export async function getCustomerOrderByIdService(customerId, orderId) {
  const db = getDB();
  const oId = new ObjectId(orderId);
  const cId = new ObjectId(customerId);

  const order = await db.collection('orders').findOne({ _id: oId, customerId: cId });
  if (!order) {
    const err = new Error('Order not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  return formatOrderDoc(order);
}

/**
 * Customer Order Modification (Before Cutoff)
 */
export async function modifyCustomerOrderService(customerId, orderId, newItems) {
  const db = getDB();
  const oId = new ObjectId(orderId);
  const cId = new ObjectId(customerId);

  const order = await db.collection('orders').findOne({ _id: oId, customerId: cId });
  if (!order) {
    const err = new Error('Order not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (order.status !== 'placed') {
    const err = new Error(`Cannot modify order with status "${order.status}". Only "placed" orders can be edited.`);
    err.code = 'CANNOT_MODIFY_STATUS';
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  if (now >= new Date(order.pickupWindow.cutoffAt)) {
    const err = new Error('The cutoff time for this order has passed. Modifications are closed.');
    err.code = 'CUTOFF_PASSED';
    err.statusCode = 400;
    throw err;
  }

  // Calculate stock adjustments for each item
  const oldItemMap = new Map(order.items.map((i) => [i.productId.toString(), i]));
  const updatedItems = [];
  const stockAdjustments = [];

  for (const newItem of newItems) {
    const productIdStr = newItem.productId;
    const oldItem = oldItemMap.get(productIdStr);

    if (!oldItem) {
      const err = new Error('Adding new unreserved products during modification is not supported. Please place an additional order.');
      err.code = 'CANNOT_ADD_NEW_PRODUCT';
      err.statusCode = 400;
      throw err;
    }

    const delta = newItem.quantity - oldItem.quantity;
    if (delta !== 0) {
      stockAdjustments.push({
        productId: new ObjectId(productIdStr),
        delta,
      });
    }

    const subtotalMinor = Math.round(oldItem.unitPriceMinor * newItem.quantity);
    updatedItems.push({
      ...oldItem,
      quantity: newItem.quantity,
      subtotalMinor,
    });
  }

  // Apply atomic adjustments to stock offers
  for (const adj of stockAdjustments) {
    if (adj.delta > 0) {
      // Need more stock: atomic reservation
      const res = await db.collection('stockOffers').updateOne(
        {
          marketId: order.marketId,
          productId: adj.productId,
          date: order.marketDate,
          availableQuantity: { $gte: adj.delta },
        },
        {
          $inc: {
            reservedQuantity: adj.delta,
            availableQuantity: -adj.delta,
          },
          $set: { updatedAt: new Date() },
        }
      );

      if (res.modifiedCount === 0) {
        const err = new Error('Insufficient additional stock available to increase order quantity.');
        err.code = 'INSUFFICIENT_STOCK';
        err.statusCode = 400;
        throw err;
      }
    } else if (adj.delta < 0) {
      // Releasing stock
      const releaseQty = Math.abs(adj.delta);
      await db.collection('stockOffers').updateOne(
        {
          marketId: order.marketId,
          productId: adj.productId,
          date: order.marketDate,
        },
        {
          $inc: {
            reservedQuantity: -releaseQty,
            availableQuantity: releaseQty,
          },
          $set: { updatedAt: new Date() },
        }
      );
    }
  }

  const totalAmountMinor = updatedItems.reduce((sum, i) => sum + i.subtotalMinor, 0);

  await db.collection('orders').updateOne(
    { _id: oId },
    {
      $set: {
        items: updatedItems,
        totalAmountMinor,
        updatedAt: new Date(),
      },
      $push: {
        statusHistory: {
          status: 'placed',
          changedBy: cId,
          role: 'customer',
          note: 'Customer adjusted item quantities before cutoff.',
          timestamp: new Date(),
        },
      },
    }
  );

  // Notify farmer
  await createNotification(
    order.farmerId.toString(),
    'order_modified',
    'Order Modified by Customer',
    `Customer adjusted items for ${order.orderNumber}. New total: PKR ${(totalAmountMinor / 100).toFixed(2)}.`,
    { orderId: orderId, orderNumber: order.orderNumber }
  );

  const updatedOrder = await db.collection('orders').findOne({ _id: oId });
  return formatOrderDoc(updatedOrder);
}

/**
 * Customer Order Cancellation & Immediate Stock Release (Before Cutoff)
 */
export async function cancelCustomerOrderService(customerId, orderId, reason = '') {
  const db = getDB();
  const oId = new ObjectId(orderId);
  const cId = new ObjectId(customerId);

  const order = await db.collection('orders').findOne({ _id: oId, customerId: cId });
  if (!order) {
    const err = new Error('Order not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (!['placed', 'accepted', 'confirmed'].includes(order.status)) {
    const err = new Error(`Cannot cancel order in "${order.status}" status.`);
    err.code = 'CANNOT_CANCEL_STATUS';
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  if (now >= new Date(order.pickupWindow.cutoffAt)) {
    const err = new Error('The cancellation cutoff time for this order has passed.');
    err.code = 'CUTOFF_PASSED';
    err.statusCode = 400;
    throw err;
  }

  // Atomically release all reserved stock back to stockOffers
  for (const item of order.items) {
    await db.collection('stockOffers').updateOne(
      {
        marketId: order.marketId,
        productId: item.productId,
        date: order.marketDate,
      },
      {
        $inc: {
          reservedQuantity: -item.quantity,
          availableQuantity: item.quantity,
        },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // Decrement pickup window reserved count
  await db.collection('pickupWindows').updateOne(
    { _id: new ObjectId(order.pickupWindow.id) },
    { $inc: { reservedOrdersCount: -1 }, $set: { updatedAt: new Date() } }
  );

  // Update order status
  await db.collection('orders').updateOne(
    { _id: oId },
    {
      $set: {
        status: 'cancelled',
        cancellationReason: reason || 'Cancelled by customer before cutoff.',
        updatedAt: new Date(),
      },
      $push: {
        statusHistory: {
          status: 'cancelled',
          changedBy: cId,
          role: 'customer',
          note: reason || 'Cancelled by customer before cutoff.',
          timestamp: new Date(),
        },
      },
    }
  );

  // Notify farmer
  await createNotification(
    order.farmerId.toString(),
    'order_cancelled',
    'Customer Cancelled Pre-Order',
    `Order ${order.orderNumber} was cancelled. Reserved produce has been released to available stock.`,
    { orderId: orderId, orderNumber: order.orderNumber }
  );

  const updatedOrder = await db.collection('orders').findOne({ _id: oId });
  return formatOrderDoc(updatedOrder);
}

/**
 * Farmer Order Management
 */
export async function listFarmerOrdersService(farmerUserId, filters = {}) {
  const db = getDB();
  const fId = new ObjectId(farmerUserId);
  const profile = await db.collection('farmerProfiles').findOne({ userId: fId });
  const possibleFarmerIds = [fId];
  if (profile) possibleFarmerIds.push(profile._id);

  const query = {
    $or: [{ farmerId: { $in: possibleFarmerIds } }, { farmerProfileId: { $in: possibleFarmerIds } }],
  };

  if (filters.status) {
    if (['accepted', 'confirmed'].includes(filters.status)) {
      query.status = { $in: ['accepted', 'confirmed'] };
    } else {
      query.status = filters.status;
    }
  }
  if (filters.marketDate) query.marketDate = filters.marketDate;
  if (filters.marketId) query.marketId = new ObjectId(filters.marketId);

  const orders = await db
    .collection('orders')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return orders.map(formatOrderDoc);
}

/**
 * Farmer Order Detail
 */
export async function getFarmerOrderByIdService(farmerUserId, orderId) {
  const db = getDB();
  const oId = new ObjectId(orderId);
  const fId = new ObjectId(farmerUserId);
  const profile = await db.collection('farmerProfiles').findOne({ userId: fId });
  const possibleFarmerIds = [fId];
  if (profile) possibleFarmerIds.push(profile._id);

  const order = await db.collection('orders').findOne({
    _id: oId,
    $or: [{ farmerId: { $in: possibleFarmerIds } }, { farmerProfileId: { $in: possibleFarmerIds } }],
  });
  if (!order) {
    const err = new Error('Order not found for this farmer.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  return formatOrderDoc(order);
}

/**
 * Farmer Order Status Transitions: Accept, Decline, Ready for Pickup, Complete
 */
export async function updateFarmerOrderStatusService(farmerUserId, orderId, nextStatus, reason = '') {
  const db = getDB();
  const oId = new ObjectId(orderId);
  const fId = new ObjectId(farmerUserId);
  const profile = await db.collection('farmerProfiles').findOne({ userId: fId });
  const possibleFarmerIds = [fId];
  if (profile) possibleFarmerIds.push(profile._id);

  const order = await db.collection('orders').findOne({
    _id: oId,
    $or: [{ farmerId: { $in: possibleFarmerIds } }, { farmerProfileId: { $in: possibleFarmerIds } }],
  });
  if (!order) {
    const err = new Error('Order not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const canonicalNextStatus = nextStatus === 'confirmed' ? 'accepted' : nextStatus;
  const currentStatus = order.status === 'confirmed' ? 'accepted' : order.status;

  // Validate state machine transitions
  const allowedTransitions = {
    placed: ['accepted', 'declined'],
    accepted: ['ready_for_pickup'],
    ready_for_pickup: ['completed'],
  };

  const validNextStates = allowedTransitions[currentStatus] || [];
  if (!validNextStates.includes(canonicalNextStatus)) {
    const err = new Error(`Invalid status transition from "${currentStatus}" to "${canonicalNextStatus}".`);
    err.code = 'INVALID_STATUS_TRANSITION';
    err.statusCode = 400;
    throw err;
  }

  const updateFields = {
    status: canonicalNextStatus,
    updatedAt: new Date(),
  };

  // Decline: Release stock and decrement pickup window count
  if (canonicalNextStatus === 'declined') {
    if (!reason) {
      const err = new Error('A reason is required when declining an order.');
      err.code = 'REASON_REQUIRED';
      err.statusCode = 400;
      throw err;
    }

    for (const item of order.items) {
      await db.collection('stockOffers').updateOne(
        {
          marketId: order.marketId,
          productId: item.productId,
          date: order.marketDate,
        },
        {
          $inc: {
            reservedQuantity: -item.quantity,
            availableQuantity: item.quantity,
          },
          $set: { updatedAt: new Date() },
        }
      );
    }

    await db.collection('pickupWindows').updateOne(
      { _id: new ObjectId(order.pickupWindow.id) },
      { $inc: { reservedOrdersCount: -1 }, $set: { updatedAt: new Date() } }
    );

    updateFields.declineReason = reason;

    await createNotification(
      order.customerId.toString(),
      'order_declined',
      'Order Declined by Farmer',
      `Farmer declined ${order.orderNumber}. Reason: ${reason}.`,
      { orderId: orderId, orderNumber: order.orderNumber }
    );
  }

  // Ready for pickup notification
  if (nextStatus === 'ready_for_pickup') {
    await createNotification(
      order.customerId.toString(),
      'order_ready',
      'Order Ready for Pickup!',
      `Your produce for ${order.orderNumber} is packed and ready at ${order.farmerSnapshot.stallNumber}.`,
      { orderId: orderId, orderNumber: order.orderNumber }
    );
  }

  // Completed: Physical pickup done, pay at pickup confirmed
  if (nextStatus === 'completed') {
    updateFields['payment.status'] = 'paid_at_pickup';
    updateFields['payment.paidAt'] = new Date();
    updateFields['payment.paidAmountMinor'] = order.totalAmountMinor;

    // Permanently decrement reservedQuantity and totalQuantity
    for (const item of order.items) {
      await db.collection('stockOffers').updateOne(
        {
          marketId: order.marketId,
          productId: item.productId,
          date: order.marketDate,
        },
        {
          $inc: {
            reservedQuantity: -item.quantity,
            totalQuantity: -item.quantity,
          },
          $set: { updatedAt: new Date() },
        }
      );
    }

    await createNotification(
      order.customerId.toString(),
      'order_completed',
      'Order Completed — Thank You!',
      `Pickup completed for ${order.orderNumber}. You can now leave a review for ${order.farmerSnapshot.businessName}.`,
      { orderId: orderId, orderNumber: order.orderNumber }
    );
  }

  // Accepted notification
  if (canonicalNextStatus === 'accepted') {
    await createNotification(
      order.customerId.toString(),
      'order_accepted',
      'Order Accepted by Farmer',
      `Farmer accepted your order ${order.orderNumber} for pickup on ${order.marketDate}.`,
      { orderId: orderId, orderNumber: order.orderNumber }
    );
  }

  await db.collection('orders').updateOne(
    { _id: oId },
    {
      $set: updateFields,
      $push: {
        statusHistory: {
          status: canonicalNextStatus,
          changedBy: fId,
          role: 'farmer',
          note: reason || `Order status updated to ${canonicalNextStatus} by farmer.`,
          timestamp: new Date(),
        },
      },
    }
  );

  const updatedOrder = await db.collection('orders').findOne({ _id: oId });
  return formatOrderDoc(updatedOrder);
}

/**
 * Format DB order document for JSON response
 */
function formatOrderDoc(doc) {
  const rawItems = doc.items || (doc.lines ? doc.lines.map((l) => ({
    productId: l.productId,
    name: l.productNameSnapshot || l.name || '',
    unit: l.unitSnapshot || l.unit || '',
    unitPriceMinor: l.unitPriceMinorSnapshot || l.unitPriceMinor || 0,
    quantity: l.quantity || 0,
    subtotalMinor: l.lineTotalMinor || l.subtotalMinor || 0,
  })) : []);

  const items = rawItems.map((i) => ({
    productId: i.productId ? i.productId.toString() : '',
    name: i.name || '',
    unit: i.unit || '',
    unitPriceMinor: i.unitPriceMinor || 0,
    quantity: i.quantity || 0,
    subtotalMinor: i.subtotalMinor || 0,
  }));

  const payment = doc.payment || {
    method: 'pay_at_pickup',
    status: doc.paymentStatus || 'pending_pickup',
    paidAmountMinor: doc.paidAmountMinor || 0,
  };

  const pickupWindow = doc.pickupWindow || {
    id: doc.pickupWindowId ? doc.pickupWindowId.toString() : '',
    startTime: (doc.pickupTimeSlot || '').split('-')[0]?.trim() || '',
    endTime: (doc.pickupTimeSlot || '').split('-')[1]?.trim() || '',
    cutoffAt: doc.cutoffAt instanceof Date ? doc.cutoffAt.toISOString() : (doc.cutoffAt || ''),
  };

  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    checkoutGroupId: doc.checkoutGroupId,
    customerId: doc.customerId ? doc.customerId.toString() : '',
    customer: doc.customerSnapshot || {},
    farmerId: doc.farmerId ? doc.farmerId.toString() : '',
    farmer: doc.farmerSnapshot || {},
    marketId: doc.marketId ? doc.marketId.toString() : '',
    market: doc.marketSnapshot || {},
    marketDate: doc.marketDate || doc.pickupDate || '',
    pickupWindow,
    items,
    totalAmountMinor: doc.totalAmountMinor || 0,
    currency: doc.currency || 'PKR',
    status: doc.status === 'confirmed' ? 'accepted' : doc.status,
    payment,
    customerNotes: doc.customerNotes || doc.notes || '',
    cancellationReason: doc.cancellationReason || null,
    declineReason: doc.declineReason || null,
    statusHistory: (doc.statusHistory || []).map((sh) => ({
      status: sh.status === 'confirmed' ? 'accepted' : sh.status,
      role: sh.role || 'system',
      note: sh.note || sh.reason || '',
      timestamp: (sh.timestamp || sh.changedAt) instanceof Date
        ? (sh.timestamp || sh.changedAt).toISOString()
        : (sh.timestamp || sh.changedAt || ''),
    })),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}

/**
 * Customer Reorder: Checks CURRENT stock offers for past order items and prepares verified lines
 */
export async function reorderCustomerOrderService(customerId, orderId, { targetMarketDate, pickupWindowId } = {}) {
  const db = getDB();
  const oId = new ObjectId(orderId);
  const cId = new ObjectId(customerId);

  const originalOrder = await db.collection('orders').findOne({ _id: oId, customerId: cId });
  if (!originalOrder) {
    const err = new Error('Original order not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const marketId = originalOrder.marketId;
  const date = targetMarketDate || originalOrder.marketDate;
  const pwId = pickupWindowId || originalOrder.pickupWindow?.id;

  const mId = marketId instanceof ObjectId ? marketId : new ObjectId(marketId);
  const availabilityReport = [];
  const readyForCheckoutItems = [];

  for (const item of originalOrder.items) {
    const pId = item.productId instanceof ObjectId ? item.productId : new ObjectId(item.productId);
    const offer = await db.collection('stockOffers').findOne({
      marketId: mId,
      productId: pId,
      date: date,
      status: 'available',
    });

    const isAvailable = offer && offer.availableQuantity >= item.quantity;
    availabilityReport.push({
      productId: item.productId.toString(),
      name: item.name,
      requestedQuantity: item.quantity,
      unit: item.unit,
      availableQuantity: offer ? offer.availableQuantity : 0,
      priceMinor: offer ? offer.priceMinor : item.unitPriceMinor,
      inStock: isAvailable,
    });

    if (isAvailable) {
      readyForCheckoutItems.push({
        productId: item.productId.toString(),
        quantity: item.quantity,
      });
    }
  }

  const allAvailable = availabilityReport.every((r) => r.inStock);

  return {
    originalOrderId: orderId,
    marketId: marketId.toString(),
    targetMarketDate: date,
    pickupWindowId: pwId,
    allAvailable,
    items: availabilityReport,
    readyForCheckoutItems,
  };
}

export async function listAdminOrdersService(filters = {}, pagination = {}) {
  const db = getDB();
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.marketId) query.marketId = new ObjectId(filters.marketId);
  if (filters.date) query.marketDate = filters.date;

  const page = parseInt(pagination.page, 10) || 1;
  const limit = parseInt(pagination.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const total = await db.collection('orders').countDocuments(query);
  const docs = await db.collection('orders').find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();

  return {
    orders: docs.map(formatOrderDoc),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

