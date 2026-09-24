import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export async function createAnnouncementService(adminId, data) {
  const db = getDB();
  const now = new Date();

  const doc = {
    title: data.title.trim(),
    message: data.message.trim(),
    type: data.type || 'general', // 'general', 'weather_alert', 'market_update'
    marketId: data.marketId ? new ObjectId(data.marketId) : null,
    priority: data.priority || 'normal', // 'normal', 'urgent'
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdBy: new ObjectId(adminId),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('announcements').insertOne(doc);

  return {
    id: result.insertedId.toString(),
    title: doc.title,
    message: doc.message,
    type: doc.type,
    marketId: doc.marketId ? doc.marketId.toString() : null,
    priority: doc.priority,
    isActive: doc.isActive,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listActiveAnnouncementsService(marketId = null) {
  const db = getDB();
  const filter = { isActive: true };

  if (marketId) {
    filter.$or = [
      { marketId: null },
      { marketId: new ObjectId(marketId) },
    ];
  }

  const items = await db
    .collection('announcements')
    .find(filter)
    .sort({ priority: -1, createdAt: -1 })
    .toArray();

  return items.map((a) => ({
    id: a._id.toString(),
    title: a.title,
    message: a.message,
    type: a.type,
    marketId: a.marketId ? a.marketId.toString() : null,
    priority: a.priority,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  }));
}

export async function listAllAnnouncementsAdminService() {
  const db = getDB();
  const items = await db
    .collection('announcements')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return items.map((a) => ({
    id: a._id.toString(),
    title: a.title,
    message: a.message,
    type: a.type,
    marketId: a.marketId ? a.marketId.toString() : null,
    priority: a.priority,
    isActive: a.isActive,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
  }));
}

export async function updateAnnouncementService(adminId, id, data) {
  const db = getDB();
  const aId = new ObjectId(id);

  const updateFields = { updatedAt: new Date() };
  if (data.title !== undefined) updateFields.title = data.title.trim();
  if (data.message !== undefined) updateFields.message = data.message.trim();
  if (data.type !== undefined) updateFields.type = data.type;
  if (data.priority !== undefined) updateFields.priority = data.priority;
  if (data.isActive !== undefined) updateFields.isActive = data.isActive;
  if (data.marketId !== undefined) {
    updateFields.marketId = data.marketId ? new ObjectId(data.marketId) : null;
  }

  const result = await db.collection('announcements').updateOne({ _id: aId }, { $set: updateFields });
  if (result.matchedCount === 0) {
    const err = new Error('Announcement not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const updated = await db.collection('announcements').findOne({ _id: aId });
  return {
    id: updated._id.toString(),
    title: updated.title,
    message: updated.message,
    type: updated.type,
    marketId: updated.marketId ? updated.marketId.toString() : null,
    priority: updated.priority,
    isActive: updated.isActive,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteAnnouncementService(adminId, id) {
  const db = getDB();
  const aId = new ObjectId(id);

  const result = await db.collection('announcements').deleteOne({ _id: aId });
  if (result.deletedCount === 0) {
    const err = new Error('Announcement not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  return { id, deleted: true };
}
