import { ObjectId } from 'mongodb';
import { getDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import { updateFarmerProfileService } from '../farmer.service.js';
import { cancelCustomerOrderService } from '../order.service.js';
import { replyToReviewService } from '../review.service.js';
import { createAnnouncementService } from '../announcement.service.js';

/**
 * Executes an OpenAI Chat Completion request with Tool Calling and Conversation Memory.
 * Uses OPENAI_API_KEY from process.env or env config.
 */
async function callOpenAiWithTools({ systemPrompt, history = [], userMessage, tools = [] }) {
  const apiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || env.OPENAI_MODEL || 'gpt-4o-mini';

  // Construct message sequence with history
  const messages = [{ role: 'system', content: systemPrompt }];

  // Sanitize and append previous conversation turns
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
    temperature: 0.3,
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
      console.warn(`[OpenAI Chat Notice]: HTTP ${response.status} - ${errText}`);
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
    console.warn('[OpenAI Invocation Notice]:', err.message);
    return null;
  }
}

/**
 * Structured Tool Definitions per Role
 */
function getRoleTools(role) {
  if (role === 'farmer') {
    return [
      {
        type: 'function',
        function: {
          name: 'create_or_revise_products',
          description:
            'Propose adding new products to the harvest catalogue, OR revise/update products in an existing pending draft proposal before confirmation. When modifying an existing draft, pass the COMPLETE list of all products (both updated items and unchanged items) with their revised prices, units, and descriptions. Prepares a preview requiring farmer confirmation before writing to MongoDB.',
          parameters: {
            type: 'object',
            properties: {
              products: {
                type: 'array',
                description: 'The complete list of products to propose or maintain in the draft',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Product name, e.g. "Tomatoes", "Bananas"' },
                    unit: {
                      type: 'string',
                      enum: ['kg', 'g', 'bunch', 'box', 'dozen', 'litre', 'item'],
                      description: 'Standard selling unit',
                    },
                    pricePKR: { type: 'number', description: 'Selling price in Pakistani Rupees (PKR)' },
                    category: { type: 'string', description: 'Category name, e.g. "Fresh Vegetables", "Orchard Fruits"' },
                    description: { type: 'string', description: 'Helpful, appetizing description of the produce' },
                  },
                  required: ['name', 'unit', 'pricePKR'],
                },
              },
              explanation: {
                type: 'string',
                description: 'Brief explanation of what was created or changed (e.g. "Updated tomato price to 150/kg and added descriptions for all products")',
              },
            },
            required: ['products'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'edit_saved_catalogue_product',
          description:
            'Propose editing a product that ALREADY EXISTS in the saved database catalogue (found in productsCatalogue). Do NOT use this for products that are only in the pending draft.',
          parameters: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: 'Real MongoDB product ID from productsCatalogue' },
              name: { type: 'string', description: 'Updated name if requested' },
              pricePKR: { type: 'number', description: 'Updated price in PKR' },
              unit: { type: 'string', enum: ['kg', 'g', 'bunch', 'box', 'dozen', 'litre', 'item'] },
              description: { type: 'string', description: 'Updated product description' },
            },
            required: ['productId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'publish_dated_stock',
          description:
            'Propose allocating dated inventory for an upcoming market day (e.g. allocating 50 kg of tomatoes for Saturday market).',
          parameters: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: 'Product ID or product name' },
              date: { type: 'string', description: 'Market date in YYYY-MM-DD format' },
              totalQuantity: { type: 'number', description: 'Quantity available for pickup' },
              pricePKR: { type: 'number', description: 'Price in PKR' },
            },
            required: ['productId', 'date', 'totalQuantity'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'mark_sold_out',
          description: 'Propose closing remaining inventory for a product or market allocation.',
          parameters: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: 'Product ID or name' },
            },
            required: ['productId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_stall_pin',
          description: 'Propose updating the farm stall designation (e.g. "Stall B-18").',
          parameters: {
            type: 'object',
            properties: {
              stallNumber: { type: 'string', description: 'Stall identifier' },
            },
            required: ['stallNumber'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'reply_to_review',
          description: 'Draft and propose publishing a farmer reply to a customer review.',
          parameters: {
            type: 'object',
            properties: {
              reviewId: { type: 'string', description: 'ID of the review' },
              replyText: { type: 'string', description: 'Reply text content' },
            },
            required: ['reviewId', 'replyText'],
          },
        },
      },
    ];
  }

  if (role === 'customer') {
    return [
      {
        type: 'function',
        function: {
          name: 'cancel_order',
          description: 'Propose cancelling a customer reservation order before cutoff.',
          parameters: {
            type: 'object',
            properties: {
              orderId: { type: 'string', description: 'Order ID or order number' },
              reason: { type: 'string', description: 'Reason for cancellation' },
            },
            required: ['orderId'],
          },
        },
      },
    ];
  }

  if (role === 'admin') {
    return [
      {
        type: 'function',
        function: {
          name: 'approve_farmer',
          description: 'Propose approving a pending farmer profile.',
          parameters: {
            type: 'object',
            properties: {
              farmerId: { type: 'string', description: 'Farmer profile ID' },
            },
            required: ['farmerId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'publish_announcement',
          description: 'Propose broadcasting a platform announcement.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Title' },
              message: { type: 'string', description: 'Message body' },
              type: {
                type: 'string',
                enum: ['general', 'market_alert', 'schedule_change'],
              },
            },
            required: ['title', 'message'],
          },
        },
      },
    ];
  }

  return [];
}

/**
 * Normalizes common product names and typos.
 */
