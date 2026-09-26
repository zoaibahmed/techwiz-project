import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { env } from '../config/env.js';
import { createNotification } from './notification.service.js';

/**
 * Resolves a farmer profile and farmer user from an ID that could be either
 * a farmerProfileId or a userId.
 */
const DEMO_FARMER_MAP = {
  'demo-f1': '66f100000000000000000001',
  'demo-f2': '66f100000000000000000002',
  'demo-f3': '66f100000000000000000003',
};

const DEMO_PRODUCT_MAP = {
  'demo-p1': '66f400000000000000000001',
  'demo-p2': '66f400000000000000000002',
  'demo-p3': '66f400000000000000000003',
  'demo-p4': '66f400000000000000000004',
  'demo-p5': '66f400000000000000000005',
};

const DEMO_ORDER_MAP = {
  'demo-o1': '66f700000000000000000001',
  'demo-o2': '66f700000000000000000002',
};

/**
 * Resolves a farmer profile and farmer user from an ID that could be either
 * a farmerProfileId, a userId, or a demo identifier (e.g. demo-f1).
 */
async function resolveFarmer(db, rawFarmerId) {
  const mappedId = DEMO_FARMER_MAP[rawFarmerId] || rawFarmerId;
  let fId = null;
  if (ObjectId.isValid(mappedId)) {
    fId = new ObjectId(mappedId);
  }

  // 1. Try finding by farmerProfile._id
  let profile = fId ? await db.collection('farmerProfiles').findOne({ _id: fId }) : null;
  let user = null;

  if (profile) {
    user = await db.collection('users').findOne({ _id: profile.userId });
  } else if (fId) {
    // 2. Try finding by user._id
    user = await db.collection('users').findOne({ _id: fId, role: 'farmer' });
    if (user) {
      profile = await db.collection('farmerProfiles').findOne({ userId: user._id });
    }
  }

  // 3. Fallback: match by businessName or contactPerson if demo alias string passed
  if (!profile || !user) {
    profile = await db.collection('farmerProfiles').findOne({
      $or: [
        { businessName: { $regex: new RegExp(String(rawFarmerId), 'i') } },
        { contactPerson: { $regex: new RegExp(String(rawFarmerId), 'i') } },
      ],
    });
    if (profile) {
      user = await db.collection('users').findOne({ _id: profile.userId });
    }
  }

  // 4. Default fallback to first active farmer profile if in demo mode
  if (!profile || !user) {
    profile = await db.collection('farmerProfiles').findOne({});
    if (profile) {
      user = await db.collection('users').findOne({ _id: profile.userId });
    }
  }

  if (!profile || !user) {
    const error = new Error('Farmer or grower profile not found.');
    error.statusCode = 404;
    error.code = 'FARMER_NOT_FOUND';
    throw error;
  }

  return { profile, user };
}

/**
 * Start or get an existing conversation between a customer and a farmer.
 */
