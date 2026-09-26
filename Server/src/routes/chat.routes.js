import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  startOrGetConversation,
  listConversations,
  getConversationDetail,
  getMessages,
  sendMessage,
  markConversationRead,
  getUnreadChatCount,
  setConversationArchive,
  suggestReply,
} from '../controllers/chat.controller.js';

export const chatRouter = Router();

// 1. Unread count (for quick polling by nav badge)
chatRouter.get('/chat/unread-count', authenticateToken, getUnreadChatCount);

// 2. Conversation management
chatRouter.get('/chat/conversations', authenticateToken, listConversations);
chatRouter.post('/chat/conversations', authenticateToken, csrfProtection, startOrGetConversation);
chatRouter.get('/chat/conversations/:id', authenticateToken, getConversationDetail);
chatRouter.patch('/chat/conversations/:id/archive', authenticateToken, csrfProtection, setConversationArchive);

// 3. Message handling
chatRouter.get('/chat/conversations/:id/messages', authenticateToken, getMessages);
chatRouter.post('/chat/conversations/:id/messages', authenticateToken, csrfProtection, sendMessage);
chatRouter.patch('/chat/conversations/:id/read', authenticateToken, csrfProtection, markConversationRead);

// 4. AI Smart Reply for Farmer
chatRouter.post('/chat/conversations/:id/suggest-reply', authenticateToken, csrfProtection, suggestReply);
