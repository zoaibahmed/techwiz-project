import { describe, it, expect, vi } from 'vitest';
import * as dbModule from '../src/config/db.js';

describe('Database Connection Module Unit Tests', () => {
  it('checkDBHealth returns disconnected when no client is initialized', async () => {
    const health = await dbModule.checkDBHealth();
    expect(health.status).toBe('disconnected');
    expect(health.pingMs).toBeNull();
  });

  it('getDB throws error when called before connectDB', () => {
    expect(() => dbModule.getDB()).toThrowError(/Database is not initialized/);
  });

  it('getClient throws error when called before connectDB', () => {
    expect(() => dbModule.getClient()).toThrowError(/Database client is not initialized/);
  });
});
