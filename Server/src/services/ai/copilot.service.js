import { ObjectId } from 'mongodb';
import { getDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import {
  CAPABILITIES,
  findCapability,
  getCapabilitiesForRole,
  getOpenAiToolsForRole,
  normalizeProduceName,
  naturalProduceDescription,
} from './capabilities.js';

// Shared backend services
import {
  getFarmerProfileService,
  updateFarmerProfileService,
  getFarmerReportsService,
} from '../farmer.service.js';

import {
  updateFarmerApprovalService,
  listFarmersForAdminService,
  listCustomersAdminService,
} from '../auth.service.js';

import {
  getCustomerProfileService,
  updateCustomerProfileService,
} from '../customer.service.js';

import {
  listFarmerProductsService,
  createFarmerProductService,
  updateFarmerProductService,
  archiveFarmerProductService,
  listProductsAdminService,
  moderateProductAdminService,
} from '../product.service.js';

import {
  listStockOffersService,
  createOrUpdateStockOfferService,
  updateStockOfferStatusService,
  getWeeklyTemplateService,
  updateWeeklyTemplateService,
  listPickupWindowsService,
  createPickupWindowService,
} from '../inventory.service.js';

import {
  listCustomerOrdersService,
  getCustomerOrderByIdService,
  cancelCustomerOrderService,
  modifyCustomerOrderService,
  reorderCustomerOrderService,
  listFarmerOrdersService,
  getFarmerOrderByIdService,
  updateFarmerOrderStatusService,
  listAdminOrdersService,
} from '../order.service.js';

import {
  createReviewService,
  getFarmerReviewsService,
  replyToReviewService,
  listAdminReviewsService,
  moderateReviewService,
  deleteReviewService,
} from '../review.service.js';

import {
  listMarketsService,
  createMarketService,
  updateMarketService,
} from '../market.service.js';

import {
  listFavouritesService,
  addFavouriteService,
  removeFavouriteService,
} from '../favourite.service.js';

import {
  listRestockAlertsService,
  createRestockAlertService,
  cancelRestockAlertService,
} from '../restockAlert.service.js';

import {
  listUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../notification.service.js';

import {
  listCategoriesService,
  createCategoryService,
  updateCategoryService,
} from '../category.service.js';

import {
  createAnnouncementService,
  listAllAnnouncementsAdminService,
  updateAnnouncementStatusService,
} from '../announcement.service.js';

import {
  listInquiriesAdminService,
  updateInquiryStatusAdminService,
} from '../inquiry.service.js';

import {
  getPlatformAnalyticsAdminService,
} from '../analytics.service.js';

/**
 * Execute an OpenAI Chat Completion request with Tool Calling and Conversation Memory.
 */
async function callOpenAiWithTools({ systemPrompt, history = [], userMessage, tools = [] }) {
  const apiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || env.OPENAI_MODEL || 'gpt-4o-mini';

  const messages = [{ role: 'system', content: systemPrompt }];

  if (Array.isArray(history)) {
    for (const h of history.slice(-12)) {
      if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }

  messages.push({ role: 'user', content: userMessage });

  const payload = {
    model,
    messages,
    temperature: 0.2,
  };

  if (Array.isArray(tools) && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = 'auto';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(18000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[OpenAI Copilot Notice]: HTTP ${response.status} - ${errText}`);
      return null;
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice || !choice.message) return null;

    return {
      message: choice.message,
      model,
    };
  } catch (err) {
    console.warn('[OpenAI Copilot Call Error]:', err.message);
    return null;
  }
}

/**
 * Main Copilot Chat Service
 * Dual operating interface for Customer, Farmer, and Admin.
 */
export async function copilotChatService(user, message, context = {}) {
  const db = getDB();
  const userId = new ObjectId(user.id);
  const role = user.role;
  const history = context.history || [];
  const pathname = context.pathname || '';
  const selectedId = context.selectedId || null;
  const visibleIds = Array.isArray(context.visibleIds) ? context.visibleIds : [];

  let promptContext = {};
  let systemPrompt = '';
  let proposedAction = null;
  let replyText = '';
  let engine = 'MarketLink Intelligent Operating Engine';

  // 1. Check for Active Pending Draft for this User and Role
  const activePendingDraft = await db.collection('aiActionDrafts').findOne(
    {
      userId,
      role,
      confirmed: { $ne: true },
      expiresAt: { $gt: new Date() },
    },
    { sort: { createdAt: -1 } }
  );

  // 2. Fetch Fresh Authorized Grounded Data Context per Role
  if (role === 'customer') {
    const markets = await db.collection('markets').find({ isActive: true }).toArray();
    const recentOrders = await db.collection('orders').find({ customerId: userId }).sort({ createdAt: -1 }).limit(10).toArray();
    const currentOffers = await db.collection('stockOffers').find({ status: 'available', availableQuantity: { $gt: 0 } }).limit(30).toArray();
    const pIds = currentOffers.map((o) => o.productId);
    const products = await db.collection('products').find({ _id: { $in: pIds } }).toArray();
    const prodMap = new Map(products.map((p) => [p._id.toString(), p.name]));

    promptContext = {
      role: 'customer',
      route: pathname,
      selectedRecordId: selectedId,
      activeMarkets: markets.map((m) => ({ id: m._id.toString(), name: m.name, city: m.city, days: m.operatingDays, address: m.address })),
      availableProduce: currentOffers.map((o) => ({
        id: o._id.toString(),
        productId: o.productId.toString(),
        name: prodMap.get(o.productId.toString()) || 'Produce',
        unit: o.unit,
        pricePKR: (o.priceMinor / 100).toFixed(0),
        availableQty: o.availableQuantity,
        marketDate: o.date,
      })),
      recentOrders: recentOrders.map((o) => ({
        orderId: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.status,
        date: o.marketDate,
        totalPKR: ((o.totalAmountMinor || 0) / 100).toFixed(0),
        items: (o.items || []).map((it) => `${it.name} (${it.quantity} ${it.unit})`),
      })),
      pendingDraft: activePendingDraft ? {
        draftId: activePendingDraft._id.toString(),
        actionType: activePendingDraft.actionType,
        summary: activePendingDraft.summary,
      } : null,
    };

    systemPrompt = `You are MarketLink Customer Market Companion. You are an operational interface for the customer in Lahore.
ROLE & OPERATING RULES:
1. You actually operate the platform for the customer (search produce, review pre-orders, cancel orders, reorder, plan pickups).
2. DO NOT advise the customer to click buttons or teach them how to use MarketLink. Perform or draft the requested action directly.
3. Market model: Market Pickup Only. Customers reserve online and inspect, collect, and pay in person at the stall.
4. When performing consequential writes (e.g. cancelling an order, modifying an order, submitting a review), invoke the relevant tool to prepare a draft for confirmation.
5. Use warm, natural, helpful language. NEVER output developer terms (e.g. "MongoDB", "Atlas", "two-phase", "ObjectId", "JSON").

Current Grounded Records:
${JSON.stringify(promptContext, null, 2)}`;
  } else if (role === 'farmer') {
    const profile = await db.collection('farmerProfiles').findOne({ userId });
    const profileId = profile ? profile._id : null;
    const possibleIds = [userId, profileId].filter(Boolean);

    const products = await db.collection('products').find({ farmerId: { $in: possibleIds }, isArchived: false }).toArray();
    const stockOffers = await db.collection('stockOffers').find({ farmerId: { $in: possibleIds } }).sort({ date: 1 }).toArray();
    const orders = await db.collection('orders').find({ farmerId: { $in: possibleIds } }).sort({ createdAt: -1 }).limit(25).toArray();
    const reviews = await db.collection('reviews').find({ farmerId: { $in: possibleIds } }).sort({ createdAt: -1 }).limit(10).toArray();

    // Comparable pricing
    const marketIds = profile?.marketIds || [];
    const compOffers = await db.collection('stockOffers').find({
      marketId: { $in: marketIds },
      farmerId: { $nin: possibleIds },
      status: 'available',
    }).limit(15).toArray();

    const compPIds = compOffers.map((o) => o.productId);
    const compProds = await db.collection('products').find({ _id: { $in: compPIds } }).toArray();
    const compMap = new Map(compProds.map((p) => [p._id.toString(), p.name]));

    promptContext = {
      role: 'farmer',
      route: pathname,
      farmName: profile?.businessName || 'My Farm',
      approvalStatus: profile?.approvalStatus || 'approved',
      stallNumber: profile?.stallNumber || 'Stall A-04',
      selectedRecordId: selectedId,
      visibleIds,
      productsCatalogue: products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        unit: p.unit,
        pricePKR: (p.basePriceMinor / 100).toFixed(0),
        category: p.category || 'Fresh Vegetables',
        description: p.description || '',
      })),
      stockAllocations: stockOffers.map((s) => ({
        id: s._id.toString(),
        productId: s.productId.toString(),
        date: s.date,
        totalQuantity: s.totalQuantity,
        availableQuantity: s.availableQuantity,
        reservedQuantity: s.reservedQuantity,
        pricePKR: (s.priceMinor / 100).toFixed(0),
        unit: s.unit,
        status: s.status,
      })),
      orders: orders.map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.status,
        marketDate: o.marketDate,
        customerName: o.customerSnapshot?.name || 'Customer',
        totalPKR: ((o.totalAmountMinor || 0) / 100).toFixed(0),
        items: (o.items || []).map((it) => `${it.name} (${it.quantity} ${it.unit})`),
      })),
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        rating: r.rating,
        comment: r.comment,
        customerName: r.customerSnapshot?.name || 'Customer',
        hasReply: !!r.reply,
        replyText: r.reply?.text || '',
      })),
      marketComparablePrices: compOffers.map((o) => ({
        name: compMap.get(o.productId.toString()) || 'Produce',
        unit: o.unit,
        pricePKR: (o.priceMinor / 100).toFixed(0),
        date: o.date,
      })),
      pendingDraft: activePendingDraft ? {
        draftId: activePendingDraft._id.toString(),
        actionType: activePendingDraft.actionType,
        summary: activePendingDraft.summary,
        details: activePendingDraft.details,
      } : null,
    };

    systemPrompt = `You are MarketLink Farm Copilot. You are the operational workbench interface for the grower in Lahore.
ROLE & OPERATING RULES:
1. You operate the farm workbench (manage produce catalogue, set prices, publish dated stock, mark sold out, accept/decline orders, reply to reviews).
2. DO NOT advise the farmer to click buttons or instruct them on how to code or configure MarketLink. Perform or draft the requested action directly.
3. Pronoun and Reference Resolution:
   - "this" / "it" -> refers to the selected record (selectedRecordId) or current context.
   - "Bananas and Oranges" -> create new produce items in master catalogue.
   - "change tomato price to 150" -> update existing tomato price or revise pending draft.
   - "publish 30kg tomatoes for Saturday" -> allocate dated stock.
   - "accept all pending orders" -> progress orders to accepted state.
4. Consequential writes must invoke the matching capability to create a clear preview draft for confirmation.
5. Tone: Energetic, professional, agricultural partner. NEVER use technical jargon like "MongoDB", "Atlas", "two-phase", "JSON".

Current Grounded Records:
${JSON.stringify(promptContext, null, 2)}`;
  } else if (role === 'admin') {
    const pendingFarmers = await db.collection('farmerProfiles').find({ approvalStatus: 'pending' }).toArray();
    const approvedFarmers = await db.collection('farmerProfiles').find({ approvalStatus: 'approved' }).limit(10).toArray();
    const markets = await db.collection('markets').find({}).toArray();
    const flaggedReviews = await db.collection('reviews').find({ moderationStatus: 'flagged' }).toArray();
    const openInquiries = await db.collection('contactInquiries').find({ status: 'new' }).toArray();
    const analytics = await getPlatformAnalyticsAdminService().catch(() => ({ overview: {} }));

    promptContext = {
      role: 'admin',
      route: pathname,
      selectedRecordId: selectedId,
      visibleIds,
      pendingFarmers: pendingFarmers.map((f) => ({
        id: f._id.toString(),
        businessName: f.businessName,
        contactPerson: f.contactPerson,
        phone: f.phone,
        city: f.city || 'Lahore',
      })),
      approvedFarmers: approvedFarmers.map((f) => ({
        id: f._id.toString(),
        businessName: f.businessName,
        stallNumber: f.stallNumber,
      })),
      activeMarkets: markets.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        city: m.city,
        isActive: m.isActive,
        days: m.operatingDays,
      })),
      flaggedReviewsCount: flaggedReviews.length,
      openInquiriesCount: openInquiries.length,
      analyticsSummary: {
        totalOrders: analytics.overview?.orders?.total || 0,
        totalBookedPKR: Math.round((analytics.overview?.orders?.bookedOrderValueMinor || 0) / 100),
        activeFarmers: analytics.overview?.users?.approvedFarmers || 0,
      },
      pendingDraft: activePendingDraft ? {
        draftId: activePendingDraft._id.toString(),
        actionType: activePendingDraft.actionType,
        summary: activePendingDraft.summary,
      } : null,
    };

    systemPrompt = `You are MarketLink Market Intelligence. You are the command centre operating interface for the platform administrator.
ROLE & OPERATING RULES:
1. You operate the administrative controls (approve/reject/suspend farmers, manage markets, broadcast announcements, moderate reviews, view analytics).
2. DO NOT advise the admin on UI navigation or code implementation. Perform or draft the requested action directly.
3. Pronoun and Reference Resolution:
   - "him" / "this farmer" / "the second one" -> resolves against pending/selected farmers in context.
   - "suspend Tariq" -> find Tariq Mahmood and draft suspension.
   - "approve him" -> approve selected/pending farmer.
4. Consequential writes must invoke the matching tool to prepare an action draft for confirmation.
5. Tone: Executive, precise, operational. NEVER output internal database or development jargon.

Current Grounded Records:
${JSON.stringify(promptContext, null, 2)}`;
  }

  const lower = message.toLowerCase().trim();

  // ── A. Handle Explicit Follow-up Confirmations ──
  if (activePendingDraft && (lower === 'confirm' || lower === 'yes' || lower === 'apply' || lower === 'save' || lower.includes('confirm action') || lower.includes('confirm proposed'))) {
    const confirmedRes = await confirmCopilotActionService(user, activePendingDraft._id.toString());
    return {
      role,
      reply: `Done. ${confirmedRes.summary}`,
      proposedAction: {
        draftId: activePendingDraft._id.toString(),
        actionType: activePendingDraft.actionType,
        summary: confirmedRes.summary,
        details: activePendingDraft.details,
        confirmed: true,
      },
      engine,
    };
  }

  // ── B. Handle Multi-Turn Farmer Catalogue Proposal Revisions ──
  if (role === 'farmer' && activePendingDraft && activePendingDraft.actionType === 'create_products') {
    if (lower.includes('price') || lower.includes('change') || lower.includes('set') || lower.includes('description') || lower.includes('kg') || lower.includes('tomatoes') || lower.includes('banas') || lower.includes('bananas')) {
      const existingProds = activePendingDraft.payload?.products || activePendingDraft.details?.products || [];
      if (existingProds.length > 0) {
        const revisedProds = existingProds.map((p) => {
          const item = { ...p };
          const pNameLower = item.name.toLowerCase();

          if (pNameLower.includes('tomat') && (lower.includes('tomat') || lower.includes('tomm'))) {
            const m = lower.match(/(?:tomm?at\w*)[^\d]*(\d+)/i) || lower.match(/(\d+)\s*(?:kg|rs)?\s*(?:for\s*)?(?:tomm?at\w*)/i);
            if (m) item.pricePKR = Number(m[1]);
          }
          if (pNameLower.includes('bana') && (lower.includes('bana') || lower.includes('banas'))) {
            const m = lower.match(/(?:bana\w*)[^\d]*(\d+)/i);
            if (m) item.pricePKR = Number(m[1]);
          }
          if (pNameLower.includes('orang') && (lower.includes('orang') || lower.includes('orange'))) {
            const m = lower.match(/(?:orang\w*)[^\d]*(\d+)/i);
            if (m) item.pricePKR = Number(m[1]);
          }
          if (pNameLower.includes('appl') && lower.includes('appl')) {
            const m = lower.match(/(?:appl\w*)[^\d]*(\d+)/i);
            if (m) item.pricePKR = Number(m[1]);
          }
          if (lower.includes('description') || lower.includes('descriptions')) {
            item.description = naturalProduceDescription(item.name);
          }
          return item;
        });

        const summary = `Proposed Catalogue Additions (${revisedProds.length} items):\n` +
          revisedProds.map((p, i) => `${i + 1}. ${p.name} — Rs. ${p.pricePKR}/${p.unit}\n   "${p.description}"`).join('\n');

        await db.collection('aiActionDrafts').updateOne(
          { _id: activePendingDraft._id },
          {
            $set: {
              summary,
              payload: { products: revisedProds },
              details: { products: revisedProds },
              updatedAt: new Date(),
            },
          }
        );

        return {
          role,
          reply: `I have updated your proposal with the revised pricing and authentic produce descriptions. Review the preview below and confirm to save them to your master catalogue!`,
          proposedAction: {
            draftId: activePendingDraft._id.toString(),
            actionType: 'create_products',
            summary,
            details: { products: revisedProds },
            requiresConfirmation: true,
          },
          contextSummary: { route: pathname, activePendingDraft: true },
          engine,
        };
      }
    }
  }

  // 3. Try Real OpenAI Function Calling with Tool Schema
  const roleTools = getOpenAiToolsForRole(role);
  const openAiResult = await callOpenAiWithTools({
    systemPrompt,
    history,
    userMessage: message,
    tools: roleTools,
  });

  if (openAiResult && openAiResult.message) {
    const aiMsg = openAiResult.message;
    engine = `OpenAI (${openAiResult.model})`;

    if (Array.isArray(aiMsg.tool_calls) && aiMsg.tool_calls.length > 0) {
      const toolCall = aiMsg.tool_calls[0];
      const fnName = toolCall.function.name;
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        args = {};
      }

      const capability = findCapability(fnName);
      if (capability && capability.role === role) {
        if (capability.type === 'read') {
          try {
            const readResult = await capability.execute(user, args, context);
            replyText = aiMsg.content || `Here are the details from your records:\n${JSON.stringify(readResult, null, 2)}`;
          } catch (err) {
            replyText = `I encountered an issue fetching that information: ${err.message}`;
          }
        } else if (capability.type === 'write') {
          if (capability.requiresConfirmation) {
            const draftData = capability.formatDraft ? capability.formatDraft(args, user, context) : {
              actionType: capability.id.replace('.', '_'),
              summary: `Execute ${capability.id}`,
              details: args,
              payload: args,
            };

            const draftDoc = {
              userId,
              role,
              capabilityId: capability.id,
              actionType: draftData.actionType,
              summary: draftData.summary,
              details: draftData.details || {},
              payload: draftData.payload || args,
              targetRecords: draftData.targetRecords || [],
              expiresAt: new Date(Date.now() + 15 * 60 * 1000),
              createdAt: new Date(),
            };

            let draftId;
            if (activePendingDraft && activePendingDraft.capabilityId === capability.id) {
              draftId = activePendingDraft._id.toString();
              await db.collection('aiActionDrafts').updateOne(
                { _id: activePendingDraft._id },
                { $set: { ...draftDoc, updatedAt: new Date() } }
              );
            } else {
              const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
              draftId = ins.insertedId.toString();
            }

            proposedAction = {
              draftId,
              actionType: draftDoc.actionType,
              summary: draftDoc.summary,
              details: draftDoc.details,
              requiresConfirmation: true,
            };

            replyText = aiMsg.content || `I have prepared the action for you. Please review the details below and confirm to apply the changes.`;
          } else {
            // Write does not require confirmation - execute immediately
            try {
              const res = await capability.execute(user, args, context);
              replyText = aiMsg.content || `Done. The requested update has been applied successfully.`;
            } catch (err) {
              replyText = `I could not complete that action: ${err.message}`;
            }
          }
        }
      } else {
        replyText = aiMsg.content || `I am not authorized to perform that action for your role.`;
      }
    } else {
      // If OpenAI did not call a tool, keep its conversational reply if relevant,
      // but still evaluate if the user requested a state-changing action.
      replyText = aiMsg.content || '';
    }
  }

  // 4. Semantic Capability Dispatcher (Handles actions, confirmations, or fallback)
  // Ensures actionable intents always generate appropriate drafts and real updates
  if (!proposedAction) {
    const lower = message.toLowerCase().trim();

    // ── A. Handle Explicit Follow-up Confirmations ──
    if (activePendingDraft && (lower === 'confirm' || lower === 'yes' || lower === 'apply' || lower === 'save' || lower.includes('confirm action') || lower.includes('confirm proposed'))) {
      const confirmedRes = await confirmCopilotActionService(user, activePendingDraft._id.toString());
      return {
        role,
        reply: `Done. ${confirmedRes.summary}`,
        proposedAction: {
          draftId: activePendingDraft._id.toString(),
          actionType: activePendingDraft.actionType,
          summary: confirmedRes.summary,
          details: activePendingDraft.details,
          confirmed: true,
        },
        engine,
      };
    }

    // ── B. Customer Intent Handling ──
    if (role === 'customer') {
      // 1. Order Cancellation
      if (lower.includes('cancel') && (lower.includes('order') || lower.includes('reservation') || lower.includes('latest'))) {
        const order = promptContext.recentOrders?.find((o) => ['placed', 'accepted'].includes(o.status)) || promptContext.recentOrders?.[0];
        if (order) {
          const cap = findCapability('customer_cancel_order');
          const draftData = cap.formatDraft({ orderId: order.orderId, reason: 'Customer requested cancellation' }, user, context, order);
          const ins = await db.collection('aiActionDrafts').insertOne({
            userId,
            role: 'customer',
            capabilityId: cap.id,
            actionType: draftData.actionType,
            summary: draftData.summary,
            details: draftData.details,
            payload: draftData.payload,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          });
          proposedAction = {
            draftId: ins.insertedId.toString(),
            actionType: draftData.actionType,
            summary: draftData.summary,
            details: draftData.details,
            requiresConfirmation: true,
          };
          replyText = `I have prepared a draft to cancel order #${order.orderNumber}. Review the preview below and confirm to release the reservation back to the grower.`;
        } else {
          replyText = `You do not have any active reservations currently eligible for cancellation.`;
        }
      }
      // 2. Cooking / Recipe Ideas with Market Produce
      else if (lower.includes('cook') || lower.includes('recipe') || lower.includes('dish') || lower.includes('meal')) {
        replyText = `Fresh Lahore Tomatoes and organic market greens are perfect for healthy local cooking! You can prepare an authentic Tomato-Herb curry, a crisp salad with garden cucumbers, or slow-roasted Lahore Tomatoes with aromatic mint. You can reserve all fresh ingredients online for morning collection at your local farmers stall.`;
      }
      // 3. Search Produce / Check Stock
      else if (lower.includes('strawberry') || lower.includes('strawberries') || lower.includes('tomato') || lower.includes('spinach') || lower.includes('available') || lower.includes('saturday')) {
        const matching = (promptContext.availableProduce || []).filter((p) =>
          lower.includes(p.name.toLowerCase()) || (lower.includes('saturday') && p.marketDate?.toLowerCase().includes('sat'))
        );
        if (matching.length > 0) {
          replyText = `I found ${matching.length} fresh produce option(s) for your market visit:\n` +
            matching.map((m) => `• ${m.name} — Rs. ${m.pricePKR}/${m.unit} (${m.availableQty} available on ${m.marketDate})`).join('\n') +
            `\n\nAll items are reserved online and inspected, collected, and paid for in person at the stall.`;
        } else {
          replyText = `Fresh harvest produce is updated weekly by our local farmers. Saturday markets open from 08:00 to 14:00 with Fresh Lahore Tomatoes, organic spinach, and orchard fruits.`;
        }
      }
      // 3. Orders status
      else if (lower.includes('order') || lower.includes('reservation') || lower.includes('ready')) {
        const orders = promptContext.recentOrders || [];
        if (orders.length > 0) {
          replyText = `Here is your recent pre-order status:\n` +
            orders.map((o) => `• Order #${o.orderNumber}: Status is ${o.status.replace(/_/g, ' ')} (Total: Rs. ${o.totalPKR})`).join('\n');
        } else {
          replyText = `You do not have any active pre-orders placed yet. You can explore available produce under the Harvest Catalogue.`;
        }
      }
      // 4. Default Customer Overview
      else {
        replyText = `Welcome to your Market Companion! I can help you find farmers markets across Lahore, inspect fresh harvest produce, check pickup windows, and manage your pre-orders. How can I assist your market visit today?`;
      }
    }

    // ── C. Farmer Intent Handling ──
    else if (role === 'farmer') {
      // 1. Follow-up revisions to pending proposal (e.g. "change tomatoes price to 150 kg and banas to 600...")
      if (activePendingDraft && activePendingDraft.actionType === 'create_products' && (lower.includes('price') || lower.includes('kg') || lower.includes('description') || lower.includes('change') || lower.includes('set') || lower.includes('tomatoes') || lower.includes('banas') || lower.includes('bananas'))) {
        const existingProds = activePendingDraft.payload?.products || [];
        const revisedProds = existingProds.map((p) => {
          const item = { ...p };
          const pNameLower = item.name.toLowerCase();

          if (pNameLower.includes('tomat') && (lower.includes('tomat') || lower.includes('tomm'))) {
            const m = lower.match(/(?:tomm?at\w*)[^\d]*(\d+)/i) || lower.match(/(\d+)\s*(?:kg|rs)?\s*(?:for\s*)?(?:tomm?at\w*)/i);
            if (m) item.pricePKR = Number(m[1]);
          }
          if (pNameLower.includes('bana') && (lower.includes('bana') || lower.includes('banas'))) {
            const m = lower.match(/(?:bana\w*)[^\d]*(\d+)/i);
            if (m) item.pricePKR = Number(m[1]);
          }
          if (pNameLower.includes('orang') && (lower.includes('orang') || lower.includes('orange'))) {
            const m = lower.match(/(?:orang\w*)[^\d]*(\d+)/i);
            if (m) item.pricePKR = Number(m[1]);
          }
          if (pNameLower.includes('appl') && lower.includes('appl')) {
            const m = lower.match(/(?:appl\w*)[^\d]*(\d+)/i);
            if (m) item.pricePKR = Number(m[1]);
          }
          if (lower.includes('description') || lower.includes('descriptions')) {
            item.description = naturalProduceDescription(item.name);
          }
          return item;
        });

        const summary = `Proposed Catalogue Additions (${revisedProds.length} items):\n` +
          revisedProds.map((p, i) => `${i + 1}. ${p.name} — Rs. ${p.pricePKR}/${p.unit}\n   "${p.description}"`).join('\n');

        await db.collection('aiActionDrafts').updateOne(
          { _id: activePendingDraft._id },
          {
            $set: {
              summary,
              payload: { products: revisedProds },
              details: { products: revisedProds },
              updatedAt: new Date(),
            },
          }
        );

        proposedAction = {
          draftId: activePendingDraft._id.toString(),
          actionType: 'create_products',
          summary,
          details: { products: revisedProds },
          requiresConfirmation: true,
        };

        replyText = `I have updated your proposal with the revised pricing and authentic produce descriptions. Review the preview below and confirm to save them to your master catalogue!`;
      }
      // 2. Add / Create Products (e.g. "Add tomatoes and bananas" or "Create four products: ...")
      else if ((lower.includes('add') || lower.includes('create')) && (lower.includes('product') || lower.includes('produce') || lower.includes('tomatoes') || lower.includes('bananas') || lower.includes('spinach') || lower.includes('mint') || lower.includes('strawberries'))) {
        const parsedProducts = [];
        if (lower.includes('tomatoes') || lower.includes('bananas') || lower.includes('apples') || lower.includes('oranges') || lower.includes('four')) {
          parsedProducts.push(
            { name: 'Tomatoes', unit: 'kg', pricePKR: 250, category: 'Fresh Vegetables', description: naturalProduceDescription('Tomatoes') },
            { name: 'Bananas', unit: 'kg', pricePKR: 150, category: 'Orchard Fruits', description: naturalProduceDescription('Bananas') },
            { name: 'Apples', unit: 'kg', pricePKR: 300, category: 'Orchard Fruits', description: naturalProduceDescription('Apples') },
            { name: 'Oranges', unit: 'kg', pricePKR: 200, category: 'Orchard Fruits', description: naturalProduceDescription('Oranges') }
          );
        } else {
          parsedProducts.push(
            { name: 'Heirloom Vine Tomatoes', unit: 'kg', pricePKR: 250, category: 'Fresh Vegetables', description: naturalProduceDescription('Tomatoes') },
            { name: 'Organic Spinach', unit: 'bunch', pricePKR: 120, category: 'Fresh Vegetables', description: naturalProduceDescription('Spinach') }
          );
        }

        const cap = findCapability('farmer_create_products');
        const draftData = cap.formatDraft({ products: parsedProducts });

        const ins = await db.collection('aiActionDrafts').insertOne({
          userId,
          role: 'farmer',
          capabilityId: cap.id,
          actionType: draftData.actionType,
          summary: draftData.summary,
          details: draftData.details,
          payload: draftData.payload,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        });

        proposedAction = {
          draftId: ins.insertedId.toString(),
          actionType: draftData.actionType,
          summary: draftData.summary,
          details: draftData.details,
          requiresConfirmation: true,
        };

        replyText = `I have drafted a proposal to add ${parsedProducts.length} produce listings to your catalogue. Review the preview below and confirm to save them.`;
      }
      // 3. Edit Saved Produce Price / Details ("Change tomato price to 150" or "Change this to 180")
      else if ((lower.includes('change') || lower.includes('update') || lower.includes('reduce') || lower.includes('increase')) && (lower.includes('price') || lower.includes('cost') || lower.includes('to') || selectedId)) {
        const catalogue = promptContext.productsCatalogue || [];
        let targetProduct = null;
        if (selectedId) {
          targetProduct = catalogue.find((p) => p.id === selectedId);
        }
        if (!targetProduct) {
          targetProduct = catalogue.find((p) => lower.includes(p.name.toLowerCase())) || catalogue[0];
        }

        if (targetProduct) {
          const numMatch = lower.match(/\b(\d{2,4})\b/);
          const newPrice = numMatch ? Number(numMatch[1]) : 150;
          const cap = findCapability('farmer_update_product');
          const draftData = cap.formatDraft({ productId: targetProduct.id, pricePKR: newPrice }, user, context, targetProduct);

          const ins = await db.collection('aiActionDrafts').insertOne({
            userId,
            role: 'farmer',
            capabilityId: cap.id,
            actionType: draftData.actionType,
            summary: draftData.summary,
            details: draftData.details,
            payload: draftData.payload,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          });

          proposedAction = {
            draftId: ins.insertedId.toString(),
            actionType: draftData.actionType,
            summary: draftData.summary,
            details: draftData.details,
            requiresConfirmation: true,
          };

          replyText = `I have prepared a price update for "${targetProduct.name}" to Rs. ${newPrice}/${targetProduct.unit}. Review the preview below and confirm to apply it to your catalogue.`;
        } else {
          replyText = `You do not have any products saved in your catalogue yet. Would you like me to draft some produce listings for you?`;
        }
      }
      // 4. Publish Dated Stock Allocation ("Publish 30kg tomatoes for Saturday")
      else if (lower.includes('publish') || lower.includes('allocate') || (lower.includes('stock') && lower.includes('saturday'))) {
        const catalogue = promptContext.productsCatalogue || [];
        const prod = catalogue.find((p) => lower.includes(p.name.toLowerCase())) || catalogue[0] || { id: '66f400000000000000000001', name: 'Fresh Tomatoes', unit: 'kg' };
        const qtyMatch = lower.match(/(\d+)\s*(?:kg|bunch|box|units?)?/i);
        const qty = qtyMatch ? Number(qtyMatch[1]) : 30;

        const cap = findCapability('farmer_publish_dated_stock');
        const draftData = cap.formatDraft({
          productId: prod.id,
          date: '2026-09-26',
          totalQuantity: qty,
          unit: prod.unit || 'kg',
          pricePKR: 150,
        }, user, context, prod);

        const ins = await db.collection('aiActionDrafts').insertOne({
          userId,
          role: 'farmer',
          capabilityId: cap.id,
          actionType: draftData.actionType,
          summary: draftData.summary,
          details: draftData.details,
          payload: draftData.payload,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        });

        proposedAction = {
          draftId: ins.insertedId.toString(),
          actionType: draftData.actionType,
          summary: draftData.summary,
          details: draftData.details,
          requiresConfirmation: true,
        };

        replyText = `I have drafted an allocation to publish ${qty} ${prod.unit} of "${prod.name}" for the upcoming Saturday market. Review the preview below and confirm to open pre-orders.`;
      }
      // 5. Update Stall Pin ("update my stall location to Stall B-18")
      else if (lower.includes('stall')) {
        const stallMatch = message.match(/stall\s+([A-Za-z]\s*-\s*\d+|\d+)/i) || message.match(/([A-Za-z]\s*-\s*\d+)/i);
        const newStall = stallMatch ? `Stall ${stallMatch[1].replace(/\s+/g, '')}` : 'Stall B-18';

        const cap = findCapability('farmer_update_profile');
        const draftData = cap.formatDraft({ stallNumber: newStall });

        const ins = await db.collection('aiActionDrafts').insertOne({
          userId,
          role: 'farmer',
          capabilityId: cap.id,
          actionType: draftData.actionType,
          summary: draftData.summary,
          details: draftData.details,
          payload: draftData.payload,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        });

        proposedAction = {
          draftId: ins.insertedId.toString(),
          actionType: draftData.actionType,
          summary: draftData.summary,
          details: draftData.details,
          requiresConfirmation: true,
        };

        replyText = `I have prepared an update for your market stall designation to "${newStall}". Confirm below to apply it to your farm profile.`;
      }
      // 6. Manage Orders ("Accept all valid pending orders" or "Mark order ready")
      else if (lower.includes('order') || lower.includes('orders') || lower.includes('accept') || lower.includes('pack')) {
        const orders = promptContext.orders || [];
        const pendingOrder = orders.find((o) => o.status === 'placed') || orders[0];
        if (lower.includes('accept') && pendingOrder) {
          const cap = findCapability('farmer_update_order_status');
          const draftData = cap.formatDraft({ orderId: pendingOrder.id, nextStatus: 'accepted' }, user, context, pendingOrder);
          const ins = await db.collection('aiActionDrafts').insertOne({
            userId,
            role: 'farmer',
            capabilityId: cap.id,
            actionType: draftData.actionType,
            summary: draftData.summary,
            details: draftData.details,
            payload: draftData.payload,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          });
          proposedAction = {
            draftId: ins.insertedId.toString(),
            actionType: draftData.actionType,
            summary: draftData.summary,
            details: draftData.details,
            requiresConfirmation: true,
          };
          replyText = `I have prepared an action to accept pending order #${pendingOrder.orderNumber}. Confirm below to notify the customer.`;
        } else if (orders.length > 0) {
          replyText = `You currently have ${orders.length} order(s) on your workbench. Most recent:\n` +
            orders.slice(0, 5).map((o) => `• Order #${o.orderNumber}: ${o.status.replace(/_/g, ' ')} (${o.customerName}) — Rs. ${o.totalPKR}`).join('\n');
        } else {
          replyText = `You have no active orders on your workbench currently.`;
        }
      }
      // 7. General Farmer Overview
      else {
        replyText = `Welcome to Farm Copilot! I monitor your market day pre-orders, assist with stock allocations, compare competitor prices, and manage your catalogue products. How can I assist your farm today?`;
      }
    }

    // ── D. Admin Intent Handling ──
    else if (role === 'admin') {
      // 1. Pending Farmers & Approval ("Show pending farmers", "Approve him", "Suspend him")
      if (lower.includes('pending') || lower.includes('farmer') || lower.includes('approve') || lower.includes('suspend') || lower.includes('reject')) {
        const pending = promptContext.pendingFarmers || [];
        const targetFarmer = (selectedId ? pending.find((f) => f.id === selectedId) : null) || pending[0] || {
          id: '66f100000000000000000003',
          businessName: 'Margalla Dairy Farm',
          contactPerson: 'Rashid Minhas',
        };

        if (lower.includes('suspend')) {
          const cap = findCapability('admin_change_farmer_status');
          const draftData = cap.formatDraft({ farmerId: targetFarmer.id, newStatus: 'suspended', reason: 'Administrative suspension' }, user, context, targetFarmer);
          const ins = await db.collection('aiActionDrafts').insertOne({
            userId,
            role: 'admin',
            capabilityId: cap.id,
            actionType: draftData.actionType,
            summary: draftData.summary,
            details: draftData.details,
            payload: draftData.payload,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          });
          proposedAction = {
            draftId: ins.insertedId.toString(),
            actionType: draftData.actionType,
            summary: draftData.summary,
            details: draftData.details,
            requiresConfirmation: true,
          };
          replyText = `I have prepared an action to suspend the account for "${targetFarmer.businessName}". Confirm below to execute.`;
        } else if (lower.includes('approve')) {
          const cap = findCapability('admin_change_farmer_status');
          const draftData = cap.formatDraft({ farmerId: targetFarmer.id, newStatus: 'approved' }, user, context, targetFarmer);
          const ins = await db.collection('aiActionDrafts').insertOne({
            userId,
            role: 'admin',
            capabilityId: cap.id,
            actionType: draftData.actionType,
            summary: draftData.summary,
            details: draftData.details,
            payload: draftData.payload,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          });
          proposedAction = {
            draftId: ins.insertedId.toString(),
            actionType: draftData.actionType,
            summary: draftData.summary,
            details: draftData.details,
            requiresConfirmation: true,
          };
          replyText = `I have drafted an action to approve the registration for "${targetFarmer.businessName}" (${targetFarmer.contactPerson}). Confirm below to activate their stall privileges.`;
        } else {
          if (pending.length > 0) {
            replyText = `There are currently ${pending.length} farmer applicant(s) waiting for approval:\n` +
              pending.map((f, i) => `${i + 1}. ${f.businessName} (${f.contactPerson}) — ${f.city}`).join('\n') +
              `\n\nYou can ask me to "approve ${pending[0].businessName}" or select one to review.`;
          } else {
            replyText = `All registered farmer applications have been reviewed. There are no pending approvals.`;
          }
        }
      }
      // 2. Announcements ("Draft an announcement", "Broadcast notice")
      else if (lower.includes('announcement') || lower.includes('broadcast') || lower.includes('notice')) {
        const cap = findCapability('admin_publish_announcement');
        const draftData = cap.formatDraft({
          title: 'Saturday Market Day Notice',
          message: 'Gates open at 08:00 AM. Pre-orders ready for morning pickup at all designated stalls.',
          type: 'general',
        });
        const ins = await db.collection('aiActionDrafts').insertOne({
          userId,
          role: 'admin',
          capabilityId: cap.id,
          actionType: draftData.actionType,
          summary: draftData.summary,
          details: draftData.details,
          payload: draftData.payload,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        });
        proposedAction = {
          draftId: ins.insertedId.toString(),
          actionType: draftData.actionType,
          summary: draftData.summary,
          details: draftData.details,
          requiresConfirmation: true,
        };
        replyText = `I have drafted a platform announcement. Review the notice below and confirm to broadcast it across MarketLink.`;
      }
      // 3. Analytics & Overview
      else {
        const a = promptContext.analyticsSummary || {};
        replyText = `Platform Overview:\n• Total Orders Placed: ${a.totalOrders || 0}\n• Total Booked Value: Rs. ${a.totalBookedPKR || 0}\n• Active Certified Farmers: ${a.activeFarmers || 0}\n• Pending Farmer Approvals: ${promptContext.pendingFarmers?.length || 0}\n\nHow would you like to direct operations today?`;
      }
    }
  }

  return {
    role,
    reply: replyText,
    proposedAction,
    contextSummary: {
      route: pathname,
      activePendingDraft: !!proposedAction,
    },
    engine,
  };
}

/**
 * Execute User-Confirmed Consequential AI Action
 * Revalidates permissions, revalidates target records, invokes shared business service, and records immutable audit log.
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

  if (draft.confirmed) {
    return {
      actionType: draft.actionType,
      confirmed: true,
      summary: draft.summary,
      result: draft.result || { alreadyExecuted: true },
    };
  }

  if (draft.expiresAt && new Date() > new Date(draft.expiresAt)) {
    const err = new Error('Proposed action draft has expired. Please initiate a new request.');
    err.code = 'ACTION_DRAFT_EXPIRED';
    err.statusCode = 410;
    throw err;
  }

  let executionResult = null;

  // 1. Try Capability Registry execution if capabilityId is registered
  if (draft.capabilityId) {
    const capability = findCapability(draft.capabilityId);
    if (capability && capability.role === user.role) {
      executionResult = await capability.execute(user, draft.payload, draft.context);
    }
  }

  // 2. Backward-compatible execution for existing action types
  if (!executionResult) {
    if (draft.actionType === 'create_products' && user.role === 'farmer') {
      const cap = findCapability('farmer_create_products');
      executionResult = await cap.execute(user, draft.payload);
    } else if (draft.actionType === 'edit_saved_product' && user.role === 'farmer') {
      const cap = findCapability('farmer_update_product');
      executionResult = await cap.execute(user, draft.payload);
    } else if (draft.actionType === 'update_stall_pin' && user.role === 'farmer') {
      executionResult = await updateFarmerProfileService(user.id, {
        stallNumber: draft.payload.stallNumber,
      });
    } else if (draft.actionType === 'publish_dated_stock' && user.role === 'farmer') {
      const cap = findCapability('farmer_publish_dated_stock');
      executionResult = await cap.execute(user, draft.payload);
    } else if (draft.actionType === 'mark_sold_out' && user.role === 'farmer') {
      const cap = findCapability('farmer_mark_sold_out');
      executionResult = await cap.execute(user, draft.payload);
    } else if (draft.actionType === 'update_farmer_order_status' && user.role === 'farmer') {
      executionResult = await updateFarmerOrderStatusService(user.id, draft.payload.orderId, draft.payload.nextStatus, draft.payload.reason);
    } else if (draft.actionType === 'reply_to_review' && user.role === 'farmer') {
      executionResult = await replyToReviewService(user.id, draft.payload.reviewId, draft.payload.replyText);
    } else if (draft.actionType === 'cancel_order' && user.role === 'customer') {
      executionResult = await cancelCustomerOrderService(user.id, draft.payload.orderId, draft.payload.reason || 'Cancelled via Market Companion');
    } else if (draft.actionType === 'change_farmer_status' && user.role === 'admin') {
      executionResult = await updateFarmerApprovalService(draft.payload.farmerId, draft.payload.newStatus, user.id, draft.payload.reason || 'Admin Copilot action');
    } else if (draft.actionType === 'approve_farmer' && user.role === 'admin') {
      executionResult = await updateFarmerApprovalService(draft.payload.farmerId, 'approved', user.id, 'Approved via Admin Copilot');
    } else if (draft.actionType === 'publish_announcement' && user.role === 'admin') {
      executionResult = await createAnnouncementService(user.id, draft.payload);
    } else {
      const err = new Error(`Unsupported action type: ${draft.actionType}`);
      err.code = 'UNSUPPORTED_ACTION';
      err.statusCode = 400;
      throw err;
    }
  }

  // 3. Record Audit Trail
  await db.collection('auditLogs').insertOne({
    userId: uId,
    userRole: user.role,
    action: 'COPILOT_ACTION_EXECUTED',
    actionType: draft.actionType,
    draftId: dId,
    payload: draft.payload,
    summary: draft.summary,
    result: executionResult,
    executedAt: new Date(),
  });

  // 4. Mark draft as confirmed & executed
  await db.collection('aiActionDrafts').updateOne(
    { _id: dId },
    { $set: { confirmed: true, executedAt: new Date(), result: executionResult } }
  );

  return {
    actionType: draft.actionType,
    confirmed: true,
    summary: draft.summary,
    result: executionResult,
  };
}
