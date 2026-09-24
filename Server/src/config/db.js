import { MongoClient } from 'mongodb';
import { env } from './env.js';

let client = null;
let db = null;

const clientOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Connect to MongoDB Atlas using the native driver.
 * Performs a non-destructive ping against the admin database to verify connectivity.
 */
export async function connectDB() {
  if (db && client) {
    return { client, db };
  }

  if (!env.MONGODB_URI) {
    throw new Error('Database connection failed: MONGODB_URI is undefined or empty.');
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      client = new MongoClient(env.MONGODB_URI, clientOptions);
      await client.connect();

      // Verify connectivity via non-destructive ping
      const adminDb = client.db('admin');
      await adminDb.command({ ping: 1 });

      db = client.db(env.MONGODB_DB_NAME);
      return { client, db };
    } catch (error) {
      lastError = error;
      if (client) {
        try {
          await client.close();
        } catch (_) {}
        client = null;
        db = null;
      }
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  // Sanitize any potential connection details from error message
  const sanitizedMsg = lastError?.message
    ? lastError.message.replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb+srv://[credentials-hidden]@')
    : 'Unknown MongoDB connection error';

  throw new Error(`MongoDB Atlas Connection Error: ${sanitizedMsg}`);
}

/**
 * Retrieve the active Db instance.
 * @param {string} [dbName] - Optional override database name.
 */
export function getDB(dbName) {
  if (!client) {
    throw new Error('Database is not initialized. Call connectDB() first.');
  }
  return dbName ? client.db(dbName) : db;
}

/**
 * Retrieve the active MongoClient instance.
 */
export function getClient() {
  if (!client) {
    throw new Error('Database client is not initialized. Call connectDB() first.');
  }
  return client;
}

/**
 * Safe non-destructive health check ping.
 */
export async function checkDBHealth() {
  if (!client) {
    return {
      status: 'disconnected',
      database: env.MONGODB_DB_NAME,
      pingMs: null,
      error: 'Client not connected',
    };
  }

  try {
    const startTime = Date.now();
    await client.db('admin').command({ ping: 1 });
    const pingMs = Date.now() - startTime;

    return {
      status: 'connected',
      database: env.MONGODB_DB_NAME,
      pingMs,
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      database: env.MONGODB_DB_NAME,
      pingMs: null,
      error: 'Ping command failed',
    };
  }
}

/**
 * Gracefully close database connection.
 */
export async function closeDB() {
  if (client) {
    try {
      await client.close();
    } finally {
      client = null;
      db = null;
    }
  }
}
