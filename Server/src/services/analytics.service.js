import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { resolveDateRange, calculateComparison } from '../utils/date-range.js';

/**
 * Returns deep multi-country platform analytical metrics for administrators.
 * Supports period filtering, country/market filtering, and separate currency grouping.
 */
export async function getAdminAnalyticsService(options = {}) {
  const db = getDB();

  const dateRange = resolveDateRange(options.period || '7d', options.startDate, options.endDate);
  const { startDate, endDate, prevStartDate, prevEndDate, period, label } = dateRange;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Markets & Geographies
  const marketFilter = {};
  if (options.country) marketFilter.country = options.country;
  if (options.marketId && ObjectId.isValid(options.marketId)) {
    marketFilter._id = new ObjectId(options.marketId);
  }

  const allMarkets = await db.collection('markets').find(marketFilter).toArray();
  const allMarketsMap = new Map(allMarkets.map((m) => [m._id.toString(), m]));
  const allowedMarketIds = allMarkets.map((m) => m._id);

  // Active countries list
  const countryCodesSet = new Set(allMarkets.map((m) => m.country || 'PK').filter(Boolean));
  const activeCountries = Array.from(countryCodesSet);

  // 2. User Stats
  const totalUsers = await db.collection('users').countDocuments({});
  const totalCustomers = await db.collection('users').countDocuments({ role: 'customer' });
  const totalFarmers = await db.collection('users').countDocuments({ role: 'farmer' });
  const pendingFarmersCount = await db.collection('farmerProfiles').countDocuments({ approvalStatus: 'pending' });
  const approvedFarmersCount = await db.collection('farmerProfiles').countDocuments({ approvalStatus: 'approved' });
  const suspendedFarmersCount = await db.collection('farmerProfiles').countDocuments({ approvalStatus: 'suspended' });
  const rejectedFarmersCount = await db.collection('farmerProfiles').countDocuments({ approvalStatus: 'rejected' });

  // 3. Attention Centre Data
  const pendingFarmersList = await db.collection('farmerProfiles')
    .find({ approvalStatus: 'pending' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  const flaggedReviewsList = await db.collection('reviews')
    .find({ moderationStatus: 'flagged' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  const openInquiriesList = await db.collection('contactInquiries')
    .find({ status: 'new' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  const hiddenProductsCount = await db.collection('products').countDocuments({ isArchived: true });

  const attentionCentre = [
    {
      id: 'pending_farmers',
      title: 'Farmer Applications Awaiting Approval',
      count: pendingFarmersCount,
      severity: pendingFarmersCount > 0 ? 'warning' : 'ok',
      targetUrl: '/admin/farmers?status=pending',
      actionLabel: 'Review Farmer Queue',
      items: pendingFarmersList.map((f) => ({
        id: f._id.toString(),
        name: f.businessName || f.contactPerson,
        detail: `Applied ${f.createdAt ? f.createdAt.toISOString().split('T')[0] : 'recently'}`,
      })),
    },
    {
      id: 'flagged_reviews',
      title: 'Customer Reviews Flagged for Moderation',
      count: flaggedReviewsList.length,
      severity: flaggedReviewsList.length > 0 ? 'alert' : 'ok',
      targetUrl: '/admin/moderation?tab=reviews',
      actionLabel: 'Inspect Flagged Reviews',
      items: flaggedReviewsList.map((r) => ({
        id: r._id.toString(),
        name: `${r.rating}★ Review`,
        detail: r.comment ? (r.comment.slice(0, 60) + '…') : 'No comment text',
      })),
    },
    {
      id: 'open_inquiries',
      title: 'Unresolved Contact Inquiries',
      count: openInquiriesList.length,
      severity: openInquiriesList.length > 0 ? 'info' : 'ok',
      targetUrl: '/admin/inquiries',
      actionLabel: 'Open Inquiries Desk',
      items: openInquiriesList.map((inq) => ({
        id: inq._id.toString(),
        name: inq.name || inq.email,
        detail: inq.subject || 'General platform query',
      })),
    },
    {
      id: 'hidden_listings',
      title: 'Archived / Hidden Produce Listings',
      count: hiddenProductsCount,
      severity: 'neutral',
      targetUrl: '/admin/products?archived=true',
      actionLabel: 'View Archived Produce',
      items: [],
    },
  ];

  // 4. Orders Retrieval & Currency Grouping
  const orderQuery = {};
  if (allowedMarketIds.length > 0) {
    orderQuery.marketId = { $in: allowedMarketIds };
  }

  const allOrders = await db.collection('orders').find(orderQuery).toArray();

  const currentPeriodOrders = allOrders.filter((o) => {
    const d = o.marketDate || (o.createdAt instanceof Date ? o.createdAt.toISOString().split('T')[0] : '');
    return d >= startDate && d <= endDate;
  });

  const prevPeriodOrders = allOrders.filter((o) => {
    const d = o.marketDate || (o.createdAt instanceof Date ? o.createdAt.toISOString().split('T')[0] : '');
    return d >= prevStartDate && d <= prevEndDate;
  });

  // Active customer engagement calculation
  const customerOrderCounts = new Map();
  for (const o of allOrders) {
    const cId = o.customerId ? o.customerId.toString() : '';
    if (cId) customerOrderCounts.set(cId, (customerOrderCounts.get(cId) || 0) + 1);
  }
  const orderingCustomersCount = customerOrderCounts.size;
  let repeatCustomersCount = 0;
  for (const count of customerOrderCounts.values()) {
    if (count >= 2) repeatCustomersCount++;
  }

  // Active customers: placed an order in last 30 days
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const activeCustomerIdsSet = new Set(
    allOrders
      .filter((o) => (o.marketDate || (o.createdAt instanceof Date ? o.createdAt.toISOString().split('T')[0] : '')) >= thirtyDaysAgoStr)
      .map((o) => o.customerId?.toString())
      .filter(Boolean)
  );

  // Currency-Grouped Booked & Completed Values (NEVER combine currencies!)
  const currencyTotals = {};
  const prevCurrencyTotals = {};

  function ensureCurrency(map, curr) {
    const c = curr || 'PKR';
    if (!map[c]) {
      map[c] = {
        currency: c,
        bookedMinor: 0,
        collectedMinor: 0,
        completedMinor: 0,
        ordersCount: 0,
      };
    }
    return map[c];
  }

  const orderCounts = {
    total: currentPeriodOrders.length,
    placed: 0,
    accepted: 0,
    ready_for_pickup: 0,
    completed: 0,
    declined: 0,
    cancelled: 0,
  };

  for (const o of currentPeriodOrders) {
    const status = o.status === 'confirmed' ? 'accepted' : o.status;
    if (orderCounts[status] !== undefined) orderCounts[status]++;

    const curr = o.currency || 'PKR';
    const cStats = ensureCurrency(currencyTotals, curr);
    cStats.ordersCount++;

    const orderTotal = o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;
    if (['placed', 'accepted', 'ready_for_pickup', 'completed'].includes(status)) {
      cStats.bookedMinor += orderTotal;
    }
    if (status === 'completed') {
      cStats.completedMinor += orderTotal;
      if (o.payment?.status === 'paid_at_pickup' || o.paymentStatus === 'paid') {
        cStats.collectedMinor += (o.payment?.paidAmountMinor || orderTotal);
      }
    }
  }

  for (const o of prevPeriodOrders) {
    const status = o.status === 'confirmed' ? 'accepted' : o.status;
    const curr = o.currency || 'PKR';
    const cStats = ensureCurrency(prevCurrencyTotals, curr);
    cStats.ordersCount++;
    const orderTotal = o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;
    if (['placed', 'accepted', 'ready_for_pickup', 'completed'].includes(status)) {
      cStats.bookedMinor += orderTotal;
    }
    if (status === 'completed') {
      cStats.completedMinor += orderTotal;
    }
  }

  // Ensure primary currencies have entries even if 0
  if (Object.keys(currencyTotals).length === 0) {
    currencyTotals['PKR'] = { currency: 'PKR', bookedMinor: 0, collectedMinor: 0, completedMinor: 0, ordersCount: 0 };
  }

  // Calculate comparisons per currency
  const bookedValueByCurrency = {};
  for (const [curr, stats] of Object.entries(currencyTotals)) {
    const prevStats = prevCurrencyTotals[curr] || { bookedMinor: 0, completedMinor: 0, ordersCount: 0 };
    bookedValueByCurrency[curr] = {
      ...stats,
      comparison: calculateComparison(stats.bookedMinor, prevStats.bookedMinor),
      averageOrderValueMinor: stats.ordersCount > 0 ? Math.round(stats.bookedMinor / stats.ordersCount) : 0,
    };
  }

  const ordersComparison = calculateComparison(currentPeriodOrders.length, prevPeriodOrders.length);

  // 5. Daily Time-Series (Orders over Time)
  const dailySeries = [];
  const currStart = new Date(dateRange.startDateTime);
  const currEnd = new Date(dateRange.endDateTime);

  for (let d = new Date(currStart); d <= currEnd; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split('T')[0];
    const dayOrders = currentPeriodOrders.filter((o) => (o.marketDate || (o.createdAt instanceof Date ? o.createdAt.toISOString().split('T')[0] : '')) === dStr);

    let placed = 0;
    let accepted = 0;
    let ready = 0;
    let completed = 0;
    let cancelled = 0;

    for (const o of dayOrders) {
      const status = o.status === 'confirmed' ? 'accepted' : o.status;
      if (status === 'placed') placed++;
      else if (status === 'accepted') accepted++;
      else if (status === 'ready_for_pickup') ready++;
      else if (status === 'completed') completed++;
      else if (['declined', 'cancelled'].includes(status)) cancelled++;
    }

    dailySeries.push({
      date: dStr,
      placed,
      accepted,
      ready,
      completed,
      cancelled,
      totalOrders: dayOrders.length,
    });
  }

  // 6. Market Performance Matrix
  const marketMatrix = [];
  for (const m of allMarkets) {
    const mIdStr = m._id.toString();
    const mOrders = allOrders.filter((o) => o.marketId && o.marketId.toString() === mIdStr);
    const mCompleted = mOrders.filter((o) => o.status === 'completed');
    const mCancelled = mOrders.filter((o) => ['cancelled', 'declined'].includes(o.status));

    const curr = m.currency || 'PKR';
    let bookedTotalMinor = 0;
    for (const o of mOrders) {
      const status = o.status === 'confirmed' ? 'accepted' : o.status;
      if (['placed', 'accepted', 'ready_for_pickup', 'completed'].includes(status)) {
        bookedTotalMinor += o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;
      }
    }

    const attendingFarmersCount = await db.collection('farmerProfiles').countDocuments({
      marketIds: m._id,
      approvalStatus: 'approved',
    });

    const activeOffersCount = await db.collection('stockOffers').countDocuments({
      marketId: m._id,
      status: 'available',
      availableQuantity: { $gt: 0 },
    });

    marketMatrix.push({
      marketId: mIdStr,
      name: m.name,
      country: m.country || 'PK',
      city: m.city || 'Lahore',
      currency: curr,
      operatingDays: m.operatingDays || [],
      activeFarmersCount: attendingFarmersCount,
      activeOffersCount,
      totalOrders: mOrders.length,
      completedPickups: mCompleted.length,
      cancellationRate: mOrders.length > 0 ? Math.round((mCancelled.length / mOrders.length) * 100) : 0,
      completionRate: mOrders.length > 0 ? Math.round((mCompleted.length / mOrders.length) * 100) : 0,
      bookedOrderValueMinor: bookedTotalMinor,
      averageOrderValueMinor: mOrders.length > 0 ? Math.round(bookedTotalMinor / mOrders.length) : 0,
      isActive: m.isActive !== false,
    });
  }
  marketMatrix.sort((a, b) => b.totalOrders - a.totalOrders);

  // 7. Country Performance Breakdown
  const countryMatrix = [];
  for (const cCode of activeCountries) {
    const countryMarkets = allMarkets.filter((m) => (m.country || 'PK') === cCode);
    const cMarketIds = countryMarkets.map((m) => m._id.toString());
    const cOrders = allOrders.filter((o) => o.marketId && cMarketIds.includes(o.marketId.toString()));
    const cCompleted = cOrders.filter((o) => o.status === 'completed');

    // Group values by currency for this country
    const countryCurrencies = {};
    for (const o of cOrders) {
      const curr = o.currency || 'PKR';
      if (!countryCurrencies[curr]) countryCurrencies[curr] = 0;
      const status = o.status === 'confirmed' ? 'accepted' : o.status;
      if (['placed', 'accepted', 'ready_for_pickup', 'completed'].includes(status)) {
        countryCurrencies[curr] += o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;
      }
    }

    countryMatrix.push({
      countryCode: cCode,
      countryName: cCode === 'PK' ? 'Pakistan' : cCode === 'GB' ? 'United Kingdom' : cCode === 'US' ? 'United States' : cCode,
      marketsCount: countryMarkets.length,
      totalOrders: cOrders.length,
      completedOrders: cCompleted.length,
      bookedValueByCurrency: countryCurrencies,
    });
  }

  // 8. Categories Analytics
  const categories = await db.collection('categories').find({}).toArray();
  const products = await db.collection('products').find({ isArchived: false }).toArray();
  const categoryAnalytics = categories.map((cat) => {
    const catIdStr = cat._id.toString();
    const catProducts = products.filter((p) => p.categoryId && p.categoryId.toString() === catIdStr);
    const catProductIds = new Set(catProducts.map((p) => p._id.toString()));

    let reservationsCount = 0;
    let catBookedMinor = 0;

    for (const o of allOrders) {
      for (const it of (o.items || [])) {
        if (it.productId && catProductIds.has(it.productId.toString())) {
          reservationsCount += it.quantity || 1;
          catBookedMinor += it.totalPriceMinor || ((it.unitPriceMinor || 0) * (it.quantity || 1));
        }
      }
    }

    return {
      categoryId: catIdStr,
      name: cat.name,
      slug: cat.slug,
      activeProductsCount: catProducts.length,
      reservationsCount,
      bookedOrderValueMinor: catBookedMinor,
    };
  });
  categoryAnalytics.sort((a, b) => b.bookedOrderValueMinor - a.bookedOrderValueMinor);

  // 9. Reviews & Platform Satisfaction
  const reviews = await db.collection('reviews').find({}).toArray();
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  for (const r of reviews) {
    const rate = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    ratingDistribution[rate]++;
    ratingSum += r.rating || 5;
  }
  const platformAverageRating = reviews.length > 0 ? Math.round((ratingSum / reviews.length) * 10) / 10 : 5.0;

  // 10. Backwards Compatibility for existing tests
  // Calculate total booked and completed across all currencies for legacy readers
  let legacyBookedMinor = 0;
  let legacyCompletedMinor = 0;
  for (const stat of Object.values(currencyTotals)) {
    legacyBookedMinor += stat.bookedMinor;
    legacyCompletedMinor += stat.completedMinor;
  }

  return {
    period: {
      key: period,
      label,
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
    },
    kpis: {
      totalCustomers,
      activeCustomers: activeCustomerIdsSet.size || orderingCustomersCount,
      orderingCustomers: orderingCustomersCount,
      repeatCustomers: repeatCustomersCount,
      repeatCustomerRate: orderingCustomersCount > 0 ? Math.round((repeatCustomersCount / orderingCustomersCount) * 100) : 0,
      totalFarmers,
      approvedFarmers: approvedFarmersCount,
      pendingFarmers: pendingFarmersCount,
      suspendedFarmers: suspendedFarmersCount,
      rejectedFarmers: rejectedFarmersCount,
      activeMarkets: allMarkets.length,
      activeCountries: activeCountries.length,
      ordersPeriodCount: currentPeriodOrders.length,
      ordersComparison,
      completedOrdersCount: orderCounts.completed,
      cancelledOrdersCount: orderCounts.cancelled + orderCounts.declined,
      bookedValueByCurrency,
      averageRating: platformAverageRating,
      totalReviews: reviews.length,
      flaggedReviewsCount: flaggedReviewsList.length,
      openInquiriesCount: openInquiriesList.length,
    },
    platformOrderTrend: dailySeries,
    bookedValueByCurrency,
    farmerGrowth: {
      statusDistribution: [
        { status: 'approved', count: approvedFarmersCount, color: '#10B981', label: 'Approved' },
        { status: 'pending', count: pendingFarmersCount, color: '#D97706', label: 'Pending Approval' },
        { status: 'suspended', count: suspendedFarmersCount, color: '#DC2626', label: 'Suspended' },
        { status: 'rejected', count: rejectedFarmersCount, color: '#6B7280', label: 'Rejected' },
      ],
    },
    customerEngagement: {
      totalCustomers,
      activeCustomers: activeCustomerIdsSet.size || orderingCustomersCount,
      orderingCustomers: orderingCustomersCount,
      repeatCustomers: repeatCustomersCount,
      reviewParticipationRate: currentPeriodOrders.length > 0
        ? Math.min(100, Math.round((reviews.length / Math.max(1, orderCounts.completed)) * 100))
        : 0,
    },
    marketPerformance: marketMatrix,
    countryPerformance: countryMatrix,
    categoryAnalytics,
    attentionCentre,
    reviewsSummary: {
      averageRating: platformAverageRating,
      totalReviews: reviews.length,
      distribution: ratingDistribution,
      flaggedCount: flaggedReviewsList.length,
    },

    // Legacy overview structure for order-hardening.test.js & older callers
    overview: {
      users: {
        total: totalUsers,
        customers: totalCustomers,
        farmers: totalFarmers,
        farmerApproval: {
          pending: pendingFarmersCount,
          approved: approvedFarmersCount,
          suspended: suspendedFarmersCount,
        },
      },
      markets: {
        total: allMarkets.length,
        active: allMarkets.filter((m) => m.isActive !== false).length,
      },
      products: {
        total: products.length,
        active: products.length,
      },
      orders: {
        ...orderCounts,
        bookedOrderValueMinor: legacyBookedMinor,
        completedOrderValueMinor: legacyCompletedMinor,
        totalPlatformValueMinor: legacyBookedMinor + legacyCompletedMinor,
      },
    },
    marketBreakdown: marketMatrix,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Backwards-compatible wrapper for getPlatformAnalyticsAdminService
 */
export async function getPlatformAnalyticsAdminService(options = {}) {
  return getAdminAnalyticsService(options);
}

/**
 * Returns ranked list of most active farmers across the platform.
 */
export async function getMostActiveFarmersService({ limit = 10, sortBy = 'orders' } = {}) {
  const db = getDB();

  // Find all approved farmers
  const farmers = await db.collection('farmerProfiles').find({}).toArray();
  const farmerUserIds = farmers.map((f) => f.userId);

  const users = await db
    .collection('users')
    .find({ _id: { $in: farmerUserIds } })
    .toArray();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  // Aggregate orders for each farmer
  const orders = await db.collection('orders').find({}).toArray();

  const farmerStats = new Map();

  for (const f of farmers) {
    const u = userMap.get(f.userId.toString());
    const fid = f.userId.toString();
    farmerStats.set(fid, {
      farmerUserId: fid,
      farmerProfileId: f._id.toString(),
      farmName: f.farmName || f.businessName || 'Unnamed Farm',
      farmerName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Unknown Farmer',
      email: u?.email || '',
      approvalStatus: f.approvalStatus,
      totalOrders: 0,
      completedOrders: 0,
      activeOrders: 0,
      bookedOrderValueMinor: 0,
      completedRevenueMinor: 0,
      averageRating: f.averageRating || 0,
      totalReviews: f.totalReviews || 0,
    });
  }

  for (const o of orders) {
    const status = o.status === 'confirmed' ? 'accepted' : o.status;
    const fId = o.farmerId ? o.farmerId.toString() : null;
    const orderTotal = o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;

    if (fId && farmerStats.has(fId)) {
      const stats = farmerStats.get(fId);
      stats.totalOrders++;

      if (status === 'completed') {
        stats.completedOrders++;
        stats.completedRevenueMinor += orderTotal;
      } else if (['placed', 'accepted', 'ready_for_pickup'].includes(status)) {
        stats.activeOrders++;
        stats.bookedOrderValueMinor += orderTotal;
      }
    }
  }

  const results = Array.from(farmerStats.values());

  if (sortBy === 'revenue') {
    results.sort((a, b) => b.completedRevenueMinor + b.bookedOrderValueMinor - (a.completedRevenueMinor + a.bookedOrderValueMinor));
  } else if (sortBy === 'rating') {
    results.sort((a, b) => b.averageRating - a.averageRating);
  } else {
    // Default by total orders
    results.sort((a, b) => b.totalOrders - a.totalOrders);
  }

  return results.slice(0, Number(limit));
}
