import { createApp } from './app.js';
import { env, validateEnv } from './config/env.js';
import { connectDB, closeDB } from './config/db.js';

async function startServer() {
  try {
    // 1. Validate environment configuration
    validateEnv();

    // 2. Connect to MongoDB Atlas
    console.log('[Database] Connecting to MongoDB Atlas cluster...');
    await connectDB();
    console.log(`[Database] Successfully connected to database: ${env.MONGODB_DB_NAME}`);

    // 3. Initialize Express Application
    const app = createApp();

    // 4. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      console.log(`[Server] TechWiz 7 Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`[Server] Health check available at: http://localhost:${env.PORT}/api/health`);
    });

    // 5. Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        try {
          await closeDB();
          console.log('[Database] MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          console.error('[Database] Error during connection close:', err.message);
          process.exit(1);
        }
      });

      // Force exit after 10s if graceful shutdown hangs
      setTimeout(() => {
        console.error('[Server] Forced shutdown timeout exceeded.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
      console.error('[Server] Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('[Server] Uncaught Exception:', err.message);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('[Server Startup Error]:', error.message);
    process.exit(1);
  }
}

startServer();
