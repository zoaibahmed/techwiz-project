import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { createNotification } from './notification.service.js';

export async function createRestockAlertService(customerId, { productId, marketId }) {
  const db = getDB();
  const cId = new ObjectId(customerId);
  const pId = new ObjectId(productId);
  const mId = new ObjectId(marketId);

  const product = await db.collection('products').findOne({ _id: pId });
  if (!product) {
    const err = new Error('Product not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const market = await db.collection('markets').findOne({ _id: mId });
  if (!market) {
    const err = new Error('Market not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const existing = await db.collection('restockAlerts').findOne({
    customerId: cId,
    productId: pId,
    marketId: mId,
    status: 'active',
  });

  if (existing) {
    return {
      id: existing._id.toString(),
      customerId: cId.toString(),
      productId: pId.toString(),
      marketId: mId.toString(),
      productName: product.name,
      marketName: market.name,
      status: existing.status,
      createdAt: existing.createdAt.toISOString(),
      isNew: false,
    };
  }

  const doc = {
    customerId: cId,
    productId: pId,
    marketId: mId,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('restockAlerts').insertOne(doc);

  return {
    id: result.insertedId.toString(),
    customerId: cId.toString(),
    productId: pId.toString(),
    marketId: mId.toString(),
    productName: product.name,
    marketName: market.name,
    status: 'active',
    createdAt: doc.createdAt.toISOString(),
    isNew: true,
  };
}

export async function listRestockAlertsService(customerId) {
  const db = getDB();
  const cId = new ObjectId(customerId);

  const alerts = await db
    .collection('restockAlerts')
    .find({ customerId: cId, status: 'active' })
    .sort({ createdAt: -1 })
    .toArray();

  const enriched = [];
  for (const a of alerts) {
    const product = await db.collection('products').findOne({ _id: a.productId });
    const market = await db.collection('markets').findOne({ _id: a.marketId });
    enriched.push({
      id: a._id.toString(),
      productId: a.productId.toString(),
      productName: product?.name || 'Unknown Product',
      marketId: a.marketId.toString(),
      marketName: market?.name || 'Unknown Market',
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    });
  }

  return enriched;
}

export async function cancelRestockAlertService(customerId, alertId) {
  const db = getDB();
  const cId = new ObjectId(customerId);
  const aId = new ObjectId(alertId);

  const result = await db.collection('restockAlerts').deleteOne({
    _id: aId,
    customerId: cId,
  });

  return { cancelled: result.deletedCount > 0 };
}

export async function triggerRestockAlertsForOfferService(productId, marketId, availableQuantity, marketDate) {
  if (availableQuantity <= 0) return 0;

  const db = getDB();
  const pId = new ObjectId(productId);
  const mId = new ObjectId(marketId);

  const alerts = await db
    .collection('restockAlerts')
    .find({ productId: pId, marketId: mId, status: 'active' })
    .toArray();

  if (alerts.length === 0) return 0;

  const product = await db.collection('products').findOne({ _id: pId });
  const market = await db.collection('markets').findOne({ _id: mId });

  const pName = product?.name || 'A produce item';
  const mName = market?.name || 'Market';

  for (const alert of alerts) {
    await createNotification(
      alert.customerId.toString(),
      'restock_alert',
      `${pName} Restocked!`,
      `Good news! ${pName} has been restocked at ${mName} for pickup on ${marketDate}.`,
      { productId: pId.toString(), marketId: mId.toString(), marketDate }
    );

    await db.collection('restockAlerts').updateOne(
      { _id: alert._id },
      { $set: { status: 'triggered', triggeredAt: new Date(), updatedAt: new Date() } }
    );
  }

  return alerts.length;
}
