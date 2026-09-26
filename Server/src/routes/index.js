import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import marketRoutes from './market.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import farmerRoutes from './farmer.routes.js';
import pickupWindowRoutes from './pickupWindow.routes.js';
import { orderRouter } from './order.routes.js';
import { notificationRouter } from './notification.routes.js';
import { aiRouter } from './ai.routes.js';
import { customerRouter } from './customer.routes.js';
import { favouriteRouter } from './favourite.routes.js';
import { restockAlertRouter } from './restockAlert.routes.js';
import { reviewRouter } from './review.routes.js';
import { announcementRouter } from './announcement.routes.js';
import { inquiryRouter } from './inquiry.routes.js';
import { uploadRouter } from './upload.routes.js';
import { chatRouter } from './chat.routes.js';

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
v1Router.use('/pickup-windows', pickupWindowRoutes);
v1Router.use('/', orderRouter);
v1Router.use('/farmers', farmerRoutes);
v1Router.use('/farmer', farmerRoutes); // Alias for farmer operations (/farmer/products, /farmer/profile, etc.)
v1Router.use('/', notificationRouter);
v1Router.use('/', aiRouter);
v1Router.use('/', customerRouter);
v1Router.use('/', favouriteRouter);
v1Router.use('/', restockAlertRouter);
v1Router.use('/', reviewRouter);
v1Router.use('/', announcementRouter);
v1Router.use('/', inquiryRouter);
v1Router.use('/', uploadRouter);
v1Router.use('/', chatRouter);

// Mount versioned API at /api/v1
apiRouter.use('/v1', v1Router);

// Fallback convenience aliases directly at /api
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/markets', marketRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/pickup-windows', pickupWindowRoutes);
apiRouter.use('/', orderRouter);
apiRouter.use('/farmers', farmerRoutes);
apiRouter.use('/farmer', farmerRoutes);
apiRouter.use('/', notificationRouter);
apiRouter.use('/', aiRouter);
apiRouter.use('/', customerRouter);
apiRouter.use('/', favouriteRouter);
apiRouter.use('/', restockAlertRouter);
apiRouter.use('/', reviewRouter);
apiRouter.use('/', announcementRouter);
apiRouter.use('/', inquiryRouter);
apiRouter.use('/', uploadRouter);
apiRouter.use('/', chatRouter);

export default apiRouter;



