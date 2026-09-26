import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, closeDB, getDB } from '../src/config/db.js';
import { setupDatabaseIndexes } from '../src/config/indexes.js';
import { runSeed } from '../src/seed/runSeed.js';
import { signToken, generateCsrfToken } from '../src/utils/token.js';

describe('MarketLink Customer <-> Farmer Messaging & Chat System', () => {
  let app;
  let db;

  // Session cookies
  let customerSarahCookie;
  let customerSarahCsrf;

  let customerBilalCookie;
  let customerBilalCsrf;

  let farmerGreenfieldCookie;
  let farmerGreenfieldCsrf;

  let farmerIndusCookie;
  let farmerIndusCsrf;

  let greenfieldProfileId;
  let sampleProductId;
  let sampleOrderId;

  beforeAll(async () => {
    await runSeed();
    await connectDB();
    db = getDB();
    app = createApp();

    // 1. Fetch seed users
    const sarahUser = await db.collection('users').findOne({ email: 'customer.sarah@marketlink.com' });
    const bilalUser = await db.collection('users').findOne({ email: 'customer.bilal@marketlink.com' });
    const greenfieldUser = await db.collection('users').findOne({ email: 'farmer.greenfield@marketlink.com' });
    const indusUser = await db.collection('users').findOne({ email: 'farmer.indus@marketlink.com' });

    customerSarahCsrf = generateCsrfToken();
    const sarahToken = signToken({ sub: sarahUser._id.toString(), role: 'customer' });
    customerSarahCookie = [`token=${sarahToken}`, `marketlink_csrf=${customerSarahCsrf}`];

    customerBilalCsrf = generateCsrfToken();
    const bilalToken = signToken({ sub: bilalUser._id.toString(), role: 'customer' });
    customerBilalCookie = [`token=${bilalToken}`, `marketlink_csrf=${customerBilalCsrf}`];

    farmerGreenfieldCsrf = generateCsrfToken();
    const greenfieldToken = signToken({ sub: greenfieldUser._id.toString(), role: 'farmer' });
    farmerGreenfieldCookie = [`token=${greenfieldToken}`, `marketlink_csrf=${farmerGreenfieldCsrf}`];

    farmerIndusCsrf = generateCsrfToken();
    const indusToken = signToken({ sub: indusUser._id.toString(), role: 'farmer' });
    farmerIndusCookie = [`token=${indusToken}`, `marketlink_csrf=${farmerIndusCsrf}`];

    // Resolve IDs
    const fProfile = await db.collection('farmerProfiles').findOne({ businessName: /Greenfield/i });
    greenfieldProfileId = fProfile._id.toString();

    const prod = await db.collection('products').findOne({ farmerId: fProfile._id });
    sampleProductId = prod._id.toString();

    const ord = await db.collection('orders').findOne({ farmerId: fProfile._id });
    sampleOrderId = ord._id.toString();

    // Clean up chat collections for pure test isolation
    await db.collection('conversations').deleteMany({});
    await db.collection('messages').deleteMany({});
  }, 30000);

  afterAll(async () => {
    await closeDB();
  });

  let createdConversationId;

  it('Customer Sarah starts a conversation with Farmer Greenfield linked to a product', async () => {
    const res = await request(app)
      .post('/api/v1/chat/conversations')
      .set('Cookie', customerSarahCookie)
      .set('x-csrf-token', customerSarahCsrf)
      .send({
        farmerId: greenfieldProfileId,
        productId: sampleProductId,
        message: 'Hello Tariq! Will you have extra heirloom tomatoes on Saturday?',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.conversationId).toBeDefined();
    expect(res.body.data.messageId).toBeDefined();
    expect(res.body.data.conversation.farmerBusinessName).toContain('Greenfield');
    expect(res.body.data.conversation.relatedProductId).toBe(sampleProductId);

    createdConversationId = res.body.data.conversationId;

    // Verify in MongoDB
    const convoInDb = await db.collection('conversations').findOne({
      _id: res.body.data.conversation.id ? new (await import('mongodb')).ObjectId(res.body.data.conversation.id) : undefined,
    });
    expect(convoInDb).toBeDefined();
    expect(convoInDb.farmerUnreadCount).toBe(1);
    expect(convoInDb.customerUnreadCount).toBe(0);
  });

  it('Farmer Greenfield sees the unread conversation in inbox and unread count endpoint', async () => {
    // Check quick unread-count badge endpoint
    const badgeRes = await request(app)
      .get('/api/v1/chat/unread-count')
      .set('Cookie', farmerGreenfieldCookie);

    expect(badgeRes.status).toBe(200);
    expect(badgeRes.body.data.unreadConversations).toBeGreaterThanOrEqual(1);

    // List conversations
    const listRes = await request(app)
      .get('/api/v1/chat/conversations?filter=unread')
      .set('Cookie', farmerGreenfieldCookie);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    const convo = listRes.body.data.find((c) => c.id === createdConversationId);
    expect(convo).toBeDefined();
    expect(convo.customerName).toContain('Sarah');
    expect(convo.unreadCount).toBe(1);
  });

  it('Farmer Greenfield reads conversation messages and resets unread count', async () => {
    const detailRes = await request(app)
      .get(`/api/v1/chat/conversations/${createdConversationId}`)
      .set('Cookie', farmerGreenfieldCookie);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.productContext).toBeDefined();
    expect(detailRes.body.data.productContext.id).toBe(sampleProductId);

    // Fetch messages (marks read)
    const messagesRes = await request(app)
      .get(`/api/v1/chat/conversations/${createdConversationId}/messages`)
      .set('Cookie', farmerGreenfieldCookie);

    expect(messagesRes.status).toBe(200);
    expect(messagesRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(messagesRes.body.data[0].body).toContain('heirloom tomatoes');

    // Unread count should now be 0
    const unreadRes = await request(app)
      .get('/api/v1/chat/unread-count')
      .set('Cookie', farmerGreenfieldCookie);
    expect(unreadRes.body.data.unreadConversations).toBe(0);
  });

  it('Farmer Greenfield requests AI Smart Reply grounded in stall inventory', async () => {
    const replyRes = await request(app)
      .post(`/api/v1/chat/conversations/${createdConversationId}/suggest-reply`)
      .set('Cookie', farmerGreenfieldCookie)
      .set('x-csrf-token', farmerGreenfieldCsrf);

    expect(replyRes.status).toBe(200);
    expect(replyRes.body.data.suggestedReply).toBeDefined();
    expect(replyRes.body.data.suggestedReply.length).toBeGreaterThan(10);
  });

  it('Farmer Greenfield replies to Customer Sarah and increments customer unread count', async () => {
    const sendRes = await request(app)
      .post(`/api/v1/chat/conversations/${createdConversationId}/messages`)
      .set('Cookie', farmerGreenfieldCookie)
      .set('x-csrf-token', farmerGreenfieldCsrf)
      .send({
        message: 'Yes Sarah! We have 47 kg harvested fresh for Saturday. Pre-order is open!',
      });

    expect(sendRes.status).toBe(201);
    expect(sendRes.body.data.id).toBeDefined();
    expect(sendRes.body.data.senderRole).toBe('farmer');

    // Customer Sarah should now have 1 unread conversation
    const customerBadge = await request(app)
      .get('/api/v1/chat/unread-count')
      .set('Cookie', customerSarahCookie);
    expect(customerBadge.status).toBe(200);
    expect(customerBadge.body.data.unreadConversations).toBe(1);
  });

  it('Customer Sarah receives the farmer reply and reading it clears unread state', async () => {
    const msgRes = await request(app)
      .get(`/api/v1/chat/conversations/${createdConversationId}/messages`)
      .set('Cookie', customerSarahCookie);

    expect(msgRes.status).toBe(200);
    expect(msgRes.body.data.length).toBe(2);
    expect(msgRes.body.data[1].senderRole).toBe('farmer');
    expect(msgRes.body.data[1].body).toContain('47 kg');

    const customerBadgeAfter = await request(app)
      .get('/api/v1/chat/unread-count')
      .set('Cookie', customerSarahCookie);
    expect(customerBadgeAfter.body.data.unreadConversations).toBe(0);
  });

  it('Security: Customer Bilal CANNOT read or post messages to Sarah\'s conversation', async () => {
    const fetchForbidden = await request(app)
      .get(`/api/v1/chat/conversations/${createdConversationId}`)
      .set('Cookie', customerBilalCookie);
    expect(fetchForbidden.status).toBe(403);

    const postForbidden = await request(app)
      .post(`/api/v1/chat/conversations/${createdConversationId}/messages`)
      .set('Cookie', customerBilalCookie)
      .set('x-csrf-token', customerBilalCsrf)
      .send({ message: 'I am spying on this conversation.' });
    expect(postForbidden.status).toBe(403);
  });

  it('Security: Farmer Indus CANNOT read or post messages to Farmer Greenfield\'s conversation', async () => {
    const fetchForbidden = await request(app)
      .get(`/api/v1/chat/conversations/${createdConversationId}`)
      .set('Cookie', farmerIndusCookie);
    expect(fetchForbidden.status).toBe(403);

    const postForbidden = await request(app)
      .post(`/api/v1/chat/conversations/${createdConversationId}/messages`)
      .set('Cookie', farmerIndusCookie)
      .set('x-csrf-token', farmerIndusCsrf)
      .send({ message: 'Farmer Indus intruding.' });
    expect(postForbidden.status).toBe(403);
  });

  it('Customer starts chat linked to an existing order', async () => {
    const res = await request(app)
      .post('/api/v1/chat/conversations')
      .set('Cookie', customerSarahCookie)
      .set('x-csrf-token', customerSarahCsrf)
      .send({
        farmerId: greenfieldProfileId,
        orderId: sampleOrderId,
        message: 'Hi, can I pick up my order 15 minutes earlier?',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.conversation.relatedOrderId).toBe(sampleOrderId);

    // Detail includes authoritative order context
    const detail = await request(app)
      .get(`/api/v1/chat/conversations/${res.body.data.conversationId}`)
      .set('Cookie', customerSarahCookie);

    expect(detail.status).toBe(200);
    expect(detail.body.data.orderContext).toBeDefined();
    expect(detail.body.data.orderContext.id).toBe(sampleOrderId);
    expect(detail.body.data.orderContext.orderNumber).toBeDefined();
  });
});
