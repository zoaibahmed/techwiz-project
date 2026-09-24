import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

/**
 * Returns platform-wide analytical metrics for administrators.
 */
export async function getPlatformAnalyticsAdminService() {
  const db = getDB();

  // 1. User stats
  const totalUsers = await db.collection('users').countDocuments({});
  const totalCustomers = await db.collection('users').countDocuments({ role: 'customer' });
  const totalFarmers = await db.collection('users').countDocuments({ role: 'farmer' });
  const pendingFarmers = await db.collection('farmerProfiles').countDocuments({ approvalStatus: 'pending' });
  const approvedFarmers = await db.collection('farmerProfiles').countDocuments({ approvalStatus: 'approved' });
  const suspendedFarmers = await db.collection('farmerProfiles').countDocuments({ approvalStatus: 'suspended' });

  // 2. Markets & Products stats
  const totalMarkets = await db.collection('markets').countDocuments({});
  const activeMarkets = await db.collection('markets').countDocuments({ isActive: { $ne: false } });
  const totalProducts = await db.collection('products').countDocuments({});
  const activeProducts = await db.collection('products').countDocuments({ isArchived: { $ne: true } });

  // 3. Orders analytics
  const orders = await db.collection('orders').find({}).toArray();

  const orderCounts = {
    total: orders.length,
    placed: 0,
    accepted: 0,
    ready_for_pickup: 0,
    completed: 0,
    declined: 0,
    cancelled: 0,
  };

  let bookedOrderValueMinor = 0;
  let completedOrderValueMinor = 0;

  const marketStatsMap = new Map();

  for (const o of orders) {
    const status = o.status === 'confirmed' ? 'accepted' : o.status;
    if (orderCounts[status] !== undefined) {
      orderCounts[status]++;
    }

    const orderTotal = o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;

    if (['placed', 'accepted', 'ready_for_pickup'].includes(status)) {
      bookedOrderValueMinor += orderTotal;
    } else if (status === 'completed') {
      completedOrderValueMinor += orderTotal;
    }

    if (o.marketId) {
      const mId = o.marketId.toString();
      const prev = marketStatsMap.get(mId) || {
        marketId: mId,
        marketName: o.marketName || 'Unknown Market',
        totalOrders: 0,
        completedOrders: 0,
        bookedOrderValueMinor: 0,
        completedOrderValueMinor: 0,
      };

      prev.totalOrders++;
      if (status === 'completed') {
        prev.completedOrders++;
        prev.completedOrderValueMinor += orderTotal;
      } else if (['placed', 'accepted', 'ready_for_pickup'].includes(status)) {
        prev.bookedOrderValueMinor += orderTotal;
      }
      marketStatsMap.set(mId, prev);
    }
  }

  return {
    overview: {
      users: {
        total: totalUsers,
        customers: totalCustomers,
        farmers: totalFarmers,
        farmerApproval: {
          pending: pendingFarmers,
          approved: approvedFarmers,
          suspended: suspendedFarmers,
        },
      },
      markets: {
        total: totalMarkets,
        active: activeMarkets,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      orders: {
        ...orderCounts,
        bookedOrderValueMinor,
        completedOrderValueMinor,
        totalPlatformValueMinor: bookedOrderValueMinor + completedOrderValueMinor,
        currency: 'GBP',
      },
    },
    marketBreakdown: Array.from(marketStatsMap.values()),
    generatedAt: new Date().toISOString(),
  };
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
