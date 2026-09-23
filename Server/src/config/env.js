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
};

export function validateEnv() {
  if (!env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not configured. Please verify that atlas-credentials.env or .env contains a valid connection string.'
    );
  }
}
