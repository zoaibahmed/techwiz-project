export function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
      fields: [],
      requestId: req.id || `req_${Date.now()}`,
    },
  });
}
