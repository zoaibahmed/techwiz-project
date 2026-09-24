import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export async function listProductsPublicService({
  categoryId,
  marketId,
  day,
  search,
  minPrice,
  maxPrice,
  sort = 'newest',
  page = 1,
  limit = 20,
}) {
  const db = getDB();
  const query = { isArchived: false };

  if (categoryId) {
    query.categoryId = new ObjectId(categoryId);
  }

  if (search) {
    query.$text = { $search: search };
  }

  // If filtered by market, find products offered by farmers attending or offering stock at that market
  if (marketId) {
    const today = new Date().toISOString().split('T')[0];
    const offers = await db
      .collection('stockOffers')
      .find({ marketId: new ObjectId(marketId), date: { $gte: today }, status: 'available' })
      .toArray();

    const allowedProductIds = offers.map((o) => o.productId);
    query._id = { $in: allowedProductIds };
  }

  if (minPrice || maxPrice) {
    query.basePriceMinor = {};
    if (minPrice) query.basePriceMinor.$gte = parseInt(minPrice, 10);
    if (maxPrice) query.basePriceMinor.$lte = parseInt(maxPrice, 10);
  }

  const sortOptions = {};
  if (sort === 'price_asc') sortOptions.basePriceMinor = 1;
  else if (sort === 'price_desc') sortOptions.basePriceMinor = -1;
  else sortOptions.createdAt = -1;

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const total = await db.collection('products').countDocuments(query);
  const products = await db.collection('products').find(query).sort(sortOptions).skip(skip).limit(take).toArray();

  // Load associated farmer profiles and categories
  const farmerIds = [...new Set(products.map((p) => p.farmerId.toString()))].map((id) => new ObjectId(id));
  const categoryIds = [...new Set(products.map((p) => p.categoryId.toString()))].map((id) => new ObjectId(id));

  const farmers = await db.collection('farmerProfiles').find({ _id: { $in: farmerIds } }).toArray();
  const categories = await db.collection('categories').find({ _id: { $in: categoryIds } }).toArray();

  const farmerMap = new Map(farmers.map((f) => [f._id.toString(), f]));
  const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

  // Load upcoming active stock offers for these products
  const productObjIds = products.map((p) => p._id);
  const today = new Date().toISOString().split('T')[0];
  const activeOffers = await db
    .collection('stockOffers')
    .find({ productId: { $in: productObjIds }, date: { $gte: today }, status: 'available' })
    .toArray();

  const offerMap = new Map();
  for (const off of activeOffers) {
    const key = off.productId.toString();
    if (!offerMap.has(key)) offerMap.set(key, off);
  }

  const formatted = products.map((p) => {
    const farmer = farmerMap.get(p.farmerId.toString());
    const cat = categoryMap.get(p.categoryId.toString());
    const offer = offerMap.get(p._id.toString());

    return {
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      unit: p.unit,
      basePrice: { amountMinor: p.basePriceMinor, currency: p.currency },
      imageUrl: p.imageUrl || '',
      category: cat ? { id: cat._id.toString(), name: cat.name, slug: cat.slug } : null,
      farmer: farmer ? { id: farmer._id.toString(), businessName: farmer.businessName } : null,
      currentOffer: offer
        ? {
            stockOfferId: offer._id.toString(),
            marketId: offer.marketId.toString(),
            date: offer.date,
            price: { amountMinor: offer.priceMinor, currency: offer.currency },
            availableQuantity: offer.availableQuantity,
            status: offer.status,
          }
        : null,
    };
  });

  return {
    items: formatted,
    total,
    page: parseInt(page, 10),
    limit: take,
    hasNext: skip + take < total,
  };
}

export async function getProductByIdPublicService(productId) {
  const db = getDB();
  const p = await db.collection('products').findOne({ _id: new ObjectId(productId), isArchived: false });
  if (!p) {
    const err = new Error('Product not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const farmer = await db.collection('farmerProfiles').findOne({ _id: p.farmerId });
  const category = await db.collection('categories').findOne({ _id: p.categoryId });

  // Get all active dated stock offers for this product
  const today = new Date().toISOString().split('T')[0];
  const offers = await db
    .collection('stockOffers')
    .find({ productId: p._id, date: { $gte: today } })
    .toArray();

  return {
    id: p._id.toString(),
    name: p.name,
    description: p.description,
    unit: p.unit,
    basePrice: { amountMinor: p.basePriceMinor, currency: p.currency },
    imageUrl: p.imageUrl || '',
    category: category ? { id: category._id.toString(), name: category.name } : null,
    farmer: farmer ? { id: farmer._id.toString(), businessName: farmer.businessName, bio: farmer.bio } : null,
    stockOffers: offers.map((o) => ({
      id: o._id.toString(),
      marketId: o.marketId.toString(),
      date: o.date,
      price: { amountMinor: o.priceMinor, currency: o.currency },
      unit: o.unit,
      availableQuantity: o.availableQuantity,
      status: o.status,
    })),
  };
}

export async function listFarmerProductsService(farmerProfileId) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);

  const products = await db.collection('products').find({ farmerId: fId }).sort({ createdAt: -1 }).toArray();

  return products.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    description: p.description,
    categoryId: p.categoryId.toString(),
    unit: p.unit,
    basePriceMinor: p.basePriceMinor,
    currency: p.currency,
    imageUrl: p.imageUrl || '',
    isArchived: p.isArchived,
    createdAt: p.createdAt?.toISOString(),
  }));
}

