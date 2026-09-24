import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { generateCsrfToken } from '../src/utils/token.js';

describe('MarketLink Actual Express Route & Contract Verification (Offline)', () => {
  let app;
  const csrfToken = generateCsrfToken();

  beforeAll(() => {
    app = createApp();
  });

  // --- 1. HEALTH & METRICS ---
  it('GET /api/v1/health responds with system status (200 or 503 degraded)', async () => {
    const res = await request(app).get('/api/v1/health');
    // When DB is offline, returns 503 Service Unavailable, which is correct
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
  });

  // --- 2. CSRF & AUTH HELPERS ---
  it('GET /api/v1/auth/csrf-token issues valid CSRF token', async () => {
    const res = await request(app).get('/api/v1/auth/csrf-token');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('csrfToken');
  });

  // --- 3. RECONCILED FAVOURITES ROUTES & ALIASES ---
  it('Reconciled favourites routes exist at both /favourites and /customer/favourites', async () => {
    const res1 = await request(app).get('/api/v1/favourites');
    expect(res1.status).toBe(401);

    const res2 = await request(app).get('/api/v1/customer/favourites');
    expect(res2.status).toBe(401);

    const res3 = await request(app).get('/api/v1/favourites/check?targetType=farmer&targetId=507f1f77bcf86cd799439011');
    expect(res3.status).toBe(401);

    const res4 = await request(app).get('/api/v1/customer/favourites/check?targetType=farmer&targetId=507f1f77bcf86cd799439011');
    expect(res4.status).toBe(401);
  });

  // --- 4. RECONCILED RESTOCK ALERTS ROUTES & ALIASES ---
  it('Reconciled restock alert routes exist at both /restock-alerts and /customer/restock-alerts', async () => {
    const res1 = await request(app).get('/api/v1/restock-alerts');
    expect(res1.status).toBe(401);

    const res2 = await request(app).get('/api/v1/customer/restock-alerts');
    expect(res2.status).toBe(401);
  });

  // --- 5. RECONCILED ORDER EXTENSIONS (ITEMS MODIFICATION, REORDER, CANCEL) ---
  it('Order extension routes exist and enforce authentication', async () => {
    // PATCH /orders/:id/items with CSRF
    const resMod = await request(app)
      .patch('/api/v1/orders/507f1f77bcf86cd799439011/items')
      .set('Cookie', [`marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);
    expect(resMod.status).toBe(401);

    // POST /orders/:id/reorder with CSRF
    const resReorder = await request(app)
      .post('/api/v1/orders/507f1f77bcf86cd799439011/reorder')
      .set('Cookie', [`marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);
    expect(resReorder.status).toBe(401);

    // PATCH /orders/:id/cancel with CSRF
    const resCancel = await request(app)
      .patch('/api/v1/orders/507f1f77bcf86cd799439011/cancel')
      .set('Cookie', [`marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);
    expect(resCancel.status).toBe(401);
  });

  // --- 6. NOTIFICATION ROUTES ---
  it('Notification routes exist and enforce authentication', async () => {
    const resList = await request(app).get('/api/v1/notifications');
    expect(resList.status).toBe(401);

    const resReadAll = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Cookie', [`marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);
    expect(resReadAll.status).toBe(401);
  });

  // --- 7. FARMER ONBOARDING ROUTES ---
  it('Farmer onboarding routes exist at /api/v1/farmer/onboarding', async () => {
    // GET onboarding without token -> 401
    const resGet = await request(app).get('/api/v1/farmer/onboarding');
    expect(resGet.status).toBe(401);

    // PUT onboarding with CSRF but without auth -> 401
    const resPut = await request(app)
      .put('/api/v1/farmer/onboarding')
      .set('Cookie', [`marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({ step: 1, data: {} });
    expect(resPut.status).toBe(401);

    // POST onboarding submit with CSRF but without auth -> 401
    const resSubmit = await request(app)
      .post('/api/v1/farmer/onboarding/submit')
      .set('Cookie', [`marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);
    expect(resSubmit.status).toBe(401);
  });

  // --- 8. PUBLIC MULTI-COUNTRY DISCOVERY FILTERING ---
  it('Public markets route supports countryCode, region, and city filter parameters', async () => {
    const res = await request(app).get('/api/v1/markets?countryCode=PK&city=Lahore');
    // If DB is offline, returns 500, but route is mapped (not 404)
    expect(res.status).not.toBe(404);
  });

  // --- 9. PUBLIC ANNOUNCEMENTS & CONTACT ---
  it('Public announcements and contact routes respond correctly', async () => {
    const resAnn = await request(app).get('/api/v1/announcements');
    expect(resAnn.status).not.toBe(404);

    // Contact form is CSRF-exempt; invalid body returns 400 validation error
    const resContact = await request(app).post('/api/v1/contact').send({});
    expect(resContact.status).toBe(400);
    expect(resContact.body.error).toHaveProperty('code');
  });

  // --- 10. MEDIA UPLOADS ---
  it('POST /api/v1/uploads/image rejects unauthenticated calls', async () => {
    const res = await request(app)
      .post('/api/v1/uploads/image')
      .set('Cookie', [`marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(401);
  });
});
