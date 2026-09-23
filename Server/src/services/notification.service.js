import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export async function createNotification(userId, type, title, message, metadata = {}) {
  try {
    const db = getDB();
    const doc = {
      userId: new ObjectId(userId),
      type,
      title,
      message,
      data: metadata,
      isRead: false,
      createdAt: new Date(),
    };
    await db.collection('notifications').insertOne(doc);
    return true;
  } catch (err) {
    console.error('[Notification Error]:', err.message);
    return false;
  }
}

export async function listUserNotifications(userId, limit = 50) {
  const db = getDB();
  const notifications = await db
    .collection('notifications')
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return notifications.map((n) => ({
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    data: n.data || {},
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function markNotificationRead(userId, notificationId) {
  const db = getDB();
  const nId = new ObjectId(notificationId);
  const uId = new ObjectId(userId);

  const res = await db
    .collection('notifications')
    .updateOne({ _id: nId, userId: uId }, { $set: { isRead: true, readAt: new Date() } });

  return res.matchedCount > 0;
}

export async function markAllNotificationsRead(userId) {
  const db = getDB();
  const uId = new ObjectId(userId);

  await db
    .collection('notifications')
    .updateMany({ userId: uId, isRead: false }, { $set: { isRead: true, readAt: new Date() } });

  return true;
}