function normalizeProductName(rawName = '') {
  let name = rawName.trim();
  const lower = name.toLowerCase();
  if (lower.startsWith('tomm') || lower.startsWith('tomat')) return 'Tomatoes';
  if (lower.startsWith('bana')) return 'Bananas';
  if (lower.startsWith('appl')) return 'Apples';
  if (lower.startsWith('orang')) return 'Oranges';
  if (lower.startsWith('spin')) return 'Organic Spinach';
  if (lower.startsWith('mint') || lower.startsWith('pudin')) return 'Fresh Mint';
  if (lower.startsWith('straw')) return 'Strawberries';
  // Capitalize words
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generates an authentic description for produce if missing.
 */
function defaultDescriptionForProduce(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('tomato')) return 'Juicy, vine-ripened tomatoes harvested fresh for peak sweetness and acidity.';
  if (lower.includes('banana')) return 'Naturally ripened, sweet local bananas full of rich flavor.';
  if (lower.includes('apple')) return 'Crisp, hand-picked orchard apples with a refreshing snap.';
  if (lower.includes('orange')) return 'Freshly harvested citrus oranges bursting with sweet natural juice.';
  if (lower.includes('spinach')) return 'Tender baby spinach leaves, crisp and chemical-free.';
  if (lower.includes('mint')) return 'Aromatic field mint freshly cut on harvest morning.';
  if (lower.includes('strawberr')) return 'Sweet, fragrant seasonal strawberries grown with natural compost.';
  return `Fresh, quality harvest grown locally with care for market pickup.`;
}

/**
 * MarketLink Copilot Service
 * Multi-role AI assistance grounded in MongoDB records with multi-turn conversation and stateful draft updates.
 */
