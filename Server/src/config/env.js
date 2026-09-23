import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Potential paths for credentials and configuration
const serverRoot = path.resolve(__dirname, '../../');
const projectRoot = path.resolve(__dirname, '../../../');

const localEnvPath = path.join(serverRoot, '.env');
const atlasCredentialsPath = path.join(projectRoot, 'atlas-credentials.env');

// 1. Load local .env if it exists
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
}

// 2. Load atlas-credentials.env if it exists (preserves already-set variables)
if (fs.existsSync(atlasCredentialsPath)) {
  dotenv.config({ path: atlasCredentialsPath });
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || '',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'techwiz_db',
  MONGODB_USERNAME: process.env.MONGODB_USERNAME || '',
  
  // Market & Regional Configuration (Configurable, not hardcoded into business logic)
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'PKR',
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE || 'Asia/Karachi',

  // Authentication & Security
  JWT_SECRET: process.env.JWT_SECRET || 'marketlink-dev-jwt-secret-do-not-use-in-production-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'marketlink-dev-cookie-secret-2026',

  // Optional AI / OpenAI Configuration (Kept server-only, never exposed to client)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
};

export function validateEnv() {
  if (!env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not configured. Please verify that atlas-credentials.env or .env contains a valid connection string.'
    );
  }
}