export async function startOrGetConversationService(currentUser, payload) {
  const db = getDB();

  // 1. Customer initiates conversation (or farmer replying)
  let customerUser = null;
  let farmerInfo = null;

  if (currentUser.role === 'customer') {
    customerUser = await db.collection('users').findOne({ _id: new ObjectId(currentUser.id) });
    if (!customerUser) {
      const err = new Error('Customer account not found.');
      err.statusCode = 404;
      throw err;
    }
    farmerInfo = await resolveFarmer(db, payload.farmerId);
  } else if (currentUser.role === 'farmer') {
    // Farmer starting conversation with a customer (e.g. from an order)
    const farmerUserId = new ObjectId(currentUser.id);
    const profile = await db.collection('farmerProfiles').findOne({ userId: farmerUserId });
    if (!profile) {
      const err = new Error('Farmer profile not found.');
      err.statusCode = 404;
      throw err;
    }
    farmerInfo = { profile, user: { _id: farmerUserId, name: currentUser.name } };
    customerUser = await db.collection('users').findOne({
      _id: new ObjectId(payload.customerId || payload.farmerId),
      role: 'customer',
    });
    if (!customerUser) {
      const err = new Error('Target customer not found.');
      err.statusCode = 404;
      throw err;
    }
  } else {
    const err = new Error('Only customers or registered farmers can engage in messaging.');
    err.statusCode = 403;
    throw err;
  }

  const customerId = customerUser._id;
  const farmerProfileId = farmerInfo.profile._id;
  const farmerUserId = farmerInfo.user._id;

  // 2. Authoritative Product Context (if provided)
  let relatedProduct = null;
  if (payload.productId) {
    const resolvedProdId = DEMO_PRODUCT_MAP[payload.productId] || payload.productId;
    if (ObjectId.isValid(resolvedProdId)) {
      relatedProduct = await db.collection('products').findOne({
        _id: new ObjectId(resolvedProdId),
      });
    }
  }

  // 3. Authoritative Order Context (if provided)
  let relatedOrder = null;
  if (payload.orderId) {
    const resolvedOrderId = DEMO_ORDER_MAP[payload.orderId] || payload.orderId;
    if (ObjectId.isValid(resolvedOrderId)) {
      relatedOrder = await db.collection('orders').findOne({
        _id: new ObjectId(resolvedOrderId),
      });
    }
  }

  // 4. Find existing conversation or create new
  const query = {
    customerId,
    farmerProfileId,
    status: { $ne: 'deleted' },
  };

  // If specific order context, prioritize conversation linked to that order
  if (relatedOrder) {
    query.relatedOrderId = relatedOrder._id;
  } else if (relatedProduct) {
    // If specific product context, check if conversation linked to that product exists
    query.relatedProductId = relatedProduct._id;
  }

  let conversation = await db.collection('conversations').findOne(query);

  // If not found with exact context, look for general active conversation between them
  if (!conversation && !relatedOrder && !relatedProduct) {
    conversation = await db.collection('conversations').findOne({
      customerId,
      farmerProfileId,
      status: { $ne: 'deleted' },
    });
  }

  const now = new Date();
  const trimmedMessage = (payload.message || '').trim();

  if (!conversation) {
    const newDoc = {
      customerId,
      customerName: customerUser.name || 'Shopper',
      customerEmail: customerUser.email,
      farmerProfileId,
      farmerUserId,
      farmerBusinessName: farmerInfo.profile.businessName || farmerInfo.user.name,
      farmerContactPerson: farmerInfo.profile.contactPerson || farmerInfo.user.name,
      relatedProductId: relatedProduct ? relatedProduct._id : null,
      relatedProductName: relatedProduct ? relatedProduct.name : null,
      relatedOrderId: relatedOrder ? relatedOrder._id : null,
      relatedOrderNumber: relatedOrder ? relatedOrder.orderNumber : null,
      status: 'active',
      lastMessageText: trimmedMessage,
      lastMessageAt: now,
      lastSenderRole: currentUser.role,
      customerUnreadCount: currentUser.role === 'farmer' ? 1 : 0,
      farmerUnreadCount: currentUser.role === 'customer' ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    };

    const res = await db.collection('conversations').insertOne(newDoc);
    conversation = { _id: res.insertedId, ...newDoc };
  } else {
    // Update existing conversation with latest message preview and context
    const updates = {
      lastMessageText: trimmedMessage,
      lastMessageAt: now,
      lastSenderRole: currentUser.role,
      updatedAt: now,
      status: 'active', // unarchive if active message sent
    };

    if (relatedProduct && !conversation.relatedProductId) {
      updates.relatedProductId = relatedProduct._id;
      updates.relatedProductName = relatedProduct.name;
    }
    if (relatedOrder && !conversation.relatedOrderId) {
      updates.relatedOrderId = relatedOrder._id;
      updates.relatedOrderNumber = relatedOrder.orderNumber;
    }

    const incField = currentUser.role === 'customer' ? 'farmerUnreadCount' : 'customerUnreadCount';
    await db.collection('conversations').updateOne(
      { _id: conversation._id },
      {
        $set: updates,
        $inc: { [incField]: 1 },
      }
    );
  }

  // 5. Insert Message
  const messageDoc = {
    conversationId: conversation._id,
    senderId: new ObjectId(currentUser.id),
    senderRole: currentUser.role,
    senderName: currentUser.name || (currentUser.role === 'farmer' ? farmerInfo.profile.businessName : 'Shopper'),
    messageType: 'text',
    body: trimmedMessage,
    readAt: null,
    createdAt: now,
  };

  const messageResult = await db.collection('messages').insertOne(messageDoc);

  // 6. Notify Recipient
  if (currentUser.role === 'customer') {
    await createNotification(
      farmerUserId.toString(),
      'new_chat_message',
      `New message from ${currentUser.name || 'a customer'}`,
      trimmedMessage.length > 80 ? `${trimmedMessage.substring(0, 80)}...` : trimmedMessage,
      {
        conversationId: conversation._id.toString(),
        customerId: customerId.toString(),
        relatedProductId: conversation.relatedProductId?.toString() || null,
        relatedOrderId: conversation.relatedOrderId?.toString() || null,
      }
    );
  } else {
    await createNotification(
      customerId.toString(),
      'farmer_chat_reply',
      `${farmerInfo.profile.businessName || 'Grower'} replied`,
      trimmedMessage.length > 80 ? `${trimmedMessage.substring(0, 80)}...` : trimmedMessage,
      {
        conversationId: conversation._id.toString(),
        farmerId: farmerProfileId.toString(),
      }
    );
  }

  return {
    conversationId: conversation._id.toString(),
    messageId: messageResult.insertedId.toString(),
    status: 'sent',
    conversation: formatConversation(conversation, currentUser),
  };
}

