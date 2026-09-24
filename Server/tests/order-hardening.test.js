import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ObjectId } from 'mongodb';
import path from 'path';
import fs from 'fs';
import { createApp } from '../src/app.js';
import { connectDB, closeDB, getDB } from '../src/config/db.js';
import { setupDatabaseIndexes } from '../src/config/indexes.js';
import { signToken, generateCsrfToken } from '../src/utils/token.js';

describe('MarketLink Hardening & Remaining Features Test Suite', () => {
  let app;
  let db;

  let customerUser;
  let customerToken;
  let farmer1User;
  let farmer1Token;
  let farmer2User;
  let farmer2Token;
  let adminUser;
  let adminToken;
  let csrfToken;

  const testMarketDate = '2026-11-01';
  let marketId;
  let pickupWindowId;
  let productAId;
  let productBId;
  let categoryId;

  beforeAll(async () => {
    app = createApp();
    await connectDB();
    db = getDB();
    await setupDatabaseIndexes(db);

    customerUser = await db.collection('users').findOne({ email: 'customer.sarah@marketlink.com' });
    farmer1User = await db.collection('users').findOne({ email: 'farmer.greenfield@marketlink.com' });
    farmer2User = await db.collection('users').findOne({ email: 'farmer.indus@marketlink.com' });
    adminUser = await db.collection('users').findOne({ role: 'admin' });

    customerToken = signToken({ sub: customerUser._id.toString(), role: 'customer' });
    farmer1Token = signToken({ sub: farmer1User._id.toString(), role: 'farmer' });
    farmer2Token = signToken({ sub: farmer2User._id.toString(), role: 'farmer' });
    adminToken = signToken({ sub: adminUser._id.toString(), role: 'admin' });
    csrfToken = generateCsrfToken();

    // Create fresh category
    const catRes = await db.collection('categories').insertOne({
      name: `Hardening Cat ${Date.now()}`,
      slug: `hard-cat-${Date.now()}`,
      isActive: true,
      createdAt: new Date(),
    });
    categoryId = catRes.insertedId.toString();

    // Create fresh market
    const mRes = await db.collection('markets').insertOne({
      name: `Hardening Market ${Date.now()}`,
      slug: `hard-market-${Date.now()}`,
      city: 'Lahore',
      address: 'Model Town Park, Lahore',
      coordinates: { type: 'Point', coordinates: [74.32, 31.48] },
      operatingDays: [0],
      operatingHours: { open: '08:00', close: '14:00' },
      isActive: true,
      createdAt: new Date(),
    });
    marketId = mRes.insertedId.toString();

    // Pickup window
    const pwRes = await db.collection('pickupWindows').insertOne({
      farmerId: farmer1User._id,
      marketId: new ObjectId(marketId),
      date: testMarketDate,
      startTime: '08:00',
      endTime: '10:00',
      cutoffAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
      maxCapacity: 25,
      currentReservations: 0,
      createdAt: new Date(),
    });
    pickupWindowId = pwRes.insertedId.toString();

    // Product A (Farmer 1)
    const pARes = await db.collection('products').insertOne({
      farmerId: farmer1User._id,
      name: 'Hardening Organic Spinach',
      description: 'Fresh leafy spinach',
      categoryId: new ObjectId(categoryId),
      unit: 'bunch',
      basePriceMinor: 8000,
      status: 'active',
      isArchived: false,
      createdAt: new Date(),
    });
    productAId = pARes.insertedId.toString();

    // Product B (Farmer 2)
    const pBRes = await db.collection('products').insertOne({
      farmerId: farmer2User._id,
      name: 'Hardening Desi Carrots',
      description: 'Crisp red carrots',
      categoryId: new ObjectId(categoryId),
      unit: 'kg',
      basePriceMinor: 12000,
      status: 'active',
      isArchived: false,
      createdAt: new Date(),
    });
    productBId = pBRes.insertedId.toString();
  }, 30000);

  afterAll(async () => {
    // Clean up test data created in this suite
    if (db) {
      if (marketId) await db.collection('markets').deleteOne({ _id: new ObjectId(marketId) });
      if (categoryId) await db.collection('categories').deleteOne({ _id: new ObjectId(categoryId) });
      if (productAId) await db.collection('products').deleteOne({ _id: new ObjectId(productAId) });
      if (productBId) await db.collection('products').deleteOne({ _id: new ObjectId(productBId) });
      if (pickupWindowId) await db.collection('pickupWindows').deleteOne({ _id: new ObjectId(pickupWindowId) });
    }
    await closeDB();
  });

  // --- 1. MULTI-FARMER CHECKOUT ROLLBACK ---
  it('Rolls back multi-farmer checkout completely when any single item is out of stock', async () => {
    // Set Product A: 10 in stock
    await db.collection('stockOffers').updateOne(
      { farmerId: farmer1User._id, marketId: new ObjectId(marketId), productId: new ObjectId(productAId), date: testMarketDate },
      { $set: { totalQuantity: 10, reservedQuantity: 0, availableQuantity: 10, priceMinor: 8000, currency: 'PKR', unit: 'bunch', status: 'available', version: 1 } },
      { upsert: true }
    );

    // Set Product B: 0 in stock (insufficient)
    await db.collection('stockOffers').updateOne(
      { farmerId: farmer2User._id, marketId: new ObjectId(marketId), productId: new ObjectId(productBId), date: testMarketDate },
      { $set: { totalQuantity: 0, reservedQuantity: 0, availableQuantity: 0, priceMinor: 12000, currency: 'PKR', unit: 'kg', status: 'sold_out', version: 1 } },
      { upsert: true }
    );

    // Attempt multi-farmer checkout with 2 units of A and 1 unit of B
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId,
        marketDate: testMarketDate,
        pickupWindowId,
        items: [
          { productId: productAId, quantity: 2 },
          { productId: productBId, quantity: 1 },
        ],
      });

    // Should fail with 400 or 409
    expect(res.status).toBeGreaterThanOrEqual(400);

    // CRITICAL: Product A must NOT have been reserved! Available quantity must remain exactly 10!
    const stockA = await db.collection('stockOffers').findOne({
      productId: new ObjectId(productAId),
      date: testMarketDate,
    });
    expect(stockA.availableQuantity).toBe(10);
    expect(stockA.reservedQuantity).toBe(0);
  });

  // --- 2. IDEMPOTENCY KEY VERIFICATION ---
  it('Honours idempotency key on checkout without duplicate order creation or double deduction', async () => {
    const testIdempKey = `idemp-hard-${Date.now()}`;

    const payload = {
      marketId,
      marketDate: testMarketDate,
      pickupWindowId,
      items: [{ productId: productAId, quantity: 3 }],
    };

    // First checkout call
    const res1 = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .set('Idempotency-Key', testIdempKey)
      .send(payload);

    expect(res1.status).toBe(201);
    const orderId = res1.body.data.orders[0].id;

    // Second checkout call with EXACT SAME Idempotency-Key
    const res2 = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .set('Idempotency-Key', testIdempKey)
      .send(payload);

    expect(res2.status).toBe(200);
    expect(res2.body.data.orders[0].id).toBe(orderId);

    // Verify stock reserved is only 3, NOT 6!
    const stockA = await db.collection('stockOffers').findOne({
      productId: new ObjectId(productAId),
      date: testMarketDate,
    });
    expect(stockA.reservedQuantity).toBe(3);
    expect(stockA.availableQuantity).toBe(7);
  });

  // --- 3. REPEATED CANCELLATION / DECLINE PREVENTION ---
  it('Rejects repeated cancellation or decline on already terminated orders', async () => {
    // Create an order to test double cancellation
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId,
        marketDate: testMarketDate,
        pickupWindowId,
        items: [{ productId: productAId, quantity: 1 }],
      });

    expect(res.status).toBe(201);
    const order = res.body.data.orders[0];

    // First cancel succeeds
    const cancel1 = await request(app)
      .patch(`/api/v1/orders/${order.id}/cancel`)
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({ reason: 'Family plans changed' });

    expect(cancel1.status).toBe(200);
    expect(cancel1.body.data.status).toBe('cancelled');

    // Second cancel must fail with 400
    const cancel2 = await request(app)
      .patch(`/api/v1/orders/${order.id}/cancel`)
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({ reason: 'Try cancelling again' });

    expect(cancel2.status).toBe(400);

    // Double decline test: farmer tries to decline a cancelled order
    const declineAttempt = await request(app)
      .patch(`/api/v1/farmer/orders/${order.id}/status`)
      .set('Cookie', [`token=${farmer1Token}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({ status: 'declined', reason: 'Farmer decline' });

    expect(declineAttempt.status).toBe(400);
  });

  // --- 4. REMOVAL INVARIANTS: MARKETS & PRODUCTS WITH ACTIVE RESERVATIONS ---
  it('Blocks market and product removal when active customer pre-orders exist', async () => {
    // Create an active order
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId,
        marketDate: testMarketDate,
        pickupWindowId,
        items: [{ productId: productAId, quantity: 1 }],
      });

    expect(res.status).toBe(201);

    // 1. Admin attempts to delete market with active order -> 409 Conflict
    const delMarketRes = await request(app)
      .delete(`/api/v1/admin/markets/${marketId}`)
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(delMarketRes.status).toBe(409);
    expect(delMarketRes.body.error.code).toBe('ACTIVE_RESERVATIONS_EXIST');

    // 2. Farmer attempts to archive product with active order -> 409 Conflict
    const archiveProductRes = await request(app)
      .delete(`/api/v1/farmer/products/${productAId}`)
      .set('Cookie', [`token=${farmer1Token}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(archiveProductRes.status).toBe(409);
    expect(archiveProductRes.body.error.code).toBe('ACTIVE_RESERVATIONS_EXIST');

    // 3. Admin attempts to delete category containing active products -> 409 Conflict
    const delCatRes = await request(app)
      .delete(`/api/v1/admin/categories/${categoryId}`)
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(delCatRes.status).toBe(409);
    expect(delCatRes.body.error.code).toBe('CATEGORY_IN_USE');
  });

  // --- 5. ADMIN CUSTOMER MANAGEMENT ---
  it('GET /api/v1/admin/customers/:id returns complete customer account and order metrics', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/customers/${customerUser._id.toString()}`)
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('id', customerUser._id.toString());
    expect(res.body.data).toHaveProperty('email', customerUser.email);
    expect(res.body.data).toHaveProperty('ordersSummary');
    expect(res.body.data.ordersSummary).toHaveProperty('totalOrders');
  });

  // --- 6. PLATFORM ANALYTICS & INTELLIGENCE ---
  it('GET /api/v1/admin/analytics returns comprehensive platform metrics and booked value', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('overview');
    expect(res.body.data.overview).toHaveProperty('orders');
    expect(res.body.data.overview.orders).toHaveProperty('bookedOrderValueMinor');
    expect(res.body.data.overview.orders).toHaveProperty('completedOrderValueMinor');
  });

  it('GET /api/v1/admin/reports/farmers returns ranked list of most active farmers', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports/farmers?limit=5&sortBy=orders')
      .set('Cookie', [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('farmerUserId');
      expect(res.body.data[0]).toHaveProperty('totalOrders');
      expect(res.body.data[0]).toHaveProperty('bookedOrderValueMinor');
    }
  });

  // --- 7. PUBLIC CONTACT INQUIRIES & ADMIN REVIEW ---
  it('Supports public contact inquiry submission and admin status management', async () => {
    // 1. Public user submits inquiry
    const inqRes = await request(app)
      .post('/api/v1/contact')
      .send({
        name: 'Fatima Noor',
        email: 'fatima.noor@example.com',
        phone: '+92 300 1234567',
        subject: 'Wholesale partnership inquiry',
        message: 'We are an organic cafe in Lahore seeking weekly bulk farm supplies.',
      });

    expect(inqRes.status).toBe(201);
    expect(inqRes.body.data).toHaveProperty('id');
    const inqId = inqRes.body.data.id;

    // 2. Admin retrieves inquiries
    const listRes = await request(app)
      .get('/api/v1/admin/inquiries')
      .set('Cookie', [`token=${adminToken}`]);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    const found = listRes.body.data.find((i) => i.id === inqId);
    expect(found).toBeDefined();

    // 3. Admin updates inquiry status
    const updateRes = await request(app)
      .patch(`/api/v1/admin/inquiries/${inqId}`)
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        status: 'in_progress',
        adminNotes: 'Contacted cafe manager via phone.',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('in_progress');
  });

  // --- 8. PLATFORM ANNOUNCEMENTS ---
  it('Supports admin announcement creation and public active retrieval', async () => {
    // 1. Admin creates announcement
    const createRes = await request(app)
      .post('/api/v1/admin/announcements')
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        title: 'Sunday Market Weather Notice',
        message: 'Clear sunny skies expected for Sunday. Farmers stalls open 08:00 sharp.',
        type: 'weather_alert',
        priority: 'urgent',
      });

    expect(createRes.status).toBe(201);
    const annId = createRes.body.data.id;

    // 2. Public retrieves active announcements
    const listRes = await request(app).get('/api/v1/announcements');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    const ann = listRes.body.data.find((a) => a.id === annId);
    expect(ann).toBeDefined();
    expect(ann.priority).toBe('urgent');
  });

  // --- 9. PRODUCT IMAGE UPLOAD ---
  it('POST /api/v1/uploads/image successfully uploads image and returns public static URL', async () => {
    // Create a small temporary test image buffer (1x1 pixel PNG)
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/v1/uploads/image')
      .set('Cookie', [`token=${farmer1Token}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .attach('image', pngBuffer, 'test-produce.png');

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('url');
    expect(res.body.data.url).toMatch(/^\/uploads\/img-/);

    // Verify static serving of uploaded image
    const getImgRes = await request(app).get(res.body.data.url);
    expect(getImgRes.status).toBe(200);
    expect(getImgRes.headers['content-type']).toContain('image/png');
  });
});
