import { ZodError } from 'zod';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const requestId = req.id || `req_${Date.now()}`;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fields = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload. Please check field requirements.',
        fields,
        requestId,
      },
    });
  }

  const statusCode = err.statusCode || (res.statusCode !== 200 && res.statusCode !== 204 ? res.statusCode : 500);

  // Clean error message without exposing connection strings or sensitive paths
  let message = err.message || 'Internal Server Error';
  message = message.replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb+srv://[credentials-hidden]@');

  const response = {
    error: {
      code: err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR'),
      message,
      fields: err.fields || [],
      requestId,
    },
  };

  // Include stack trace only in development
  if (env.NODE_ENV === 'development' && statusCode === 500) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
