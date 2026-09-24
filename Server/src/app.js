import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { corsMiddleware } from './middleware/corsConfig.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { csrfProtection } from './middleware/csrf.js';
import apiRouter from './routes/index.js';

import path from 'path';

export function createApp() {
  const app = express();

  // 1. Security Headers with cross-origin resource policy for uploaded media
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 2. Cross-Origin Resource Sharing
  app.use(corsMiddleware);

  // 3. Static files for uploaded images
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // 4. Cookie Parsing
  app.use(cookieParser(env.COOKIE_SECRET));

  // 5. Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 5. CSRF Protection for state-modifying requests
  app.use(csrfProtection);

  // 6. API Routes
  app.use('/api', apiRouter);

  // 7. Root ping
  app.get('/', (req, res) => {
    res.json({
      message: 'TechWiz 7 MarketLink Backend API',
      status: 'active',
      version: '1.0.0',
      docs: '/api/v1/health',
    });
  });

  // 8. 404 Handler for undefined routes
  app.use(notFoundHandler);

  // 9. Central Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
