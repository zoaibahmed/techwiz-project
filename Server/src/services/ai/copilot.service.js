import { ObjectId } from 'mongodb';
import { getDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import { createStockOfferService } from '../inventory.service.js';
import { updateFarmerProfileService } from '../farmer.service.js';
import { cancelCustomerOrderService } from '../order.service.js';

/**
 * MarketLink Copilot Service
 * Multi-role AI assistance grounded in actual MongoDB records.
 * Two-phase action execution: prepares a draft requiring explicit user confirmation.
 */
export async function copilotChatService(user, message, context = {}) {
  const db = getDB();
  const userId = new ObjectId(user.id);
  const role = user.role;

  let promptContext = {};
  let proposedAction = null;
  let replyText = '';

  // 1. Gather Grounded MongoDB Context Based on Role
  if (role === 'customer') {
    const activeMarkets = await db
      .collection('markets')
      .find({ isActive: true })
      .project({ name: 1, city: 1, address: 1, operatingDays: 1, operatingHours: 1 })
      .toArray();

    const currentOffers = await db
      .collection('stockOffers')
      .find({ status: 'available', availableQuantity: { $gt: 0 } })
      .limit(10)
      .toArray();

    const productIds = currentOffers.map((o) => o.productId);
    const products = await db
      .collection('products')
      .find({ _id: { $in: productIds } })
      .project({ name: 1, unit: 1, basePriceMinor: 1 })
      .toArray();

    const productMap = new Map(products.map((p) => [p._id.toString(), p.name]));
    const availableProduce = currentOffers.map((o) => ({
      name: productMap.get(o.productId.toString()) || 'Produce',
      date: o.date,
      availableQuantity: o.availableQuantity,
      pricePKR: (o.priceMinor / 100).toFixed(2),
    }));

    promptContext = {
      markets: activeMarkets.map((m) => m.name),
      availableProduce,
    };

    // Customer Intent Recognition
    const lower = message.toLowerCase();
    if (lower.includes('recipe') || lower.includes('cook') || lower.includes('dinner')) {
      replyText = `Based on today's market produce in Lahore (such as fresh Bedian Tomatoes and Okra), I recommend preparing a vibrant Desi Tomato-Bhindi Karahi! You can pick up fresh vine-ripened tomatoes and farm-fresh okra directly from Greenfield Organic Orchards at Model Town Sunday Organic Bazaar.`;
    } else if (lower.includes('market') || lower.includes('when') || lower.includes('where')) {
      replyText = `We currently have verified demonstration markets in Lahore: ${activeMarkets.map((m) => `${m.name} (${m.address})`).join('; ')}. All orders are reserved online for in-person pickup and payment at the farmer's stall.`;
    } else {
      replyText = `Hello! I am your MarketLink Market Companion. I can help you discover seasonal produce at Lahore farmers markets, check live stock availability, and suggest recipes using fresh ingredients from approved local growers.`;
    }
  } else if (role === 'farmer') {
    const farmerProfile = await db.collection('farmerProfiles').findOne({ userId });
    const farmerOrders = await db
      .collection('orders')
      .find({ farmerId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const stockOffers = await db
      .collection('stockOffers')
      .find({ farmerId: userId })
      .limit(10)
      .toArray();

    promptContext = {
      farm: farmerProfile ? farmerProfile.businessName : 'My Farm',
      approvalStatus: farmerProfile ? farmerProfile.approvalStatus : 'pending',
      recentOrdersCount: farmerOrders.length,
      activeOffersCount: stockOffers.length,
    };

    const lower = message.toLowerCase();
    if (lower.includes('stall') || lower.includes('pin') || lower.includes('location')) {
      // Proposed action to update stall number
      const stallMatch = message.match(/stall\s+([A-Za-z0-9-]+)/i);
      const newStall = stallMatch ? stallMatch[1] : 'Stall A-15';

      const draftDoc = {
        userId,
        role: 'farmer',
        actionType: 'update_stall_pin',
        summary: `Update farm stall designation to "${newStall}".`,
        payload: { stallNumber: newStall },
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15-minute TTL
        createdAt: new Date(),
      };

      const insertRes = await db.collection('aiActionDrafts').insertOne(draftDoc);
      proposedAction = {
        draftId: insertRes.insertedId.toString(),
        actionType: draftDoc.actionType,
        summary: draftDoc.summary,
        requiresConfirmation: true,
      };

      replyText = `I have drafted an action to update your market stall number to "${newStall}". Consequential changes to your farm profile require your explicit confirmation before they take effect. Would you like me to apply this update?`;
    } else if (lower.includes('stock') || lower.includes('inventory') || lower.includes('pricing')) {
      replyText = `For ${farmerProfile ? farmerProfile.businessName : 'your farm'}, you currently have ${stockOffers.length} active dated stock allocations. With pre-orders coming in, keeping adequate buffer for morning walk-in customers while honoring online pre-order reservations is recommended.`;
    } else {
      replyText = `Welcome to Farm Copilot! I monitor your market day pre-orders, assist with weekly stock allocation, and help update your stall logistics. How can I assist your farm today?`;
    }
  } else if (role === 'admin') {
    const totalMarkets = await db.collection('markets').countDocuments({ isActive: true });
    const totalFarmers = await db.collection('farmerProfiles').countDocuments({});
    const pendingFarmers = await db.collection('farmerProfiles').countDocuments({ approvalStatus: 'pending' });
    const totalOrders = await db.collection('orders').countDocuments({});

    promptContext = {
      totalActiveMarkets: totalMarkets,
      totalRegisteredFarmers: totalFarmers,
      pendingFarmerApprovals: pendingFarmers,
      totalOrdersPlaced: totalOrders,
    };

    replyText = `MarketLink Intelligence Overview: Currently managing ${totalMarkets} active markets in Lahore, ${totalFarmers} registered farmers (${pendingFarmers} pending administrative approval), and ${totalOrders} total market pre-orders placed. All checkout operations adhere to Market Pickup Only and atomic stock reservations.`;
  }

  // 2. Return Response
  return {
    role,
    reply: replyText,
    contextSummary: promptContext,
    proposedAction,
  };
}

/**
 * Execute User-Confirmed Consequential AI Action
 */
export async function confirmCopilotActionService(user, draftId) {
  const db = getDB();
  const dId = new ObjectId(draftId);
  const uId = new ObjectId(user.id);

  const draft = await db.collection('aiActionDrafts').findOne({ _id: dId, userId: uId });
  if (!draft) {
    const err = new Error('Proposed action draft not found, expired, or unauthorized.');
    err.code = 'ACTION_DRAFT_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  let executionResult = null;

  // Revalidate expiry
  if (draft.expiresAt && new Date() > new Date(draft.expiresAt)) {
    const err = new Error('Proposed action draft has expired. Please initiate a new copilot request.');
    err.code = 'ACTION_DRAFT_EXPIRED';
    err.statusCode = 410;
    throw err;
  }

  if (draft.actionType === 'update_stall_pin' && user.role === 'farmer') {
    // Server-side revalidation: farmer profile must exist
    const profile = await db.collection('farmerProfiles').findOne({ userId: uId });
    if (!profile) {
      const err = new Error('Farmer profile not found for this account.');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }
    executionResult = await updateFarmerProfileService(user.id, {
      stallNumber: draft.payload.stallNumber,
    });
  } else if (draft.actionType === 'cancel_order' && user.role === 'customer') {
    // Server-side revalidation: order must exist, belong to user, and be cancellable
    const order = await db.collection('orders').findOne({
      _id: new ObjectId(draft.payload.orderId),
      customerId: uId,
    });
    if (!order) {
      const err = new Error('Order not found or no longer accessible.');
      err.code = 'ORDER_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }
    if (!['placed', 'accepted'].includes(order.status)) {
      const err = new Error(`Order cannot be cancelled in its current status (${order.status}).`);
      err.code = 'CANNOT_CANCEL_STATUS';
      err.statusCode = 400;
      throw err;
    }
    executionResult = await cancelCustomerOrderService(
      user.id,
      draft.payload.orderId,
      'Cancelled via Market Companion'
    );
  } else {
    const err = new Error(`Unsupported action type: ${draft.actionType}`);
    err.code = 'UNSUPPORTED_ACTION';
    err.statusCode = 400;
    throw err;
  }

  // Audit Logging
  await db.collection('auditLogs').insertOne({
    userId: uId,
    userRole: user.role,
    action: 'COPILOT_ACTION_EXECUTED',
    actionType: draft.actionType,
    draftId: dId,
    payload: draft.payload,
    summary: draft.summary,
    executedAt: new Date(),
  });

  // Delete draft after successful execution
  await db.collection('aiActionDrafts').deleteOne({ _id: dId });

  return {
    actionType: draft.actionType,
    confirmed: true,
    summary: draft.summary,
    result: executionResult,
  };
}
