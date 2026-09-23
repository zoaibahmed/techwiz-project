import {
  listUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notification.service.js';

export async function listNotifications(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const notifications = await listUserNotifications(req.user.id, limit);
    res.status(200).json({
      data: notifications,
      meta: {
        total: notifications.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const success = await markNotificationRead(req.user.id, req.params.id);
    res.status(200).json({
      data: { success },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    await markAllNotificationsRead(req.user.id);
    res.status(200).json({
      data: { success: true },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