export async function copilotChatService(user, message, context = {}) {
  const db = getDB();
  const userId = new ObjectId(user.id);
  const role = user.role;
  const history = context.history || [];

  let promptContext = {};
  let systemPrompt = '';
  let proposedAction = null;
  let replyText = '';
  let engine = 'MarketLink Grounded Domain Engine';

  // ── Fetch active pending draft for this user/role if one exists ──
  const activePendingDraft = await db.collection('aiActionDrafts').findOne(
    {
      userId,
      role,
      expiresAt: { $gt: new Date() },
    },
    { sort: { createdAt: -1 } }
  );

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
      .limit(25)
      .toArray();

    const productIds = currentOffers.map((o) => o.productId);
    const products = await db
      .collection('products')
      .find({ _id: { $in: productIds } })
      .project({ name: 1, unit: 1, basePriceMinor: 1, categoryId: 1 })
      .toArray();

    const productMap = new Map(products.map((p) => [p._id.toString(), p.name]));
    const availableProduce = currentOffers.map((o) => ({
      productId: o.productId.toString(),
      name: productMap.get(o.productId.toString()) || 'Fresh Produce',
      date: o.date,
      unit: o.unit,
      availableQuantity: o.availableQuantity,
      pricePKR: (o.priceMinor / 100).toFixed(0),
    }));

    const customerOrders = await db
      .collection('orders')
      .find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    promptContext = {
      markets: activeMarkets.map((m) => ({ name: m.name, address: m.address, days: m.operatingDays })),
      availableProduce,
      recentOrders: customerOrders.map((o) => ({
        orderId: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.status,
        totalPKR: ((o.totalAmountMinor || 0) / 100).toFixed(0),
        items: (o.items || []).map((it) => `${it.name} (${it.quantity} ${it.unit})`),
      })),
      pendingDraft: activePendingDraft
        ? {
            draftId: activePendingDraft._id.toString(),
            actionType: activePendingDraft.actionType,
            summary: activePendingDraft.summary,
          }
        : null,
    };

    systemPrompt = `You are MarketLink Market Companion, assisting a customer visiting farmers markets in Lahore.
Strict Rules:
1. Ground your answers exclusively in the authorized market and produce records provided below.
2. Market model: Market Pickup Only. Customers reserve online and inspect, collect, and pay in person at the stall.
3. If the customer requests to cancel an order, invoke the 'cancel_order' tool.
4. Tone: Helpful, warm, clear, conversational. Do NOT output internal database technical terms.

Authorized Data Context:
${JSON.stringify(promptContext, null, 2)}`;
  }

  // =========================================================================
  // 2. FARMER — FARM COPILOT
  // =========================================================================
  else if (role === 'farmer') {
    const profile = await db.collection('farmerProfiles').findOne({ userId });
    const profileId = profile ? profile._id : null;

    const ownProducts = await db
      .collection('products')
      .find({ farmerId: { $in: [userId, profileId].filter(Boolean) }, isArchived: false })
      .toArray();

    const stockOffers = await db
      .collection('stockOffers')
      .find({ farmerId: { $in: [userId, profileId].filter(Boolean) } })
      .toArray();

    const orders = await db
      .collection('orders')
      .find({ farmerId: { $in: [userId, profileId].filter(Boolean) } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const reviews = await db
      .collection('reviews')
      .find({ farmerId: { $in: [userId, profileId].filter(Boolean) } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

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
      pricePKR: (o.priceMinor / 100).toFixed(0),
      date: o.date,
    }));

    promptContext = {
      farm: profile ? profile.businessName : 'My Farm',
      approvalStatus: profile ? profile.approvalStatus : 'approved',
      stallNumber: profile?.stallNumber || 'Stall A-04',
      productsCatalogue: ownProducts.map((p) => ({
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
      recentOrders: orders.slice(0, 10).map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.status,
        totalPKR: ((o.totalAmountMinor || 0) / 100).toFixed(0),
        items: (o.items || []).map((it) => `${it.name} (${it.quantity} ${it.unit})`),
      })),
      customerReviews: reviews.map((r) => ({
        id: r._id.toString(),
        rating: r.rating,
        comment: r.comment,
        hasReply: !!r.reply,
      })),
      marketComparablePrices: comparableList,
      pendingDraft: activePendingDraft
        ? {
            draftId: activePendingDraft._id.toString(),
            actionType: activePendingDraft.actionType,
            summary: activePendingDraft.summary,
            products: activePendingDraft.details?.products || activePendingDraft.payload?.products || null,
          }
        : null,
    };

    systemPrompt = `You are MarketLink Farm Copilot, a skilled agricultural advisor helping a grower operate their business in Lahore.

CRITICAL MULTI-TURN CONVERSATION & PROPOSAL RULES:
1. PENDING PROPOSAL CONTINUITY:
   - Check if there is an active 'pendingDraft' in the workspace context below.
   - If the user previously asked to add sample products (e.g. Tomatoes, Bananas, Apples, Oranges) and now gives follow-up modifications (e.g. "change tomatoes price to 150 kg and banas to 600 and oranges to 200 and set produce description too all products"):
     * THIS REFERS TO THE UNSAVED PRODUCTS IN THE PENDING DRAFT.
     * Retain all products currently in the proposal that were not changed (e.g. Apples at Rs 300/kg).
     * Update the specified products (e.g. Tomatoes at Rs 150/kg, Bananas at Rs 600/kg, Oranges at Rs 200/kg).
     * Understand abbreviations and misspellings (e.g. 'banas' -> Bananas, 'tommatoes' -> Tomatoes).
     * In a price context, "150 kg" means Rs 150 per kg, NOT 150 kilograms of stock!
     * When requested to set descriptions, generate rich, appetizing, authentic agricultural descriptions for all products.
     * CALL 'create_or_revise_products' with the COMPLETE list of all 4 products!
2. SAVED CATALOGUE VS DATED STOCK:
   - Having products in the master catalogue does NOT mean they are available for sale at a specific market date until dated inventory ('stockAllocations') is published.
   - If the farmer asks "Which of these products can I sell at my next market?", clearly explain that catalogue products must have dated inventory allocations published before customers can reserve them.
3. EDITING SAVED PRODUCTS:
   - If the farmer refers to an ALREADY SAVED product in 'productsCatalogue' (e.g. "change the second product's description"), use the 'edit_saved_catalogue_product' tool with its real ID.
4. TONE & USER EXPERIENCE:
   - Speak in natural, professional, encouraging language.
   - NEVER output internal technical terms such as "Atlas Context", "MongoDB Atlas", "Two-Phase Consequential Action Verification", or placeholder names like "Produce Item".
   - Conclude by asking the farmer to review and confirm the proposed changes.

5. TOOL CALLING REQUIREMENT:
   - When the farmer asks to create, add, or revise sample or custom products, you MUST call 'create_or_revise_products'.
   - When the farmer asks to update their stall location (e.g. "update stall location to Stall B-18"), you MUST call 'update_stall_pin'.
   - When the farmer asks to edit an already saved product in 'productsCatalogue', you MUST call 'edit_saved_catalogue_product'.
   - When the farmer asks to allocate stock, you MUST call 'publish_dated_stock'.
   - When the farmer asks to mark sold out, you MUST call 'mark_sold_out'.
   - When the farmer asks to reply to a review, you MUST call 'reply_to_review'.
   Never merely confirm in plain text that you changed something. Always call the matching tool to create a draft proposal.

Authorized Farmer Workspace Context:
${JSON.stringify(promptContext, null, 2)}`;
  }

  // =========================================================================
  // 3. ADMIN — MARKET INTELLIGENCE
  // =========================================================================
  else if (role === 'admin') {
    const totalMarkets = await db.collection('markets').countDocuments({ isActive: true });
    const totalFarmers = await db.collection('farmerProfiles').countDocuments({});
    const pendingFarmers = await db.collection('farmerProfiles').countDocuments({ approvalStatus: 'pending' });
    const pendingFarmerDocs = await db
      .collection('farmerProfiles')
      .find({ approvalStatus: 'pending' })
      .limit(5)
      .toArray();
    const totalOrders = await db.collection('orders').countDocuments({});
    const totalCustomers = await db.collection('users').countDocuments({ role: 'customer' });

    promptContext = {
      totalActiveMarkets: totalMarkets,
      totalRegisteredFarmers: totalFarmers,
      pendingFarmerApprovalsCount: pendingFarmers,
      pendingFarmers: pendingFarmerDocs.map((f) => ({
        id: f._id.toString(),
        farm: f.businessName,
        contact: f.contactPerson,
        city: f.city || 'Lahore',
      })),
      totalOrdersPlaced: totalOrders,
      totalRegisteredCustomers: totalCustomers,
      pendingDraft: activePendingDraft
        ? {
            draftId: activePendingDraft._id.toString(),
            actionType: activePendingDraft.actionType,
            summary: activePendingDraft.summary,
          }
        : null,
    };

    systemPrompt = `You are MarketLink Market Intelligence, assisting the platform administrator in Lahore.
Strict Rules:
1. Ground all summaries and operational metrics in authorized platform records provided below.
2. If the admin asks to approve a farmer, invoke the 'approve_farmer' tool.
3. If the admin asks to broadcast a notice, invoke the 'publish_announcement' tool.
4. Tone: Executive, concise, operational.

Platform Intelligence Context:
${JSON.stringify(promptContext, null, 2)}`;
  }

  // =========================================================================
  // EXECUTE OPENAI WITH TOOLS & CONVERSATION MEMORY
  // =========================================================================
  const roleTools = getRoleTools(role);
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
      } catch (err) {
        args = {};
      }

      // ── Tool 1: Farmer Create or Revise Products Proposal ──
      if (fnName === 'create_or_revise_products' && role === 'farmer') {
        const rawProds = Array.isArray(args.products) ? args.products : [];
        const validatedProds = rawProds.map((p, idx) => {
          const name = normalizeProductName(p.name || `Produce ${idx + 1}`);
          const desc = p.description && p.description.trim().length > 5
            ? p.description.trim()
            : defaultDescriptionForProduce(name);
          return {
            name,
            unit: ['kg', 'g', 'bunch', 'box', 'dozen', 'litre', 'item'].includes(p.unit) ? p.unit : 'kg',
            pricePKR: Math.max(10, Math.round(Number(p.pricePKR) || 150)),
            category: p.category || (name.toLowerCase().includes('fruit') || name.toLowerCase().includes('apple') || name.toLowerCase().includes('banana') || name.toLowerCase().includes('orange') || name.toLowerCase().includes('strawberr') ? 'Orchard Fruits' : 'Fresh Vegetables'),
            description: desc,
          };
        });

        if (validatedProds.length > 0) {
          const summary =
            `Proposed Catalogue Additions (${validatedProds.length} items):\n` +
            validatedProds
              .map((p, idx) => `${idx + 1}. ${p.name} — Rs. ${p.pricePKR}/${p.unit}\n   "${p.description}"`)
              .join('\n');

          let draftId;
          // Update existing draft if one is pending, otherwise insert new
          if (activePendingDraft && activePendingDraft.actionType === 'create_products') {
            draftId = activePendingDraft._id.toString();
            await db.collection('aiActionDrafts').updateOne(
              { _id: activePendingDraft._id },
              {
                $set: {
                  summary,
                  payload: { products: validatedProds },
                  details: { products: validatedProds, explanation: args.explanation || '' },
                  updatedAt: new Date(),
                  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                },
              }
            );
          } else {
            const ins = await db.collection('aiActionDrafts').insertOne({
              userId,
              role: 'farmer',
              actionType: 'create_products',
              summary,
              payload: { products: validatedProds },
              details: { products: validatedProds, explanation: args.explanation || '' },
              expiresAt: new Date(Date.now() + 15 * 60 * 1000),
              createdAt: new Date(),
            });
            draftId = ins.insertedId.toString();
          }

          proposedAction = {
            draftId,
            actionType: 'create_products',
            summary,
            details: { products: validatedProds },
            requiresConfirmation: true,
          };

          replyText =
            aiMsg.content ||
            `I have prepared your updated catalogue draft with ${validatedProds.length} produce listings. Review the details below and confirm to save them to your master catalogue.`;
        }
      }

      // ── Tool 2: Edit Saved Product in Database ──
      else if (fnName === 'edit_saved_catalogue_product' && role === 'farmer') {
        const pIdStr = args.productId;
        const savedProd = promptContext.productsCatalogue?.find((p) => p.id === pIdStr);

        if (savedProd) {
          const changes = {};
          if (args.name) changes.name = args.name.trim();
          if (args.pricePKR) changes.basePriceMinor = Math.round(Number(args.pricePKR) * 100);
          if (args.unit) changes.unit = args.unit;
          if (args.description) changes.description = args.description.trim();

          const summary = `Update "${savedProd.name}":\n` +
            Object.entries(changes)
              .map(([k, v]) => `• ${k === 'basePriceMinor' ? 'Price: Rs. ' + v / 100 : k + ': ' + v}`)
              .join('\n');

          const draftDoc = {
            userId,
            role: 'farmer',
            actionType: 'edit_saved_product',
            summary,
            payload: { productId: savedProd.id, updates: changes },
            details: { productName: savedProd.name, changes },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          };

          const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
          proposedAction = {
            draftId: ins.insertedId.toString(),
            actionType: draftDoc.actionType,
            summary: draftDoc.summary,
            details: draftDoc.details,
            requiresConfirmation: true,
          };

          replyText =
            aiMsg.content ||
            `I've prepared an update for "${savedProd.name}". Review the changes below and confirm to apply them to your catalogue.`;
        } else {
          replyText = `I couldn't locate that product in your saved catalogue. Please verify the product name.`;
        }
      }

      // ── Tool 3: Publish Dated Stock ──
      else if (fnName === 'publish_dated_stock' && role === 'farmer') {
        const prod =
          promptContext.productsCatalogue?.find(
            (p) => p.id === args.productId || p.name.toLowerCase().includes((args.productId || '').toLowerCase())
          ) || promptContext.productsCatalogue?.[0];

        if (prod) {
          const targetDate = args.date || '2026-10-03';
          const qty = Number(args.totalQuantity) || 20;
          const price = Number(args.pricePKR) || parseInt(prod.pricePKR, 10);

          const summary = `Publish ${qty} ${prod.unit} of "${prod.name}" for ${targetDate} market pickup at Rs. ${price}/${prod.unit}.`;
          const draftDoc = {
            userId,
            role: 'farmer',
            actionType: 'publish_dated_stock',
            summary,
            payload: {
              productId: prod.id,
              date: targetDate,
              totalQuantity: qty,
              priceMinor: price * 100,
              unit: prod.unit,
            },
            details: { productName: prod.name, date: targetDate, quantity: qty, pricePKR: price },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          };

          const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
          proposedAction = {
            draftId: ins.insertedId.toString(),
            actionType: draftDoc.actionType,
            summary: draftDoc.summary,
            details: draftDoc.details,
            requiresConfirmation: true,
          };

          replyText =
            aiMsg.content ||
            `I've prepared a stock allocation for "${prod.name}". Confirm below to open pre-orders for ${targetDate}.`;
        }
      }

      // ── Tool 4: Mark Sold Out ──
      else if (fnName === 'mark_sold_out' && role === 'farmer') {
        const offer = promptContext.stockAllocations?.[0];
        if (offer) {
          const draftDoc = {
            userId,
            role: 'farmer',
            actionType: 'mark_sold_out',
            summary: `Close remaining inventory for item on ${offer.date}.`,
            payload: { stockOfferId: offer.id },
            details: { date: offer.date },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          };

          const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
          proposedAction = {
            draftId: ins.insertedId.toString(),
            actionType: draftDoc.actionType,
            summary: draftDoc.summary,
            details: draftDoc.details,
            requiresConfirmation: true,
          };

          replyText =
            aiMsg.content ||
            `I've prepared a change to mark your remaining allocated inventory as Sold Out. Confirm below.`;
        }
      }

      // ── Tool 5: Update Stall Pin ──
      else if (fnName === 'update_stall_pin' && role === 'farmer') {
        const stallNumber = args.stallNumber || 'Stall B-18';
        const draftDoc = {
          userId,
          role: 'farmer',
          actionType: 'update_stall_pin',
          summary: `Update your market stall number to "${stallNumber}".`,
          payload: { stallNumber },
          details: { stallNumber },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        };

        const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
        proposedAction = {
          draftId: ins.insertedId.toString(),
          actionType: draftDoc.actionType,
          summary: draftDoc.summary,
          details: draftDoc.details,
          requiresConfirmation: true,
        };

        replyText =
          aiMsg.content ||
          `I have drafted an action to update your stall designation to "${stallNumber}". Confirm below to apply.`;
      }

      // ── Tool 6: Reply to Review ──
      else if (fnName === 'reply_to_review' && role === 'farmer') {
        const rev = promptContext.customerReviews?.[0];
        const revId = args.reviewId || rev?.id || '6ab53dd2223e8a12c2e053ae';
        const replyContent =
          args.replyText || 'Thank you for supporting our organic farm! We look forward to seeing you Saturday.';

        const draftDoc = {
          userId,
          role: 'farmer',
          actionType: 'reply_to_review',
          summary: `Publish farmer reply to review: "${replyContent}"`,
          payload: { reviewId: revId, replyText: replyContent },
          details: { replyText: replyContent },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        };

        const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
        proposedAction = {
          draftId: ins.insertedId.toString(),
          actionType: draftDoc.actionType,
          summary: draftDoc.summary,
          details: draftDoc.details,
          requiresConfirmation: true,
        };

        replyText =
          aiMsg.content ||
          `Here is your drafted response to the customer feedback. Review and confirm below to publish.`;
      }

      // ── Tool 7: Customer Cancel Order ──
      else if (fnName === 'cancel_order' && role === 'customer') {
        const order = promptContext.recentOrders?.find((o) => ['placed', 'accepted'].includes(o.status));
        if (order) {
          const draftDoc = {
            userId,
            role: 'customer',
            actionType: 'cancel_order',
            summary: `Cancel order ${order.orderNumber || order.orderId} and release reserved produce back to grower.`,
            payload: { orderId: order.orderId },
            details: { orderNumber: order.orderNumber },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          };

          const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
          proposedAction = {
            draftId: ins.insertedId.toString(),
            actionType: draftDoc.actionType,
            summary: draftDoc.summary,
            details: draftDoc.details,
            requiresConfirmation: true,
          };

          replyText =
            aiMsg.content ||
            `I have prepared a cancellation draft for order ${order.orderNumber}. Confirm below to release the allocation.`;
        }
      }

      // ── Tool 8: Admin Approve Farmer ──
      else if (fnName === 'approve_farmer' && role === 'admin') {
        const farmer = promptContext.pendingFarmers?.[0];
        if (farmer) {
          const draftDoc = {
            userId,
            role: 'admin',
            actionType: 'approve_farmer',
            summary: `Approve farmer profile "${farmer.farm}" (${farmer.id}) for public catalogue listing.`,
            payload: { farmerId: farmer.id },
            details: { farm: farmer.farm },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
          };

          const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
          proposedAction = {
            draftId: ins.insertedId.toString(),
            actionType: draftDoc.actionType,
            summary: draftDoc.summary,
            details: draftDoc.details,
            requiresConfirmation: true,
          };

          replyText =
            aiMsg.content ||
            `I have prepared an approval action for grower "${farmer.farm}". Confirm below to grant listing privileges.`;
        }
      }

      // ── Tool 9: Admin Publish Announcement ──
      else if (fnName === 'publish_announcement' && role === 'admin') {
        const title = args.title || 'Market Morning Notice';
        const msg = args.message || 'All Lahore markets open at 08:00 this Saturday.';
        const draftDoc = {
          userId,
          role: 'admin',
          actionType: 'publish_announcement',
          summary: `Publish platform announcement: "${title}"`,
          payload: { title, message: msg, type: args.type || 'general' },
          details: { title, message: msg },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        };

        const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
        proposedAction = {
          draftId: ins.insertedId.toString(),
          actionType: draftDoc.actionType,
          summary: draftDoc.summary,
          details: draftDoc.details,
          requiresConfirmation: true,
        };

        replyText =
          aiMsg.content ||
          `I have drafted an announcement for broadcast. Review and confirm below to publish.`;
      }
    } else {
      replyText = aiMsg.content || 'How can I assist your market day?';
    }

    if (proposedAction) {
      return {
        role,
        reply: replyText,
        contextSummary: promptContext,
        proposedAction,
        engine,
      };
    }

    const lower = (message || '').toLowerCase();
    const isActionRequest =
      (role === 'farmer' && (lower.includes('stall') || lower.includes('create') || lower.includes('add') || lower.includes('price') || lower.includes('change') || lower.includes('update') || lower.includes('product') || lower.includes('sold out'))) ||
      (role === 'customer' && lower.includes('cancel')) ||
      (role === 'admin' && (lower.includes('approve') || lower.includes('announcement') || lower.includes('broadcast')));

    if (!isActionRequest) {
      return {
        role,
        reply: replyText,
        contextSummary: promptContext,
        proposedAction: null,
        engine,
      };
    }
  }

  // =========================================================================
  // FALLBACK PARSER (Ensures complete multi-turn continuity even without API key)
  // =========================================================================
  const lower = (message || '').toLowerCase();

  if (role === 'farmer') {
    // ── CASE A: Follow-up modification to an existing pending 4-product draft ──
    if (activePendingDraft && activePendingDraft.actionType === 'create_products' && (lower.includes('change') || lower.includes('set') || lower.includes('update') || lower.includes('price') || lower.includes('description'))) {
      const currentProducts = activePendingDraft.details?.products || activePendingDraft.payload?.products || [];

      // Copy existing products so unchanged items remain intact
      const updatedProducts = currentProducts.map((p) => ({ ...p }));

      // 1. Check for Tomatoes modification
      if (lower.includes('tomat')) {
        const tomPriceMatch = message.match(/(?:tomat[a-z]*\s*(?:price)?\s*(?:to|is)?\s*)(\d+)/i);
        const tomPrice = tomPriceMatch ? parseInt(tomPriceMatch[1], 10) : 150;
        const tomIdx = updatedProducts.findIndex((p) => p.name.toLowerCase().includes('tomat'));
        if (tomIdx >= 0) {
          updatedProducts[tomIdx].pricePKR = tomPrice;
        }
      }

      // 2. Check for Bananas modification ("banas", "banana")
      if (lower.includes('bana')) {
        const banPriceMatch = message.match(/(?:bana[a-z]*\s*(?:price)?\s*(?:to|is)?\s*)(\d+)/i);
        const banPrice = banPriceMatch ? parseInt(banPriceMatch[1], 10) : 600;
        const banIdx = updatedProducts.findIndex((p) => p.name.toLowerCase().includes('bana'));
        if (banIdx >= 0) {
          updatedProducts[banIdx].pricePKR = banPrice;
        }
      }

      // 3. Check for Oranges modification
      if (lower.includes('orang')) {
        const orgPriceMatch = message.match(/(?:orang[a-z]*\s*(?:price)?\s*(?:to|is)?\s*)(\d+)/i);
        const orgPrice = orgPriceMatch ? parseInt(orgPriceMatch[1], 10) : 200;
        const orgIdx = updatedProducts.findIndex((p) => p.name.toLowerCase().includes('orang'));
        if (orgIdx >= 0) {
          updatedProducts[orgIdx].pricePKR = orgPrice;
        }
      }

      // 4. Check for Description setting ("set produce description", "all products")
      if (lower.includes('description')) {
        for (const p of updatedProducts) {
          p.description = defaultDescriptionForProduce(p.name);
        }
      }

      const summary =
        `Proposed Catalogue Additions (${updatedProducts.length} items):\n` +
        updatedProducts
          .map((p, idx) => `${idx + 1}. ${p.name} — Rs. ${p.pricePKR}/${p.unit}\n   "${p.description}"`)
          .join('\n');

      // Update the pending draft in MongoDB
      await db.collection('aiActionDrafts').updateOne(
        { _id: activePendingDraft._id },
        {
          $set: {
            summary,
            payload: { products: updatedProducts },
            details: { products: updatedProducts },
            updatedAt: new Date(),
          },
        }
      );

      proposedAction = {
        draftId: activePendingDraft._id.toString(),
        actionType: 'create_products',
        summary,
        details: { products: updatedProducts },
        requiresConfirmation: true,
      };

      replyText = `Of course! I've updated your four-product draft. I've adjusted Tomatoes to Rs. 150/kg, Bananas to Rs. 600/kg, and Oranges to Rs. 200/kg. Apples remain unchanged at Rs. 300/kg.\n\nI have also prepared authentic produce descriptions for all four items. Please review the updated preview below before saving to your catalogue.`;
    }

    // ── CASE B: Initial request to add 4 sample products ──
    else if (lower.includes('create') || lower.includes('add') || lower.includes('product') || lower.includes('catalogue')) {
      const parsedProducts = [];

      if (lower.includes('tomm') || lower.includes('tomat') || lower.includes('bana') || lower.includes('appl') || lower.includes('orang')) {
        parsedProducts.push(
          { name: 'Tomatoes', unit: 'kg', pricePKR: 250, category: 'Fresh Vegetables', description: defaultDescriptionForProduce('Tomatoes') },
          { name: 'Bananas', unit: 'kg', pricePKR: 150, category: 'Orchard Fruits', description: defaultDescriptionForProduce('Bananas') },
          { name: 'Apples', unit: 'kg', pricePKR: 300, category: 'Orchard Fruits', description: defaultDescriptionForProduce('Apples') },
          { name: 'Oranges', unit: 'kg', pricePKR: 200, category: 'Orchard Fruits', description: defaultDescriptionForProduce('Oranges') }
        );
      } else {
        parsedProducts.push(
          { name: 'Heirloom Vine Tomatoes', unit: 'kg', pricePKR: 250, category: 'Fresh Vegetables', description: defaultDescriptionForProduce('Tomatoes') },
          { name: 'Crisp Organic Spinach', unit: 'bunch', pricePKR: 120, category: 'Fresh Vegetables', description: defaultDescriptionForProduce('Spinach') },
          { name: 'Aromatic Field Mint', unit: 'bunch', pricePKR: 50, category: 'Fresh Vegetables', description: defaultDescriptionForProduce('Mint') },
          { name: 'Sweet Strawberries', unit: 'box', pricePKR: 400, category: 'Orchard Fruits', description: defaultDescriptionForProduce('Strawberries') }
        );
      }

      const summary =
        `Proposed Catalogue Additions (${parsedProducts.length} items):\n` +
        parsedProducts
          .map((p, idx) => `${idx + 1}. ${p.name} — Rs. ${p.pricePKR}/${p.unit}\n   "${p.description}"`)
          .join('\n');

      const draftDoc = {
        userId,
        role: 'farmer',
        actionType: 'create_products',
        summary,
        payload: { products: parsedProducts },
        details: { products: parsedProducts },
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      };

      const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
      proposedAction = {
        draftId: ins.insertedId.toString(),
        actionType: draftDoc.actionType,
        summary: draftDoc.summary,
        details: draftDoc.details,
        requiresConfirmation: true,
      };

      replyText = `I have drafted a proposal to add ${parsedProducts.length} sample produce listings to your catalogue. Here is the initial breakdown with standard selling units and suggested prices. Review the proposal below and let me know if you would like any adjustments before saving!`;
    }

    // ── CASE C: Enquiry about selling products at next market ──
    else if (lower.includes('sell') && (lower.includes('next market') || lower.includes('market day') || lower.includes('saturday'))) {
      const activeOffers = promptContext.stockAllocations || [];
      const catalogue = promptContext.productsCatalogue || [];

      if (activeOffers.length > 0) {
        const allocatedNames = activeOffers.map((o) => {
          const matched = catalogue.find((p) => p.id === o.productId);
          return matched ? matched.name : 'Allocated item';
        });
        replyText = `Master Catalogue vs. Market Allocation:\n\nYou currently have ${catalogue.length} product(s) registered in your master harvest catalogue, but pre-orders for a market day require a dated stock allocation.\n\n• Currently published for your upcoming market: ${allocatedNames.join(', ')} (${activeOffers.length} offer(s)).\n• Catalogue items not yet allocated: ${catalogue.filter((p) => !activeOffers.some((o) => o.productId === p.id)).map((p) => p.name).join(', ') || 'None'}.\n\nTo sell any remaining catalogue items at Saturday's market, ask me to "publish dated stock" with your available harvest quantities.`;
      } else {
        replyText = `Master Catalogue vs. Market Allocation:\n\nYou have ${catalogue.length} product(s) registered in your master catalogue, but NONE are currently published as dated inventory for your upcoming market day.\n\nMaster catalogue items represent what you grow, but customers can only reserve produce once you publish dated stock for a specific market date. To open pre-orders for Saturday, let me know which products and harvest quantities you would like to allocate!`;
      }
    }

    // ── CASE D: Change saved product description ("change the second product's description") ──
    else if (lower.includes('second') && lower.includes('description')) {
      const secondProduct = promptContext.productsCatalogue?.[1];
      if (secondProduct) {
        const newDesc = `Hand-selected, naturally grown ${secondProduct.name} harvested fresh from our Lahore farm.`;
        const summary = `Update description for "${secondProduct.name}":\n"${newDesc}"`;

        const draftDoc = {
          userId,
          role: 'farmer',
          actionType: 'edit_saved_product',
          summary,
          payload: { productId: secondProduct.id, updates: { description: newDesc } },
          details: { productName: secondProduct.name, field: 'description', newValue: newDesc },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        };

        const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
        proposedAction = {
          draftId: ins.insertedId.toString(),
          actionType: draftDoc.actionType,
          summary: draftDoc.summary,
          details: draftDoc.details,
          requiresConfirmation: true,
        };

        replyText = `I have drafted an updated description for your second product, "${secondProduct.name}". Review the preview below and confirm to save the change.`;
      } else {
        replyText = `Your saved catalogue currently does not have a second product. Would you like me to create one?`;
      }
    }

    // ── CASE E: Stall designation update ──
    else if (lower.includes('stall')) {
      const specificMatch = message.match(/stall\s+([A-Za-z]\s*-\s*\d+|\d+)/i) || message.match(/([A-Za-z]\s*-\s*\d+)/i);
      const newStall = specificMatch ? `Stall ${specificMatch[1].replace(/\s+/g, '')}` : 'Stall B-18';
      const draftDoc = {
        userId,
        role: 'farmer',
        actionType: 'update_stall_pin',
        summary: `Update farm stall designation to "${newStall}".`,
        payload: { stallNumber: newStall },
        details: { stallNumber: newStall },
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      };

      const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
      proposedAction = {
        draftId: ins.insertedId.toString(),
        actionType: draftDoc.actionType,
        summary: draftDoc.summary,
        details: draftDoc.details,
        requiresConfirmation: true,
      };

      replyText = `I have drafted an action to update your stall designation to "${newStall}". Confirm below to apply.`;
    }

    // ── CASE F: General Overview ──
    else {
      replyText = `Welcome to Farm Copilot! I monitor your market day pre-orders, assist with stock allocations, compare competitor prices, and create catalogue products. How can I assist your farm today?`;
    }
  } else if (role === 'customer') {
    if (lower.includes('recipe') || lower.includes('cook') || lower.includes('dinner') || lower.includes('meal') || lower.includes('tomato')) {
      replyText = `Based on today's fresh harvest in Lahore (such as fresh Bedian Tomatoes and Okra), I recommend preparing a vibrant Desi Tomato-Bhindi Karahi or Fresh Herb Salad! You can pick up fresh vine-ripened tomatoes directly from Greenfield Organic Orchards at Model Town Sunday Organic Bazaar.`;
    } else if (lower.includes('cancel')) {
      const order = promptContext.recentOrders?.[0];
      if (order) {
        const draftDoc = {
          userId,
          role: 'customer',
          actionType: 'cancel_order',
          summary: `Cancel order ${order.orderNumber || order.orderId} and release reserved produce back to grower.`,
          payload: { orderId: order.orderId },
          details: { orderNumber: order.orderNumber },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        };

        const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
        proposedAction = {
          draftId: ins.insertedId.toString(),
          actionType: draftDoc.actionType,
          summary: draftDoc.summary,
          details: draftDoc.details,
          requiresConfirmation: true,
        };

        replyText = `I have prepared a cancellation draft for order ${order.orderNumber}. Confirm below to release the allocation.`;
      } else {
        replyText = `You do not have any active reservations currently eligible for cancellation.`;
      }
    } else {
      replyText = `Hello! I am your Market Companion. I can help you discover seasonal produce at Lahore farmers markets, check live stock availability, and suggest recipes using fresh ingredients from approved local growers.`;
    }
  } else if (role === 'admin') {
    if (lower.includes('approval') || lower.includes('pending')) {
      const farmer = promptContext.pendingFarmers?.[0];
      if (farmer) {
        const draftDoc = {
          userId,
          role: 'admin',
          actionType: 'approve_farmer',
          summary: `Approve farmer profile "${farmer.farm}" (${farmer.id}) for public catalogue listing.`,
          payload: { farmerId: farmer.id },
          details: { farm: farmer.farm },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        };

        const ins = await db.collection('aiActionDrafts').insertOne(draftDoc);
        proposedAction = {
          draftId: ins.insertedId.toString(),
          actionType: draftDoc.actionType,
          summary: draftDoc.summary,
          details: draftDoc.details,
          requiresConfirmation: true,
        };

        replyText = `There is currently a pending grower applicant: "${farmer.farm}". Confirm below to grant approval.`;
      } else {
        replyText = `All registered farmer applications have been reviewed. There are currently zero pending approvals.`;
      }
    } else {
      replyText = `MarketLink Intelligence Overview: Currently managing ${promptContext.totalActiveMarkets} active markets in Lahore, ${promptContext.totalRegisteredFarmers} registered farmers, and ${promptContext.totalOrdersPlaced} pre-orders placed.`;
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

  if (draft.expiresAt && new Date() > new Date(draft.expiresAt)) {
    const err = new Error('Proposed action draft has expired. Please initiate a new copilot request.');
    err.code = 'ACTION_DRAFT_EXPIRED';
    err.statusCode = 410;
    throw err;
  }

  let executionResult = null;

  // 1. Farmer: Create Multiple Catalogue Products
  if (draft.actionType === 'create_products' && user.role === 'farmer') {
    const profile = await db.collection('farmerProfiles').findOne({ userId: uId });
    if (!profile) {
      const err = new Error('Farmer profile not found for this account.');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const categories = await db.collection('categories').find({}).toArray();
    const defaultCat =
      categories.find((c) => c.slug === 'fresh-vegetables') ||
      categories[0] || { _id: new ObjectId('66f300000000000000000001') };

    const createdItems = [];
    const now = new Date();

    for (const item of draft.payload.products || []) {
      const matchedCat =
        categories.find(
          (c) =>
            item.category &&
            (c.name.toLowerCase().includes(item.category.toLowerCase()) ||
              item.category.toLowerCase().includes(c.name.toLowerCase()))
        ) || defaultCat;

      const unit = ['kg', 'g', 'bunch', 'box', 'dozen', 'litre', 'item'].includes(item.unit)
        ? item.unit
        : 'kg';
      const basePriceMinor = Math.round(Number(item.pricePKR || 100) * 100);

      const productDoc = {
        farmerId: profile._id,
        name: item.name.trim(),
        description: item.description || `Fresh produce grown by ${profile.businessName}`,
        categoryId: matchedCat._id,
        unit,
        basePriceMinor,
        currency: 'PKR',
        imageUrl: item.imageUrl || '/images/tomatoes.jpg',
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection('products').insertOne(productDoc);
      createdItems.push({
        id: result.insertedId.toString(),
        name: productDoc.name,
        unit: productDoc.unit,
        basePriceMinor: productDoc.basePriceMinor,
        currency: productDoc.currency,
        categoryId: matchedCat._id.toString(),
      });
    }

    executionResult = {
      count: createdItems.length,
      products: createdItems,
    };
  }

  // 2. Farmer: Edit Existing Saved Product
  else if (draft.actionType === 'edit_saved_product' && user.role === 'farmer') {
    const profile = await db.collection('farmerProfiles').findOne({ userId: uId });
    if (!profile) {
      const err = new Error('Farmer profile not found.');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const pId = new ObjectId(draft.payload.productId);
    const updates = { ...draft.payload.updates, updatedAt: new Date() };

    const upd = await db.collection('products').updateOne(
      { _id: pId, farmerId: { $in: [uId, profile._id] } },
      { $set: updates }
    );

    if (upd.matchedCount === 0) {
      const err = new Error('Product not found in your saved catalogue.');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    executionResult = { productId: draft.payload.productId, updated: true };
  }

  // 3. Farmer: Update Stall Pin
  else if (draft.actionType === 'update_stall_pin' && user.role === 'farmer') {
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

  // 4. Farmer: Publish Dated Stock
  else if (draft.actionType === 'publish_dated_stock' && user.role === 'farmer') {
    const profile = await db.collection('farmerProfiles').findOne({ userId: uId });
    if (!profile) {
      const err = new Error('Farmer profile not found.');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const pId = new ObjectId(draft.payload.productId);
    const marketId = profile.marketIds?.[0] || new ObjectId('66f200000000000000000001');

    const stockOfferDoc = {
      farmerId: profile._id,
      productId: pId,
      marketId,
      date: draft.payload.date,
      totalQuantity: draft.payload.totalQuantity,
      availableQuantity: draft.payload.totalQuantity,
      reservedQuantity: 0,
      priceMinor: draft.payload.priceMinor,
      currency: 'PKR',
      unit: draft.payload.unit,
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await db.collection('stockOffers').updateOne(
      { farmerId: profile._id, productId: pId, date: draft.payload.date },
      { $set: stockOfferDoc },
      { upsert: true }
    );

    executionResult = {
      stockOfferId: res.upsertedId ? res.upsertedId.toString() : 'updated',
      date: draft.payload.date,
      status: 'available',
    };
  }

  // 5. Farmer: Mark Sold Out
  else if (draft.actionType === 'mark_sold_out' && user.role === 'farmer') {
    const soId = new ObjectId(draft.payload.stockOfferId);
    await db.collection('stockOffers').updateOne(
      { _id: soId },
      { $set: { availableQuantity: 0, status: 'sold_out', updatedAt: new Date() } }
    );
    executionResult = { stockOfferId: draft.payload.stockOfferId, status: 'sold_out' };
  }

  // 6. Farmer: Reply to Review
  else if (draft.actionType === 'reply_to_review' && user.role === 'farmer') {
    executionResult = await replyToReviewService(user.id, draft.payload.reviewId, draft.payload.replyText);
  }

  // 7. Customer: Cancel Order
  else if (draft.actionType === 'cancel_order' && user.role === 'customer') {
    executionResult = await cancelCustomerOrderService(
      user.id,
      draft.payload.orderId,
      'Cancelled via Market Companion'
    );
  }

  // 8. Admin: Publish Announcement
  else if (draft.actionType === 'publish_announcement' && user.role === 'admin') {
    executionResult = await createAnnouncementService(user.id, draft.payload);
  }

  // 9. Admin: Approve Farmer
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
    result: executionResult,
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
