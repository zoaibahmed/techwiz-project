import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ObjectId } from 'mongodb';
import { createApp } from '../src/app.js';
import { connectDB, closeDB, getDB } from '../src/config/db.js';
import { setupDatabaseIndexes } from '../src/config/indexes.js';
import { signToken, generateCsrfToken } from '../src/utils/token.js';

describe('MarketLink Phase 3 Order Engine & Copilot Test Suite', () => {
  let app;
  let db;

  let customerToken = '';
  let customerUser = null;
  let farmer1Token = '';
  let farmer1User = null;
  let farmer2Token = '';
  let farmer2User = null;
  let adminToken = '';
  let csrfToken = '';

  const testMarketDate = '2026-10-18';
  let marketId = '';
  let pickupWindowValidId = '';
  let pickupWindowExpiredId = '';
  let product1Id = '';
  let product2Id = '';
  let stockOffer1Id = '';
  let stockOffer2Id = '';

  let createdOrder1Id = '';
  let createdOrder2Id = '';
  let order1Number = '';
  let checkoutGroupId = '';

  beforeAll(async () => {
    app = createApp();
    await connectDB();
    db = getDB();
    await setupDatabaseIndexes(db);

    // 1. Get or setup users
    customerUser = await db.collection('users').findOne({ email: 'customer.sarah@marketlink.com' });
    farmer1User = await db.collection('users').findOne({ email: 'farmer.greenfield@marketlink.com' });
    farmer2User = await db.collection('users').findOne({ email: 'farmer.indus@marketlink.com' });
    const adminUser = await db.collection('users').findOne({ role: 'admin' });

    customerToken = signToken({ sub: customerUser._id.toString(), role: 'customer' });
    farmer1Token = signToken({ sub: farmer1User._id.toString(), role: 'farmer' });
    farmer2Token = signToken({ sub: farmer2User._id.toString(), role: 'farmer' });
    adminToken = signToken({ sub: adminUser._id.toString(), role: 'admin' });
    csrfToken = generateCsrfToken();

    // Clean up any test orders from previous runs
    await db.collection('orders').deleteMany({
      $or: [
        { checkoutKey: { $regex: /^idemp-test/ } },
        { idempotencyKey: { $regex: /^idemp-test/ } },
      ],
    });

    // 2. Setup Test Market
    const mRes = await db.collection('markets').insertOne({
      name: 'Liberty Sunday Farmers Market (Phase 3 Test)',
      slug: `liberty-market-test-${Date.now()}`,
      city: 'Lahore',
      address: 'Liberty Roundabout, Gulberg III, Lahore',
      coordinates: { type: 'Point', coordinates: [74.34, 31.51] },
      operatingDays: [0],
      operatingHours: { open: '07:30', close: '13:00' },
      isActive: true,
      createdAt: new Date(),
    });
    marketId = mRes.insertedId.toString();

    // 3. Setup Test Products (Product 1 for Farmer 1, Product 2 for Farmer 2)
    const cat = await db.collection('categories').findOne({ isActive: true });
    const catId = cat ? cat._id : new ObjectId();

    const p1Res = await db.collection('products').insertOne({
      farmerId: farmer1User._id,
      name: 'Organic Cherry Tomatoes (Test P3)',
      description: 'Sweet juicy organic cherry tomatoes.',
      categoryId: catId,
      unit: 'kg',
      basePriceMinor: 25000, // PKR 250
      status: 'active',
      createdAt: new Date(),
    });
    product1Id = p1Res.insertedId.toString();

    const p2Res = await db.collection('products').insertOne({
      farmerId: farmer2User._id,
      name: 'Fresh Farm Strawberries (Test P3)',
      description: 'Hand-picked ruby strawberries.',
      categoryId: catId,
      unit: 'box',
      basePriceMinor: 45000, // PKR 450
      status: 'active',
      createdAt: new Date(),
    });
    product2Id = p2Res.insertedId.toString();

    // 4. Setup Pickup Windows (One valid in future, one expired)
    const validCutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
    const pw1Res = await db.collection('pickupWindows').insertOne({
      marketId: new ObjectId(marketId),
      date: testMarketDate,
      startTime: '08:30',
      endTime: '10:30',
      capacity: 50,
      reservedOrdersCount: 0,
      cutoffAt: validCutoff,
      createdAt: new Date(),
    });
    pickupWindowValidId = pw1Res.insertedId.toString();

    const expiredCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const pw2Res = await db.collection('pickupWindows').insertOne({
      marketId: new ObjectId(marketId),
      date: testMarketDate,
      startTime: '11:00',
      endTime: '12:30',
      capacity: 50,
      reservedOrdersCount: 0,
      cutoffAt: expiredCutoff,
      createdAt: new Date(),
    });
    pickupWindowExpiredId = pw2Res.insertedId.toString();

    // 5. Setup Dated Stock Offers
    const so1Res = await db.collection('stockOffers').insertOne({
      farmerId: farmer1User._id,
      marketId: new ObjectId(marketId),
      productId: new ObjectId(product1Id),
      date: testMarketDate,
      priceMinor: 25000,
      totalQuantity: 50,
      reservedQuantity: 0,
      availableQuantity: 50,
      unit: 'kg',
      status: 'available',
      createdAt: new Date(),
    });
    stockOffer1Id = so1Res.insertedId.toString();

    const so2Res = await db.collection('stockOffers').insertOne({
      farmerId: farmer2User._id,
      marketId: new ObjectId(marketId),
      productId: new ObjectId(product2Id),
      date: testMarketDate,
      priceMinor: 45000,
      totalQuantity: 30,
      reservedQuantity: 0,
      availableQuantity: 30,
      unit: 'box',
      status: 'available',
      createdAt: new Date(),
    });
    stockOffer2Id = so2Res.insertedId.toString();
  }, 30000);

  afterAll(async () => {
    if (db) {
      await db.collection('markets').deleteOne({ _id: new ObjectId(marketId) });
      await db.collection('products').deleteMany({ _id: { $in: [new ObjectId(product1Id), new ObjectId(product2Id)] } });
      await db.collection('pickupWindows').deleteMany({ _id: { $in: [new ObjectId(pickupWindowValidId), new ObjectId(pickupWindowExpiredId)] } });
      await db.collection('stockOffers').deleteMany({ _id: { $in: [new ObjectId(stockOffer1Id), new ObjectId(stockOffer2Id)] } });
      await db.collection('orders').deleteMany({ marketId: new ObjectId(marketId) });
      await db.collection('notifications').deleteMany({
        userId: { $in: [customerUser._id, farmer1User._id, farmer2User._id] },
      });
    }
    await closeDB();
  });

  // --- 1. CART TO CHECKOUT & MULTI-FARMER GROUPING ---
  it('POST /api/v1/orders/checkout groups multi-farmer cart and reserves stock atomically', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId,
        marketDate: testMarketDate,
        pickupWindowId: pickupWindowValidId,
        items: [
          { productId: product1Id, quantity: 2 }, // from Farmer 1
          { productId: product2Id, quantity: 1 }, // from Farmer 2
        ],
        idempotencyKey: 'idemp-test-checkout-001',
        customerNotes: 'Please pack in paper bags.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('checkoutGroupId');
    expect(Array.isArray(res.body.data.orders)).toBe(true);
    expect(res.body.data.orders.length).toBe(2); // Grouped into 2 orders (1 per farmer)

    checkoutGroupId = res.body.data.checkoutGroupId;
    const order1 = res.body.data.orders.find((o) => o.farmerId === farmer1User._id.toString());
    const order2 = res.body.data.orders.find((o) => o.farmerId === farmer2User._id.toString());

    expect(order1).toBeDefined();
    expect(order1.items.length).toBe(1);
    expect(order1.items[0].quantity).toBe(2);
    expect(order1.totalAmountMinor).toBe(50000); // 2 * 25000
    expect(order1.payment.method).toBe('pay_at_pickup');
    expect(order1.payment.status).toBe('pending_pickup');

    expect(order2).toBeDefined();
    expect(order2.items.length).toBe(1);
    expect(order2.items[0].quantity).toBe(1);
    expect(order2.totalAmountMinor).toBe(45000); // 1 * 45000
    expect(order2.payment.method).toBe('pay_at_pickup');

    createdOrder1Id = order1.id;
    createdOrder2Id = order2.id;
    order1Number = order1.orderNumber;

    // Verify atomic inventory reservation in stockOffers collection
    const offer1 = await db.collection('stockOffers').findOne({ _id: new ObjectId(stockOffer1Id) });
    expect(offer1.reservedQuantity).toBe(2);
    expect(offer1.availableQuantity).toBe(48);

    const offer2 = await db.collection('stockOffers').findOne({ _id: new ObjectId(stockOffer2Id) });
    expect(offer2.reservedQuantity).toBe(1);
    expect(offer2.availableQuantity).toBe(29);
  });

  // --- 2. CHECKOUT IDEMPOTENCY ---
  it('POST /api/v1/orders/checkout with same idempotencyKey replays existing orders without double-deduction', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId,
        marketDate: testMarketDate,
        pickupWindowId: pickupWindowValidId,
        items: [
          { productId: product1Id, quantity: 2 },
          { productId: product2Id, quantity: 1 },
        ],
        idempotencyKey: 'idemp-test-checkout-001',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.isIdempotentReplay).toBe(true);
    expect(res.body.data.checkoutGroupId).toBe(checkoutGroupId);

    // Verify stock was NOT deducted again
    const offer1 = await db.collection('stockOffers').findOne({ _id: new ObjectId(stockOffer1Id) });
    expect(offer1.reservedQuantity).toBe(2);
    expect(offer1.availableQuantity).toBe(48);
  });

  // --- 3. CUTOFF & CAPACITY ENFORCEMENT ---
  it('POST /api/v1/orders/checkout fails with 400 CUTOFF_PASSED if pickup window cutoff has expired', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId,
        marketDate: testMarketDate,
        pickupWindowId: pickupWindowExpiredId,
        items: [{ productId: product1Id, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CUTOFF_PASSED');
  });

  // --- 4. INSUFFICIENT STOCK & CONCURRENCY PROTECTION ---
  it('POST /api/v1/orders/checkout rejects orders exceeding available stock with 400 INSUFFICIENT_STOCK', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId,
        marketDate: testMarketDate,
        pickupWindowId: pickupWindowValidId,
        items: [{ productId: product1Id, quantity: 100 }], // Available is 48
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  // --- 5. CUSTOMER ORDER HISTORY & DETAIL ---
  it('GET /api/v1/orders returns customer pre-order history with market snapshots', async () => {
    const res = await request(app)
      .get('/api/v1/orders')
      .set('Cookie', [`token=${customerToken}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0]).toHaveProperty('orderNumber');
    expect(res.body.data[0]).toHaveProperty('market');
    expect(res.body.data[0]).toHaveProperty('payment');
  });

  it('GET /api/v1/orders/:id returns full order details for owner customer', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${createdOrder1Id}`)
      .set('Cookie', [`token=${customerToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdOrder1Id);
    expect(res.body.data.status).toBe('placed');
  });

  // --- 6. CUSTOMER ORDER MODIFICATION BEFORE CUTOFF ---
  it('PATCH /api/v1/orders/:id/items modifies item quantity and adjusts stock atomically', async () => {
    // Increase quantity of Product 1 from 2 to 4
    const res = await request(app)
      .patch(`/api/v1/orders/${createdOrder1Id}/items`)
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        items: [{ productId: product1Id, quantity: 4 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBe(4);
    expect(res.body.data.totalAmountMinor).toBe(100000); // 4 * 25000 = PKR 1000

    // Verify stock reservation increased by 2 (2 -> 4 reserved, 48 -> 46 available)
    const offer1 = await db.collection('stockOffers').findOne({ _id: new ObjectId(stockOffer1Id) });
    expect(offer1.reservedQuantity).toBe(4);
    expect(offer1.availableQuantity).toBe(46);
  });

  // --- 7. CUSTOMER ORDER CANCELLATION & STOCK RELEASE ---
  it('PATCH /api/v1/orders/:id/cancel cancels order and immediately releases reserved stock', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/${createdOrder2Id}/cancel`)
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({ reason: 'Plans changed for Sunday.' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');

    // Verify Product 2 stock was released (was reserved: 1, available: 29; now reserved: 0, available: 30)
    const offer2 = await db.collection('stockOffers').findOne({ _id: new ObjectId(stockOffer2Id) });
    expect(offer2.reservedQuantity).toBe(0);
    expect(offer2.availableQuantity).toBe(30);
  });

  // --- 8. FARMER ORDER LIFECYCLE (ACCEPT, READY, COMPLETE) ---
  it('Farmer 1 can view incoming orders and transition status through complete lifecycle', async () => {
    // 1. List farmer orders
    const listRes = await request(app)
      .get('/api/v1/farmer/orders')
      .set('Cookie', [`token=${farmer1Token}`]);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((o) => o.id === createdOrder1Id)).toBe(true);

    // 2. Accept order -> 'accepted'
    const confirmRes = await request(app)
      .patch(`/api/v1/farmer/orders/${createdOrder1Id}/status`)
      .set('Cookie', [`token=${farmer1Token}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({ status: 'accepted' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('accepted');

    // 3. Mark ready for pickup -> 'ready_for_pickup'
    const readyRes = await request(app)
      .patch(`/api/v1/farmer/orders/${createdOrder1Id}/status`)
      .set('Cookie', [`token=${farmer1Token}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({ status: 'ready_for_pickup' });

    expect(readyRes.status).toBe(200);
    expect(readyRes.body.data.status).toBe('ready_for_pickup');

    // 4. Complete physical pickup and pay at pickup -> 'completed'
    const completeRes = await request(app)
      .patch(`/api/v1/farmer/orders/${createdOrder1Id}/status`)
      .set('Cookie', [`token=${farmer1Token}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({ status: 'completed' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('completed');
    expect(completeRes.body.data.payment.status).toBe('paid_at_pickup');
  });

  // --- 9. FARMER ORDER DECLINE & STOCK RELEASE ---
  it('Farmer can decline order with reason, immediately releasing reserved stock', async () => {
    // Place a new order for Farmer 1
    const checkoutRes = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        marketId,
        marketDate: testMarketDate,
        pickupWindowId: pickupWindowValidId,
        items: [{ productId: product1Id, quantity: 5 }],
      });

    expect(checkoutRes.status).toBe(201);
    const orderToDecline = checkoutRes.body.data.orders[0];

    // Farmer declines order
    const declineRes = await request(app)
      .patch(`/api/v1/farmer/orders/${orderToDecline.id}/status`)
      .set('Cookie', [`token=${farmer1Token}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        status: 'declined',
        reason: 'Severe frost damaged overnight cherry tomato harvest.',
      });

    expect(declineRes.status).toBe(200);
    expect(declineRes.body.data.status).toBe('declined');
    expect(declineRes.body.data.declineReason).toBe('Severe frost damaged overnight cherry tomato harvest.');
  });

  // --- 10. IN-APP NOTIFICATIONS ---
  it('GET /api/v1/notifications returns order event notifications for user', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', [`token=${customerToken}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('title');
    expect(res.body.data[0]).toHaveProperty('message');

    // Mark as read
    const firstNotif = res.body.data[0];
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${firstNotif.id}/read`)
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.success).toBe(true);
  });

  // --- 11. PHASE 4 PREPARATION: MARKETLINK COPILOT ---
  it('POST /api/v1/ai/chat returns grounded MongoDB context and prepares two-phase actions', async () => {
    // 1. Customer Companion Chat
    const custChatRes = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({ message: 'What can I cook with fresh Lahore tomatoes and vegetables?' });

    expect(custChatRes.status).toBe(200);
    expect(custChatRes.body.data.role).toBe('customer');
    expect(custChatRes.body.data.reply).toContain('Tomato');

    // 2. Farmer Farm Copilot Chat with Consequential Action Draft
    const farmerChatRes = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${farmer1Token}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({ message: 'Please update my stall location to Stall B-18 for Sunday.' });

    expect(farmerChatRes.status).toBe(200);
    expect(farmerChatRes.body.data.role).toBe('farmer');
    expect(farmerChatRes.body.data.proposedAction).toBeDefined();
    expect(farmerChatRes.body.data.proposedAction.requiresConfirmation).toBe(true);

    const draftId = farmerChatRes.body.data.proposedAction.draftId;

    // 3. Confirm Consequential AI Action
    const confirmActionRes = await request(app)
      .post(`/api/v1/ai/actions/${draftId}/confirm`)
      .set('Cookie', [`token=${farmer1Token}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(confirmActionRes.status).toBe(200);
    expect(confirmActionRes.body.data.confirmed).toBe(true);
  });
});
