import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export async function addFavouriteService(customerId, { targetType, targetId }) {
  const db = getDB();
  const cId = new ObjectId(customerId);
  const tId = new ObjectId(targetId);

  // Validate target existence
  let targetExists = false;
  if (targetType === 'farmer') {
    const farmer = await db.collection('farmerProfiles').findOne({ $or: [{ userId: tId }, { _id: tId }] });
    targetExists = !!farmer;
  } else if (targetType === 'product') {
    const product = await db.collection('products').findOne({ _id: tId });
    targetExists = !!product;
  } else if (targetType === 'market') {
    const market = await db.collection('markets').findOne({ _id: tId });
    targetExists = !!market;
  }

  if (!targetExists) {
    const err = new Error(`The requested ${targetType} was not found.`);
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const existing = await db.collection('favourites').findOne({
    customerId: cId,
    targetType,
    targetId: tId,
  });

  if (existing) {
    return {
      id: existing._id.toString(),
      customerId: cId.toString(),
      targetType,
      targetId: tId.toString(),
      createdAt: existing.createdAt.toISOString(),
      isNew: false,
    };
  }

  const doc = {
    customerId: cId,
    targetType,
    targetId: tId,
    createdAt: new Date(),
  };

  const result = await db.collection('favourites').insertOne(doc);

  return {
    id: result.insertedId.toString(),
    customerId: cId.toString(),
    targetType,
    targetId: tId.toString(),
    createdAt: doc.createdAt.toISOString(),
    isNew: true,
  };
}

export async function removeFavouriteService(customerId, targetType, targetId) {
  const db = getDB();
  const cId = new ObjectId(customerId);
  const tId = new ObjectId(targetId);

  const result = await db.collection('favourites').deleteOne({
    customerId: cId,
    targetType,
    targetId: tId,
  });

  return { removed: result.deletedCount > 0 };
}

export async function checkFavouriteStatusService(customerId, targetType, targetId) {
  const db = getDB();
  const cId = new ObjectId(customerId);
  const tId = new ObjectId(targetId);

  const existing = await db.collection('favourites').findOne({
    customerId: cId,
    targetType,
    targetId: tId,
  });

  return { isFavourited: !!existing };
}

export async function listFavouritesService(customerId) {
  const db = getDB();
  const cId = new ObjectId(customerId);

  const favourites = await db
    .collection('favourites')
    .find({ customerId: cId })
    .sort({ createdAt: -1 })
    .toArray();

  const enriched = [];

  for (const fav of favourites) {
    let details = null;
    if (fav.targetType === 'farmer') {
      const farmer = await db.collection('farmerProfiles').findOne({
        $or: [{ userId: fav.targetId }, { _id: fav.targetId }],
      });
      if (farmer) {
        details = {
          businessName: farmer.businessName,
          bio: farmer.bio,
          rating: farmer.metrics?.rating || 5.0,
          location: farmer.location,
        };
      }
    } else if (fav.targetType === 'product') {
      const product = await db.collection('products').findOne({ _id: fav.targetId });
      if (product) {
        details = {
          name: product.name,
          category: product.category,
          basePriceMinor: product.basePriceMinor,
          unit: product.unit,
        };
      }
    } else if (fav.targetType === 'market') {
      const market = await db.collection('markets').findOne({ _id: fav.targetId });
      if (market) {
        details = {
          name: market.name,
          address: market.address,
          operatingDays: market.operatingDays,
        };
      }
    }

    enriched.push({
      id: fav._id.toString(),
      targetType: fav.targetType,
      targetId: fav.targetId.toString(),
      details,
      createdAt: fav.createdAt.toISOString(),
    });
  }

  return enriched;
}
