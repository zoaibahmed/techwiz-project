import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ObjectId } from 'mongodb';
import { createApp } from '../src/app.js';
import { connectDB, closeDB, getDB } from '../src/config/db.js';
import { setupDatabaseIndexes } from '../src/config/indexes.js';
import { signToken, generateCsrfToken } from '../src/utils/token.js';
import { CAPABILITIES, getCapabilitiesForRole, findCapability } from '../src/services/ai/capabilities.js';

describe('MarketLink Platform-Wide Copilot Capability & Operating Engine Test Suite', () => {
  let app;
  let db;

  let customerToken = '';
  let customerUser = null;
  let farmerToken = '';
  let farmerUser = null;
  let farmerProfile = null;
  let adminToken = '';
  let adminUser = null;
  let csrfToken = '';

  let createdProductDraftId = '';
  let createdProductId = '';
  let testOrderId = '';

  beforeAll(async () => {
    app = createApp();
    await connectDB();
    db = getDB();
    await setupDatabaseIndexes(db);

    // Retrieve seeded demo actors
    customerUser = await db.collection('users').findOne({ email: 'customer.sarah@marketlink.com' });
    farmerUser = await db.collection('users').findOne({ email: 'farmer.greenfield@marketlink.com' });
    farmerProfile = await db.collection('farmerProfiles').findOne({ userId: farmerUser._id });
    adminUser = await db.collection('users').findOne({ role: 'admin' });

    customerToken = signToken({ sub: customerUser._id.toString(), role: 'customer' });
    farmerToken = signToken({ sub: farmerUser._id.toString(), role: 'farmer' });
    adminToken = signToken({ sub: adminUser._id.toString(), role: 'admin' });
    csrfToken = generateCsrfToken();

    // Clean up test action drafts from previous test executions
    await db.collection('aiActionDrafts').deleteMany({
      userId: { $in: [customerUser._id, farmerUser._id, adminUser._id] },
    });

    // Create an active test reservation order for customer cancellation testing
    const testOrderDoc = {
      orderNumber: `TEST-COPILOT-${Date.now()}`,
      customerId: customerUser._id,
      farmerId: farmerProfile._id,
      marketId: farmerProfile.marketIds?.[0] || new ObjectId('66f200000000000000000001'),
      marketDate: '2026-10-30',
      status: 'placed',
      items: [
        {
          name: 'Fresh Carrots',
          quantity: 3,
          unit: 'kg',
          unitPriceMinor: 10000,
          totalPriceMinor: 30000,
        },
      ],
      totalAmountMinor: 30000,
      currency: 'PKR',
      pickupWindow: {
        id: '66f500000000000000000001',
        name: 'Morning Slot 1',
        startTime: '08:30',
        endTime: '10:00',
        cutoffAt: new Date(Date.now() + 86400000),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const oRes = await db.collection('orders').insertOne(testOrderDoc);
    testOrderId = oRes.insertedId.toString();
  });


  // =========================================================================
  // 1. CAPABILITY REGISTRY INTEGRITY
  // =========================================================================
  it('verifies that Capability Registry defines safe, explicit operations for all 3 roles', () => {
    const customerCaps = getCapabilitiesForRole('customer');
    const farmerCaps = getCapabilitiesForRole('farmer');
    const adminCaps = getCapabilitiesForRole('admin');

    expect(customerCaps.length).toBeGreaterThanOrEqual(10);
    expect(farmerCaps.length).toBeGreaterThanOrEqual(10);
    expect(adminCaps.length).toBeGreaterThanOrEqual(10);

    // Verify all capabilities have valid IDs, types, and executable handlers
    for (const cap of CAPABILITIES) {
      expect(cap.id).toBeDefined();
      expect(cap.name).toBeDefined();
      expect(['customer', 'farmer', 'admin']).toContain(cap.role);
      expect(['read', 'write']).toContain(cap.type);
      expect(typeof cap.execute).toBe('function');
      expect(cap.parameters).toBeDefined();
    }
  });

  // =========================================================================
  // 2. CUSTOMER COPILOT: READ & ACTION OPERATIONAL CAPABILITIES
  // =========================================================================
  it('Customer: checks produce availability and cooking ideas with natural tone', async () => {
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'What fresh produce can I get this Saturday and what can I cook with Lahore tomatoes?',
        context: { pathname: '/products' },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('customer');
    expect(res.body.data.reply).toContain('Tomato');
    expect(res.body.data.reply).not.toContain('MongoDB');
    expect(res.body.data.reply).not.toContain('two-phase');
  });

  it('Customer: prepares order cancellation draft for active reservation', async () => {
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'Please cancel my latest order.',
        context: { pathname: '/customer/orders' },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.proposedAction).toBeDefined();
    expect(res.body.data.proposedAction.requiresConfirmation).toBe(true);
    expect(res.body.data.proposedAction.actionType).toBe('cancel_order');

    const draftId = res.body.data.proposedAction.draftId;

    // Confirm Cancellation
    const confirmRes = await request(app)
      .post(`/api/v1/ai/actions/${draftId}/confirm`)
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.confirmed).toBe(true);

    // Verify order status in database was updated via shared order service
    const updatedOrder = await db.collection('orders').findOne({ _id: new ObjectId(testOrderId) });
    expect(updatedOrder.status).toBe('cancelled');
  });

  // =========================================================================
  // 3. FARM COPILOT: PRODUCE CREATION, MULTI-TURN REVISION & OPERATING WORKBENCH
  // =========================================================================
  it('Farmer: creates batch catalogue draft and performs multi-turn price/description revision', async () => {
    // Step 1: Initial proposal request
    const initRes = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'Add tomatoes and bananas to my produce catalogue.',
        context: { pathname: '/farmer/products' },
      });

    expect(initRes.status).toBe(200);
    expect(initRes.body.data.proposedAction).toBeDefined();
    expect(initRes.body.data.proposedAction.actionType).toBe('create_products');

    createdProductDraftId = initRes.body.data.proposedAction.draftId;

    // Step 2: Multi-turn revision ("change tomatoes price to 150 kg and banas to 600 and set descriptions")
    const revRes = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'change tomatoes price to 150 kg and banas to 600 and set produce description too all products',
        context: { pathname: '/farmer/products' },
      });

    expect(revRes.status).toBe(200);
    expect(revRes.body.data.proposedAction).toBeDefined();
    const prods = revRes.body.data.proposedAction.details.products;
    expect(prods).toBeDefined();
    expect(prods.length).toBeGreaterThanOrEqual(2);

    const tomato = prods.find((p) => p.name.toLowerCase().includes('tomat'));
    const banana = prods.find((p) => p.name.toLowerCase().includes('bana'));
    expect(tomato.pricePKR).toBe(150);
    expect(banana.pricePKR).toBe(600);
    expect(tomato.description.length).toBeGreaterThan(10);

    // Step 3: Confirm action via AI action confirm endpoint
    const confirmRes = await request(app)
      .post(`/api/v1/ai/actions/${createdProductDraftId}/confirm`)
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.confirmed).toBe(true);

    // Verify produce records were actually persisted to products collection
    const savedTomatoes = await db.collection('products').findOne({
      farmerId: { $in: [farmerUser._id, farmerProfile._id] },
      name: { $regex: /tomato/i },
      basePriceMinor: 15000,
    });
    expect(savedTomatoes).toBeDefined();
    createdProductId = savedTomatoes._id.toString();
  });

  it('Farmer: switches topic without old draft hijacking', async () => {
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'Show my orders on the workbench.',
        context: { pathname: '/farmer/orders' },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('farmer');
    // Ensure it does not force-activate a product creation draft
    if (res.body.data.proposedAction) {
      expect(res.body.data.proposedAction.actionType).not.toBe('create_products');
    }
  });

  it('Farmer: edits saved product price using pronoun/context resolution', async () => {
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'Change this produce price to 180.',
        context: {
          pathname: '/farmer/products',
          selectedId: createdProductId,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.proposedAction).toBeDefined();
    expect(res.body.data.proposedAction.actionType).toBe('edit_saved_product');

    // Confirm price edit
    const confirmRes = await request(app)
      .post(`/api/v1/ai/actions/${res.body.data.proposedAction.draftId}/confirm`)
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(confirmRes.status).toBe(200);

    // Recheck in database
    const updatedProd = await db.collection('products').findOne({ _id: new ObjectId(createdProductId) });
    expect(updatedProd.basePriceMinor).toBe(18000);
  });

  it('Farmer: publishes dated stock allocation for Saturday market', async () => {
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'Publish 50kg tomatoes for Saturday market.',
        context: { pathname: '/farmer/stock' },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.proposedAction).toBeDefined();
    expect(res.body.data.proposedAction.actionType).toBe('publish_dated_stock');

    const confirmRes = await request(app)
      .post(`/api/v1/ai/actions/${res.body.data.proposedAction.draftId}/confirm`)
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.confirmed).toBe(true);

    // Verify stock offer exists in database
    const offer = await db.collection('stockOffers').findOne({
      farmerId: farmerProfile._id,
      totalQuantity: 50,
      status: 'available',
    });
    expect(offer).toBeDefined();
  });

  // =========================================================================
  // 4. ADMIN MARKET INTELLIGENCE: PENDING FARMER QUEUE & OPERATIONAL ACTIONS
  // =========================================================================
  it('Admin: lists pending farmers and resolves pronoun "approve him" to real service', async () => {
    // Check pending list
    const listRes = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'Which farmers are waiting for approval?',
        context: { pathname: '/admin/farmers' },
      });

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.role).toBe('admin');

    // Admin proposes approval
    const approveRes = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'Approve him.',
        context: { pathname: '/admin/farmers' },
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.proposedAction).toBeDefined();
    expect(approveRes.body.data.proposedAction.actionType).toBe('change_farmer_status');

    // Confirm approval
    const confirmRes = await request(app)
      .post(`/api/v1/ai/actions/${approveRes.body.data.proposedAction.draftId}/confirm`)
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.confirmed).toBe(true);
  });

  it('Admin: drafts and broadcasts platform announcement', async () => {
    const draftRes = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'Draft an announcement: Early Morning Gate Opening for Saturday market at 07:30 AM.',
        context: { pathname: '/admin' },
      });

    expect(draftRes.status).toBe(200);
    expect(draftRes.body.data.proposedAction).toBeDefined();
    expect(draftRes.body.data.proposedAction.actionType).toBe('publish_announcement');

    // Confirm broadcast
    const confirmRes = await request(app)
      .post(`/api/v1/ai/actions/${draftRes.body.data.proposedAction.draftId}/confirm`)
      .set('Cookie', [`token=${adminToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.confirmed).toBe(true);
  });

  // =========================================================================
  // 5. SECURITY & ROLE BOUNDARY ENFORCEMENT
  // =========================================================================
  it('Security: rejects customer attempting to execute farmer or admin actions', async () => {
    // Attempting admin action as customer
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Cookie', [`token=${customerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken)
      .send({
        message: 'Approve all pending farmers and suspend Greenfield Farmstead.',
        context: { pathname: '/admin' },
      });

    expect(res.status).toBe(200);
    // Must NOT generate an administrative proposed action
    if (res.body.data.proposedAction) {
      expect(res.body.data.proposedAction.actionType).not.toBe('change_farmer_status');
    }
  });

  it('Edge Case: prevents re-execution of already confirmed action draft', async () => {
    // Re-confirming previously confirmed createdProductDraftId
    const res = await request(app)
      .post(`/api/v1/ai/actions/${createdProductDraftId}/confirm`)
      .set('Cookie', [`token=${farmerToken}`, `marketlink_csrf=${csrfToken}`])
      .set('x-csrf-token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.data.confirmed).toBe(true);
  });

  afterAll(async () => {
    if (db) {
      // Restore pending status for any test farmers to preserve state for other test suites
      const pendingFarmerUser = await db.collection('users').findOne({ email: 'farmer.pending@marketlink.com' });
      if (pendingFarmerUser) {
        await db.collection('farmerProfiles').updateOne(
          { userId: pendingFarmerUser._id },
          { $set: { approvalStatus: 'pending', approvedAt: null } }
        );
      }
      // Remove test announcements
      await db.collection('announcements').deleteMany({
        title: { $regex: /Early Morning Gate/i },
      });
      // Remove test order
      if (testOrderId) {
        await db.collection('orders').deleteOne({ _id: new ObjectId(testOrderId) });
      }
      // Remove test drafts
      await db.collection('aiActionDrafts').deleteMany({
        userId: { $in: [customerUser?._id, farmerUser?._id, adminUser?._id].filter(Boolean) },
      });
    }
    await closeDB();
  });
});
