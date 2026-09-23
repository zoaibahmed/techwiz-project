import { z } from 'zod';
import { copilotChatService, confirmCopilotActionService } from '../services/ai/copilot.service.js';

const chatInputSchema = z.object({
  message: z.string().min(1).max(1000),
  context: z.record(z.any()).optional().default({}),
});

export async function chatCopilot(req, res, next) {
  try {
    const { message, context } = chatInputSchema.parse(req.body);
    const result = await copilotChatService(req.user, message, context);
    res.status(200).json({
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmCopilotAction(req, res, next) {
  try {
    const { draftId } = req.params;
    const result = await confirmCopilotActionService(req.user, draftId);
    res.status(200).json({
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
