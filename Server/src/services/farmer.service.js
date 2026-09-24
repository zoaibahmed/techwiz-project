import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

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

export async function getFarmerReportsService(userId) {
  const db = getDB();
  const fId = new ObjectId(userId);
  const profile = await db.collection('farmerProfiles').findOne({ userId: fId });
  const possibleIds = [fId];
  if (profile) possibleIds.push(profile._id);

  // 1. Order aggregation by status
  const orders = await db
    .collection('orders')
    .find({ $or: [{ farmerId: { $in: possibleIds } }, { farmerProfileId: { $in: possibleIds } }] })
    .toArray();

  const counts = {
    total: orders.length,
    placed: 0,
    accepted: 0,
    ready_for_pickup: 0,
    completed: 0,
    declined: 0,
    cancelled: 0,
  };

  let bookedOrderValueMinor = 0;
  let actualCollectedPaymentMinor = 0;

  const productSalesMap = new Map();

  for (const o of orders) {
    const status = o.status === 'confirmed' ? 'accepted' : o.status;
    if (counts[status] !== undefined) {
      counts[status]++;
    }

    const orderTotal = o.totalAmountMinor || (o.total ? o.total.amountMinor : 0) || 0;

    // Booked value: Active pre-orders reserved
    if (['placed', 'accepted', 'ready_for_pickup'].includes(status)) {
      bookedOrderValueMinor += orderTotal;
    }

    // Actual collected payment: Physical payment recorded at pickup
    if (status === 'completed' && (o.payment?.status === 'paid_at_pickup' || o.paymentStatus === 'paid')) {
      actualCollectedPaymentMinor += (o.payment?.paidAmountMinor || orderTotal);
    }

    // Aggregate product sales from completed and active pre-orders
    if (['placed', 'accepted', 'ready_for_pickup', 'completed'].includes(status)) {
      for (const item of (o.items || [])) {
        const pIdStr = item.productId ? item.productId.toString() : '';
        const prev = productSalesMap.get(pIdStr) || {
          productId: pIdStr,
          productName: item.name,
          unit: item.unit,
          quantitySold: 0,
          revenueMinor: 0,
        };
        prev.quantitySold += item.quantity || 0;
        prev.revenueMinor += (item.totalPriceMinor || ((item.unitPriceMinor || 0) * (item.quantity || 0)));
        productSalesMap.set(pIdStr, prev);
      }
    }
  }

  const bestSellingProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 10);

  // 2. Upcoming pickup schedule (grouped by date)
  const today = new Date().toISOString().split('T')[0];
  const upcomingOrders = orders.filter(
    (o) => ['placed', 'accepted', 'confirmed', 'ready_for_pickup'].includes(o.status) && o.marketDate >= today
  );
  const scheduleMap = new Map();
  for (const uo of upcomingOrders) {
    const date = uo.marketDate;
    const prev = scheduleMap.get(date) || {
      date,
      orderCount: 0,
      totalBookedMinor: 0,
      marketName: uo.marketSnapshot?.name || 'Farmers Market',
    };
    prev.orderCount++;
    prev.totalBookedMinor += uo.totalAmountMinor || 0;
    scheduleMap.set(date, prev);
  }

  const upcomingPickupSchedule = Array.from(scheduleMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // 3. Weekly stock summary count
  const stockOffers = await db
    .collection('stockOffers')
    .find({
      farmerId: { $in: possibleIds },
      date: { $gte: today },
    })
    .sort({ date: 1 })
    .toArray();

  return {
    farmerId: userId,
    businessName: profile?.businessName || 'Farm',
    metrics: {
      orderCounts: counts,
      bookedOrderValue: {
        amountMinor: bookedOrderValueMinor,
        currency: 'PKR',
        description: 'Value of currently reserved pre-orders pending pickup',
      },
      actualCollectedPayment: {
        amountMinor: actualCollectedPaymentMinor,
        currency: 'PKR',
        description: 'Physical payment confirmed by farmer at market stall pickup',
      },
    },
    bestSellingProducts,
    upcomingPickupSchedule,
    activeStockOffersCount: stockOffers.length,
  };
}


