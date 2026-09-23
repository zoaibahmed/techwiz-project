import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { chatCopilot, confirmCopilotAction } from '../controllers/ai.controller.js';

export const aiRouter = Router();

aiRouter.post('/ai/chat', authenticate, csrfProtection, chatCopilot);
aiRouter.post('/ai/actions/:draftId/confirm', authenticate, csrfProtection, confirmCopilotAction);
