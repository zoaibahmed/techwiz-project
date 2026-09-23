import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export async function getPublicFarmerProfileService(farmerProfileId) {
  const db = getDB();
  const fId = new ObjectId(farmerProfileId);

  const profile = await db.collection('farmerProfiles').findOne({ _id: fId, approvalStatus: 'approved' });
  if (!profile) {
    const err = new Error('Farmer profile not found or currently unapproved.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  // Get attending markets
  const markets = await db
    .collection('markets')
    .find({ _id: { $in: profile.marketIds || [] }, isActive: true })
    .toArray();

  const formattedMarkets = markets.map((m) => ({
    id: m._id.toString(),
    name: m.name,
    address: m.address,
    operatingDays: m.operatingDays,
    operatingHours: m.operatingHours,
  }));

  // Get current active stock offers
  const today = new Date().toISOString().split('T')[0];
  const stockOffers = await db
    .collection('stockOffers')
    .find({ farmerId: fId, date: { $gte: today }, status: 'available' })
    .toArray();

  // Get product names for these offers
  const productIds = stockOffers.map((s) => s.productId);
  const products = await db
    .collection('products')
    .find({ _id: { $in: productIds } })
    .toArray();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const formattedOffers = stockOffers.map((s) => {
    const prod = productMap.get(s.productId.toString());
    return {
      stockOfferId: s._id.toString(),
      productId: s.productId.toString(),
      productName: prod?.name || 'Produce Item',
      marketId: s.marketId.toString(),
      date: s.date,
      price: { amountMinor: s.priceMinor, currency: s.currency },
      unit: s.unit,
      availableQuantity: s.availableQuantity,
      status: s.status,
    };
  });

  const stallCoords = profile.stallCoordinates?.coordinates;

  return {
    id: profile._id.toString(),
    businessName: profile.businessName,
    contactPerson: profile.contactPerson,
    bio: profile.bio || '',
    profileImageUrl: profile.profileImageUrl || '',
    stallCoordinates: stallCoords ? { latitude: stallCoords[1], longitude: stallCoords[0] } : null,
    operatingDays: profile.operatingDays || [],
    attendingMarkets: formattedMarkets,
    currentOffers: formattedOffers,
  };
}

export async function getMyFarmerProfileService(userId) {
  const db = getDB();
  const profile = await db.collection('farmerProfiles').findOne({ userId: new ObjectId(userId) });
  if (!profile) {
    const err = new Error('Farmer profile not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const stallCoords = profile.stallCoordinates?.coordinates;

  return {
    id: profile._id.toString(),
    businessName: profile.businessName,
    contactPerson: profile.contactPerson,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    bio: profile.bio || '',
    profileImageUrl: profile.profileImageUrl || '',
    stallCoordinates: stallCoords ? { latitude: stallCoords[1], longitude: stallCoords[0] } : null,
    approvalStatus: profile.approvalStatus,
    marketIds: (profile.marketIds || []).map((id) => id.toString()),
    operatingDays: profile.operatingDays || [],
    createdAt: profile.createdAt?.toISOString(),
  };
}

export async function updateMyFarmerProfileService(userId, data) {
  const db = getDB();
  const updateFields = { updatedAt: new Date() };

  if (data.bio !== undefined) updateFields.bio = data.bio;
  if (data.phone !== undefined) updateFields.phone = data.phone;
  if (data.address !== undefined) updateFields.address = data.address;
  if (data.operatingDays !== undefined) updateFields.operatingDays = data.operatingDays;

  if (data.marketIds) {
    updateFields.marketIds = data.marketIds.map((id) => new ObjectId(id));
  }

  if (data.stallCoordinates) {
    updateFields.stallCoordinates = {
      type: 'Point',
      coordinates: [data.stallCoordinates.longitude, data.stallCoordinates.latitude],
    };
  } else if (data.stallCoordinates === null) {
    updateFields.stallCoordinates = null;
  }

  const result = await db.collection('farmerProfiles').updateOne(
    { userId: new ObjectId(userId) },
    { $set: updateFields }
  );

  if (result.matchedCount === 0) {
    const err = new Error('Farmer profile not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  return getMyFarmerProfileService(userId);
}