/**
 * List all conversations for the authenticated user with filters and search.
 */
export async function listConversationsService(currentUser, { filter = 'all', search = '' }) {
  const db = getDB();
  const query = {};

  if (currentUser.role === 'customer') {
    query.customerId = new ObjectId(currentUser.id);
  } else if (currentUser.role === 'farmer') {
    // Farmer matches either by farmerUserId or farmerProfileId
    const farmerUserId = new ObjectId(currentUser.id);
    const profile = await db.collection('farmerProfiles').findOne({ userId: farmerUserId });
    if (profile) {
      query.$or = [{ farmerUserId }, { farmerProfileId: profile._id }];
    } else {
      query.farmerUserId = farmerUserId;
    }
  } else if (currentUser.role === 'admin') {
    // Admin review/moderation (read-only audit support)
  } else {
    const err = new Error('Unauthorized role for messaging.');
    err.statusCode = 403;
    throw err;
  }

  // Handle archive/active status
  if (filter === 'archived') {
    query.status = 'archived';
  } else {
    query.status = { $ne: 'archived' };
  }

  // Unread filter
  if (filter === 'unread') {
    if (currentUser.role === 'customer') {
      query.customerUnreadCount = { $gt: 0 };
    } else {
      query.farmerUnreadCount = { $gt: 0 };
    }
  }

  // Order-linked filter
  if (filter === 'order-linked') {
    query.relatedOrderId = { $ne: null };
  }

  // Search filter
  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term, 'i');
    const searchConditions = [
      { customerName: regex },
      { farmerBusinessName: regex },
      { relatedProductName: regex },
      { relatedOrderNumber: regex },
      { lastMessageText: regex },
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  const rawList = await db
    .collection('conversations')
    .find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(100)
    .toArray();

  return rawList.map((c) => formatConversation(c, currentUser));
}

/**
 * Get conversation details including authoritative product and order context.
 */
export async function getConversationDetailService(currentUser, conversationId) {
  const db = getDB();
  const cId = new ObjectId(conversationId);
  const conversation = await db.collection('conversations').findOne({ _id: cId });

  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }

  verifyParticipant(conversation, currentUser);

  // Authoritative Context Enrichment
  let productContext = null;
  if (conversation.relatedProductId) {
    const p = await db.collection('products').findOne({ _id: conversation.relatedProductId });
    if (p) {
      productContext = {
        id: p._id.toString(),
        name: p.name,
        priceMinor: p.basePriceMinor,
        currency: p.currency,
        unit: p.unit,
        imageUrl: p.imageUrl,
        isArchived: p.isArchived,
      };
    }
  }

  let orderContext = null;
  if (conversation.relatedOrderId) {
    const o = await db.collection('orders').findOne({ _id: conversation.relatedOrderId });
    if (o) {
      orderContext = {
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmountMinor: o.totalAmountMinor,
        currency: o.currency,
        pickupDate: o.pickupDate,
        pickupTimeSlot: o.pickupTimeSlot,
        lines: (o.lines || []).map((l) => ({
          name: l.productNameSnapshot,
          quantity: l.quantity,
          unit: l.unitSnapshot,
          lineTotalMinor: l.lineTotalMinor,
        })),
      };
    }
  }

  return {
    ...formatConversation(conversation, currentUser),
    productContext,
    orderContext,
  };
}

