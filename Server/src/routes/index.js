import { Router } from 'express';
import healthRoutes from './health.routes.js';

const apiRouter = Router();

// Mount modular sub-routers
apiRouter.use('/health', healthRoutes);

export default apiRouter;
