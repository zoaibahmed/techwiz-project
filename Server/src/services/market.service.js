import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export async function listMarketsService({ day, search, lat, lng, radiusKm, page = 1, limit = 20 }) {
  const db = getDB();
  const query = { isActive: true };

  if (day !== undefined && day !== null && day !== '') {
    query.operatingDays = parseInt(day, 10);
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  if (lat && lng) {
    const maxDistanceMeters = (parseFloat(radiusKm) || 25) * 1000;
    query.coordinates = {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: maxDistanceMeters,
      },
    };
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const total = await db.collection('markets').countDocuments(query);
  const markets = await db.collection('markets').find(query).skip(skip).limit(take).toArray();

  // Attach attending approved farmer counts
  const marketIds = markets.map((m) => m._id);
  const farmerCounts = await db
    .collection('farmerProfiles')
    .aggregate([
      { $match: { approvalStatus: 'approved', marketIds: { $in: marketIds } } },
      { $unwind: '$marketIds' },
      { $match: { marketIds: { $in: marketIds } } },
      { $group: { _id: '$marketIds', count: { $sum: 1 } } },
    ])
    .toArray();

  const countMap = new Map(farmerCounts.map((fc) => [fc._id.toString(), fc.count]));

  const formatted = markets.map((m) => {
    const coords = m.coordinates?.coordinates || [0, 0];
    return {
      id: m._id.toString(),
      name: m.name,
      address: m.address,
      timezone: m.timezone,
      coordinates: {
        latitude: coords[1],
        longitude: coords[0],
      },
      operatingDays: m.operatingDays,
      operatingHours: m.operatingHours,
      mapProvider: m.mapProvider,
      attendingFarmerCount: countMap.get(m._id.toString()) || 0,
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

export async function getMarketByIdService(marketId) {
  const db = getDB();
  const m = await db.collection('markets').findOne({ _id: new ObjectId(marketId), isActive: true });
  if (!m) {
    const err = new Error('Market not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const coords = m.coordinates?.coordinates || [0, 0];

  // Get attending approved farmers
  const farmers = await db
    .collection('farmerProfiles')
    .find({ marketIds: m._id, approvalStatus: 'approved' })
    .project({ businessName: 1, contactPerson: 1, bio: 1, stallCoordinates: 1, operatingDays: 1 })
    .toArray();

  const formattedFarmers = farmers.map((f) => ({
    id: f._id.toString(),
    businessName: f.businessName,
    contactPerson: f.contactPerson,
    bio: f.bio,
    stallCoordinates: f.stallCoordinates?.coordinates
      ? { latitude: f.stallCoordinates.coordinates[1], longitude: f.stallCoordinates.coordinates[0] }
      : null,
    operatingDays: f.operatingDays,
  }));

  return {
    id: m._id.toString(),
    name: m.name,
    address: m.address,
    timezone: m.timezone,
    coordinates: {
      latitude: coords[1],
      longitude: coords[0],
    },
    operatingDays: m.operatingDays,
    operatingHours: m.operatingHours,
    mapProvider: m.mapProvider,
    attendingFarmers: formattedFarmers,
  };
}

export async function createMarketService(adminId, data) {
  const db = getDB();
  const now = new Date();

  const doc = {
    name: data.name,
    address: data.address,
    timezone: data.timezone || 'Asia/Karachi',
    coordinates: {
      type: 'Point',
      coordinates: [data.coordinates.longitude, data.coordinates.latitude],
    },
    operatingDays: data.operatingDays,
    operatingHours: data.operatingHours,
    mapProvider: data.mapProvider || 'google',
    isActive: true,
    createdBy: new ObjectId(adminId),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('markets').insertOne(doc);

  return {
    id: result.insertedId.toString(),
    ...data,
  };
}

export async function updateMarketService(adminId, marketId, data) {
  const db = getDB();
  const mId = new ObjectId(marketId);

  const updateFields = { updatedAt: new Date() };

  if (data.name) updateFields.name = data.name;
  if (data.address) updateFields.address = data.address;
  if (data.timezone) updateFields.timezone = data.timezone;
  if (data.operatingDays) updateFields.operatingDays = data.operatingDays;
  if (data.operatingHours) updateFields.operatingHours = data.operatingHours;
  if (data.mapProvider) updateFields.mapProvider = data.mapProvider;

  if (data.coordinates) {
    updateFields.coordinates = {
      type: 'Point',
      coordinates: [data.coordinates.longitude, data.coordinates.latitude],
    };
  }

  const result = await db.collection('markets').updateOne({ _id: mId }, { $set: updateFields });
  if (result.matchedCount === 0) {
    const err = new Error('Market not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  return getMarketByIdService(marketId);
}

export async function deleteMarketService(adminId, marketId) {
  const db = getDB();
  const mId = new ObjectId(marketId);

  // Soft delete by setting isActive to false to preserve historical order snapshots
  const result = await db.collection('markets').updateOne(
    { _id: mId },
    { $set: { isActive: false, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) {
    const err = new Error('Market not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  return { id: marketId, deleted: true };
}