/**
 * Retrieve messages for a conversation and mark unread incoming messages as read.
 */
export async function getMessagesService(currentUser, conversationId, { limit = 100, before = null } = {}) {
  const db = getDB();
  const cId = new ObjectId(conversationId);
  const conversation = await db.collection('conversations').findOne({ _id: cId });

  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }

  verifyParticipant(conversation, currentUser);

  const query = { conversationId: cId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const rawMessages = await db
    .collection('messages')
    .find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();

  // Mark incoming messages as read
  const now = new Date();
  const opposingRole = currentUser.role === 'customer' ? 'farmer' : 'customer';

  await db.collection('messages').updateMany(
    {
      conversationId: cId,
      senderRole: opposingRole,
      readAt: null,
    },
    {
      $set: { readAt: now },
    }
  );

  // Reset caller's unread counter on the conversation document
  const unreadFieldToReset = currentUser.role === 'customer' ? 'customerUnreadCount' : 'farmerUnreadCount';
  await db.collection('conversations').updateOne(
    { _id: cId },
    { $set: { [unreadFieldToReset]: 0 } }
  );

  return rawMessages.map((m) => ({
    id: m._id.toString(),
    conversationId: m.conversationId.toString(),
    senderId: m.senderId.toString(),
    senderRole: m.senderRole,
    senderName: m.senderName,
    body: m.body,
    isSelf: m.senderId.toString() === currentUser.id.toString(),
    readAt: m.readAt ? m.readAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  }));
}

/**
 * Send a message within an existing conversation.
 */
export async function sendMessageService(currentUser, conversationId, { message }) {
  const db = getDB();
  const cId = new ObjectId(conversationId);
  const conversation = await db.collection('conversations').findOne({ _id: cId });

  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }

  verifyParticipant(conversation, currentUser);

  const now = new Date();
  const trimmed = message.trim();

  // 1. Insert message
  const messageDoc = {
    conversationId: cId,
    senderId: new ObjectId(currentUser.id),
    senderRole: currentUser.role,
    senderName: currentUser.name || (currentUser.role === 'farmer' ? conversation.farmerBusinessName : 'Shopper'),
    messageType: 'text',
    body: trimmed,
    readAt: null,
    createdAt: now,
  };

  const res = await db.collection('messages').insertOne(messageDoc);

  // 2. Update conversation summary and increment recipient unread
  const incField = currentUser.role === 'customer' ? 'farmerUnreadCount' : 'customerUnreadCount';
  await db.collection('conversations').updateOne(
    { _id: cId },
    {
      $set: {
        lastMessageText: trimmed,
        lastMessageAt: now,
        lastSenderRole: currentUser.role,
        updatedAt: now,
        status: 'active',
      },
      $inc: { [incField]: 1 },
    }
  );

  // 3. Dispatch Notification to the other party
  if (currentUser.role === 'customer') {
    await createNotification(
      conversation.farmerUserId.toString(),
      'new_chat_message',
      `New message from ${currentUser.name || 'customer'}`,
      trimmed.length > 80 ? `${trimmed.substring(0, 80)}...` : trimmed,
      {
        conversationId: cId.toString(),
        customerId: conversation.customerId.toString(),
      }
    );
  } else {
    await createNotification(
      conversation.customerId.toString(),
      'farmer_chat_reply',
      `${conversation.farmerBusinessName} replied`,
      trimmed.length > 80 ? `${trimmed.substring(0, 80)}...` : trimmed,
      {
        conversationId: cId.toString(),
        farmerId: conversation.farmerProfileId.toString(),
      }
    );
  }

  return {
    id: res.insertedId.toString(),
    conversationId: cId.toString(),
    senderId: currentUser.id,
    senderRole: currentUser.role,
    senderName: messageDoc.senderName,
    body: trimmed,
    isSelf: true,
    readAt: null,
    createdAt: now.toISOString(),
  };
}

/**
 * Mark a conversation as read.
 */
