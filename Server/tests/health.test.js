import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as dbModule from '../src/config/db.js';

describe('Health and System Routes', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  it('GET / should return root ping message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'active');
    expect(res.body).toHaveProperty('message');
  });

  it('GET /api/health should return health payload with db status', async () => {
    // Mock db health check to isolate route behavior
    vi.spyOn(dbModule, 'checkDBHealth').mockResolvedValueOnce({
      status: 'connected',
      database: 'techwiz_db',
      pingMs: 24,
    });

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database.status).toBe('connected');
    expect(res.body.database.databaseName).toBe('techwiz_db');
  });

  it('GET /api/health should return 503 when database is disconnected', async () => {
    vi.spyOn(dbModule, 'checkDBHealth').mockResolvedValueOnce({
      status: 'disconnected',
      database: 'techwiz_db',
      pingMs: null,
      error: 'Client not connected',
    });

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.database.status).toBe('disconnected');
  });

  it('GET /api/unknown-endpoint should return 404 with structured JSON error', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
  });
});
