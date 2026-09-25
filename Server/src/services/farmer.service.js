import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { resolveDateRange, calculateComparison } from '../utils/date-range.js';

export async function getPublicFarmerProfileService(farmerProfileId) {
  const db = getDB();
  if (!ObjectId.isValid(farmerProfileId)) {
    const err = new Error('Farmer profile not found or currently unapproved.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }
  const fId = new ObjectId(farmerProfileId);

  const profile = await db.collection('farmerProfiles').findOne({ _id: fId, approvalStatus: 'approved' });
  if (!profile) {
    const err = new Error('Farmer profile not found or currently unapproved.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  // Get attending markets
  const markets = await db
    .collection('markets')
    .find({ _id: { $in: profile.marketIds || [] }, isActive: true })
    .toArray();

  const formattedMarkets = markets.map((m) => ({
    id: m._id.toString(),
    name: m.name,
    address: m.address,
    operatingDays: m.operatingDays,
    operatingHours: m.operatingHours,
  }));

  // Get current active stock offers
  const today = new Date().toISOString().split('T')[0];
  const stockOffers = await db
    .collection('stockOffers')
    .find({ farmerId: fId, date: { $gte: today }, status: 'available' })
    .toArray();

  // Get product names for these offers
  const productIds = stockOffers.map((s) => s.productId);
  const products = await db
    .collection('products')
    .find({ _id: { $in: productIds } })
    .toArray();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const formattedOffers = stockOffers.map((s) => {
    const prod = productMap.get(s.productId.toString());
    return {
      stockOfferId: s._id.toString(),
      productId: s.productId.toString(),
      productName: prod?.name || 'Produce Item',
      marketId: s.marketId.toString(),
      date: s.date,
      price: { amountMinor: s.priceMinor, currency: s.currency },
      unit: s.unit,
      availableQuantity: s.availableQuantity,
      status: s.status,
    };
  });

  const stallCoords = profile.stallCoordinates?.coordinates;

  return {
    id: profile._id.toString(),
    businessName: profile.businessName,
    contactPerson: profile.contactPerson,
    bio: profile.bio || '',
    profileImageUrl: profile.profileImageUrl || '',
    stallCoordinates: stallCoords ? { latitude: stallCoords[1], longitude: stallCoords[0] } : null,
    operatingDays: profile.operatingDays || [],
    attendingMarkets: formattedMarkets,
    currentOffers: formattedOffers,
  };
}

export async function getMyFarmerProfileService(userId) {
  const db = getDB();
  const profile = await db.collection('farmerProfiles').findOne({ userId: new ObjectId(userId) });
  if (!profile) {
    const err = new Error('Farmer profile not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const stallCoords = profile.stallCoordinates?.coordinates;

  return {
    id: profile._id.toString(),
    businessName: profile.businessName,
    contactPerson: profile.contactPerson,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    bio: profile.bio || '',
    profileImageUrl: profile.profileImageUrl || '',
    stallCoordinates: stallCoords ? { latitude: stallCoords[1], longitude: stallCoords[0] } : null,
    approvalStatus: profile.approvalStatus,
    marketIds: (profile.marketIds || []).map((id) => id.toString()),
    operatingDays: profile.operatingDays || [],
    createdAt: profile.createdAt?.toISOString(),
  };
}

export async function updateMyFarmerProfileService(userId, data) {
  const db = getDB();
  const updateFields = { updatedAt: new Date() };

  if (data.bio !== undefined) updateFields.bio = data.bio;
  if (data.phone !== undefined) updateFields.phone = data.phone;
  if (data.address !== undefined) updateFields.address = data.address;
  if (data.stallNumber !== undefined) updateFields.stallNumber = data.stallNumber;
  if (data.operatingDays !== undefined) updateFields.operatingDays = data.operatingDays;

  if (data.marketIds) {
    updateFields.marketIds = data.marketIds.map((id) => new ObjectId(id));
  }

  if (data.stallCoordinates) {
    updateFields.stallCoordinates = {
      type: 'Point',
      coordinates: [data.stallCoordinates.longitude, data.stallCoordinates.latitude],
    };
  } else if (data.stallCoordinates === null) {
    updateFields.stallCoordinates = null;
  }

  const result = await db.collection('farmerProfiles').updateOne(
    { userId: new ObjectId(userId) },
    { $set: updateFields }
  );

  if (result.matchedCount === 0) {
    const err = new Error('Farmer profile not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  return getMyFarmerProfileService(userId);
}

export const updateFarmerProfileService = updateMyFarmerProfileService;
export const getFarmerProfileService = getMyFarmerProfileService;

export async function listFarmersPublicService({ search, marketId } = {}) {
  const db = getDB();
  const query = { approvalStatus: 'approved' };
  if (search) {
    query.$or = [
      { businessName: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
    ];
  }
  if (marketId) {
    query.marketIds = new ObjectId(marketId);
  }
  const profiles = await db.collection('farmerProfiles').find(query).limit(50).toArray();
  return profiles.map((p) => ({
    id: p._id.toString(),
    businessName: p.businessName,
    contactPerson: p.contactPerson,
    bio: p.bio || '',
    stallNumber: p.stallNumber || '',
    operatingDays: p.operatingDays || [],
  }));
}

export async function getFarmerAnalyticsService(userId, options = {}) {
  const db = getDB();
  const fId = new ObjectId(userId);
  const profile = await db.collection('farmerProfiles').findOne({ userId: fId });
  const possibleIds = [fId];
  if (profile) possibleIds.push(profile._id);

  const dateRange = resolveDateRange(options.period || '7d', options.startDate, options.endDate);
  const { startDate, endDate, prevStartDate, prevEndDate, period, label } = dateRange;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Markets & Currency
  const marketIds = profile?.marketIds || [];
  const markets = await db.collection('markets').find({ _id: { $in: marketIds } }).toArray();
  const primaryCurrency = markets[0]?.currency || 'PKR';
  const marketMap = new Map(markets.map((m) => [m._id.toString(), m]));

  // 2. Orders retrieval
  const orderFilter = {
    $or: [{ farmerId: { $in: possibleIds } }, { farmerProfileId: { $in: possibleIds } }],
  };
  if (options.marketId && ObjectId.isValid(options.marketId)) {
    orderFilter.marketId = new ObjectId(options.marketId);
  }

  const allOrders = await db.collection('orders').find(orderFilter).toArray();

  // Partition into current period, previous period, upcoming
  const hasExplicitPeriod = Boolean(options.period || options.startDate || options.endDate);
  const currentOrders = hasExplicitPeriod
    ? allOrders.filter((o) => {
        const d = o.marketDate || (o.createdAt instanceof Date ? o.createdAt.toISOString().split('T')[0] : '');
        return d >= startDate && d <= endDate;
      })
    : allOrders;

  const prevOrders = allOrders.filter((o) => {
    const d = o.marketDate || (o.createdAt instanceof Date ? o.createdAt.toISOString().split('T')[0] : '');
    return d >= prevStartDate && d <= prevEndDate;
  });

  const upcomingOrders = allOrders.filter((o) => {
    const d = o.marketDate || '';
    return d >= todayStr && ['placed', 'accepted', 'confirmed', 'ready_for_pickup'].includes(o.status);
  });

  // Calculate current period counts & financials
  const counts = {
    total: currentOrders.length,
    placed: 0,
    accepted: 0,
    ready_for_pickup: 0,
    completed: 0,
    declined: 0,
    cancelled: 0,
  };

  let bookedOrderValueMinor = 0;
  let recordedCollectedValueMinor = 0;

  for (const o of currentOrders) {
    const status = o.status === 'confirmed' ? 'accepted' : o.status;
    if (counts[status] !== undefined) counts[status]++;
    const orderTotal = o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;

    if (['placed', 'accepted', 'ready_for_pickup', 'completed'].includes(status)) {
      bookedOrderValueMinor += orderTotal;
    }
    if (status === 'completed' && (o.payment?.status === 'paid_at_pickup' || o.paymentStatus === 'paid')) {
      recordedCollectedValueMinor += (o.payment?.paidAmountMinor || orderTotal);
    }
  }

  // Previous period counts & financials for comparison
  let prevBookedOrderValueMinor = 0;
  for (const o of prevOrders) {
    const status = o.status === 'confirmed' ? 'accepted' : o.status;
    const orderTotal = o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;
    if (['placed', 'accepted', 'ready_for_pickup', 'completed'].includes(status)) {
      prevBookedOrderValueMinor += orderTotal;
    }
  }

  const ordersComparison = calculateComparison(currentOrders.length, prevOrders.length);
  const bookedValueComparison = calculateComparison(bookedOrderValueMinor, prevBookedOrderValueMinor);
  const averageBookedOrderValueMinor = currentOrders.length > 0 ? Math.round(bookedOrderValueMinor / currentOrders.length) : 0;

  // 3. Products & Stock Health
  const products = await db.collection('products').find({ farmerId: { $in: possibleIds } }).toArray();
  const activeProducts = products.filter((p) => !p.isArchived);
  const prodMap = new Map(products.map((p) => [p._id.toString(), p]));

  const stockOffers = await db.collection('stockOffers').find({
    farmerId: { $in: possibleIds },
    ...(options.marketId && ObjectId.isValid(options.marketId) ? { marketId: new ObjectId(options.marketId) } : {}),
  }).toArray();

  let totalPublishedUnits = 0;
  let totalReservedUnits = 0;
  let totalAvailableUnits = 0;
  let soldOutOffersCount = 0;
  let lowStockOffersCount = 0;

  const productStockStats = new Map();

  for (const s of stockOffers) {
    totalPublishedUnits += s.totalQuantity || 0;
    totalReservedUnits += s.reservedQuantity || 0;
    totalAvailableUnits += s.availableQuantity || 0;
    if (s.availableQuantity <= 0) soldOutOffersCount++;
    else if (s.availableQuantity < 10) lowStockOffersCount++;

    const pIdStr = s.productId ? s.productId.toString() : '';
    const prev = productStockStats.get(pIdStr) || {
      productId: pIdStr,
      productName: prodMap.get(pIdStr)?.name || 'Produce',
      unit: s.unit || 'kg',
      published: 0,
      reserved: 0,
      available: 0,
    };
    prev.published += s.totalQuantity || 0;
    prev.reserved += s.reservedQuantity || 0;
    prev.available += s.availableQuantity || 0;
    productStockStats.set(pIdStr, prev);
  }

  const stockUtilizationPct = totalPublishedUnits > 0
    ? Math.round((totalReservedUnits / totalPublishedUnits) * 100)
    : 0;

  let stockHealthSummary = 'No stock published';
  if (totalPublishedUnits > 0) {
    if (stockUtilizationPct >= 85) {
      stockHealthSummary = `Reservations consuming ${stockUtilizationPct}% of published stock`;
    } else if (stockUtilizationPct >= 50) {
      stockHealthSummary = 'Healthy reservation velocity';
    } else {
      stockHealthSummary = 'High availability across catalogue';
    }
  }

  // 4. Daily Time-Series (Orders & Booked Value Trend)
  const dailySeries = [];
  const currStart = new Date(dateRange.startDateTime);
  const currEnd = new Date(dateRange.endDateTime);
  let highestValueDay = { date: '', amountMinor: 0, ordersCount: 0 };

  for (let d = new Date(currStart); d <= currEnd; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split('T')[0];
    const dayOrders = currentOrders.filter((o) => (o.marketDate || (o.createdAt instanceof Date ? o.createdAt.toISOString().split('T')[0] : '')) === dStr);

    let dayPlaced = 0;
    let dayAccepted = 0;
    let dayReady = 0;
    let dayCompleted = 0;
    let dayCancelled = 0;
    let dayBookedMinor = 0;

    for (const o of dayOrders) {
      const status = o.status === 'confirmed' ? 'accepted' : o.status;
      if (status === 'placed') dayPlaced++;
      else if (status === 'accepted') dayAccepted++;
      else if (status === 'ready_for_pickup') dayReady++;
      else if (status === 'completed') dayCompleted++;
      else if (['declined', 'cancelled'].includes(status)) dayCancelled++;

      const val = o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;
      if (['placed', 'accepted', 'ready_for_pickup', 'completed'].includes(status)) {
        dayBookedMinor += val;
      }
    }

    if (dayBookedMinor > highestValueDay.amountMinor) {
      highestValueDay = { date: dStr, amountMinor: dayBookedMinor, ordersCount: dayOrders.length };
    }

    dailySeries.push({
      date: dStr,
      placed: dayPlaced,
      accepted: dayAccepted,
      ready: dayReady,
      completed: dayCompleted,
      cancelled: dayCancelled,
      bookedValueMinor: dayBookedMinor,
      totalOrders: dayOrders.length,
    });
  }

  // 5. Order Status Distribution
  const totalPeriodOrders = Math.max(1, currentOrders.length);
  const statusDistribution = [
    { status: 'placed', label: 'Placed (Awaiting)', count: counts.placed, percentage: Math.round((counts.placed / totalPeriodOrders) * 100), color: '#D97706' },
    { status: 'accepted', label: 'Accepted', count: counts.accepted, percentage: Math.round((counts.accepted / totalPeriodOrders) * 100), color: '#2563EB' },
    { status: 'ready_for_pickup', label: 'Ready for Pickup', count: counts.ready_for_pickup, percentage: Math.round((counts.ready_for_pickup / totalPeriodOrders) * 100), color: '#10B981' },
    { status: 'completed', label: 'Completed', count: counts.completed, percentage: Math.round((counts.completed / totalPeriodOrders) * 100), color: '#059669' },
    { status: 'declined', label: 'Declined', count: counts.declined, percentage: Math.round((counts.declined / totalPeriodOrders) * 100), color: '#DC2626' },
    { status: 'cancelled', label: 'Cancelled', count: counts.cancelled, percentage: Math.round((counts.cancelled / totalPeriodOrders) * 100), color: '#9CA3AF' },
  ];

  // 6. Top Products Aggregation
  const productAggMap = new Map();
  const ordersForProductAgg = currentOrders.length > 0 ? currentOrders : allOrders;

  for (const o of ordersForProductAgg) {
    const isCountable = !['declined', 'cancelled'].includes(o.status);
    if (!isCountable) continue;

    for (const it of (o.items || [])) {
      const pIdStr = it.productId ? it.productId.toString() : '';
      const prod = prodMap.get(pIdStr);
      const prev = productAggMap.get(pIdStr) || {
        productId: pIdStr,
        name: it.name || prod?.name || 'Produce Item',
        category: prod?.category || 'Produce',
        unit: it.unit || prod?.unit || 'kg',
        quantityReserved: 0,
        ordersCount: 0,
        bookedValueMinor: 0,
        remainingStock: productStockStats.get(pIdStr)?.available || 0,
      };

      prev.quantityReserved += it.quantity || 0;
      prev.ordersCount += 1;
      const lineVal = it.totalPriceMinor || ((it.unitPriceMinor || 0) * (it.quantity || 0));
      prev.bookedValueMinor += lineVal;
      productAggMap.set(pIdStr, prev);
    }
  }

  // 7. Reviews & Ratings
  const reviews = await db.collection('reviews').find({
    farmerId: { $in: possibleIds },
    moderationStatus: { $ne: 'hidden' },
  }).sort({ createdAt: -1 }).toArray();

  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  let reviewsNeedingReply = 0;

  for (const r of reviews) {
    const rate = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    ratingCounts[rate]++;
    ratingSum += r.rating || 5;
    if (!r.reply || !r.reply.text) reviewsNeedingReply++;
  }

  const averageRating = reviews.length > 0 ? Math.round((ratingSum / reviews.length) * 10) / 10 : 5.0;

  const topProductsList = Array.from(productAggMap.values()).map((p) => {
    const prodReviews = reviews.filter((r) => r.productId && r.productId.toString() === p.productId);
    const pAvg = prodReviews.length > 0
      ? Math.round((prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length) * 10) / 10
      : null;
    return {
      ...p,
      rating: pAvg,
      reviewCount: prodReviews.length,
    };
  });

  const topProducts = {
    byOrders: [...topProductsList].sort((a, b) => b.ordersCount - a.ordersCount).slice(0, 10),
    byValue: [...topProductsList].sort((a, b) => b.bookedValueMinor - a.bookedValueMinor).slice(0, 10),
    byVolume: [...topProductsList].sort((a, b) => b.quantityReserved - a.quantityReserved).slice(0, 10),
    byRating: [...topProductsList].filter((p) => p.rating !== null).sort((a, b) => b.rating - a.rating).slice(0, 10),
  };

  // 8. Market Performance Comparison
  const marketPerformanceMap = new Map();
  for (const m of markets) {
    const mIdStr = m._id.toString();
    marketPerformanceMap.set(mIdStr, {
      marketId: mIdStr,
      marketName: m.name,
      city: m.city || 'Lahore',
      currency: m.currency || primaryCurrency,
      ordersCount: 0,
      completedPickups: 0,
      cancelledOrders: 0,
      bookedValueMinor: 0,
      topProductName: 'None',
      _topProductMap: new Map(),
    });
  }

  for (const o of allOrders) {
    const mIdStr = o.marketId ? o.marketId.toString() : '';
    if (!marketPerformanceMap.has(mIdStr)) continue;
    const entry = marketPerformanceMap.get(mIdStr);
    entry.ordersCount++;
    const status = o.status === 'confirmed' ? 'accepted' : o.status;
    const val = o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;

    if (status === 'completed') {
      entry.completedPickups++;
      entry.bookedValueMinor += val;
    } else if (['placed', 'accepted', 'ready_for_pickup'].includes(status)) {
      entry.bookedValueMinor += val;
    } else if (['declined', 'cancelled'].includes(status)) {
      entry.cancelledOrders++;
    }

    for (const it of (o.items || [])) {
      const pName = it.name || 'Produce';
      entry._topProductMap.set(pName, (entry._topProductMap.get(pName) || 0) + (it.quantity || 1));
    }
  }

  const marketComparison = Array.from(marketPerformanceMap.values()).map((mp) => {
    let topProd = 'N/A';
    let maxQty = 0;
    for (const [name, qty] of mp._topProductMap.entries()) {
      if (qty > maxQty) {
        maxQty = qty;
        topProd = name;
      }
    }
    const cancellationRate = mp.ordersCount > 0 ? Math.round((mp.cancelledOrders / mp.ordersCount) * 100) : 0;
    const averageOrderValueMinor = mp.ordersCount > 0 ? Math.round(mp.bookedValueMinor / mp.ordersCount) : 0;
    return {
      marketId: mp.marketId,
      marketName: mp.marketName,
      city: mp.city,
      currency: mp.currency,
      ordersCount: mp.ordersCount,
      completedPickups: mp.completedPickups,
      cancellationRate,
      bookedValueMinor: mp.bookedValueMinor,
      averageOrderValueMinor,
      topProductName: topProd,
    };
  });

  // 9. Pickup Workload by Time Slot
  const slotMap = new Map();
  for (const uo of upcomingOrders) {
    const window = uo.pickupWindow || {};
    const slotLabel = (window.startTime && window.endTime)
      ? `${window.startTime}–${window.endTime}`
      : 'Morning Collection Slot';

    const prev = slotMap.get(slotLabel) || {
      timeSlot: slotLabel,
      orderCount: 0,
      totalItemsCount: 0,
      date: uo.marketDate,
    };
    prev.orderCount++;
    prev.totalItemsCount += (uo.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
    slotMap.set(slotLabel, prev);
  }

  const pickupWorkload = Array.from(slotMap.values()).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  return {
    farmerId: userId,
    businessName: profile?.businessName || profile?.farmName || 'Farm Workbench',
    primaryCurrency,
    period: {
      key: period,
      label,
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
    },
    kpis: {
      ordersCount: currentOrders.length,
      ordersComparison,
      awaitingAcceptance: counts.placed,
      acceptedOrders: counts.accepted,
      readyForPickup: counts.ready_for_pickup,
      completedOrders: counts.completed,
      cancelledOrDeclined: counts.cancelled + counts.declined,
      bookedOrderValueMinor,
      bookedValueComparison,
      recordedCollectedValueMinor,
      averageBookedOrderValueMinor,
      activeCatalogueProducts: activeProducts.length,
      publishedDatedOffers: stockOffers.length,
      reservedStockTotal: totalReservedUnits,
      availableStockTotal: totalAvailableUnits,
      lowStockProductsCount: lowStockOffersCount,
      soldOutProductsCount: soldOutOffersCount,
      stockUtilizationPct,
      stockHealthSummary,
      averageRating,
      reviewCount: reviews.length,
      reviewsRequiringReply: reviewsNeedingReply,
      upcomingPickupsCount: upcomingOrders.length,
    },
    ordersTrend: dailySeries,
    bookedValueTrend: {
      series: dailySeries.map((d) => ({ date: d.date, bookedValueMinor: d.bookedValueMinor })),
      highestValueDay,
      currency: primaryCurrency,
    },
    orderStatusDistribution: statusDistribution,
    topProducts,
    stockHealth: {
      totalPublished: totalPublishedUnits,
      totalReserved: totalReservedUnits,
      totalAvailable: totalAvailableUnits,
      soldOutCount: soldOutOffersCount,
      lowStockCount: lowStockOffersCount,
      utilizationPct: stockUtilizationPct,
      summary: stockHealthSummary,
      items: Array.from(productStockStats.values()).slice(0, 15),
    },
    marketComparison,
    pickupWorkload,
    reviewsSummary: {
      averageRating,
      reviewCount: reviews.length,
      reviewsRequiringReply: reviewsNeedingReply,
      distribution: ratingCounts,
      recent: reviews.slice(0, 5).map((r) => ({
        id: r._id.toString(),
        rating: r.rating,
        comment: r.comment,
        customerName: r.customerSnapshot?.name || 'Customer',
        hasReply: !!(r.reply?.text),
        replyText: r.reply?.text || '',
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      })),
    },
  };
}

export async function getFarmerReportsService(userId, options = {}) {
  const analytics = await getFarmerAnalyticsService(userId, options);

  // Return full analytics plus backwards-compatible keys expected by customer-engagement.test.js
  return {
    ...analytics,
    metrics: {
      orderCounts: {
        total: analytics.kpis.ordersCount,
        placed: analytics.kpis.awaitingAcceptance,
        accepted: analytics.kpis.acceptedOrders,
        ready_for_pickup: analytics.kpis.readyForPickup,
        completed: analytics.kpis.completedOrders,
        declined: analytics.orderStatusDistribution.find((s) => s.status === 'declined')?.count || 0,
        cancelled: analytics.orderStatusDistribution.find((s) => s.status === 'cancelled')?.count || 0,
      },
      bookedOrderValue: {
        amountMinor: analytics.kpis.bookedOrderValueMinor,
        currency: analytics.primaryCurrency,
        description: 'Value of currently reserved pre-orders pending pickup',
      },
      actualCollectedPayment: {
        amountMinor: analytics.kpis.recordedCollectedValueMinor,
        currency: analytics.primaryCurrency,
        description: 'Physical payment confirmed by farmer at market stall pickup',
      },
    },
    bestSellingProducts: analytics.topProducts.byVolume.map((p) => ({
      productId: p.productId,
      productName: p.name,
      unit: p.unit,
      quantitySold: p.quantityReserved,
      revenueMinor: p.bookedValueMinor,
    })),
    upcomingPickupSchedule: analytics.pickupWorkload,
    activeStockOffersCount: analytics.kpis.publishedDatedOffers,
  };
}


// --- GUIDED MULTI-STEP ONBOARDING WIZARD SERVICES ---

export async function getFarmerOnboardingService(userId) {
  const db = getDB();
  const uId = new ObjectId(userId);

  let profile = await db.collection('farmerProfiles').findOne({ userId: uId });

  if (!profile) {
    // If user account is farmer but profile not initialized, initialize skeleton
    const user = await db.collection('users').findOne({ _id: uId });
    const newProfile = {
      userId: uId,
      businessName: user ? `${user.firstName || 'Farmer'}'s Produce` : 'My Farm',
      contactPerson: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
      phone: user?.phone || '',
      email: user?.email || '',
      approvalStatus: 'draft',
      countryCode: 'PK',
      city: 'Lahore',
      onboarding: {
        currentStep: 1,
        status: 'in_progress',
        completedSteps: [],
        stepData: {
          step1_account: {
            contactPerson: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
            phone: user?.phone || '',
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res = await db.collection('farmerProfiles').insertOne(newProfile);
    profile = { _id: res.insertedId, ...newProfile };
  }

  const onboarding = profile.onboarding || {
    currentStep: 1,
    status: profile.approvalStatus === 'approved' ? 'approved' : 'in_progress',
    completedSteps: [],
    stepData: {},
  };

  return {
    farmerProfileId: profile._id.toString(),
    currentStep: onboarding.currentStep || 1,
    status: onboarding.status || 'in_progress',
    completedSteps: onboarding.completedSteps || [],
    stepData: onboarding.stepData || {},
    approvalStatus: profile.approvalStatus || 'draft',
    submittedAt: onboarding.submittedAt ? onboarding.submittedAt.toISOString() : null,
    adminNotes: profile.adminNotes || '',
  };
}

export async function saveFarmerOnboardingStepService(userId, { step, data }) {
  const db = getDB();
  const uId = new ObjectId(userId);

  const stepKey = `onboarding.stepData.step${step}`;
  const now = new Date();

  const updateDoc = {
    $set: {
      [stepKey]: data,
      'onboarding.currentStep': Math.min(8, Math.max(step + 1, 1)),
      updatedAt: now,
    },
    $addToSet: {
      'onboarding.completedSteps': step,
    },
  };

  // Sync key profile fields at appropriate steps
  if (step === 1) {
    if (data.contactPerson) updateDoc.$set.contactPerson = data.contactPerson;
    if (data.phone) updateDoc.$set.phone = data.phone;
  } else if (step === 2) {
    if (data.countryCode) updateDoc.$set.countryCode = data.countryCode.toUpperCase();
    if (data.countryName) updateDoc.$set.countryName = data.countryName;
    if (data.region) updateDoc.$set.region = data.region;
    if (data.city) updateDoc.$set.city = data.city;
    if (data.address) updateDoc.$set.address = data.address;
  } else if (step === 3) {
    if (data.businessName) updateDoc.$set.businessName = data.businessName;
    if (data.bio) updateDoc.$set.bio = data.bio;
    if (data.story) updateDoc.$set.story = data.story;
    if (data.logoUrl) updateDoc.$set.profileImageUrl = data.logoUrl;
    if (data.bannerUrl) updateDoc.$set.bannerImageUrl = data.bannerUrl;
    if (data.farmingPractices) updateDoc.$set.farmingPractices = data.farmingPractices;
  } else if (step === 4) {
    if (Array.isArray(data.requestedMarketIds)) {
      updateDoc.$set.marketIds = data.requestedMarketIds.map((id) => new ObjectId(id));
    }
  } else if (step === 6) {
    if (Array.isArray(data.operatingDays)) {
      updateDoc.$set.operatingDays = data.operatingDays;
    }
  } else if (step === 7) {
    if (data.stallNumber) updateDoc.$set.stallNumber = data.stallNumber;
    if (data.defaultStallNotes) updateDoc.$set.stallNotes = data.defaultStallNotes;
  }

  await db.collection('farmerProfiles').updateOne({ userId: uId }, updateDoc, { upsert: true });

  return getFarmerOnboardingService(userId);
}

export async function submitFarmerOnboardingService(userId) {
  const db = getDB();
  const uId = new ObjectId(userId);

  const profile = await db.collection('farmerProfiles').findOne({ userId: uId });
  if (!profile) {
    const err = new Error('Farmer profile not found. Please complete step 1 first.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const stepData = profile.onboarding?.stepData || {};

  // Check required steps: 1 (Account), 2 (Location), 3 (Profile), 4 (Markets)
  const missing = [];
  if (!stepData.step1_account?.contactPerson || !stepData.step1_account?.phone) {
    missing.push('Step 1: Contact person and phone number are required.');
  }
  if (!stepData.step2_location?.countryCode || !stepData.step2_location?.city || !stepData.step2_location?.address) {
    missing.push('Step 2: Country, city, and address are required.');
  }
  if (!stepData.step3_profile?.businessName || !stepData.step3_profile?.bio) {
    missing.push('Step 3: Farm business name and description are required.');
  }
  if (!stepData.step4_markets?.requestedMarketIds || stepData.step4_markets.requestedMarketIds.length === 0) {
    missing.push('Step 4: At least one market selection is required.');
  }

  if (missing.length > 0) {
    const err = new Error(`Onboarding submission incomplete. ${missing.join(' ')}`);
    err.code = 'ONBOARDING_INCOMPLETE';
    err.statusCode = 400;
    err.fields = missing;
    throw err;
  }

  const now = new Date();
  await db.collection('farmerProfiles').updateOne(
    { userId: uId },
    {
      $set: {
        approvalStatus: 'pending',
        'onboarding.status': 'submitted',
        'onboarding.submittedAt': now,
        'onboarding.currentStep': 8,
        updatedAt: now,
      },
      $addToSet: {
        'onboarding.completedSteps': 8,
      },
    }
  );

  return getFarmerOnboardingService(userId);
}



