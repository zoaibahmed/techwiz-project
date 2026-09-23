import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

// --- WEEKLY RECURRING STOCK TEMPLATES ---
export async function getWeeklyTemplateService(farmerProfileId, marketId, dayOfWeek) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);
  const mId = new ObjectId(marketId);

  const template = await db.collection('weeklyStockTemplates').findOne({
    farmerId: fId,
    marketId: mId,
    dayOfWeek: parseInt(dayOfWeek, 10),
  });

  if (!template) {
    return {
      farmerId: farmerProfileId,
      marketId,
      dayOfWeek: parseInt(dayOfWeek, 10),
      items: [],
    };
  }

  return {
    id: template._id.toString(),
    farmerId: farmerProfileId,
    marketId,
    dayOfWeek: template.dayOfWeek,
    items: template.items.map((it) => ({
      productId: it.productId.toString(),
      defaultQuantity: it.defaultQuantity,
      defaultPriceMinor: it.defaultPriceMinor,
      unit: it.unit,
    })),
  };
}

export async function updateWeeklyTemplateService(farmerProfileId, data) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);
  const mId = new ObjectId(data.marketId);

  const formattedItems = data.items.map((it) => ({
    productId: new ObjectId(it.productId),
    defaultQuantity: it.defaultQuantity,
    defaultPriceMinor: it.defaultPriceMinor,
    unit: it.unit,
  }));

  const now = new Date();
  await db.collection('weeklyStockTemplates').updateOne(
    {
      farmerId: fId,
      marketId: mId,
      dayOfWeek: data.dayOfWeek,
    },
    {
      $set: {
        items: formattedItems,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return getWeeklyTemplateService(farmerProfileId, data.marketId, data.dayOfWeek);
}

// --- DATED STOCK OFFERS (ACTIVE INVENTORY ALLOCATION) ---
export async function listStockOffersService(farmerProfileId, { date, marketId }) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);
  const query = { farmerId: fId };

  if (date) query.date = date;
  if (marketId) query.marketId = new ObjectId(marketId);

  const offers = await db.collection('stockOffers').find(query).sort({ date: 1 }).toArray();

  // Load product names
  const productIds = offers.map((o) => o.productId);
  const products = await db.collection('products').find({ _id: { $in: productIds } }).toArray();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  return offers.map((o) => {
    const prod = productMap.get(o.productId.toString());
    return {
      id: o._id.toString(),
      marketId: o.marketId.toString(),
      productId: o.productId.toString(),
      productName: prod?.name || 'Produce Item',
      date: o.date,
      price: { amountMinor: o.priceMinor, currency: o.currency },
      unit: o.unit,
      totalQuantity: o.totalQuantity,
      reservedQuantity: o.reservedQuantity,
      availableQuantity: o.availableQuantity,
      status: o.status,
      version: o.version,
    };
  });
}

export async function createOrUpdateStockOfferService(farmerProfileId, data) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);
  const mId = new ObjectId(data.marketId);
  const pId = new ObjectId(data.productId);

  // Check product belongs to farmer
  const product = await db.collection('products').findOne({ _id: pId, farmerId: fId });
  if (!product) {
    const err = new Error('Product not found or does not belong to this farmer.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  // Check market exists
  const market = await db.collection('markets').findOne({ _id: mId, isActive: true });
  if (!market) {
    const err = new Error('Market not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const existingOffer = await db.collection('stockOffers').findOne({
    farmerId: fId,
    marketId: mId,
    productId: pId,
    date: data.date,
  });

  const reserved = existingOffer ? existingOffer.reservedQuantity : 0;
  if (data.totalQuantity < reserved) {
    const err = new Error(
      `Cannot set total quantity to ${data.totalQuantity}. There are already ${reserved} units reserved by customers.`
    );
    err.code = 'INVALID_INVENTORY_ADJUSTMENT';
    err.statusCode = 409;
    throw err;
  }

  const available = data.totalQuantity - reserved;
  const status = available === 0 ? 'sold_out' : 'available';

  const doc = {
    farmerId: fId,
    marketId: mId,
    productId: pId,
    date: data.date,
    priceMinor: data.priceMinor,
    currency: data.currency || 'PKR',
    unit: data.unit,
    totalQuantity: data.totalQuantity,
    reservedQuantity: reserved,
    availableQuantity: available,
    status,
    version: existingOffer ? existingOffer.version + 1 : 1,
  };

  const result = await db.collection('stockOffers').updateOne(
    {
      farmerId: fId,
      marketId: mId,
      productId: pId,
      date: data.date,
    },
    { $set: doc },
    { upsert: true }
  );

  return {
    farmerId: farmerProfileId,
    marketId: data.marketId,
    productId: data.productId,
    date: data.date,
    price: { amountMinor: data.priceMinor, currency: doc.currency },
    unit: data.unit,
    totalQuantity: data.totalQuantity,
    reservedQuantity: reserved,
    availableQuantity: available,
    status,
  };
}

export async function updateStockOfferStatusService(farmerProfileId, offerId, newStatus) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);
  const oId = new ObjectId(offerId);

  const result = await db.collection('stockOffers').updateOne(
    { _id: oId, farmerId: fId },
    {
      $set: { status: newStatus },
      $inc: { version: 1 },
    }
  );

  if (result.matchedCount === 0) {
    const err = new Error('Stock offer not found or unauthorized.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  return { id: offerId, status: newStatus };
}

// --- PICKUP WINDOWS & CUTOFFS ---
export async function listPickupWindowsService({ farmerId, marketId, date }) {
  const db = getDB();
  const query = {};

  if (farmerId) query.farmerId = new ObjectId(farmerId);
  if (marketId) query.marketId = new ObjectId(marketId);
  if (date) query.date = date;

  const windows = await db.collection('pickupWindows').find(query).sort({ startTime: 1 }).toArray();

  const now = new Date();
  return windows.map((w) => {
    const cutoffDate = new Date(w.cutoffAt);
    const isCutoffPassed = now >= cutoffDate;
    const isSlotAvailable = !isCutoffPassed && w.currentReservations < w.maxCapacity;

    return {
      id: w._id.toString(),
      farmerId: w.farmerId.toString(),
      marketId: w.marketId.toString(),
      date: w.date,
      startTime: w.startTime,
      endTime: w.endTime,
      cutoffAt: w.cutoffAt.toISOString(),
      maxCapacity: w.maxCapacity,
      currentReservations: w.currentReservations,
      isCutoffPassed,
      isSlotAvailable,
    };
  });
}

export async function createPickupWindowService(farmerProfileId, data) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);
  const mId = new ObjectId(data.marketId);

  const doc = {
    farmerId: fId,
    marketId: mId,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    cutoffAt: new Date(data.cutoffAt),
    maxCapacity: data.maxCapacity || 20,
    currentReservations: 0,
  };

  const result = await db.collection('pickupWindows').insertOne(doc);

  return {
    id: result.insertedId.toString(),
    farmerId: farmerProfileId,
    marketId: data.marketId,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    cutoffAt: doc.cutoffAt.toISOString(),
    maxCapacity: doc.maxCapacity,
    currentReservations: 0,
  };
}
