import express from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/corsConfig.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

export function createApp() {
  const app = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. Cross-Origin Resource Sharing
  app.use(corsMiddleware);

  // 3. Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. API Routes
  app.use('/api', apiRouter);

  // 5. Root ping
  app.get('/', (req, res) => {
    res.json({
      message: 'TechWiz 7 Backend API Server',
      status: 'active',
      docs: '/api/health',
    });
  });

  // 6. 404 Handler for undefined routes
  app.use(notFoundHandler);

  // 7. Central Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
