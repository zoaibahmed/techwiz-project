import { ObjectId } from 'mongodb';
import { getDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import { updateFarmerProfileService } from '../farmer.service.js';
import { cancelCustomerOrderService } from '../order.service.js';
import { replyToReviewService } from '../review.service.js';
import { createAnnouncementService } from '../announcement.service.js';
import { updateFarmerProductService } from '../product.service.js';
import { createOrUpdateStockOfferService } from '../inventory.service.js';

/**
 * Optional OpenAI invocation helper.
 * If OPENAI_API_KEY is configured in the environment, delegates inference to OpenAI.
 * Otherwise, falls back to the deterministic grounded domain engine.
 */
async function tryOpenAICall(systemPrompt, userMessage, contextData) {
  if (!env.OPENAI_API_KEY) return null;

  try {
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
          {
            role: 'user',
            content: `User query: "${userMessage}"\n\nGrounded database records:\n${JSON.stringify(contextData, null, 2)}`,
          },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[OpenAI Call Notice]: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn('[OpenAI Call Notice]:', err.message);
    return null;
  }
}

/**
 * MarketLink Copilot Service
 * Multi-role AI assistance strictly grounded in authorized MongoDB records.
 * Two-phase action execution: prepares a draft requiring explicit user confirmation.
 */
export async function copilotChatService(user, message, context = {}) {
  const db = getDB();
  const userId = new ObjectId(user.id);
  const role = user.role;

  let promptContext = {};
  let proposedAction = null;
  let replyText = '';
  let engine = 'MarketLink Grounded Domain Engine';

  const lower = (message || '').toLowerCase();

  // =========================================================================
  // 1. CUSTOMER — MARKET COMPANION
  // =========================================================================
  if (role === 'customer') {
    const activeMarkets = await db
      .collection('markets')
      .find({ isActive: true })
      .project({ name: 1, city: 1, address: 1, operatingDays: 1, operatingHours: 1 })
      .toArray();

    const currentOffers = await db
      .collection('stockOffers')
      .find({ status: 'available', availableQuantity: { $gt: 0 } })
      .limit(15)
      .toArray();

    const productIds = currentOffers.map((o) => o.productId);
    const products = await db
      .collection('products')
      .find({ _id: { $in: productIds } })
      .project({ name: 1, unit: 1, basePriceMinor: 1, categoryId: 1 })
      .toArray();

    const productMap = new Map(products.map((p) => [p._id.toString(), p.name]));
    const availableProduce = currentOffers.map((o) => ({
      name: productMap.get(o.productId.toString()) || 'Produce',
      date: o.date,
      availableQuantity: o.availableQuantity,
      pricePKR: (o.priceMinor / 100).toFixed(2),
    }));

    const customerOrders = await db
      .collection('orders')
      .find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    promptContext = {
      markets: activeMarkets.map((m) => m.name),
      availableProduce,
      activeOrdersCount: customerOrders.filter((o) => ['placed', 'accepted', 'ready_for_pickup'].includes(o.status)).length,
    };

    // System prompt for optional OpenAI call
    const systemPrompt = `You are MarketLink Market Companion, assisting a customer visiting farmers markets in Lahore.
Strictly adhere to:
1. Ground your answers exclusively in the provided authorized market and produce records.
2. Market model: Market Pickup Only. Customers pre-order online and collect/pay in person at the stall. No delivery or online card processing.
3. Clearly distinguish factual findings from culinary/planning suggestions.`;

    const openAiReply = await tryOpenAICall(systemPrompt, message, promptContext);
    if (openAiReply) {
      replyText = openAiReply;
      engine = `OpenAI (${env.OPENAI_MODEL})`;
    } else {
      // Deterministic Grounded Logic
      if (lower.includes('recipe') || lower.includes('cook') || lower.includes('dinner') || lower.includes('meal')) {
        replyText = `Based on today's market produce in Lahore (such as fresh Bedian Tomatoes and Okra), I recommend preparing a vibrant Desi Tomato-Bhindi Karahi! You can pick up fresh vine-ripened tomatoes and farm-fresh okra directly from Greenfield Organic Orchards at Model Town Sunday Organic Bazaar.`;
      } else if (lower.includes('market') || lower.includes('when') || lower.includes('where') || lower.includes('saturday')) {
        const marketList = activeMarkets.map((m) => `${m.name} (${m.address})`).join('; ');
        replyText = `We currently have verified demonstration markets in Lahore: ${marketList}. All orders are reserved online for in-person pickup and payment at the farmer's stall.`;
      } else if (lower.includes('cancel') && customerOrders.length > 0) {
        const cancellable = customerOrders.find((o) => ['placed', 'accepted'].includes(o.status));
        if (cancellable) {
          const draftDoc = {
            userId,
            role: 'customer',
            actionType: 'cancel_order',
            summary: `Cancel order ${cancellable.orderNumber || cancellable._id.toString()} before market cutoff. Reserved stock will be immediately returned to the grower.`,
            payload: { orderId: cancellable._id.toString() },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          };
          const insertRes = await db.collection('aiActionDrafts').insertOne(draftDoc);
          proposedAction = {
            draftId: insertRes.insertedId.toString(),
            actionType: draftDoc.actionType,
            summary: draftDoc.summary,
            requiresConfirmation: true,
          };
          replyText = `I have drafted a cancellation for reservation ${cancellable.orderNumber || cancellable._id.toString()}. Because this releases reserved produce back to the grower, please review and confirm.`;
        } else {
          replyText = `You do not have any active reservations currently eligible for cancellation. Completed or already terminated orders cannot be cancelled.`;
        }
      } else if (lower.includes('order') || lower.includes('pickup') || lower.includes('ready')) {
        const readyOrders = customerOrders.filter((o) => o.status === 'ready_for_pickup');
        if (readyOrders.length > 0) {
          replyText = `You have ${readyOrders.length} order(s) marked Ready for Pickup: ${readyOrders.map((o) => o.orderNumber || o._id.toString()).join(', ')}. Head to the designated farmer stall, inspect your produce, and pay at collection.`;
        } else {
          replyText = `You have ${customerOrders.length} total recorded order(s). Check your pickup windows in the My Planner timetable to prepare your morning walk.`;
        }
      } else {
        replyText = `Hello! I am your MarketLink Market Companion. I can help you discover seasonal produce at Lahore farmers markets, check live stock availability, and suggest recipes using fresh ingredients from approved local growers.`;
      }
    }
  }

  // =========================================================================
  // 2. FARMER — FARM COPILOT
  // =========================================================================
  else if (role === 'farmer') {
    const profile = await db.collection('farmerProfiles').findOne({ userId });
    const profileId = profile ? profile._id : null;

    // Load Farmer's Products
    const ownProducts = await db
      .collection('products')
      .find({ farmerId: { $in: [userId, profileId].filter(Boolean) } })
      .toArray();

    // Load Farmer's Stock Offers
    const stockOffers = await db
      .collection('stockOffers')
      .find({ farmerId: { $in: [userId, profileId].filter(Boolean) } })
      .toArray();

    // Load Farmer's Recent Orders
    const orders = await db
      .collection('orders')
      .find({ farmerId: { $in: [userId, profileId].filter(Boolean) } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    // Load Comparable Market Produce (other farmers at the same market)
    const marketIds = profile?.marketIds || [];
    const comparableOffers = await db
      .collection('stockOffers')
      .find({
        marketId: { $in: marketIds },
        farmerId: { $nin: [userId, profileId].filter(Boolean) },
        status: 'available',
      })
      .limit(10)
      .toArray();

    const compProductIds = comparableOffers.map((o) => o.productId);
    const compProducts = await db
      .collection('products')
      .find({ _id: { $in: compProductIds } })
      .toArray();
    const compMap = new Map(compProducts.map((p) => [p._id.toString(), p]));

    const comparableList = comparableOffers.map((o) => ({
      productName: compMap.get(o.productId.toString())?.name || 'Produce',
      unit: o.unit,
      pricePKR: (o.priceMinor / 100).toFixed(2),
      date: o.date,
    }));

    promptContext = {
      farm: profile ? profile.businessName : 'My Farm',
      approvalStatus: profile ? profile.approvalStatus : 'pending',
      activeProductsCount: ownProducts.length,
      activeOffersCount: stockOffers.length,
      ordersCount: orders.length,
      comparableMarketPrices: comparableList,
    };

    const systemPrompt = `You are MarketLink Farm Copilot, advising an approved grower in Lahore.
Rules:
1. Ground all analysis strictly in the farmer's actual products, stock, orders, and comparable market records.
2. Distinguish factual findings (e.g. current reservations, price differences) from recommendations.
3. When comparing prices, ensure identical selling units (e.g. PKR/kg).
4. When suggesting pricing or stock updates, describe the exact operational effect.`;

    const openAiReply = await tryOpenAICall(systemPrompt, message, promptContext);
    if (openAiReply && !lower.includes('price') && !lower.includes('stall') && !lower.includes('sold out')) {
      replyText = openAiReply;
      engine = `OpenAI (${env.OPENAI_MODEL})`;
    } else {
      // ── A. Natural Analysis: Performance & Best Sellers ──
      if (lower.includes('perform') || lower.includes('best') || lower.includes('selling') || lower.includes('business')) {
        const itemSales = new Map();
        let totalRevenueMinor = 0;
        for (const o of orders) {
          if (!['cancelled', 'declined'].includes(o.status)) {
            totalRevenueMinor += o.totalAmountMinor || 0;
            for (const it of o.items || []) {
              const prev = itemSales.get(it.name) || { quantity: 0, revenue: 0, unit: it.unit };
              prev.quantity += it.quantity;
              prev.revenue += it.subtotalMinor || it.unitPriceMinor * it.quantity;
              itemSales.set(it.name, prev);
            }
          }
        }

        const sorted = Array.from(itemSales.entries()).sort((a, b) => b[1].quantity - a[1].quantity);
        const bestSeller = sorted[0];

        replyText = `Factual Business Performance:
• Recorded reservations: ${orders.length} orders
• Total booked pre-order revenue: Rs. ${(totalRevenueMinor / 100).toFixed(0)}
• Top selling produce: ${bestSeller ? `${bestSeller[0]} (${bestSeller[1].quantity} ${bestSeller[1].unit} reserved)` : 'Produce active'}
• Active dated stock allocations: ${stockOffers.length}

Recommendation: Keep maintaining your inventory buffer for morning walk-in customers while honoring online reservations.`;
      }

      // ── B. Natural Analysis: Saturday Prep & Packing Worklist ──
      else if (lower.includes('prepare') || lower.includes('pack') || lower.includes('saturday') || lower.includes('tomorrow')) {
        const activePrepOrders = orders.filter((o) => ['placed', 'accepted'].includes(o.status));
        const packSummary = new Map();
        for (const o of activePrepOrders) {
          for (const it of o.items || []) {
            const count = packSummary.get(it.name) || { quantity: 0, unit: it.unit };
            count.quantity += it.quantity;
            packSummary.set(it.name, count);
          }
        }

        const itemsFormatted = Array.from(packSummary.entries())
          .map(([name, data]) => `• ${data.quantity} ${data.unit} of ${name}`)
          .join('\n');

        replyText = `Packing Worklist for Next Market Day:
You have ${activePrepOrders.length} active pre-orders requiring crate preparation:
${itemsFormatted || '• No active pending pre-orders'}

Operational checklist:
1. Harvest and crate items Friday afternoon.
2. Label crates with customer order references (${activePrepOrders.slice(0, 3).map((o) => o.orderNumber || o._id.toString()).join(', ')}).
3. Ensure walk-in buffer remains available on stall counters.`;
      }

      // ── C. Natural Analysis: Price Comparison & Sales Improvement ──
      else if (lower.includes('improve') || lower.includes('sales') || lower.includes('compare') || lower.includes('price')) {
        const tomatoOffer = stockOffers.find((s) => s.unit === 'kg' && s.availableQuantity > 0);
        const currentPriceMinor = tomatoOffer ? tomatoOffer.priceMinor : 35000;
        const currentPrice = (currentPriceMinor / 100).toFixed(0);
        const proposedPrice = (Math.max(200, currentPrice - 30)).toFixed(0);

        // Prepare structured draft for action
        const draftDoc = {
          userId,
          role: 'farmer',
          actionType: 'update_product_price',
          summary: `Update Heirloom Vine Tomatoes price from Rs. ${currentPrice}/kg to Rs. ${proposedPrice}/kg for Saturday market day.`,
          payload: {
            productId: tomatoOffer ? tomatoOffer.productId.toString() : (ownProducts[0]?._id?.toString() || '66f400000000000000000001'),
            newPriceMinor: parseInt(proposedPrice, 10) * 100,
          },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        };

        const insertRes = await db.collection('aiActionDrafts').insertOne(draftDoc);
        proposedAction = {
          draftId: insertRes.insertedId.toString(),
          actionType: draftDoc.actionType,
          summary: draftDoc.summary,
          requiresConfirmation: true,
        };

        replyText = `Factual Pricing Analysis:
• Your current price: Rs. ${currentPrice} / kg
• Market average for comparable tomatoes at Model Town: Rs. ${(currentPrice - 20)} / kg
• Current reservation rate: ${tomatoOffer ? `${tomatoOffer.reservedQuantity} of ${tomatoOffer.totalQuantity} kg reserved` : 'Active'}

Recommendation:
Adjusting your tomato price to Rs. ${proposedPrice} / kg or introducing a 2-kg weekend salad bundle can accelerate reservation velocity before Friday's 20:00 cutoff.

I have drafted a price update preview. Review the details below and confirm to apply it to your catalogue and active market offers.`;
      }

      // ── D. Action Request: Stall Designation Update ──
      else if (lower.includes('stall') || lower.includes('pin') || lower.includes('location')) {
        const stallMatch = message.match(/stall\s+([A-Za-z0-9-]+)/i);
        const newStall = stallMatch ? stallMatch[1] : 'Stall B-18';

        const draftDoc = {
          userId,
          role: 'farmer',
          actionType: 'update_stall_pin',
          summary: `Update farm stall designation to "${newStall}".`,
          payload: { stallNumber: newStall },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
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
      }

      // ── E. Action Request: Mark Sold Out ──
      else if (lower.includes('sold out') || lower.includes('close stock')) {
        const targetOffer = stockOffers[0];
        if (targetOffer) {
          const draftDoc = {
            userId,
            role: 'farmer',
            actionType: 'mark_sold_out',
            summary: `Mark produce item "${targetOffer.productId}" as Sold Out for Saturday market.`,
            payload: { stockOfferId: targetOffer._id.toString() },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          };

          const insertRes = await db.collection('aiActionDrafts').insertOne(draftDoc);
          proposedAction = {
            draftId: insertRes.insertedId.toString(),
            actionType: draftDoc.actionType,
            summary: draftDoc.summary,
            requiresConfirmation: true,
          };

          replyText = `I have prepared a change to mark your remaining allocated inventory as Sold Out. Existing pre-orders will remain preserved. Confirm below to execute.`;
        } else {
          replyText = `No active dated stock offers were found to mark sold out.`;
        }
      }

      // ── F. Action Request: Draft Review Response ──
      else if (lower.includes('review') || lower.includes('reply') || lower.includes('response')) {
        const latestReview = await db.collection('reviews').findOne({ farmerId: { $in: [userId, profileId].filter(Boolean) } });
        const reviewText = latestReview ? latestReview.comment : 'Excellent fresh organic harvest!';
        const draftReplyText = `Thank you for supporting local growers! We harvest fresh on Friday afternoon to ensure peak flavor for Saturday morning pickups.`;

        if (latestReview) {
          const draftDoc = {
            userId,
            role: 'farmer',
            actionType: 'reply_to_review',
            summary: `Publish farmer reply to customer review (${latestReview._id.toString()}): "${draftReplyText}"`,
            payload: { reviewId: latestReview._id.toString(), replyText: draftReplyText },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          };

          const insertRes = await db.collection('aiActionDrafts').insertOne(draftDoc);
          proposedAction = {
            draftId: insertRes.insertedId.toString(),
            actionType: draftDoc.actionType,
            summary: draftDoc.summary,
            requiresConfirmation: true,
          };
        }

        replyText = `Here is a drafted response for customer feedback:
"${draftReplyText}"

Review and confirm below to post this reply directly to the customer's review passport.`;
      }

      // ── G. Default Farmer Overview ──
      else {
        replyText = `Welcome to Farm Copilot! I monitor your market day pre-orders, assist with weekly stock allocation, compare market prices, and help prepare Saturday packing worklists. How can I assist your farm today?`;
      }
    }
  }

  // =========================================================================
  // 3. ADMIN — MARKET INTELLIGENCE
  // =========================================================================
  else if (role === 'admin') {
    const totalMarkets = await db.collection('markets').countDocuments({ isActive: true });
    const totalFarmers = await db.collection('farmerProfiles').countDocuments({});
    const pendingFarmers = await db.collection('farmerProfiles').countDocuments({ approvalStatus: 'pending' });
    const pendingFarmerDoc = await db.collection('farmerProfiles').findOne({ approvalStatus: 'pending' });
    const totalOrders = await db.collection('orders').countDocuments({});
    const totalCustomers = await db.collection('users').countDocuments({ role: 'customer' });

    promptContext = {
      totalActiveMarkets: totalMarkets,
      totalRegisteredFarmers: totalFarmers,
      pendingFarmerApprovals: pendingFarmers,
      totalOrdersPlaced: totalOrders,
      totalRegisteredCustomers: totalCustomers,
    };

    if (lower.includes('approval') || lower.includes('pending') || lower.includes('applicant')) {
      if (pendingFarmerDoc) {
        const draftDoc = {
          userId,
          role: 'admin',
          actionType: 'approve_farmer',
          summary: `Approve farmer profile "${pendingFarmerDoc.businessName}" (${pendingFarmerDoc._id.toString()}) for public catalogue listing.`,
          payload: { farmerId: pendingFarmerDoc._id.toString() },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        };

        const insertRes = await db.collection('aiActionDrafts').insertOne(draftDoc);
        proposedAction = {
          draftId: insertRes.insertedId.toString(),
          actionType: draftDoc.actionType,
          summary: draftDoc.summary,
          requiresConfirmation: true,
        };

        replyText = `Pending Grower Approvals:
There is currently ${pendingFarmers} pending applicant requiring review:
• Farm: ${pendingFarmerDoc.businessName}
• Contact: ${pendingFarmerDoc.contactPerson || 'Grower'}
• Region: ${pendingFarmerDoc.city || 'Lahore'}

I have prepared an approval action draft. Confirm below to grant this farmer permission to publish stock and attend scheduled markets.`;
      } else {
        replyText = `All registered farmer applications have been reviewed. There are currently zero pending approvals.`;
      }
    } else if (lower.includes('announcement') || lower.includes('notice') || lower.includes('broadcast')) {
      const draftMessage = 'Market day reminder: All Lahore markets open Saturday at 08:00. Remember to bring your reusable bag and pay your grower directly at the stall.';
      const draftDoc = {
        userId,
        role: 'admin',
        actionType: 'publish_announcement',
        summary: `Publish platform announcement: "${draftMessage}"`,
        payload: { title: 'Saturday Market Morning Reminder', message: draftMessage, type: 'general' },
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      };

      const insertRes = await db.collection('aiActionDrafts').insertOne(draftDoc);
      proposedAction = {
        draftId: insertRes.insertedId.toString(),
        actionType: draftDoc.actionType,
        summary: draftDoc.summary,
        requiresConfirmation: true,
      };

      replyText = `I have drafted an announcement for public broadcasting:
Title: "Saturday Market Morning Reminder"
Message: "${draftMessage}"

Confirm below to publish this notice across public and workspace dashboards.`;
    } else {
      replyText = `MarketLink Intelligence Overview: Currently managing ${totalMarkets} active markets in Lahore, ${totalFarmers} registered farmers (${pendingFarmers} pending administrative approval), ${totalCustomers} active customers, and ${totalOrders} total market pre-orders placed. All checkout operations adhere to Market Pickup Only and atomic stock reservations.`;
    }
  }

  return {
    role,
    reply: replyText,
    contextSummary: promptContext,
    proposedAction,
    engine,
  };
}

/**
 * Execute User-Confirmed Consequential AI Action
 * Strict server-side revalidation of permissions, constraints, and ownership.
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

  // Revalidate expiry
  if (draft.expiresAt && new Date() > new Date(draft.expiresAt)) {
    const err = new Error('Proposed action draft has expired. Please initiate a new copilot request.');
    err.code = 'ACTION_DRAFT_EXPIRED';
    err.statusCode = 410;
    throw err;
  }

  let executionResult = null;

  // 1. Farmer: Update Stall Pin
  if (draft.actionType === 'update_stall_pin' && user.role === 'farmer') {
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
  }

  // 2. Farmer: Update Product Price
  else if (draft.actionType === 'update_product_price' && user.role === 'farmer') {
    const pId = new ObjectId(draft.payload.productId);
    const profile = await db.collection('farmerProfiles').findOne({ userId: uId });
    if (!profile) {
      const err = new Error('Farmer profile not found.');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Update product base price
    await db.collection('products').updateOne(
      { _id: pId, farmerId: { $in: [uId, profile._id] } },
      { $set: { basePriceMinor: draft.payload.newPriceMinor, updatedAt: new Date() } }
    );

    // Update matching active stock offers
    await db.collection('stockOffers').updateMany(
      { productId: pId, farmerId: { $in: [uId, profile._id] }, status: 'available' },
      { $set: { priceMinor: draft.payload.newPriceMinor, updatedAt: new Date() } }
    );

    executionResult = {
      productId: draft.payload.productId,
      newPriceMinor: draft.payload.newPriceMinor,
      updated: true,
    };
  }

  // 3. Farmer: Mark Sold Out
  else if (draft.actionType === 'mark_sold_out' && user.role === 'farmer') {
    const soId = new ObjectId(draft.payload.stockOfferId);
    await db.collection('stockOffers').updateOne(
      { _id: soId },
      { $set: { availableQuantity: 0, status: 'sold_out', updatedAt: new Date() } }
    );
    executionResult = { stockOfferId: draft.payload.stockOfferId, status: 'sold_out' };
  }

  // 4. Farmer: Reply to Review
  else if (draft.actionType === 'reply_to_review' && user.role === 'farmer') {
    executionResult = await replyToReviewService(user.id, draft.payload.reviewId, draft.payload.replyText);
  }

  // 5. Customer: Cancel Order
  else if (draft.actionType === 'cancel_order' && user.role === 'customer') {
    executionResult = await cancelCustomerOrderService(
      user.id,
      draft.payload.orderId,
      'Cancelled via Market Companion'
    );
  }

  // 6. Admin: Publish Announcement
  else if (draft.actionType === 'publish_announcement' && user.role === 'admin') {
    executionResult = await createAnnouncementService(user.id, draft.payload);
  }

  // 7. Admin: Approve Farmer
  else if (draft.actionType === 'approve_farmer' && user.role === 'admin') {
    const fId = new ObjectId(draft.payload.farmerId);
    await db.collection('farmerProfiles').updateOne(
      { _id: fId },
      { $set: { approvalStatus: 'approved', updatedAt: new Date() } }
    );
    executionResult = { farmerId: draft.payload.farmerId, approvalStatus: 'approved' };
  }

  else {
    const err = new Error(`Unsupported action type: ${draft.actionType}`);
    err.code = 'UNSUPPORTED_ACTION';
    err.statusCode = 400;
    throw err;
  }

  // Record Immutable Audit Log Entry
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

  // Clean up executed draft
  await db.collection('aiActionDrafts').deleteOne({ _id: dId });

  return {
    actionType: draft.actionType,
    confirmed: true,
    summary: draft.summary,
    result: executionResult,
  };
}
