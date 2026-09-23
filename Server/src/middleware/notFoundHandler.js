export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  });
}
