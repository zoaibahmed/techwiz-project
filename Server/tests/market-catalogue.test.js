import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ObjectId } from 'mongodb';
import { createApp } from '../src/app.js';
import { connectDB, closeDB, getDB } from '../src/config/db.js';
import { signToken, generateCsrfToken } from '../src/utils/token.js';

describe('Market & Catalogue Engine Test Suite (Phase 2)', () => {
  let app;
  let db;

  let adminToken = '';
  let farmerToken = '';
  let pendingFarmerToken = '';
  let customerToken = '';
  let csrfToken = '';

  const testCategoryName = `Artisan Preserves ${Date.now()}`;
  const testCategorySlug = `test-cat-${Date.now()}`;
  let createdMarketId = '';
  let createdCategoryId = '';
  let createdProductId = '';
  let demoMarketId = '';
  let demoFarmerProfileId = '';

  beforeAll(async () => {
    app = createApp();
    await connectDB();
    db = getDB();

    // Clean up any stale test categories from previous runs
    await db.collection('categories').deleteMany({
      $or: [{ name: 'Artisan Cheeses & Preserves' }, { slug: 'artisan-cheeses-preserves' }],
    });

    // Load pre-seeded user IDs for test tokens
    const adminUser = await db.collection('users').findOne({ role: 'admin' });
    const farmerUser = await db.collection('users').findOne({ email: 'farmer.greenfield@marketlink.com' });
    const pendingFarmerUser = await db.collection('users').findOne({ email: 'farmer.pending@marketlink.com' });
    if (pendingFarmerUser) {
      await db.collection('farmerProfiles').updateOne(
        { userId: pendingFarmerUser._id },
        { $set: { approvalStatus: 'pending' } }
      );
    }
    const customerUser = await db.collection('users').findOne({ email: 'customer.sarah@marketlink.com' });
    const demoMarket = await db.collection('markets').findOne({ isActive: true });
    const demoFarmerProfile = await db.collection('farmerProfiles').findOne({ approvalStatus: 'approved' });

    adminToken = signToken({ sub: adminUser._id.toString(), role: 'admin' });
    farmerToken = signToken({ sub: farmerUser._id.toString(), role: 'farmer' });
    pendingFarmerToken = signToken({ sub: pendingFarmerUser._id.toString(), role: 'farmer' });
    customerToken = signToken({ sub: customerUser._id.toString(), role: 'customer' });

    demoMarketId = demoMarket._id.toString();
    demoFarmerProfileId = demoFarmerProfile._id.toString();
    csrfToken = generateCsrfToken();
  });

  afterAll(async () => {
    // Clean up test-created records
    if (db) {
      if (createdMarketId) {
        await db.collection('markets').deleteOne({ _id: new ObjectId(createdMarketId) });
      }
      if (createdCategoryId) {
        await db.collection('categories').deleteOne({ _id: new ObjectId(createdCategoryId) });
      }
      await db.collection('categories').deleteMany({ slug: testCategorySlug });
      if (createdProductId) {
        await db.collection('products').deleteOne({ _id: new ObjectId(createdProductId) });
      }
    }
    await closeDB();
  });

  // --- 1. PUBLIC MARKET DISCOVERY ---
  it('GET /api/v1/markets should list active markets with attending farmer counts', async () => {
    const res = await request(app).get('/api/v1/markets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('coordinates');
    expect(res.body.data[0]).toHaveProperty('attendingFarmerCount');
  });

  it('GET /api/v1/markets/:id should return market details and attending farmers', async () => {
    const res = await request(app).get(`/api/v1/markets/${demoMarketId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(demoMarketId);
    expect(Array.isArray(res.body.data.attendingFarmers)).toBe(true);
  });

  // --- 2. ADMIN MARKET & CATEGORY MANAGEMENT ---
  it('POST /api/v1/admin/markets should allow admin to create a market', async () => {
    const res = await request(app)
      .post('/api/v1/admin/markets')
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'Bahria Orchard Fresh Bazaar (Test)',
        address: 'Sector B Commercial, Bahria Orchard, Lahore',
        timezone: 'Asia/Karachi',
        coordinates: { latitude: 31.332, longitude: 74.215 },
        operatingDays: [0],
        operatingHours: { open: '08:00', close: '13:00' },
        mapProvider: 'google',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    createdMarketId = res.body.data.id;
  });

  it('POST /api/v1/admin/categories should allow admin to create category', async () => {
    const res = await request(app)
      .post('/api/v1/admin/categories')
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        name: testCategoryName,
        slug: testCategorySlug,
        description: 'Cultured cheeses and homemade preserves.',
        icon: 'cheese',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe(testCategorySlug);
    createdCategoryId = res.body.data.id;
  });

  it('GET /api/v1/categories should list active categories for customers and farmers', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((c) => c.slug === testCategorySlug)).toBe(true);
  });

  // --- 3. FARMER PROFILE & PARTICIPATION ---
  it('GET /api/v1/farmers/:id should return public farmer profile with current offers', async () => {
    const res = await request(app).get(`/api/v1/farmers/${demoFarmerProfileId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(demoFarmerProfileId);
    expect(Array.isArray(res.body.data.attendingMarkets)).toBe(true);
    expect(Array.isArray(res.body.data.currentOffers)).toBe(true);
  });

  it('GET /api/v1/farmer/profile should return authenticated farmer profile', async () => {
    const res = await request(app)
      .get('/api/v1/farmer/profile')
      .set('Cookie', [`token=${farmerToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.businessName).toBeDefined();
    expect(res.body.data.approvalStatus).toBe('approved');
  });

  it('PATCH /api/v1/farmer/profile should allow farmer to update stall pin and bio', async () => {
    const res = await request(app)
      .patch('/api/v1/farmer/profile')
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        bio: 'Updated bio: Handcrafting fresh heirloom produce weekly.',
        stallCoordinates: { latitude: 31.4825, longitude: 74.3218 },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.bio).toContain('Updated bio');
  });

  // --- 4. FARMER PRODUCT CRUD ---
  it('Pending farmer cannot create products (blocked by requireApprovedFarmer)', async () => {
    const res = await request(app)
      .post('/api/v1/farmer/products')
      .set('Cookie', [`token=${pendingFarmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'Blocked Produce',
        categoryId: createdCategoryId,
        unit: 'kg',
        basePriceMinor: 20000,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FARMER_NOT_APPROVED');
  });

  it('Approved farmer can create a new catalogue product', async () => {
    const res = await request(app)
      .post('/api/v1/farmer/products')
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'Organic Red Bell Peppers (Test)',
        description: 'Vibrant sweet bell peppers picked at peak maturity.',
        categoryId: createdCategoryId,
        unit: 'kg',
        basePriceMinor: 28000,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Organic Red Bell Peppers (Test)');
    createdProductId = res.body.data.id;
  });

  // --- 5. WEEKLY TEMPLATE & DATED STOCK OFFERS ---
  it('Farmer can update weekly recurring stock template', async () => {
    const res = await request(app)
      .put('/api/v1/farmer/stock-templates')
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId: demoMarketId,
        dayOfWeek: 6,
        items: [
          {
            productId: createdProductId,
            defaultQuantity: 30,
            defaultPriceMinor: 28000,
            unit: 'kg',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
  });

  it('Farmer can allocate dated stock offer for specific market day', async () => {
    const res = await request(app)
      .post('/api/v1/farmer/stock-offers')
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId: demoMarketId,
        productId: createdProductId,
        date: '2026-10-03',
        priceMinor: 28000,
        totalQuantity: 25,
        unit: 'kg',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.availableQuantity).toBe(25);
    expect(res.body.data.status).toBe('available');
  });

  // --- 6. PUBLIC PRODUCT DISCOVERY JOIN ---
  it('GET /api/v1/products should search and return products with seller and offer', async () => {
    const res = await request(app).get('/api/v1/products?search=Tomatoes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('category');
    expect(res.body.data[0]).toHaveProperty('farmer');
  });

  // --- 7. PICKUP WINDOWS & CUTOFFS ---
  it('Farmer can create a pickup window slot with cutoff timestamp', async () => {
    const res = await request(app)
      .post('/api/v1/farmer/pickup-windows')
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId: demoMarketId,
        date: '2026-10-03',
        startTime: '08:00',
        endTime: '09:30',
        cutoffAt: '2026-10-03T02:00:00.000Z',
        maxCapacity: 30,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.startTime).toBe('08:00');
  });

  it('GET /api/v1/pickup-windows returns slots with isCutoffPassed and isSlotAvailable flags', async () => {
    const res = await request(app).get(`/api/v1/pickup-windows?marketId=${demoMarketId}&date=2026-10-03`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('isCutoffPassed');
    expect(res.body.data[0]).toHaveProperty('isSlotAvailable');
  });
});
