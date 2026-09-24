import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ObjectId } from 'mongodb';
import { createApp } from '../src/app.js';
import { connectDB, closeDB, getDB } from '../src/config/db.js';
import { setupDatabaseIndexes } from '../src/config/indexes.js';
import { signToken, generateCsrfToken } from '../src/utils/token.js';
import { createOrUpdateStockOfferService } from '../src/services/inventory.service.js';

describe('MarketLink Phase 4 Customer Engagement, Favourites, Reviews & Alerts Test Suite', () => {
  let app;
  let db;

  let customerToken = '';
  let customerUser = null;
  let farmerToken = '';
  let farmerUser = null;
  let farmerProfile = null;
  let adminToken = '';
  let csrfToken = '';

  let testMarketId = '';
  let testProductId = '';
  let completedOrderId = '';
  let placedOrderId = '';
  let createdReviewFarmerId = '';
  let createdRestockAlertId = '';

  beforeAll(async () => {
    app = createApp();
    await connectDB();
    db = getDB();
    await setupDatabaseIndexes(db);

    // 1. Fetch seed users
    customerUser = await db.collection('users').findOne({ email: 'customer.sarah@marketlink.com' });
    farmerUser = await db.collection('users').findOne({ email: 'farmer.greenfield@marketlink.com' });
    farmerProfile = await db.collection('farmerProfiles').findOne({ userId: farmerUser._id });
    const adminUser = await db.collection('users').findOne({ role: 'admin' });

    customerToken = signToken({ sub: customerUser._id.toString(), role: 'customer' });
    farmerToken = signToken({ sub: farmerUser._id.toString(), role: 'farmer' });
    adminToken = signToken({ sub: adminUser._id.toString(), role: 'admin' });
    csrfToken = generateCsrfToken();

    // Clean up favourites and restock alerts for test customer
    await db.collection('favourites').deleteMany({ customerId: customerUser._id });
    await db.collection('restockAlerts').deleteMany({ customerId: customerUser._id });

    // 2. Setup a test market
    const mRes = await db.collection('markets').insertOne({
      name: 'Gulberg Saturday Market (Phase 4 Test)',
      slug: `gulberg-test-${Date.now()}`,
      city: 'Lahore',
      address: 'Main Boulevard, Gulberg, Lahore',
      coordinates: { type: 'Point', coordinates: [74.35, 31.52] },
      operatingDays: [6],
      isActive: true,
      createdAt: new Date(),
    });
    testMarketId = mRes.insertedId.toString();

    // 3. Setup a test product
    const pRes = await db.collection('products').insertOne({
      farmerId: farmerUser._id,
      name: 'Organic Spinach (Phase 4 Test)',
      description: 'Crisp pesticide-free organic spinach.',
      categoryId: new ObjectId(),
      unit: 'bunch',
      basePriceMinor: 12000,
      status: 'active',
      createdAt: new Date(),
    });
    testProductId = pRes.insertedId.toString();

    // 4. Setup completed test order (for review testing)
    const oRes = await db.collection('orders').insertOne({
      orderNumber: `ORD-P4-COMP-${Date.now()}`,
      checkoutGroupId: new ObjectId().toString(),
      customerId: customerUser._id,
      customerSnapshot: {
        name: customerUser.name || 'Sarah Khan',
        phone: customerUser.phone || '03001234567',
        email: customerUser.email,
      },
      farmerId: farmerUser._id,
      farmerProfileId: farmerProfile?._id || farmerUser._id,
      farmerSnapshot: {
        businessName: farmerProfile?.businessName || 'Greenfield Organics',
        stallNumber: 'A-12',
      },
      marketId: new ObjectId(testMarketId),
      marketSnapshot: {
        name: 'Gulberg Saturday Market (Phase 4 Test)',
      },
      marketDate: '2026-10-24',
      items: [
        {
          productId: new ObjectId(testProductId),
          name: 'Organic Spinach (Phase 4 Test)',
          unit: 'bunch',
          quantity: 2,
          unitPriceMinor: 12000,
          totalPriceMinor: 24000,
        },
      ],
      totalAmountMinor: 24000,
      currency: 'PKR',
      status: 'completed',
      statusHistory: [
        { status: 'placed', timestamp: new Date() },
        { status: 'completed', timestamp: new Date() },
      ],
      payment: {
        status: 'paid_at_pickup',
        paidAmountMinor: 24000,
        paidAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    completedOrderId = oRes.insertedId.toString();

    // 5. Setup active/placed order (for ineligibility test)
    const pOrderRes = await db.collection('orders').insertOne({
      orderNumber: `ORD-P4-PLACED-${Date.now()}`,
      checkoutGroupId: new ObjectId().toString(),
      customerId: customerUser._id,
      farmerId: farmerUser._id,
      marketId: new ObjectId(testMarketId),
      marketDate: '2026-10-31',
      items: [
        {
          productId: new ObjectId(testProductId),
          name: 'Organic Spinach (Phase 4 Test)',
          unit: 'bunch',
          quantity: 1,
          unitPriceMinor: 12000,
          totalPriceMinor: 12000,
        },
      ],
      totalAmountMinor: 12000,
      currency: 'PKR',
      status: 'placed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    placedOrderId = pOrderRes.insertedId.toString();
  });

  afterAll(async () => {
    if (db) {
      await db.collection('markets').deleteOne({ _id: new ObjectId(testMarketId) });
      await db.collection('products').deleteOne({ _id: new ObjectId(testProductId) });
      await db.collection('orders').deleteMany({
        _id: { $in: [new ObjectId(completedOrderId), new ObjectId(placedOrderId)] },
      });
      await db.collection('reviews').deleteMany({ customerId: customerUser._id });
      await db.collection('favourites').deleteMany({ customerId: customerUser._id });
      await db.collection('restockAlerts').deleteMany({ customerId: customerUser._id });
    }
    await closeDB();
  });

  // --- SECTION 1: CUSTOMER PROFILE & PREFERENCES ---
  describe('Customer Profile & Preferences Management', () => {
    it('GET /api/v1/customer/profile returns customer profile with preferences', async () => {
      const res = await request(app)
        .get('/api/v1/customer/profile')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(customerUser.email);
      expect(res.body.data.role).toBe('customer');
      expect(res.body.data.preferences).toBeDefined();
    });

    it('PATCH /api/v1/customer/profile updates profile and dietary preferences', async () => {
      const res = await request(app)
        .patch('/api/v1/customer/profile')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          phone: '03009988776',
          dietaryPreferences: ['Organic', 'Pesticide-Free'],
          defaultPickupNotes: 'Please pack in cloth bags',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe('03009988776');
      expect(res.body.data.preferences.dietaryPreferences).toContain('Organic');
      expect(res.body.data.preferences.defaultPickupNotes).toBe('Please pack in cloth bags');
    });

    it('GET /api/v1/customers/preferences returns isolated preferences', async () => {
      const res = await request(app)
        .get('/api/v1/customers/preferences')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.dietaryPreferences).toContain('Organic');
    });
  });

  // --- SECTION 2: CUSTOMER FAVOURITES (WISHLIST) ---
  describe('Customer Favourites Management', () => {
    it('POST /api/v1/favourites allows adding a farmer to favourites', async () => {
      const res = await request(app)
        .post('/api/v1/favourites')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          targetType: 'farmer',
          targetId: farmerProfile?._id ? farmerProfile._id.toString() : farmerUser._id.toString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.targetType).toBe('farmer');
      expect(res.body.data.isNew).toBe(true);
    });

    it('POST /api/v1/favourites allows adding a product to favourites', async () => {
      const res = await request(app)
        .post('/api/v1/favourites')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          targetType: 'product',
          targetId: testProductId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.targetType).toBe('product');
    });

    it('GET /api/v1/favourites/check verifies favourite status', async () => {
      const res = await request(app)
        .get(`/api/v1/favourites/check?targetType=product&targetId=${testProductId}`)
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.isFavourited).toBe(true);
    });

    it('GET /api/v1/favourites returns enriched list of favourite farmers and products', async () => {
      const res = await request(app)
        .get('/api/v1/favourites')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      const productFav = res.body.data.find((f) => f.targetType === 'product');
      expect(productFav.details.name).toBe('Organic Spinach (Phase 4 Test)');
    });

    it('DELETE /api/v1/favourites/:targetType/:targetId removes favourite', async () => {
      const res = await request(app)
        .delete(`/api/v1/favourites/product/${testProductId}`)
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.data.removed).toBe(true);

      const checkRes = await request(app)
        .get(`/api/v1/favourites/check?targetType=product&targetId=${testProductId}`)
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`]);

      expect(checkRes.body.data.isFavourited).toBe(false);
    });
  });

  // --- SECTION 3: RESTOCK ALERTS ---
  describe('Restock Alerts', () => {
    it('POST /api/v1/restock-alerts subscribes customer for out-of-stock product', async () => {
      const res = await request(app)
        .post('/api/v1/restock-alerts')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          productId: testProductId,
          marketId: testMarketId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.productName).toBe('Organic Spinach (Phase 4 Test)');
      createdRestockAlertId = res.body.data.id;
    });

    it('GET /api/v1/restock-alerts lists active subscriptions', async () => {
      const res = await request(app)
        .get('/api/v1/restock-alerts')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.some((a) => a.id === createdRestockAlertId)).toBe(true);
    });

    it('Adding a stock offer triggers notification for subscribed customer', async () => {
      // Simulate farmer publishing new stock for this product at this market
      await createOrUpdateStockOfferService(farmerUser._id.toString(), {
        productId: testProductId,
        marketId: testMarketId,
        date: '2026-10-31',
        allocatedQuantity: 25,
        priceMinor: 12000,
        status: 'available',
      });

      // Check customer notifications
      const notifRes = await request(app)
        .get('/api/v1/notifications')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`]);

      expect(notifRes.status).toBe(200);
      const restockNotif = notifRes.body.data.find((n) => n.type === 'restock_alert');
      expect(restockNotif).toBeDefined();
      expect(restockNotif.title).toContain('Restocked');
    });

    it('DELETE /api/v1/restock-alerts/:id cancels subscription', async () => {
      const res = await request(app)
        .delete(`/api/v1/restock-alerts/${createdRestockAlertId}`)
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.data.cancelled).toBe(true);
    });
  });

  // --- SECTION 4: REVIEWS & RATINGS ENGINE ---
  describe('Order Reviews & Ratings', () => {
    it('POST /api/v1/reviews rejects review on uncompleted order with 400', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          orderId: placedOrderId,
          targetType: 'farmer',
          targetId: farmerUser._id.toString(),
          rating: 5,
          comment: 'Premature review attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ORDER_NOT_COMPLETED');
    });

    it('POST /api/v1/reviews rejects product not in the order with 400', async () => {
      const fakeProductId = new ObjectId().toString();
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          orderId: completedOrderId,
          targetType: 'product',
          targetId: fakeProductId,
          rating: 4,
          comment: 'Product not in order',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_REVIEW_TARGET');
    });

    it('POST /api/v1/reviews submits 5-star review for the farmer on completed order', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          orderId: completedOrderId,
          targetType: 'farmer',
          targetId: farmerUser._id.toString(),
          rating: 5,
          comment: 'Exceptional fresh organic produce and polite stall service!',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.targetType).toBe('farmer');
      createdReviewFarmerId = res.body.data.id;
    });

    it('POST /api/v1/reviews blocks duplicate review for same target on same order with 409', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          orderId: completedOrderId,
          targetType: 'farmer',
          targetId: farmerUser._id.toString(),
          rating: 4,
          comment: 'Trying to review same farmer twice on same order',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_REVIEW');
    });

    it('POST /api/v1/reviews allows reviewing individual product in same order', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          orderId: completedOrderId,
          targetType: 'product',
          targetId: testProductId,
          rating: 5,
          comment: 'Crispy spinach leaves with no wilting. Highly recommended!',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.targetType).toBe('product');
      expect(res.body.data.rating).toBe(5);
    });

    it('GET /api/v1/reviews/farmer/:id provides public review feed and average rating', async () => {
      const res = await request(app).get(`/api/v1/reviews/farmer/${farmerUser._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalReviews).toBeGreaterThanOrEqual(1);
      expect(res.body.data.averageRating).toBeGreaterThanOrEqual(4.5);
    });

    it('GET /api/v1/reviews/product/:id provides public review feed for product', async () => {
      const res = await request(app).get(`/api/v1/reviews/product/${testProductId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalReviews).toBeGreaterThanOrEqual(1);
      expect(res.body.data.averageRating).toBe(5);
    });

    it('POST /api/v1/farmer/reviews/:id/reply allows farmer to reply to customer review', async () => {
      const res = await request(app)
        .post(`/api/v1/farmer/reviews/${createdReviewFarmerId}/reply`)
        .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          replyText: 'Thank you Sarah! We harvest at 5am every market day to keep it crispy.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.farmerReply).toBeDefined();
      expect(res.body.data.farmerReply.text).toContain('5am every market day');

      // Verify customer received notification of reply
      const notifRes = await request(app)
        .get('/api/v1/notifications')
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`]);

      const replyNotif = notifRes.body.data.find((n) => n.type === 'review_reply');
      expect(replyNotif).toBeDefined();
    });

    it('Admin can list and moderate reviews', async () => {
      const listRes = await request(app)
        .get('/api/v1/admin/reviews')
        .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`]);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      const modRes = await request(app)
        .patch(`/api/v1/admin/reviews/${createdReviewFarmerId}/status`)
        .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          moderationStatus: 'approved',
          moderationReason: 'Verified genuine pickup order.',
        });

      expect(modRes.status).toBe(200);
      expect(modRes.body.data.moderationStatus).toBe('approved');
    });
  });

  // --- SECTION 5: CUSTOMER REORDERING & FARMER INSIGHTS ---
  describe('Customer Reorder & Farmer Insights Reports', () => {
    it('POST /api/v1/orders/:id/reorder checks current inventory for items from past order', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${completedOrderId}/reorder`)
        .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({
          targetMarketDate: '2026-10-31',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.originalOrderId).toBe(completedOrderId);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.items.length).toBe(1);
      // Because we allocated stock earlier for 2026-10-31
      expect(res.body.data.allAvailable).toBe(true);
      expect(res.body.data.readyForCheckoutItems.length).toBe(1);
    });

    it('GET /api/v1/farmer/reports calculates real booked order values and collected payments', async () => {
      const res = await request(app)
        .get('/api/v1/farmer/reports')
        .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics.orderCounts).toBeDefined();
      expect(res.body.data.metrics.actualCollectedPayment.amountMinor).toBeGreaterThanOrEqual(24000);
      expect(res.body.data.bestSellingProducts).toBeDefined();
    });
  });
});
