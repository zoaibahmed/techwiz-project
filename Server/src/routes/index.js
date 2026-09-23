import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import marketRoutes from './market.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import farmerRoutes from './farmer.routes.js';
import pickupWindowRoutes from './pickupWindow.routes.js';

const apiRouter = Router();

// Preparation health route
apiRouter.use('/health', healthRoutes);

// Version 1 Sub-Router
const v1Router = Router();
v1Router.use('/health', healthRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/markets', marketRoutes);
v1Router.use('/categories', categoryRoutes);
v1Router.use('/products', productRoutes);
v1Router.use('/farmers', farmerRoutes);
v1Router.use('/farmer', farmerRoutes); // Alias for farmer operations (/farmer/products, /farmer/profile, etc.)
v1Router.use('/pickup-windows', pickupWindowRoutes);

// Mount versioned API at /api/v1
apiRouter.use('/v1', v1Router);

// Fallback convenience aliases directly at /api
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/markets', marketRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/farmers', farmerRoutes);
apiRouter.use('/farmer', farmerRoutes);
apiRouter.use('/pickup-windows', pickupWindowRoutes);

export default apiRouter;