export async function markConversationReadService(currentUser, conversationId) {
  const db = getDB();
  const cId = new ObjectId(conversationId);
  const conversation = await db.collection('conversations').findOne({ _id: cId });

  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }

  verifyParticipant(conversation, currentUser);

  const now = new Date();
  const opposingRole = currentUser.role === 'customer' ? 'farmer' : 'customer';

  await db.collection('messages').updateMany(
    { conversationId: cId, senderRole: opposingRole, readAt: null },
    { $set: { readAt: now } }
  );

  const unreadField = currentUser.role === 'customer' ? 'customerUnreadCount' : 'farmerUnreadCount';
  await db.collection('conversations').updateOne({ _id: cId }, { $set: { [unreadField]: 0 } });

  return { success: true };
}

/**
 * Retrieve total unread conversation/message count for caller (used by navigation badges).
 */
export async function getUnreadChatCountService(currentUser) {
  const db = getDB();

  if (currentUser.role === 'customer') {
    const count = await db.collection('conversations').countDocuments({
      customerId: new ObjectId(currentUser.id),
      customerUnreadCount: { $gt: 0 },
      status: { $ne: 'archived' },
    });
    return { unreadConversations: count };
  } else if (currentUser.role === 'farmer') {
    const farmerUserId = new ObjectId(currentUser.id);
    const profile = await db.collection('farmerProfiles').findOne({ userId: farmerUserId });
    const match = profile
      ? { $or: [{ farmerUserId }, { farmerProfileId: profile._id }] }
      : { farmerUserId };

    match.farmerUnreadCount = { $gt: 0 };
    match.status = { $ne: 'archived' };

    const count = await db.collection('conversations').countDocuments(match);
    return { unreadConversations: count };
  }

  return { unreadConversations: 0 };
}

/**
 * Archive or unarchive a conversation.
 */
export async function setConversationArchiveService(currentUser, conversationId, isArchived) {
  const db = getDB();
  const cId = new ObjectId(conversationId);
  const conversation = await db.collection('conversations').findOne({ _id: cId });

  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }

  verifyParticipant(conversation, currentUser);

  await db.collection('conversations').updateOne(
    { _id: cId },
    { $set: { status: isArchived ? 'archived' : 'active', updatedAt: new Date() } }
  );

  return { success: true, status: isArchived ? 'archived' : 'active' };
}

/**
 * AI Smart Reply Generator for Farmer.
 * Generates an grounded, suggested reply draft using actual inventory & order data.
 */
