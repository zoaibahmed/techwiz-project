import { ObjectId } from 'mongodb';
import { getDB } from '../../config/db.js';

// Shared backend services
import {
  getFarmerProfileService,
  updateFarmerProfileService,
  listFarmersPublicService,
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
  listProductsPublicService,
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
 * Normalizes common produce names and typos
 */
export function normalizeProduceName(raw = '') {
  let name = raw.trim();
  const lower = name.toLowerCase();
  if (lower.startsWith('tomat') || lower.startsWith('tomm')) return 'Tomatoes';
  if (lower.startsWith('bana')) return 'Bananas';
  if (lower.startsWith('appl')) return 'Apples';
  if (lower.startsWith('orang')) return 'Oranges';
  if (lower.startsWith('spin')) return 'Organic Spinach';
  if (lower.startsWith('mint') || lower.startsWith('pudin')) return 'Fresh Mint';
  if (lower.startsWith('straw')) return 'Strawberries';
  if (lower.startsWith('cucum') || lower.startsWith('kheera')) return 'Cucumbers';
  if (lower.startsWith('carro') || lower.startsWith('gajar')) return 'Carrots';
  if (lower.startsWith('potat') || lower.startsWith('aloo')) return 'Potatoes';
  if (lower.startsWith('onion') || lower.startsWith('pyaz')) return 'Red Onions';
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Natural descriptions for fresh produce
 */
export function naturalProduceDescription(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('tomato')) return 'Juicy, vine-ripened tomatoes harvested fresh for peak sweetness and acidity.';
  if (lower.includes('banana')) return 'Naturally ripened, sweet local bananas full of rich flavor.';
  if (lower.includes('apple')) return 'Crisp, hand-picked orchard apples with a refreshing snap.';
  if (lower.includes('orange')) return 'Freshly harvested citrus oranges bursting with sweet natural juice.';
  if (lower.includes('spinach')) return 'Tender baby spinach leaves, crisp, vibrant, and chemical-free.';
  if (lower.includes('mint')) return 'Aromatic field mint freshly cut on market harvest morning.';
  if (lower.includes('strawberr')) return 'Sweet, fragrant seasonal strawberries grown with natural compost.';
  if (lower.includes('cucumber')) return 'Cool, crisp garden cucumbers harvested at peak freshness.';
  if (lower.includes('carrot')) return 'Sweet and crunchy heirloom carrots grown in nutrient-dense soil.';
  return 'Fresh, quality harvest grown locally with care for market pickup.';
}

/**
 * Role Capability Registry
 */
export const CAPABILITIES = [
  // =========================================================================
  // 1. CUSTOMER CAPABILITIES
  // =========================================================================
  {
    id: 'customer.get_profile',
    name: 'customer_get_profile',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'Retrieve the authenticated customer profile, contact details, address, and dietary preferences.',
    parameters: { type: 'object', properties: {} },
    execute: async (user) => getCustomerProfileService(user.id),
  },
  {
    id: 'customer.update_profile',
    name: 'customer_update_profile',
    role: 'customer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose updating customer profile details such as name, phone, address, or dietary preferences.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Updated customer full name' },
        phone: { type: 'string', description: 'Contact phone number' },
        address: { type: 'string', description: 'Street address' },
        dietaryPreferences: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dietary preferences e.g. ["organic", "pesticide_free", "vegan"]',
        },
      },
    },
    formatDraft: (args) => {
      const parts = [];
      if (args.name) parts.push(`Name: ${args.name}`);
      if (args.phone) parts.push(`Phone: ${args.phone}`);
      if (args.address) parts.push(`Address: ${args.address}`);
      if (args.dietaryPreferences) parts.push(`Preferences: ${args.dietaryPreferences.join(', ')}`);
      return {
        actionType: 'update_customer_profile',
        summary: `Update your profile information:\n${parts.join('\n')}`,
        details: args,
        payload: args,
      };
    },
    execute: async (user, args) => updateCustomerProfileService(user.id, args),
  },
  {
    id: 'customer.get_markets',
    name: 'customer_get_markets',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'Find active farmers markets, schedules, operating days, and locations.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Optional city filter, e.g. "Lahore"' },
        operatingDay: { type: 'string', description: 'Optional day of week, e.g. "Saturday"' },
      },
    },
    execute: async (user, args) => listMarketsService({ city: args.city, operatingDay: args.operatingDay }),
  },
  {
    id: 'customer.get_farmers',
    name: 'customer_get_farmers',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'View registered farmers, their farm names, bios, and assigned stalls.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search term for farm name or farmer' },
      },
    },
    execute: async (user, args) => listFarmersPublicService({ search: args.search }),
  },
  {
    id: 'customer.get_products',
    name: 'customer_get_products',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'Search the harvest catalogue for available fresh produce, categories, and prices.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search keyword like "tomatoes", "spinach"' },
        category: { type: 'string', description: 'Category filter' },
      },
    },
    execute: async (user, args) => listProductsPublicService({ search: args.search, category: args.category }),
  },
  {
    id: 'customer.search_dated_stock',
    name: 'customer_search_dated_stock',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'Check available dated inventory, remaining quantities, and pricing for a specific market day.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Market date in YYYY-MM-DD format' },
        marketId: { type: 'string', description: 'Market ID' },
      },
    },
    execute: async (user, args) => {
      const db = getDB();
      const filter = { status: 'available', availableQuantity: { $gt: 0 } };
      if (args.date) filter.date = args.date;
      if (args.marketId) filter.marketId = new ObjectId(args.marketId);
      const offers = await db.collection('stockOffers').find(filter).limit(20).toArray();
      const pIds = offers.map((o) => o.productId);
      const prods = await db.collection('products').find({ _id: { $in: pIds } }).toArray();
      const pMap = new Map(prods.map((p) => [p._id.toString(), p]));
      return offers.map((o) => ({
        offerId: o._id.toString(),
        productName: pMap.get(o.productId.toString())?.name || 'Produce',
        date: o.date,
        availableQuantity: o.availableQuantity,
        unit: o.unit,
        pricePKR: (o.priceMinor / 100).toFixed(0),
      }));
    },
  },
  {
    id: 'customer.get_pickup_windows',
    name: 'customer_get_pickup_windows',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'View scheduled market pickup time windows for stalls.',
    parameters: {
      type: 'object',
      properties: {
        marketId: { type: 'string', description: 'Market ID' },
        date: { type: 'string', description: 'Market date' },
      },
    },
    execute: async (user, args) => listPickupWindowsService(args),
  },
  {
    id: 'customer.get_orders',
    name: 'customer_get_orders',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'Retrieve current customer reservations, orders, items, and status.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Optional status filter: placed, accepted, ready_for_pickup, completed, cancelled' },
      },
    },
    execute: async (user, args) => listCustomerOrdersService(user.id, { status: args.status }),
  },
  {
    id: 'customer.get_order_details',
    name: 'customer_get_order_details',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'Get complete itemized details and pickup instructions for a specific pre-order.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Order ID or order number' },
      },
      required: ['orderId'],
    },
    execute: async (user, args) => getCustomerOrderByIdService(user.id, args.orderId),
  },
  {
    id: 'customer.cancel_order',
    name: 'customer_cancel_order',
    role: 'customer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose cancelling a customer reservation order and releasing reserved produce back to the grower.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Order ID or order number to cancel' },
        reason: { type: 'string', description: 'Reason for cancellation' },
      },
      required: ['orderId'],
    },
    formatDraft: (args, user, context, resolvedOrder) => {
      const orderNum = resolvedOrder?.orderNumber || args.orderId;
      return {
        actionType: 'cancel_order',
        summary: `Cancel order #${orderNum} and release the reserved items back to the farm.`,
        details: { orderId: resolvedOrder?._id?.toString() || args.orderId, orderNumber: orderNum, reason: args.reason || 'Requested via assistant' },
        targetRecords: [resolvedOrder?._id?.toString() || args.orderId],
        payload: { orderId: resolvedOrder?._id?.toString() || args.orderId, reason: args.reason || 'Cancelled via Market Companion' },
      };
    },
    execute: async (user, args) => cancelCustomerOrderService(user.id, args.orderId, args.reason),
  },
  {
    id: 'customer.reorder',
    name: 'customer_reorder',
    role: 'customer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose repeating a past order for an upcoming market pickup date.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Previous order ID to repeat' },
        targetMarketDate: { type: 'string', description: 'Target market date YYYY-MM-DD' },
      },
      required: ['orderId'],
    },
    formatDraft: (args, user, context, resolvedOrder) => {
      const orderNum = resolvedOrder?.orderNumber || args.orderId;
      return {
        actionType: 'reorder_market_items',
        summary: `Reorder produce from order #${orderNum} for upcoming market pickup${args.targetMarketDate ? ` on ${args.targetMarketDate}` : ''}.`,
        details: { orderId: args.orderId, targetMarketDate: args.targetMarketDate },
        payload: args,
      };
    },
    execute: async (user, args) => reorderCustomerOrderService(user.id, args.orderId, { targetMarketDate: args.targetMarketDate }),
  },
  {
    id: 'customer.get_favourites',
    name: 'customer_get_favourites',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'View saved favourite farmers and produce.',
    parameters: { type: 'object', properties: {} },
    execute: async (user) => listFavouritesService(user.id),
  },
  {
    id: 'customer.toggle_favourite',
    name: 'customer_toggle_favourite',
    role: 'customer',
    type: 'write',
    requiresConfirmation: false,
    description: 'Add or remove a farmer or product from customer favourites.',
    parameters: {
      type: 'object',
      properties: {
        targetType: { type: 'string', enum: ['farmer', 'product'] },
        targetId: { type: 'string', description: 'ID of farmer or product' },
        action: { type: 'string', enum: ['add', 'remove'] },
      },
      required: ['targetType', 'targetId'],
    },
    execute: async (user, args) => {
      if (args.action === 'remove') {
        return removeFavouriteService(user.id, args.targetType, args.targetId);
      }
      return addFavouriteService(user.id, { targetType: args.targetType, targetId: args.targetId });
    },
  },
  {
    id: 'customer.get_restock_alerts',
    name: 'customer_get_restock_alerts',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'View active out-of-stock restock notification subscriptions.',
    parameters: { type: 'object', properties: {} },
    execute: async (user) => listRestockAlertsService(user.id),
  },
  {
    id: 'customer.subscribe_restock_alert',
    name: 'customer_subscribe_restock_alert',
    role: 'customer',
    type: 'write',
    requiresConfirmation: false,
    description: 'Subscribe for notification when an out-of-stock produce item is restocked.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID' },
        marketId: { type: 'string', description: 'Market ID' },
      },
      required: ['productId', 'marketId'],
    },
    execute: async (user, args) => createRestockAlertService(user.id, args),
  },
  {
    id: 'customer.get_notifications',
    name: 'customer_get_notifications',
    role: 'customer',
    type: 'read',
    requiresConfirmation: false,
    description: 'View order status notifications and platform alerts.',
    parameters: { type: 'object', properties: {} },
    execute: async (user) => listUserNotifications(user.id),
  },
  {
    id: 'customer.mark_notifications_read',
    name: 'customer_mark_notifications_read',
    role: 'customer',
    type: 'write',
    requiresConfirmation: false,
    description: 'Mark notification(s) as read.',
    parameters: {
      type: 'object',
      properties: {
        notificationId: { type: 'string', description: 'Optional notification ID, or omit to mark all read' },
      },
    },
    execute: async (user, args) => {
      if (args.notificationId) return markNotificationRead(user.id, args.notificationId);
      return markAllNotificationsRead(user.id);
    },
  },
  {
    id: 'customer.submit_review',
    name: 'customer_submit_review',
    role: 'customer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose submitting a review and rating for an order or farmer.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Completed order ID' },
        farmerId: { type: 'string', description: 'Farmer profile ID' },
        rating: { type: 'number', minimum: 1, maximum: 5, description: 'Star rating (1 to 5)' },
        comment: { type: 'string', description: 'Review feedback' },
      },
      required: ['orderId', 'farmerId', 'rating', 'comment'],
    },
    formatDraft: (args) => ({
      actionType: 'submit_customer_review',
      summary: `Submit a ${args.rating}-star review:\n"${args.comment}"`,
      details: args,
      payload: args,
    }),
    execute: async (user, args) => createReviewService(user.id, args),
  },

  // =========================================================================
  // 2. FARMER CAPABILITIES
  // =========================================================================
  {
    id: 'farmer.get_profile',
    name: 'farmer_get_profile',
    role: 'farmer',
    type: 'read',
    requiresConfirmation: false,
    description: 'View authenticated farmer farmstead details, approval status, and stall designation.',
    parameters: { type: 'object', properties: {} },
    execute: async (user) => getFarmerProfileService(user.id),
  },
  {
    id: 'farmer.update_profile',
    name: 'farmer_update_profile',
    role: 'farmer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose updating farm stall location, bio, or contact information.',
    parameters: {
      type: 'object',
      properties: {
        stallNumber: { type: 'string', description: 'Assigned stall pin, e.g. "Stall B-18"' },
        bio: { type: 'string', description: 'Farm description and growing practices' },
        businessName: { type: 'string', description: 'Farm business name' },
      },
    },
    formatDraft: (args) => {
      const parts = [];
      if (args.stallNumber) parts.push(`Stall designation: ${args.stallNumber}`);
      if (args.bio) parts.push(`Bio: "${args.bio}"`);
      if (args.businessName) parts.push(`Farm Name: ${args.businessName}`);
      return {
        actionType: 'update_stall_pin',
        summary: `Update farm details:\n${parts.join('\n')}`,
        details: args,
        payload: args,
      };
    },
    execute: async (user, args) => updateFarmerProfileService(user.id, args),
  },
  {
    id: 'farmer.get_products',
    name: 'farmer_get_products',
    role: 'farmer',
    type: 'read',
    requiresConfirmation: false,
    description: 'List all products in the farmer produce catalogue with base prices and units.',
    parameters: { type: 'object', properties: {} },
    execute: async (user) => {
      const db = getDB();
      const profile = await db.collection('farmerProfiles').findOne({ userId: new ObjectId(user.id) });
      if (!profile) return [];
      return listFarmerProductsService(profile._id.toString());
    },
  },
  {
    id: 'farmer.create_products',
    name: 'farmer_create_products',
    role: 'farmer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose adding one or more new produce items to the farmer catalogue with name, selling unit, price in PKR, category, and appetizing description.',
    parameters: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Produce name, e.g. "Heirloom Tomatoes"' },
              unit: { type: 'string', enum: ['kg', 'g', 'bunch', 'box', 'dozen', 'litre', 'item'], description: 'Selling unit' },
              pricePKR: { type: 'number', description: 'Price in PKR' },
              category: { type: 'string', description: 'Category name, e.g. "Fresh Vegetables"' },
              description: { type: 'string', description: 'Authentic harvest description' },
            },
            required: ['name', 'unit', 'pricePKR'],
          },
        },
      },
      required: ['products'],
    },
    formatDraft: (args) => {
      const prods = (args.products || []).map((p) => {
        const name = normalizeProduceName(p.name);
        return {
          name,
          unit: p.unit || 'kg',
          pricePKR: Math.max(10, Math.round(Number(p.pricePKR) || 100)),
          category: p.category || (name.toLowerCase().includes('fruit') || name.toLowerCase().includes('apple') || name.toLowerCase().includes('banana') || name.toLowerCase().includes('orange') || name.toLowerCase().includes('strawberr') ? 'Orchard Fruits' : 'Fresh Vegetables'),
          description: p.description?.trim() || naturalProduceDescription(name),
        };
      });
      return {
        actionType: 'create_products',
        summary: `Add ${prods.length} produce item(s) to catalogue:\n` + prods.map((p, i) => `${i + 1}. ${p.name} — Rs. ${p.pricePKR}/${p.unit}\n   "${p.description}"`).join('\n'),
        details: { products: prods },
        payload: { products: prods },
      };
    },
    execute: async (user, args) => {
      const db = getDB();
      const profile = await db.collection('farmerProfiles').findOne({ userId: new ObjectId(user.id) });
      if (!profile) throw new Error('Farmer profile not found.');

      const defaultCategory = await db.collection('categories').findOne({});
      const defaultCatId = defaultCategory ? defaultCategory._id.toString() : '66f300000000000000000001';

      const results = [];
      for (const p of args.products) {
        const res = await createFarmerProductService(profile._id.toString(), {
          name: normalizeProduceName(p.name),
          description: p.description || naturalProduceDescription(p.name),
          categoryId: defaultCatId,
          unit: p.unit || 'kg',
          basePriceMinor: Math.round(Number(p.pricePKR) * 100),
          currency: 'PKR',
        });
        results.push(res);
      }
      return results;
    },
  },
  {
    id: 'farmer.update_product',
    name: 'farmer_update_product',
    role: 'farmer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose updating an existing catalogue produce price, unit, name, or description.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID or name' },
        name: { type: 'string', description: 'Updated name' },
        pricePKR: { type: 'number', description: 'Updated price in PKR' },
        unit: { type: 'string', enum: ['kg', 'g', 'bunch', 'box', 'dozen', 'litre', 'item'] },
        description: { type: 'string', description: 'Updated description' },
      },
      required: ['productId'],
    },
    formatDraft: (args, user, context, resolvedProd) => {
      const pName = resolvedProd?.name || args.name || 'Produce';
      const parts = [];
      if (args.pricePKR) parts.push(`Price: Rs. ${args.pricePKR}/${args.unit || resolvedProd?.unit || 'kg'}`);
      if (args.description) parts.push(`Description: "${args.description}"`);
      if (args.name) parts.push(`Name: ${args.name}`);
      return {
        actionType: 'edit_saved_product',
        summary: `Update produce "${pName}":\n${parts.join('\n')}`,
        details: { productId: resolvedProd?._id?.toString() || args.productId, ...args },
        targetRecords: [resolvedProd?._id?.toString() || args.productId],
        payload: {
          productId: resolvedProd?._id?.toString() || args.productId,
          updates: {
            ...(args.name ? { name: args.name } : {}),
            ...(args.pricePKR ? { basePriceMinor: Math.round(args.pricePKR * 100) } : {}),
            ...(args.unit ? { unit: args.unit } : {}),
            ...(args.description ? { description: args.description } : {}),
          },
        },
      };
    },
    execute: async (user, args) => {
      const db = getDB();
      const profile = await db.collection('farmerProfiles').findOne({ userId: new ObjectId(user.id) });
      if (!profile) throw new Error('Farmer profile not found.');
      return updateFarmerProductService(profile._id.toString(), args.productId, args.updates || {
        ...(args.name ? { name: args.name } : {}),
        ...(args.pricePKR ? { basePriceMinor: Math.round(args.pricePKR * 100) } : {}),
        ...(args.unit ? { unit: args.unit } : {}),
        ...(args.description ? { description: args.description } : {}),
      });
    },
  },
  {
    id: 'farmer.archive_product',
    name: 'farmer_archive_product',
    role: 'farmer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose archiving/discontinuing a produce item from the catalogue.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID or name' },
      },
      required: ['productId'],
    },
    formatDraft: (args, user, context, resolvedProd) => ({
      actionType: 'archive_product',
      summary: `Archive product "${resolvedProd?.name || args.productId}" from active catalogue.`,
      details: { productId: resolvedProd?._id?.toString() || args.productId },
      targetRecords: [resolvedProd?._id?.toString() || args.productId],
      payload: { productId: resolvedProd?._id?.toString() || args.productId },
    }),
    execute: async (user, args) => {
      const db = getDB();
      const profile = await db.collection('farmerProfiles').findOne({ userId: new ObjectId(user.id) });
      if (!profile) throw new Error('Farmer profile not found.');
      return archiveFarmerProductService(profile._id.toString(), args.productId);
    },
  },
  {
    id: 'farmer.get_inventory',
    name: 'farmer_get_inventory',
    role: 'farmer',
    type: 'read',
    requiresConfirmation: false,
    description: 'View active dated stock offers, published vs reserved quantities.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Market date YYYY-MM-DD' },
      },
    },
    execute: async (user, args) => {
      const db = getDB();
      const profile = await db.collection('farmerProfiles').findOne({ userId: new ObjectId(user.id) });
      if (!profile) return [];
      return listStockOffersService(profile._id.toString(), args);
    },
  },
  {
    id: 'farmer.publish_dated_stock',
    name: 'farmer_publish_dated_stock',
    role: 'farmer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose allocating harvest inventory for an upcoming market date (e.g. 50 kg tomatoes for Saturday).',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID or produce name' },
        date: { type: 'string', description: 'Market date in YYYY-MM-DD' },
        totalQuantity: { type: 'number', description: 'Total quantity available for pre-order' },
        pricePKR: { type: 'number', description: 'Market day price in PKR' },
        unit: { type: 'string', description: 'Selling unit' },
      },
      required: ['productId', 'date', 'totalQuantity'],
    },
    formatDraft: (args, user, context, resolvedProd) => {
      const pName = resolvedProd?.name || args.productId;
      const unit = args.unit || resolvedProd?.unit || 'kg';
      const priceText = args.pricePKR ? ` at Rs. ${args.pricePKR}/${unit}` : '';
      return {
        actionType: 'publish_dated_stock',
        summary: `Allocate ${args.totalQuantity} ${unit} of "${pName}" for market day ${args.date}${priceText}.`,
        details: { productId: resolvedProd?._id?.toString() || args.productId, productName: pName, ...args },
        payload: {
          productId: resolvedProd?._id?.toString() || args.productId,
          date: args.date,
          totalQuantity: args.totalQuantity,
          priceMinor: args.pricePKR ? Math.round(args.pricePKR * 100) : (resolvedProd?.basePriceMinor || 15000),
          unit,
        },
      };
    },
    execute: async (user, args) => {
      const db = getDB();
      const profile = await db.collection('farmerProfiles').findOne({ userId: new ObjectId(user.id) });
      if (!profile) throw new Error('Farmer profile not found.');
      const marketId = profile.marketIds?.[0]?.toString() || '66f200000000000000000001';
      return createOrUpdateStockOfferService(profile._id.toString(), {
        productId: args.productId,
        marketId,
        date: args.date,
        totalQuantity: args.totalQuantity,
        priceMinor: args.priceMinor || Math.round((args.pricePKR || 150) * 100),
        unit: args.unit || 'kg',
      });
    },
  },
  {
    id: 'farmer.mark_sold_out',
    name: 'farmer_mark_sold_out',
    role: 'farmer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose marking a product or stock allocation as sold out to halt new reservations.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID or produce name' },
      },
      required: ['productId'],
    },
    formatDraft: (args, user, context, resolvedProd) => ({
      actionType: 'mark_sold_out',
      summary: `Mark "${resolvedProd?.name || args.productId}" as sold out.`,
      details: { productId: resolvedProd?._id?.toString() || args.productId },
      payload: { productId: resolvedProd?._id?.toString() || args.productId },
    }),
    execute: async (user, args) => {
      const db = getDB();
      const profile = await db.collection('farmerProfiles').findOne({ userId: new ObjectId(user.id) });
      if (!profile) throw new Error('Farmer profile not found.');
      const offer = await db.collection('stockOffers').findOne({
        farmerId: profile._id,
        productId: new ObjectId(args.productId),
        status: 'available',
      });
      if (offer) {
        return updateStockOfferStatusService(profile._id.toString(), offer._id.toString(), 'sold_out');
      }
      return { status: 'sold_out' };
    },
  },
  {
    id: 'farmer.get_orders',
    name: 'farmer_get_orders',
    role: 'farmer',
    type: 'read',
    requiresConfirmation: false,
    description: 'View customer pre-orders placed for the farm, filterable by status or date.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['placed', 'accepted', 'ready_for_pickup', 'completed', 'declined', 'cancelled'] },
        marketDate: { type: 'string', description: 'Market date filter YYYY-MM-DD' },
      },
    },
    execute: async (user, args) => listFarmerOrdersService(user.id, args),
  },
  {
    id: 'farmer.update_order_status',
    name: 'farmer_update_order_status',
    role: 'farmer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose updating an order status: accept, decline (releases reserved stock), mark ready for pickup, or complete pickup.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Order ID or order number' },
        nextStatus: { type: 'string', enum: ['accepted', 'declined', 'ready_for_pickup', 'completed'] },
        reason: { type: 'string', description: 'Reason (required when declining)' },
      },
      required: ['orderId', 'nextStatus'],
    },
    formatDraft: (args, user, context, resolvedOrder) => {
      const statusLabels = {
        accepted: 'Accept reservation',
        declined: 'Decline reservation and release stock',
        ready_for_pickup: 'Mark packed and ready for pickup',
        completed: 'Complete order and record payment',
      };
      const orderNum = resolvedOrder?.orderNumber || args.orderId;
      return {
        actionType: 'update_farmer_order_status',
        summary: `${statusLabels[args.nextStatus] || args.nextStatus} for order #${orderNum}.`,
        details: { orderId: resolvedOrder?._id?.toString() || args.orderId, orderNumber: orderNum, ...args },
        payload: {
          orderId: resolvedOrder?._id?.toString() || args.orderId,
          nextStatus: args.nextStatus,
          reason: args.reason || '',
        },
      };
    },
    execute: async (user, args) => updateFarmerOrderStatusService(user.id, args.orderId, args.nextStatus, args.reason),
  },
  {
    id: 'farmer.get_reviews',
    name: 'farmer_get_reviews',
    role: 'farmer',
    type: 'read',
    requiresConfirmation: false,
    description: 'View customer reviews, ratings, and existing responses for the farm.',
    parameters: { type: 'object', properties: {} },
    execute: async (user) => getFarmerReviewsService(user.id),
  },
  {
    id: 'farmer.reply_to_review',
    name: 'farmer_reply_to_review',
    role: 'farmer',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose publishing an official farm reply to a customer review.',
    parameters: {
      type: 'object',
      properties: {
        reviewId: { type: 'string', description: 'Review ID' },
        replyText: { type: 'string', description: 'Reply text to publish' },
      },
      required: ['reviewId', 'replyText'],
    },
    formatDraft: (args) => ({
      actionType: 'reply_to_review',
      summary: `Publish reply to review:\n"${args.replyText}"`,
      details: args,
      payload: args,
    }),
    execute: async (user, args) => replyToReviewService(user.id, args.reviewId, args.replyText),
  },
  {
    id: 'farmer.get_reports',
    name: 'farmer_get_reports',
    role: 'farmer',
    type: 'read',
    requiresConfirmation: false,
    description: 'Retrieve financial metrics: booked order values, collected payments, and sales volume.',
    parameters: { type: 'object', properties: {} },
    execute: async (user) => getFarmerReportsService(user.id),
  },

  // =========================================================================
  // 3. ADMIN CAPABILITIES
  // =========================================================================
  {
    id: 'admin.get_farmers',
    name: 'admin_get_farmers',
    role: 'admin',
    type: 'read',
    requiresConfirmation: false,
    description: 'List registered farmers and filter by status: pending, approved, suspended.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'approved', 'suspended'] },
        search: { type: 'string', description: 'Search by farm or name' },
      },
    },
    execute: async (user, args) => listFarmersForAdminService(args),
  },
  {
    id: 'admin.change_farmer_status',
    name: 'admin_change_farmer_status',
    role: 'admin',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose changing farmer approval state: approve pending applicant, suspend, or reactivate.',
    parameters: {
      type: 'object',
      properties: {
        farmerId: { type: 'string', description: 'Farmer profile ID or farm name' },
        newStatus: { type: 'string', enum: ['approved', 'suspended', 'pending'] },
        reason: { type: 'string', description: 'Operational reason' },
      },
      required: ['farmerId', 'newStatus'],
    },
    formatDraft: (args, user, context, resolvedFarmer) => {
      const fName = resolvedFarmer?.businessName || resolvedFarmer?.contactPerson || args.farmerId;
      const statusAction = {
        approved: 'Approve farmer registration for',
        suspended: 'Suspend farmer account for',
        pending: 'Place in pending review state for',
      };
      return {
        actionType: 'change_farmer_status',
        summary: `${statusAction[args.newStatus] || 'Change status to ' + args.newStatus} "${fName}".${args.reason ? ` Reason: ${args.reason}` : ''}`,
        details: { farmerId: resolvedFarmer?.id || args.farmerId, farmerName: fName, ...args },
        targetRecords: [resolvedFarmer?.id || args.farmerId],
        payload: {
          farmerId: resolvedFarmer?.id || args.farmerId,
          newStatus: args.newStatus,
          reason: args.reason || '',
        },
      };
    },
    execute: async (user, args) => updateFarmerApprovalService(args.farmerId, args.newStatus, user.id, args.reason),
  },
  {
    id: 'admin.get_customers',
    name: 'admin_get_customers',
    role: 'admin',
    type: 'read',
    requiresConfirmation: false,
    description: 'List registered customer accounts, activity, and pre-order metrics.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search customer name/email' },
      },
    },
    execute: async (user, args) => listCustomersAdminService(args),
  },
  {
    id: 'admin.get_markets',
    name: 'admin_get_markets',
    role: 'admin',
    type: 'read',
    requiresConfirmation: false,
    description: 'List platform farmers markets, operating schedules, and stall capacities.',
    parameters: { type: 'object', properties: {} },
    execute: async () => listMarketsService({}),
  },
  {
    id: 'admin.create_market',
    name: 'admin_create_market',
    role: 'admin',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose creating a new farmers market location with schedule and operating hours.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Market name, e.g. "Model Town Farmers Market"' },
        city: { type: 'string', description: 'City' },
        address: { type: 'string', description: 'Street address' },
        operatingDays: { type: 'array', items: { type: 'string' } },
        operatingHours: { type: 'string', description: 'e.g. "08:00 - 14:00"' },
      },
      required: ['name', 'city', 'address', 'operatingDays'],
    },
    formatDraft: (args) => ({
      actionType: 'create_market',
      summary: `Create new farmers market "${args.name}" in ${args.city} (${args.operatingDays.join(', ')}).`,
      details: args,
      payload: args,
    }),
    execute: async (user, args) => createMarketService(user.id, args),
  },
  {
    id: 'admin.update_market',
    name: 'admin_update_market',
    role: 'admin',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose updating an existing market schedule, operating days, or active status.',
    parameters: {
      type: 'object',
      properties: {
        marketId: { type: 'string', description: 'Market ID' },
        isActive: { type: 'boolean', description: 'Market open/closed flag' },
        operatingDays: { type: 'array', items: { type: 'string' } },
        operatingHours: { type: 'string' },
      },
      required: ['marketId'],
    },
    formatDraft: (args, user, context, resolvedMarket) => ({
      actionType: 'update_market',
      summary: `Update market settings for "${resolvedMarket?.name || args.marketId}".`,
      details: args,
      payload: args,
    }),
    execute: async (user, args) => updateMarketService(user.id, args.marketId, args),
  },
  {
    id: 'admin.get_products',
    name: 'admin_get_products',
    role: 'admin',
    type: 'read',
    requiresConfirmation: false,
    description: 'Audit listed produce across all farmers on the platform.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
      },
    },
    execute: async (user, args) => listProductsAdminService(args),
  },
  {
    id: 'admin.moderate_product',
    name: 'admin_moderate_product',
    role: 'admin',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose moderating or hiding an inappropriate or non-compliant product listing.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID' },
        status: { type: 'string', enum: ['approved', 'rejected', 'flagged'] },
        reason: { type: 'string', description: 'Moderation rationale' },
      },
      required: ['productId', 'status'],
    },
    formatDraft: (args) => ({
      actionType: 'moderate_product',
      summary: `Set product moderation status to ${args.status}${args.reason ? ` (${args.reason})` : ''}.`,
      details: args,
      payload: args,
    }),
    execute: async (user, args) => moderateProductAdminService(user.id, args.productId, { status: args.status, moderationReason: args.reason }),
  },
  {
    id: 'admin.get_categories',
    name: 'admin_get_categories',
    role: 'admin',
    type: 'read',
    requiresConfirmation: false,
    description: 'List produce categories.',
    parameters: { type: 'object', properties: {} },
    execute: async () => listCategoriesService(),
  },
  {
    id: 'admin.create_category',
    name: 'admin_create_category',
    role: 'admin',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose creating a new produce category.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Category name, e.g. "Artisanal Dairy"' },
        description: { type: 'string', description: 'Description' },
      },
      required: ['name'],
    },
    formatDraft: (args) => ({
      actionType: 'create_category',
      summary: `Create new category "${args.name}".`,
      details: args,
      payload: args,
    }),
    execute: async (user, args) => createCategoryService(user.id, args),
  },
  {
    id: 'admin.get_reviews',
    name: 'admin_get_reviews',
    role: 'admin',
    type: 'read',
    requiresConfirmation: false,
    description: 'Inspect reviews queue for moderation.',
    parameters: { type: 'object', properties: {} },
    execute: async () => listAdminReviewsService(),
  },
  {
    id: 'admin.moderate_review',
    name: 'admin_moderate_review',
    role: 'admin',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose moderating or deleting a flagged customer review.',
    parameters: {
      type: 'object',
      properties: {
        reviewId: { type: 'string', description: 'Review ID' },
        action: { type: 'string', enum: ['approved', 'hidden', 'delete'] },
        reason: { type: 'string' },
      },
      required: ['reviewId', 'action'],
    },
    formatDraft: (args) => ({
      actionType: 'moderate_review',
      summary: `${args.action === 'delete' ? 'Permanently delete' : 'Set status to ' + args.action} for review #${args.reviewId}.`,
      details: args,
      payload: args,
    }),
    execute: async (user, args) => {
      if (args.action === 'delete') return deleteReviewService(args.reviewId);
      return moderateReviewService(args.reviewId, args.action, args.reason);
    },
  },
  {
    id: 'admin.get_announcements',
    name: 'admin_get_announcements',
    role: 'admin',
    type: 'read',
    requiresConfirmation: false,
    description: 'List platform announcements.',
    parameters: { type: 'object', properties: {} },
    execute: async () => listAllAnnouncementsAdminService(),
  },
  {
    id: 'admin.publish_announcement',
    name: 'admin_publish_announcement',
    role: 'admin',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose broadcasting a platform notice to customers and farmers.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Announcement title' },
        message: { type: 'string', description: 'Announcement body' },
        type: { type: 'string', enum: ['general', 'market_alert', 'schedule_change'] },
      },
      required: ['title', 'message'],
    },
    formatDraft: (args) => ({
      actionType: 'publish_announcement',
      summary: `Broadcast announcement "${args.title}":\n"${args.message}"`,
      details: args,
      payload: args,
    }),
    execute: async (user, args) => createAnnouncementService(user.id, args),
  },
  {
    id: 'admin.get_inquiries',
    name: 'admin_get_inquiries',
    role: 'admin',
    type: 'read',
    requiresConfirmation: false,
    description: 'List public support and contact inquiries.',
    parameters: { type: 'object', properties: {} },
    execute: async () => listInquiriesAdminService(),
  },
  {
    id: 'admin.update_inquiry_status',
    name: 'admin_update_inquiry_status',
    role: 'admin',
    type: 'write',
    requiresConfirmation: true,
    description: 'Propose updating a support inquiry resolution status.',
    parameters: {
      type: 'object',
      properties: {
        inquiryId: { type: 'string', description: 'Inquiry ID' },
        status: { type: 'string', enum: ['new', 'in_progress', 'resolved'] },
        adminNotes: { type: 'string' },
      },
      required: ['inquiryId', 'status'],
    },
    formatDraft: (args) => ({
      actionType: 'update_inquiry_status',
      summary: `Set inquiry status to ${args.status}.`,
      details: args,
      payload: args,
    }),
    execute: async (user, args) => updateInquiryStatusAdminService(args.inquiryId, { status: args.status, adminNotes: args.adminNotes }),
  },
  {
    id: 'admin.get_analytics',
    name: 'admin_get_analytics',
    role: 'admin',
    type: 'read',
    requiresConfirmation: false,
    description: 'Retrieve platform analytics overview: GMV, customer count, order volumes.',
    parameters: { type: 'object', properties: {} },
    execute: async () => getPlatformAnalyticsAdminService(),
  },
];

/**
 * Get capabilities allowed for a role
 */
export function getCapabilitiesForRole(role) {
  return CAPABILITIES.filter((c) => c.role === role);
}

/**
 * Get OpenAI Function Tools for a role
 */
export function getOpenAiToolsForRole(role) {
  return getCapabilitiesForRole(role).map((c) => ({
    type: 'function',
    function: {
      name: c.name,
      description: c.description,
      parameters: c.parameters,
    },
  }));
}

/**
 * Find capability by function name or id
 */
export function findCapability(nameOrId) {
  return CAPABILITIES.find((c) => c.name === nameOrId || c.id === nameOrId);
}