export async function createFarmerProductService(farmerProfileId, data) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);
  const now = new Date();

  const doc = {
    farmerId: fId,
    name: data.name.trim(),
    description: data.description || '',
    categoryId: new ObjectId(data.categoryId),
    unit: data.unit,
    basePriceMinor: data.basePriceMinor,
    currency: data.currency || 'PKR',
    imageUrl: data.imageUrl || '',
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('products').insertOne(doc);

  return {
    id: result.insertedId.toString(),
    name: doc.name,
    description: doc.description,
    categoryId: data.categoryId,
    unit: doc.unit,
    basePriceMinor: doc.basePriceMinor,
    currency: doc.currency,
    isArchived: false,
  };
}

export async function updateFarmerProductService(farmerProfileId, productId, data) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);
  const pId = new ObjectId(productId);

  const updateFields = { updatedAt: new Date() };
  if (data.name) updateFields.name = data.name.trim();
  if (data.description !== undefined) updateFields.description = data.description;
  if (data.categoryId) updateFields.categoryId = new ObjectId(data.categoryId);
  if (data.unit) updateFields.unit = data.unit;
  if (data.basePriceMinor) updateFields.basePriceMinor = data.basePriceMinor;
  if (data.currency) updateFields.currency = data.currency;
  if (data.imageUrl !== undefined) updateFields.imageUrl = data.imageUrl;

  const result = await db.collection('products').updateOne({ _id: pId, farmerId: fId }, { $set: updateFields });
  if (result.matchedCount === 0) {
    const err = new Error('Product not found or unauthorized.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const updated = await db.collection('products').findOne({ _id: pId });
  return {
    id: updated._id.toString(),
    name: updated.name,
    description: updated.description,
    categoryId: updated.categoryId.toString(),
    unit: updated.unit,
    basePriceMinor: updated.basePriceMinor,
    currency: updated.currency,
    isArchived: updated.isArchived,
  };
}

export async function archiveFarmerProductService(farmerProfileId, productId) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);
  const pId = new ObjectId(productId);

  // Invariant: Cannot archive product if active reserved orders contain this product
  const activeOrdersCount = await db.collection('orders').countDocuments({
    'items.productId': pId,
    status: { $in: ['placed', 'accepted', 'confirmed', 'ready_for_pickup'] },
  });

  if (activeOrdersCount > 0) {
    const err = new Error(
      `Cannot archive product with ${activeOrdersCount} active reserved order(s). Fulfill, cancel, or decline active orders before archiving.`
    );
    err.code = 'ACTIVE_RESERVATIONS_EXIST';
    err.statusCode = 409;
    throw err;
  }

  const result = await db
    .collection('products')
    .updateOne({ _id: pId, farmerId: fId }, { $set: { isArchived: true, updatedAt: new Date() } });

  if (result.matchedCount === 0) {
    const err = new Error('Product not found or unauthorized.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  return { id: productId, archived: true };
}

export async function listProductsAdminService(query = {}) {
  const db = getDB();
  const filter = {};

  if (query.status) {
    if (query.status === 'archived') {
      filter.isArchived = true;
    } else {
      filter.status = query.status;
      filter.isArchived = { $ne: true };
    }
  }

  if (query.search) {
    filter.name = { $regex: query.search.trim(), $options: 'i' };
  }

  const products = await db
    .collection('products')
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  const farmerIds = products.map((p) => p.farmerId);
  const farmers = await db
    .collection('farmerProfiles')
    .find({ _id: { $in: farmerIds } })
    .toArray();
  const farmerMap = new Map(farmers.map((f) => [f._id.toString(), f.businessName]));

  const categoryIds = products.map((p) => p.categoryId);
  const categories = await db
    .collection('categories')
    .find({ _id: { $in: categoryIds } })
    .toArray();
  const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

  return products.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    description: p.description,
    farmerId: p.farmerId.toString(),
    farmerBusinessName: farmerMap.get(p.farmerId.toString()) || 'Farm',
    categoryId: p.categoryId.toString(),
    categoryName: categoryMap.get(p.categoryId.toString()) || 'Category',
    unit: p.unit,
    basePriceMinor: p.basePriceMinor,
    currency: p.currency || 'PKR',
    imageUrl: p.imageUrl || '',
    status: p.isArchived ? 'archived' : (p.status || 'active'),
    rating: p.rating || 5.0,
    reviewCount: p.reviewCount || 0,
    moderationReason: p.moderationReason || '',
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  }));
}

export async function moderateProductAdminService(adminId, productId, { status, moderationReason = '' }) {
  const db = getDB();
  const pId = new ObjectId(productId);

  const product = await db.collection('products').findOne({ _id: pId });
  if (!product) {
    const err = new Error('Product not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const isArchived = status === 'archived';
  const updateFields = {
    status,
    isArchived,
    moderationReason,
    updatedAt: new Date(),
  };

  await db.collection('products').updateOne({ _id: pId }, { $set: updateFields });

  // Audit log
  await db.collection('auditLogs').insertOne({
    actorId: new ObjectId(adminId),
    actorRole: 'admin',
    action: 'PRODUCT_STATUS_MODERATION',
    targetCollection: 'products',
    targetId: pId,
    details: {
      productName: product.name,
      previousStatus: product.status,
      newStatus: status,
      moderationReason,
    },
    createdAt: new Date(),
  });

  return {
    id: productId,
    name: product.name,
    status,
    isArchived,
    moderationReason,
    updatedAt: updateFields.updatedAt.toISOString(),
  };
}