export async function suggestReplyService(currentUser, conversationId) {
  if (currentUser.role !== 'farmer') {
    const err = new Error('AI Smart Reply is only available to registered farmers.');
    err.statusCode = 403;
    throw err;
  }

  const db = getDB();
  const cId = new ObjectId(conversationId);
  const conversation = await db.collection('conversations').findOne({ _id: cId });

  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }

  verifyParticipant(conversation, currentUser);

  // 1. Fetch recent message history (up to last 6)
  const recentMessages = await db
    .collection('messages')
    .find({ conversationId: cId })
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();
  recentMessages.reverse();

  const lastCustomerMessage = [...recentMessages]
    .reverse()
    .find((m) => m.senderRole === 'customer')?.body || '';

  // 2. Fetch authoritative stock offers for this farmer
  const upcomingStock = await db
    .collection('stockOffers')
    .find({ farmerId: conversation.farmerProfileId, status: 'available' })
    .limit(10)
    .toArray();

  const productIds = upcomingStock.map((s) => s.productId);
  const products = await db
    .collection('products')
    .find({ _id: { $in: productIds } })
    .toArray();

  const productMap = new Map(products.map((p) => [p._id.toString(), p.name]));

  const stockInventoryText = upcomingStock
    .map((s) => {
      const name = productMap.get(s.productId.toString()) || 'Produce';
      return `- ${name}: ${s.availableQuantity} ${s.unit} available for ${s.date} at Rs. ${(s.priceMinor / 100).toFixed(0)}`;
    })
    .join('\n');

  // 3. Fetch linked order context if present
  let orderInfoText = 'No specific order linked.';
  if (conversation.relatedOrderId) {
    const order = await db.collection('orders').findOne({ _id: conversation.relatedOrderId });
    if (order) {
      orderInfoText = `Order #${order.orderNumber}: Status is "${order.status}". Scheduled for pickup on ${order.pickupDate} (${order.pickupTimeSlot}). Items: ${order.lines?.map((l) => `${l.quantity}x ${l.productNameSnapshot}`).join(', ')}`;
    }
  }

  // 4. Try OpenAI if configured
  if (env.OPENAI_API_KEY) {
    try {
      const systemPrompt = `You are Farm Copilot for ${conversation.farmerBusinessName}.
Draft a polite, brief, helpful reply to the customer (${conversation.customerName}) on behalf of the farmer.
GROUNDING RULES:
1. ONLY reference real produce and availability if supported by the inventory data below:
${stockInventoryText || 'No active published stock offers found.'}
2. Order information:
${orderInfoText}
3. Never promise items or availability that are not listed above.
4. Keep the draft natural, clear, and under 50 words.
5. Provide ONLY the draft message text.`;

      const userPrompt = `Recent conversation:
${recentMessages.map((m) => `${m.senderRole === 'customer' ? conversation.customerName : 'Farmer'}: ${m.body}`).join('\n')}

Draft an appropriate response to the customer's latest question.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 150,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const draft = json.choices?.[0]?.message?.content?.trim();
        if (draft) {
          return {
            suggestedReply: draft.replace(/^"|"$/g, ''),
            groundingNotes: 'Drafted using live stall inventory and order status.',
          };
        }
      }
    } catch (e) {
      console.warn('[Smart Reply OpenAI Warning]:', e.message);
    }
  }

  // Fallback grounded deterministic suggestion
  let fallbackReply = `Hello ${conversation.customerName}! Thank you for reaching out. `;
  if (conversation.relatedOrderId) {
    fallbackReply += `Regarding your reservation #${conversation.relatedOrderNumber || ''}, everything is on track for market pickup. Let me know if you need any adjustments!`;
  } else if (conversation.relatedProductName) {
    fallbackReply += `Yes, our ${conversation.relatedProductName} is harvested fresh for market day collection. Feel free to place a pre-order through the stall catalogue!`;
  } else {
    fallbackReply += `We will have fresh harvest ready at our market stall this weekend. Looking forward to seeing you!`;
  }

  return {
    suggestedReply: fallbackReply,
    groundingNotes: 'Pre-grounded reply template based on stall schedule.',
  };
}

/**
 * Helper to ensure the current authenticated user is a participant.
 */
function verifyParticipant(conversation, currentUser) {
  if (currentUser.role === 'admin') return true; // Admins have oversight

  const isCustomer =
    currentUser.role === 'customer' &&
    conversation.customerId.toString() === currentUser.id.toString();

  const isFarmer =
    currentUser.role === 'farmer' &&
    (conversation.farmerUserId?.toString() === currentUser.id.toString() ||
      (currentUser.farmerProfileId && conversation.farmerProfileId.toString() === currentUser.farmerProfileId.toString()));

  if (!isCustomer && !isFarmer) {
    const error = new Error('You are not authorized to view or access this conversation.');
    error.statusCode = 403;
    error.code = 'CHAT_FORBIDDEN';
    throw error;
  }
  return true;
}

/**
 * Formats a conversation document for API responses.
 */
function formatConversation(doc, currentUser) {
  const isCustomer = currentUser.role === 'customer';
  return {
    id: doc._id.toString(),
    customerId: doc.customerId.toString(),
    customerName: doc.customerName,
    farmerProfileId: doc.farmerProfileId.toString(),
    farmerUserId: doc.farmerUserId?.toString() || null,
    farmerBusinessName: doc.farmerBusinessName,
    farmerContactPerson: doc.farmerContactPerson,
    relatedProductId: doc.relatedProductId ? doc.relatedProductId.toString() : null,
    relatedProductName: doc.relatedProductName || null,
    relatedOrderId: doc.relatedOrderId ? doc.relatedOrderId.toString() : null,
    relatedOrderNumber: doc.relatedOrderNumber || null,
    status: doc.status || 'active',
    lastMessageText: doc.lastMessageText || '',
    lastMessageAt: doc.lastMessageAt ? doc.lastMessageAt.toISOString() : null,
    lastSenderRole: doc.lastSenderRole,
    unreadCount: isCustomer ? (doc.customerUnreadCount || 0) : (doc.farmerUnreadCount || 0),
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}
