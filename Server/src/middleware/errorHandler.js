import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || (res.statusCode !== 200 && res.statusCode !== 204 ? res.statusCode : 500);

  // Clean error message without exposing connection strings or sensitive paths
  let message = err.message || 'Internal Server Error';
  message = message.replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb+srv://[credentials-hidden]@');

  const response = {
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_SERVER_ERROR',
    },
  };

  // Include stack trace only in development
  if (env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
