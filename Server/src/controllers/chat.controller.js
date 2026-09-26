import {
  startConversationSchema,
  sendMessageSchema,
  listConversationsQuerySchema,
} from '../validation/chat.schema.js';
import {
  startOrGetConversationService,
  listConversationsService,
  getConversationDetailService,
  getMessagesService,
  sendMessageService,
  markConversationReadService,
  getUnreadChatCountService,
  setConversationArchiveService,
  suggestReplyService,
} from '../services/chat.service.js';

export async function startOrGetConversation(req, res, next) {
  try {
    const validated = startConversationSchema.parse(req.body);
    const result = await startOrGetConversationService(req.user, validated);
    res.status(201).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function listConversations(req, res, next) {
  try {
    const validated = listConversationsQuerySchema.parse(req.query);
    const result = await listConversationsService(req.user, validated);
    res.status(200).json({
      data: result,
      meta: {
        total: result.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getConversationDetail(req, res, next) {
  try {
    const { id } = req.params;
    const result = await getConversationDetailService(req.user, id);
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req, res, next) {
  try {
    const { id } = req.params;
    const { limit, before } = req.query;
    const result = await getMessagesService(req.user, id, {
      limit: limit ? parseInt(limit, 10) : 100,
      before: before || null,
    });
    res.status(200).json({
      data: result,
      meta: {
        total: result.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const { id } = req.params;
    const validated = sendMessageSchema.parse(req.body);
    const result = await sendMessageService(req.user, id, validated);
    res.status(201).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function markConversationRead(req, res, next) {
  try {
    const { id } = req.params;
    const result = await markConversationReadService(req.user, id);
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadChatCount(req, res, next) {
  try {
    const result = await getUnreadChatCountService(req.user);
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function setConversationArchive(req, res, next) {
  try {
    const { id } = req.params;
    const { isArchived } = req.body;
    const result = await setConversationArchiveService(req.user, id, !!isArchived);
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function suggestReply(req, res, next) {
  try {
    const { id } = req.params;
    const result = await suggestReplyService(req.user, id);
    res.status(200).json({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}
