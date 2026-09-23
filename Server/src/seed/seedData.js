import { ObjectId } from 'mongodb';
import { hashPassword } from '../utils/token.js';
import { env } from '../config/env.js';

/**
 * Realistic Lahore-based DEVELOPMENT Demonstration Seed Dataset.
 * Clearly marked as demonstration data; not affiliated with real commercial entities.
 */
export async function generateSeedData() {
  const commonPassword = 'Password123!';
  const defaultHash = await hashPassword(commonPassword);
  const adminHash = await hashPassword('Admin123!');
  const farmerHash = await hashPassword('Farmer123!');
  const customerHash = await hashPassword('Customer123!');

  const now = new Date();
  const currency = env.DEFAULT_CURRENCY;
  const timezone = env.DEFAULT_TIMEZONE;

  // 1. User IDs
  const adminId = new ObjectId('66f000000000000000000001');
  const farmerGreenfieldUserId = new ObjectId('66f000000000000000000002');
  const farmerIndusUserId = new ObjectId('66f000000000000000000003');
  const farmerPendingUserId = new ObjectId('66f000000000000000000004');
  const customerSarahId = new ObjectId('66f000000000000000000005');
  const customerBilalId = new ObjectId('66f000000000000000000006');

  // Farmer Profile IDs
  const greenfieldProfileId = new ObjectId('66f100000000000000000001');
  const indusProfileId = new ObjectId('66f100000000000000000002');
  const pendingProfileId = new ObjectId('66f100000000000000000003');

  // Market IDs
  const marketModelTownId = new ObjectId('66f200000000000000000001');
  const marketGulbergId = new ObjectId('66f200000000000000000002');
  const marketDhaId = new ObjectId('66f200000000000000000003');

  // Category IDs
  const catVegId = new ObjectId('66f300000000000000000001');
  const catFruitId = new ObjectId('66f300000000000000000002');
  const catDairyId = new ObjectId('66f300000000000000000003');
  const catPantryId = new ObjectId('66f300000000000000000004');

  // Product IDs
  const prodTomatoesId = new ObjectId('66f400000000000000000001');
  const prodSpinachId = new ObjectId('66f400000000000000000002');
  const prodCucumbersId = new ObjectId('66f400000000000000000003');
  const prodStrawberriesId = new ObjectId('66f400000000000000000004');
  const prodHoneyId = new ObjectId('66f400000000000000000005');

  // Pickup Window IDs
  const pwSlot1Id = new ObjectId('66f500000000000000000001');
  const pwSlot2Id = new ObjectId('66f500000000000000000002');

  // Stock Offer IDs
  const offerTomatoesId = new ObjectId('66f600000000000000000001');
  const offerSpinachId = new ObjectId('66f600000000000000000002');
  const offerCucumbersId = new ObjectId('66f600000000000000000003');
  const offerStrawberriesId = new ObjectId('66f600000000000000000004');
  const offerHoneyId = new ObjectId('66f600000000000000000005');

  // --- 1. USERS ---
  const users = [
    {
      _id: adminId,
      email: 'admin@marketlink.com',
      passwordHash: adminHash,
      role: 'admin',
      name: 'System Administrator (Demo)',
      phone: '+923000000001',
      address: 'MarketLink Command HQ, Lahore',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: farmerGreenfieldUserId,
      email: 'farmer.greenfield@marketlink.com',
      passwordHash: farmerHash,
      role: 'farmer',
      name: 'Tariq Mahmood (Demo Farmer)',
      phone: '+923005550101',
      address: 'Greenfield Farmstead, Bedian Road, Lahore',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: farmerIndusUserId,
      email: 'farmer.indus@marketlink.com',
      passwordHash: farmerHash,
      role: 'farmer',
      name: 'Khurram Shahzad (Demo Farmer)',
      phone: '+923005550102',
      address: 'Indus Agro Fields, Multan Road, Lahore',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: farmerPendingUserId,
      email: 'farmer.pending@marketlink.com',
      passwordHash: farmerHash,
      role: 'farmer',
      name: 'Rashid Minhas (Demo Applicant)',
      phone: '+923005550103',
      address: 'Margalla Dairy Farm, Rawat Area',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: customerSarahId,
      email: 'customer.sarah@marketlink.com',
      passwordHash: customerHash,
      role: 'customer',
      name: 'Sarah Ahmed (Demo Customer)',
      phone: '+923214440201',
      address: 'House 42, Block C, Model Town, Lahore',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: customerBilalId,
      email: 'customer.bilal@marketlink.com',
      passwordHash: customerHash,
      role: 'customer',
      name: 'Bilal Khan (Demo Customer)',
      phone: '+923214440202',
      address: 'Sector J, Phase 5, DHA, Lahore',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // --- 2. FARMER PROFILES ---
  const farmerProfiles = [
    {
      _id: greenfieldProfileId,
      userId: farmerGreenfieldUserId,
      businessName: 'Greenfield Farm Produce (Demo)',
      contactPerson: 'Tariq Mahmood',
      phone: '+923005550101',
      email: 'farmer.greenfield@marketlink.com',
      address: 'Bedian Road, Near BRB Canal, Lahore',
      bio: 'Family-run farm cultivating heirloom tomatoes, crunchy salad greens, and seasonal vegetables without synthetic sprays.',
      profileImageUrl: '',
      stallCoordinates: { type: 'Point', coordinates: [74.3216, 31.4824] },
      approvalStatus: 'approved',
      approvedAt: now,
      approvedBy: adminId,
      marketIds: [marketModelTownId, marketGulbergId],
      operatingDays: [6, 0],
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: indusProfileId,
      userId: farmerIndusUserId,
      businessName: 'Indus Valley Harvest (Demo)',
      contactPerson: 'Khurram Shahzad',
      phone: '+923005550102',
      email: 'farmer.indus@marketlink.com',
      address: 'Changa Manga Outskirts, Multan Road, Lahore',
      bio: 'Specialising in seasonal berries, artisan berry honey, and fresh orchard produce.',
      profileImageUrl: '',
      stallCoordinates: { type: 'Point', coordinates: [74.3218, 31.482] },
      approvalStatus: 'approved',
      approvedAt: now,
      approvedBy: adminId,
      marketIds: [marketModelTownId],
      operatingDays: [6],
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: pendingProfileId,
      userId: farmerPendingUserId,
      businessName: 'Margalla Valley Fresh (Demo - Pending)',
      contactPerson: 'Rashid Minhas',
      phone: '+923005550103',
      email: 'farmer.pending@marketlink.com',
      address: 'Rawat Outskirts, GT Road',
      bio: 'Artisan dairy and raw honey awaiting platform verification.',
      profileImageUrl: '',
      stallCoordinates: null,
      approvalStatus: 'pending',
      approvedAt: null,
      approvedBy: null,
      marketIds: [],
      operatingDays: [],
      createdAt: now,
      updatedAt: now,
    },
  ];

  // --- 3. MARKETS ---
  const markets = [
    {
      _id: marketModelTownId,
      name: 'Model Town Community Market (Demo)',
      address: 'Central Park Area, Model Town, Lahore',
      timezone,
      coordinates: { type: 'Point', coordinates: [74.3214, 31.4822] },
      operatingDays: [6], // Saturday
      operatingHours: { open: '08:00', close: '13:00' },
      mapProvider: 'google',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: marketGulbergId,
      name: 'Gulberg Weekend Bazaar (Demo)',
      address: 'Main Boulevard, Gulberg III, Lahore',
      timezone,
      coordinates: { type: 'Point', coordinates: [74.3587, 31.5204] },
      operatingDays: [6, 0], // Saturday & Sunday
      operatingHours: { open: '08:30', close: '14:00' },
      mapProvider: 'google',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: marketDhaId,
      name: 'DHA Phase 3 Fresh Market (Demo)',
      address: 'Sector Y Commercial Area, DHA Phase 3, Lahore',
      timezone,
      coordinates: { type: 'Point', coordinates: [74.3775, 31.4707] },
      operatingDays: [0], // Sunday
      operatingHours: { open: '08:00', close: '13:30' },
      mapProvider: 'google',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // --- 4. CATEGORIES ---
  const categories = [
    {
      _id: catVegId,
      name: 'Fresh Vegetables',
      slug: 'fresh-vegetables',
      description: 'Locally grown seasonal greens, roots, and field produce.',
      icon: 'carrot',
      isActive: true,
    },
    {
      _id: catFruitId,
      name: 'Orchard Fruits',
      slug: 'orchard-fruits',
      description: 'Handpicked seasonal tree fruits and fresh berries.',
      icon: 'apple',
      isActive: true,
    },
    {
      _id: catDairyId,
      name: 'Dairy & Farm Fresh',
      slug: 'dairy-farm-fresh',
      description: 'Farm raw milk, artisanal paneer, and free-range eggs.',
      icon: 'egg',
      isActive: true,
    },
    {
      _id: catPantryId,
      name: 'Farm Pantry & Honey',
      slug: 'farm-pantry-honey',
      description: 'Pure raw honey, preserved sun-dried produce, and stone-ground grains.',
      icon: 'jar',
      isActive: true,
    },
  ];

  // --- 5. PRODUCTS ---
  const products = [
    {
      _id: prodTomatoesId,
      farmerId: greenfieldProfileId,
      name: 'Heirloom Beefsteak Tomatoes (Demo)',
      description: 'Vine-ripened heritage beefsteak tomatoes with rich, sweet flavour. Harvested early morning.',
      categoryId: catVegId,
      unit: 'kg',
      basePriceMinor: 35000, // Rs. 350/kg
      currency,
      imageUrl: '/placeholder-tomatoes.webp',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: prodSpinachId,
      farmerId: greenfieldProfileId,
      name: 'Fresh Desi Palak / Spinach (Demo)',
      description: 'Tender dark green leaves, washed and bundled fresh from the field.',
      categoryId: catVegId,
      unit: 'bunch',
      basePriceMinor: 8000, // Rs. 80/bunch
      currency,
      imageUrl: '/placeholder-spinach.webp',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: prodCucumbersId,
      farmerId: greenfieldProfileId,
      name: 'Crisp Salad Cucumbers (Demo)',
      description: 'Crunchy, naturally sweet cucumbers ideal for fresh summer salads.',
      categoryId: catVegId,
      unit: 'kg',
      basePriceMinor: 15000, // Rs. 150/kg
      currency,
      imageUrl: '/placeholder-cucumbers.webp',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: prodStrawberriesId,
      farmerId: indusProfileId,
      name: 'Fresh Field Strawberries (Demo)',
      description: 'Fragrant sweet strawberries packed in recyclable cardboard punnets.',
      categoryId: catFruitId,
      unit: 'box',
      basePriceMinor: 45000, // Rs. 450/box
      currency,
      imageUrl: '/placeholder-strawberries.webp',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: prodHoneyId,
      farmerId: indusProfileId,
      name: 'Pure Sidr / Berry Raw Honey (Demo)',
      description: 'Unprocessed, cold-extracted honey collected from wild blossom fields.',
      categoryId: catPantryId,
      unit: 'item',
      basePriceMinor: 125000, // Rs. 1250/jar
      currency,
      imageUrl: '/placeholder-honey.webp',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Target Demo Date: Next Saturday (2026-09-26)
  const targetDate = '2026-09-26';
  const cutoffTime = new Date('2026-09-26T02:00:00.000Z');

  // --- 6. PICKUP WINDOWS ---
  const pickupWindows = [
    {
      _id: pwSlot1Id,
      farmerId: greenfieldProfileId,
      marketId: marketModelTownId,
      date: targetDate,
      startTime: '08:30',
      endTime: '10:00',
      cutoffAt: cutoffTime,
      maxCapacity: 25,
      currentReservations: 1,
    },
    {
      _id: pwSlot2Id,
      farmerId: greenfieldProfileId,
      marketId: marketModelTownId,
      date: targetDate,
      startTime: '10:00',
      endTime: '11:30',
      cutoffAt: cutoffTime,
      maxCapacity: 25,
      currentReservations: 2,
    },
  ];

  // --- 7. STOCK OFFERS (Dated Active Allocations) ---
  const stockOffers = [
    {
      _id: offerTomatoesId,
      farmerId: greenfieldProfileId,
      marketId: marketModelTownId,
      productId: prodTomatoesId,
      date: targetDate,
      priceMinor: 35000,
      currency,
      unit: 'kg',
      totalQuantity: 50,
      reservedQuantity: 3,
      availableQuantity: 47,
      status: 'available',
      version: 1,
    },
    {
      _id: offerSpinachId,
      farmerId: greenfieldProfileId,
      marketId: marketModelTownId,
      productId: prodSpinachId,
      date: targetDate,
      priceMinor: 8000,
      currency,
      unit: 'bunch',
      totalQuantity: 30,
      reservedQuantity: 2,
      availableQuantity: 28,
      status: 'available',
      version: 1,
    },
    {
      _id: offerCucumbersId,
      farmerId: greenfieldProfileId,
      marketId: marketModelTownId,
      productId: prodCucumbersId,
      date: targetDate,
      priceMinor: 15000,
      currency,
      unit: 'kg',
      totalQuantity: 35,
      reservedQuantity: 0,
      availableQuantity: 35,
      status: 'available',
      version: 1,
    },
    {
      _id: offerStrawberriesId,
      farmerId: indusProfileId,
      marketId: marketModelTownId,
      productId: prodStrawberriesId,
      date: targetDate,
      priceMinor: 45000,
      currency,
      unit: 'box',
      totalQuantity: 25,
      reservedQuantity: 4,
      availableQuantity: 21,
      status: 'available',
      version: 1,
    },
    {
      _id: offerHoneyId,
      farmerId: indusProfileId,
      marketId: marketModelTownId,
      productId: prodHoneyId,
      date: targetDate,
      priceMinor: 125000,
      currency,
      unit: 'item',
      totalQuantity: 15,
      reservedQuantity: 1,
      availableQuantity: 14,
      status: 'available',
      version: 1,
    },
  ];

  // --- 8. DEMO ORDERS (Completed historical & upcoming placed) ---
  const orderCompletedId = new ObjectId('66f700000000000000000001');
  const orderActiveId = new ObjectId('66f700000000000000000002');

  const orders = [
    {
      _id: orderCompletedId,
      orderNumber: 'ML-26-8901',
      checkoutGroupId: 'grp_001',
      customerId: customerSarahId,
      farmerId: greenfieldProfileId,
      marketId: marketModelTownId,
      pickupWindowId: pwSlot1Id,
      pickupDate: '2026-09-19',
      pickupTimeSlot: '08:30 - 10:00',
      cutoffAt: new Date('2026-09-19T02:00:00.000Z'),
      lines: [
        {
          productId: prodTomatoesId,
          stockOfferId: offerTomatoesId,
          productNameSnapshot: 'Heirloom Beefsteak Tomatoes (Demo)',
          unitSnapshot: 'kg',
          unitPriceMinorSnapshot: 35000,
          quantity: 2,
          lineTotalMinor: 70000,
        },
      ],
      totalAmountMinor: 70000,
      currency,
      status: 'completed',
      statusHistory: [
        { status: 'placed', changedAt: new Date('2026-09-18T10:00:00Z'), changedBy: customerSarahId, reason: 'Initial pre-order' },
        { status: 'accepted', changedAt: new Date('2026-09-18T11:00:00Z'), changedBy: farmerGreenfieldUserId, reason: 'Order confirmed' },
        { status: 'ready_for_pickup', changedAt: new Date('2026-09-19T08:00:00Z'), changedBy: farmerGreenfieldUserId, reason: 'Produce packed at stall' },
        { status: 'completed', changedAt: new Date('2026-09-19T09:15:00Z'), changedBy: farmerGreenfieldUserId, reason: 'Collected and paid at stall' },
      ],
      paymentStatus: 'pay_at_pickup',
      notes: 'Demo historical order for review testing.',
      createdAt: new Date('2026-09-18T10:00:00Z'),
      updatedAt: new Date('2026-09-19T09:15:00Z'),
    },
    {
      _id: orderActiveId,
      orderNumber: 'ML-26-9042',
      checkoutGroupId: 'grp_002',
      customerId: customerSarahId,
      farmerId: greenfieldProfileId,
      marketId: marketModelTownId,
      pickupWindowId: pwSlot2Id,
      pickupDate: targetDate,
      pickupTimeSlot: '10:00 - 11:30',
      cutoffAt: cutoffTime,
      lines: [
        {
          productId: prodTomatoesId,
          stockOfferId: offerTomatoesId,
          productNameSnapshot: 'Heirloom Beefsteak Tomatoes (Demo)',
          unitSnapshot: 'kg',
          unitPriceMinorSnapshot: 35000,
          quantity: 3,
          lineTotalMinor: 105000,
        },
      ],
      totalAmountMinor: 105000,
      currency,
      status: 'placed',
      statusHistory: [
        { status: 'placed', changedAt: now, changedBy: customerSarahId, reason: 'Upcoming Saturday market pre-order' },
      ],
      paymentStatus: 'pay_at_pickup',
      notes: 'Please pack in eco-friendly paper crate.',
      createdAt: now,
      updatedAt: now,
    },
  ];

  // --- 9. REVIEWS ---
  const reviews = [
    {
      _id: new ObjectId('66f800000000000000000001'),
      orderId: orderCompletedId,
      customerId: customerSarahId,
      farmerId: greenfieldProfileId,
      targetType: 'farmer',
      targetId: greenfieldProfileId,
      rating: 5,
      comment: 'Excellent stall setup and friendly service from Tariq at the Model Town market.',
      farmerReply: {
        replyText: 'Thank you Sarah! Look forward to seeing you next Saturday.',
        repliedAt: now,
      },
      moderationStatus: 'visible',
      createdAt: now,
    },
    {
      _id: new ObjectId('66f800000000000000000002'),
      orderId: orderCompletedId,
      customerId: customerSarahId,
      farmerId: greenfieldProfileId,
      targetType: 'product',
      targetId: prodTomatoesId,
      rating: 5,
      comment: 'Remarkable sweetness and aroma in these beefsteak tomatoes.',
      farmerReply: null,
      moderationStatus: 'visible',
      createdAt: now,
    },
  ];

  // --- 10. FAVOURITES ---
  const favourites = [
    {
      customerId: customerSarahId,
      targetType: 'farmer',
      targetId: greenfieldProfileId,
      createdAt: now,
    },
    {
      customerId: customerSarahId,
      targetType: 'product',
      targetId: prodTomatoesId,
      createdAt: now,
    },
    {
      customerId: customerSarahId,
      targetType: 'market',
      targetId: marketModelTownId,
      createdAt: now,
    },
  ];

  // --- 11. NOTIFICATIONS ---
  const notifications = [
    {
      userId: customerSarahId,
      type: 'order_accepted',
      title: 'Order Confirmed by Greenfield Farm',
      message: 'Your pre-order ML-26-9042 for Saturday pickup has been received and confirmed.',
      metadata: { orderId: orderActiveId },
      isRead: false,
      createdAt: now,
    },
  ];

  return {
    users,
    farmerProfiles,
    markets,
    categories,
    products,
    pickupWindows,
    stockOffers,
    orders,
    reviews,
    favourites,
    notifications,
  };
}
