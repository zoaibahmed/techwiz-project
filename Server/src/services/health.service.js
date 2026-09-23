import { checkDBHealth } from '../config/db.js';
import { env } from '../config/env.js';

export async function getHealthStatus() {
  const dbHealth = await checkDBHealth();

  return {
    status: dbHealth.status === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    database: {
      status: dbHealth.status,
      databaseName: dbHealth.database,
      latencyMs: dbHealth.pingMs,
    },
    version: '1.0.0',
  };
}
