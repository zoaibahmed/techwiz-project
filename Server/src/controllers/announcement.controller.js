import { z } from 'zod';
import {
  createAnnouncementService,
  listActiveAnnouncementsService,
  listAllAnnouncementsAdminService,
  updateAnnouncementService,
  deleteAnnouncementService,
} from '../services/announcement.service.js';

const announcementSchema = z.object({
  title: z.string().min(3).max(150),
  message: z.string().min(5).max(1000),
  type: z.enum(['general', 'weather_alert', 'market_update']).optional().default('general'),
  marketId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid market ID').optional().nullable(),
  priority: z.enum(['normal', 'urgent']).optional().default('normal'),
  isActive: z.boolean().optional().default(true),
});

const updateAnnouncementSchema = announcementSchema.partial();

export async function listActiveAnnouncements(req, res, next) {
  try {
    const { marketId } = req.query;
    const announcements = await listActiveAnnouncementsService(marketId);
    res.status(200).json({
      data: announcements,
      meta: { total: announcements.length, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function listAllAnnouncementsAdmin(req, res, next) {
  try {
    const announcements = await listAllAnnouncementsAdminService();
    res.status(200).json({
      data: announcements,
      meta: { total: announcements.length, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function createAnnouncementAdmin(req, res, next) {
  try {
    const validated = announcementSchema.parse(req.body);
    const result = await createAnnouncementService(req.user.id, validated);
    res.status(201).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAnnouncementAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const validated = updateAnnouncementSchema.parse(req.body);
    const result = await updateAnnouncementService(req.user.id, id, validated);
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAnnouncementAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const result = await deleteAnnouncementService(req.user.id, id);
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}
