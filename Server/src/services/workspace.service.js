import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { computeMetrics, resolvePeriod, todayPk, firstBookableDate, OPEN_STATUSES } from './metrics.service.js';

/**
 * Builds the complete, consistent data the web client renders: the public
 * catalogue and a role-scoped workspace. Every screen reads from these two
 * payloads, and every number comes from metrics.service.js.
 */

const TZ_OFFSET_HOURS = 5;
const STAGE = {
  placed: 'Placed',
  accepted: 'Accepted',
  confirmed: 'Accepted',
  ready_for_pickup: 'Ready for pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};
const FARMER_STATE = { approved: 'Approved', pending: 'Pending', suspended: 'Suspended', rejected: 'Suspended' };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const str = (v) => (v == null ? '' : String(v));
const iso = (v) => (v instanceof Date ? v.toISOString() : v ? new Date(v).toISOString() : null);

/** Wall-clock time on a Pakistan date as an ISO string with offset. */
const pkIso = (date, hhmm) => `${date}T${hhmm || '00:00'}:00+05:00`;

/** Upcoming market dates that can still take pre-orders, starting from `from` (inclusive). */
function nextDatesFor(days, from, count = 2) {
  const out = [];
  for (let i = 0; out.length < count && i < 30; i++) {
    const d = new Date(`${from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    if (days.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function marketView(m, today, extra = {}) {
  const [lng, lat] = m.coordinates?.coordinates || [];
  const days = m.operatingDays || [];
  const next = nextDatesFor(days, firstBookableDate());
  return {
    id: str(m._id),
    name: m.name,
    slug: m.slug || '',
    area: m.locality || '',
    address: m.address,
    city: m.city || 'Lahore',
    countryCode: m.countryCode || 'PK',
    countryName: m.countryName || 'Pakistan',
    currency: m.currency || 'PKR',
    timeZone: m.timezone || 'Asia/Karachi',
    coordinates: lat != null ? { latitude: lat, longitude: lng } : undefined,
    operatingDays: days,
    dayNames: days.map((d) => DAY_NAMES[d]),
    open: m.operatingHours?.open || '',
    close: m.operatingHours?.close || '',
    hours: m.operatingHours ? `${m.operatingHours.open}–${m.operatingHours.close}` : '',
    day: next[0] || '',
    nextDates: next,
    active: m.isActive !== false,
    description: m.description || '',
    image: m.imageUrl || '',
    ...extra,
  };
}

function farmerView(p, extra = {}) {
  return {
    id: str(p._id),
    userId: str(p.userId),
    name: p.businessName,
    person: p.contactPerson || '',
    story: p.story || p.bio || '',
    bio: p.bio || '',
    specialties: p.specialties || [],
    since: p.farmingSince || null,
    location: p.address || '',
    stall: p.stallNumber || '',
    marketId: str(p.marketIds?.[0]),
    marketIds: (p.marketIds || []).map(str),
    state: FARMER_STATE[p.approvalStatus] || 'Pending',
    rating: p.metrics?.rating || 0,
    reviewCount: p.metrics?.reviewCount || 0,
    image: p.profileImageUrl || '',
    appliedAt: iso(p.createdAt),
    ...extra,
  };
}

/** Products carry their upcoming dated offers; stock fields describe the nearest one. */
function productView(p, offers, categoryName, extra = {}) {
  const upcoming = offers.sort((a, b) => a.date.localeCompare(b.date) || str(a.marketId).localeCompare(str(b.marketId)));
  const nearest = upcoming.find((o) => o.status === 'available' && o.availableQuantity > 0) || upcoming[0];
  return {
    id: str(p._id),
    farmerId: str(p.farmerId),
    name: p.name,
    category: categoryName,
    categoryId: str(p.categoryId),
    unit: p.unit,
    price: nearest?.priceMinor || p.basePriceMinor,
    basePrice: p.basePriceMinor,
    stock: nearest ? nearest.totalQuantity : 0,
    reserved: nearest ? nearest.reservedQuantity : 0,
    description: p.description || '',
    image: p.imageUrl || '',
    visible: p.status !== 'hidden' && !p.isArchived,
    archived: !!p.isArchived,
    available: !!nearest && nearest.status === 'available' && nearest.availableQuantity > 0,
    marketId: str(nearest?.marketId),
    date: nearest?.date || '',
    offerId: str(nearest?._id),
    offers: upcoming.map((o) => ({
      id: str(o._id),
      marketId: str(o.marketId),
      date: o.date,
      price: o.priceMinor,
      total: o.totalQuantity,
      reserved: o.reservedQuantity,
      available: Math.max(0, o.availableQuantity),
      status: o.status,
    })),
    rating: p.metrics?.rating || 0,
    reviewCount: p.metrics?.reviewCount || 0,
    ...extra,
  };
}

function slotView(w) {
  return {
    id: str(w._id),
    farmerId: str(w.farmerId),
    marketId: str(w.marketId),
    date: w.date,
    start: pkIso(w.date, w.startTime),
    end: pkIso(w.date, w.endTime),
    cutoff: iso(w.cutoffAt),
    capacity: w.maxCapacity || 0,
    reserved: w.currentReservations || 0,
  };
}

function orderView(o, profileIdOf) {
  const items = o.items || (o.lines || []).map((l) => ({
    productId: l.productId, name: l.productNameSnapshot, unit: l.unitSnapshot, unitPriceMinor: l.unitPriceMinorSnapshot, quantity: l.quantity,
  }));
  return {
    id: str(o._id),
    number: o.orderNumber || str(o._id).slice(-6).toUpperCase(),
    farmerId: str(o.farmerProfileId) || profileIdOf(str(o.farmerId)),
    farmerName: o.farmerSnapshot?.businessName || '',
    marketId: str(o.marketId),
    marketName: o.marketSnapshot?.name || '',
    slotId: o.pickupWindow?.id || str(o.pickupWindowId),
    marketDate: o.marketDate,
    window: { start: o.pickupWindow?.startTime || '', end: o.pickupWindow?.endTime || '' },
    cutoff: iso(o.pickupWindow?.cutoffAt || o.cutoffAt),
    status: o.status,
    stage: STAGE[o.status] || 'Placed',
    lines: items.map((i) => ({ productId: str(i.productId), name: i.name, unit: i.unit, price: i.unitPriceMinor || 0, quantity: i.quantity || 0 })),
    total: o.totalAmountMinor || 0,
    customerId: str(o.customerId),
    customerName: o.customerSnapshot?.name || '',
    customerPhone: o.customerSnapshot?.phone || '',
    notes: o.customerNotes || '',
    events: (o.statusHistory || []).map((h) => ({ label: STAGE[h.status] || h.status, at: iso(h.timestamp || h.changedAt) })),
    createdAt: iso(o.createdAt),
  };
}

function reviewView(r, extra = {}) {
  const author = (r.customerName || 'Customer').trim();
  const [first, last] = author.split(/\s+/);
  return {
    id: str(r._id),
    orderId: str(r.orderId),
    target: str(r.targetId),
    targetType: r.targetType,
    farmerId: str(r.targetType === 'farmer' ? r.targetId : ''),
    rating: r.rating,
    text: r.comment,
    reply: r.farmerReply?.text || r.farmerReply?.replyText || '',
    visible: r.moderationStatus === 'approved',
    status: r.moderationStatus || 'approved',
    verified: r.verified ?? !!r.orderId,
    reason: r.moderationReason || '',
    author: last ? `${first} ${last[0]}.` : first,
    at: iso(r.createdAt),
    ...extra,
  };
}

function noticeHref(n, role) {
  const d = n.data || n.metadata || {};
  const orderId = d.orderId ? str(d.orderId) : '';
  switch (n.type) {
    case 'order_received':
      return orderId ? `/farmer/orders/${orderId}` : '/farmer/orders';
    case 'review_received':
      return '/farmer/reviews';
    case 'farmer_application':
      return d.farmerProfileId ? `/admin/farmers/${d.farmerProfileId}` : '/admin/farmers';
    case 'review_flagged':
    case 'review_pending':
      return '/admin/moderation';
    case 'review_approved':
      return d.farmerProfileId ? `/farmers/${d.farmerProfileId}` : '/customer';
    case 'review_rejected':
      return '/customer';
    case 'restock_watch':
    case 'restock_available':
      return d.productId ? `/products/${d.productId}` : '/products';
    default:
      if (orderId) return role === 'farmer' ? `/farmer/orders/${orderId}` : `/customer/orders/${orderId}`;
      return `/${role}`;
  }
}

function noticeView(n, role) {
  return {
    id: str(n._id),
    role,
    title: n.title,
    text: n.message,
    href: noticeHref(n, role),
    read: !!n.isRead,
    at: iso(n.createdAt),
    type: n.type,
  };
}

function announcementView(a) {
  return {
    id: str(a._id),
    title: a.title,
    body: a.message,
    published: a.isActive !== false,
    type: a.type || 'general',
    priority: a.priority || 'normal',
    marketId: str(a.marketId),
    at: iso(a.createdAt),
  };
}

// ─── Public catalogue ─────────────────────────────────────────────────────────

export async function getCatalogueService({ now = new Date() } = {}) {
  const db = getDB();
  const today = todayPk(now);
  const [markets, categories, profiles, products, offers, windows, reviews, announcements] = await Promise.all([
    db.collection('markets').find({ isActive: { $ne: false } }).toArray(),
    db.collection('categories').find({ isActive: { $ne: false } }).sort({ name: 1 }).toArray(),
    db.collection('farmerProfiles').find({ approvalStatus: 'approved' }).toArray(),
    db.collection('products').find({ isArchived: { $ne: true }, status: { $ne: 'hidden' } }).toArray(),
    db.collection('stockOffers').find({ date: { $gte: today } }).toArray(),
    db.collection('pickupWindows').find({ date: { $gte: today } }).sort({ date: 1, startTime: 1 }).toArray(),
    db.collection('reviews').find({ moderationStatus: 'approved' }).sort({ createdAt: -1 }).toArray(),
    db.collection('announcements').find({ isActive: true }).sort({ createdAt: -1 }).toArray(),
  ]);

  const approved = new Set(profiles.map((p) => str(p._id)));
  const categoryName = new Map(categories.map((c) => [str(c._id), c.name]));
  const offersByProduct = new Map();
  for (const o of offers) {
    const k = str(o.productId);
    if (!offersByProduct.has(k)) offersByProduct.set(k, []);
    offersByProduct.get(k).push(o);
  }
  const publicProducts = products
    .filter((p) => approved.has(str(p.farmerId)))
    .map((p) => productView(p, offersByProduct.get(str(p._id)) || [], categoryName.get(str(p.categoryId)) || 'Produce'));
  const productCountByFarmer = new Map();
  for (const p of publicProducts) productCountByFarmer.set(p.farmerId, (productCountByFarmer.get(p.farmerId) || 0) + 1);

  const marketViews = markets.map((m) => {
    const attending = profiles.filter((p) => (p.marketIds || []).some((id) => str(id) === str(m._id)));
    const next = nextDatesFor(m.operatingDays || [], firstBookableDate(now))[0];
    const productCount = new Set(offers.filter((o) => str(o.marketId) === str(m._id) && o.date === next && approved.has(str(o.farmerId)) && o.status !== 'unavailable').map((o) => str(o.productId))).size;
    return marketView(m, today, { attendingFarmerCount: attending.length, farmerIds: attending.map((p) => str(p._id)), productCount });
  });

  const categoryViews = categories.map((c) => ({
    id: str(c._id),
    name: c.name,
    slug: c.slug,
    description: c.description || '',
    productCount: publicProducts.filter((p) => p.categoryId === str(c._id)).length,
  }));

  return {
    generatedAt: now.toISOString(),
    today,
    markets: marketViews,
    categories: categoryViews,
    farmers: profiles.map((p) => farmerView(p, { productCount: productCountByFarmer.get(str(p._id)) || 0 })),
    products: publicProducts,
    slots: windows.filter((w) => approved.has(str(w.farmerId))).map(slotView),
    reviews: reviews.filter((r) => r.targetType === 'product' || approved.has(str(r.targetId))).slice(0, 400).map((r) => reviewView(r)),
    announcements: announcements.map(announcementView),
  };
}

// ─── Role workspaces ──────────────────────────────────────────────────────────

async function lookups(db) {
  const [markets, profiles] = await Promise.all([
    db.collection('markets').find({}, { projection: { name: 1 } }).toArray(),
    db.collection('farmerProfiles').find({}, { projection: { businessName: 1, userId: 1 } }).toArray(),
  ]);
  const marketNames = new Map(markets.map((m) => [str(m._id), m.name]));
  const farmerNames = new Map(profiles.map((p) => [str(p._id), p.businessName]));
  const profileByUser = new Map(profiles.map((p) => [str(p.userId), str(p._id)]));
  const profileIdOf = (id) => profileByUser.get(id) || id;
  return { marketNames, farmerNames, profileIdOf };
}

async function notificationsFor(db, userId, role) {
  const list = await db.collection('notifications').find({ userId: new ObjectId(userId) }).sort({ createdAt: -1 }).limit(40).toArray();
  return list.map((n) => noticeView(n, role));
}

export async function getWorkspaceService(user, { period: periodKey = '30d', from, to, now = new Date() } = {}) {
  const db = getDB();
  const period = resolvePeriod(periodKey, { now, from, to });
  const { marketNames, farmerNames, profileIdOf } = await lookups(db);
  const userDoc = await db.collection('users').findOne({ _id: new ObjectId(user.id) }, { projection: { passwordHash: 0 } });
  const session = { id: user.id, role: user.role, name: userDoc?.name || user.name, email: userDoc?.email || user.email, phone: userDoc?.phone || '', address: userDoc?.address || '', active: userDoc?.isActive !== false };
  const notices = await notificationsFor(db, user.id, user.role);

  if (user.role === 'customer') {
    const cId = new ObjectId(user.id);
    const [orders, favourites, alerts, reviews] = await Promise.all([
      db.collection('orders').find({ customerId: cId }).sort({ createdAt: -1 }).toArray(),
      db.collection('favourites').find({ customerId: cId }).toArray(),
      db.collection('restockAlerts').find({ customerId: cId, status: 'active' }).toArray(),
      db.collection('reviews').find({ customerId: cId }).toArray(),
    ]);
    return {
      session,
      notices,
      orders: orders.map((o) => orderView(o, profileIdOf)),
      favourites: favourites.map((f) => ({ type: f.targetType, id: str(f.targetId) })),
      restockAlerts: alerts.map((a) => ({ id: str(a._id), productId: str(a.productId), marketId: str(a.marketId) })),
      myReviews: reviews.map((r) => reviewView(r)),
      metrics: computeMetrics({ orders, reviews, marketNames, farmerNames, period, now }),
    };
  }

  if (user.role === 'farmer') {
    const profile = await db.collection('farmerProfiles').findOne({ userId: new ObjectId(user.id) });
    if (!profile) return { session, notices, profile: null };
    const fId = profile._id;
    const today = todayPk(now);
    const [products, offers, windows, orders, reviews, templates, categories] = await Promise.all([
      db.collection('products').find({ farmerId: fId }).sort({ createdAt: 1 }).toArray(),
      db.collection('stockOffers').find({ farmerId: fId, date: { $gte: today } }).toArray(),
      db.collection('pickupWindows').find({ farmerId: fId, date: { $gte: today } }).sort({ date: 1, startTime: 1 }).toArray(),
      db.collection('orders').find({ $or: [{ farmerProfileId: fId }, { farmerId: { $in: [fId, new ObjectId(user.id)] } }] }).sort({ createdAt: -1 }).toArray(),
      db.collection('reviews').find({ $or: [{ targetId: fId }, { farmerId: { $in: [fId, new ObjectId(user.id)] } }] }).sort({ createdAt: -1 }).toArray(),
      db.collection('weeklyStockTemplates').find({ farmerId: fId }).toArray(),
      db.collection('categories').find({}).toArray(),
    ]);
    const categoryName = new Map(categories.map((c) => [str(c._id), c.name]));
    const offersByProduct = new Map();
    for (const o of offers) {
      const k = str(o.productId);
      if (!offersByProduct.has(k)) offersByProduct.set(k, []);
      offersByProduct.get(k).push(o);
    }
    return {
      session,
      notices,
      profile: farmerView(profile, { email: profile.email, phone: profile.phone, approvalStatus: profile.approvalStatus, suspensionReason: profile.suspensionReason || '' }),
      products: products.map((p) => productView(p, offersByProduct.get(str(p._id)) || [], categoryName.get(str(p.categoryId)) || 'Produce')),
      slots: windows.map(slotView),
      orders: orders.map((o) => orderView(o, profileIdOf)),
      reviews: reviews.map((r) => reviewView(r)),
      templates: templates.map((t) => ({
        id: str(t._id),
        name: `${marketNames.get(str(t.marketId)) || 'Market'} · ${DAY_NAMES[t.dayOfWeek]}`,
        marketId: str(t.marketId),
        dayOfWeek: t.dayOfWeek,
        quantities: Object.fromEntries((t.items || []).map((i) => [str(i.productId), i.defaultQuantity])),
      })),
      metrics: computeMetrics({ orders, offers, reviews, marketNames, farmerNames, period, now }),
    };
  }

  // Admin: mission control over the whole platform.
  const today = todayPk(now);
  const [markets, profiles, users, products, offers, orders, reviews, announcements, inquiries, categories] = await Promise.all([
    db.collection('markets').find({}).toArray(),
    db.collection('farmerProfiles').find({}).toArray(),
    db.collection('users').find({}, { projection: { passwordHash: 0 } }).toArray(),
    db.collection('products').find({}).toArray(),
    db.collection('stockOffers').find({ date: { $gte: today } }).toArray(),
    db.collection('orders').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection('reviews').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection('announcements').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection('contactInquiries').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection('categories').find({}).toArray(),
  ]);
  const categoryName = new Map(categories.map((c) => [str(c._id), c.name]));
  const userById = new Map(users.map((u) => [str(u._id), u]));
  const offersByProduct = new Map();
  for (const o of offers) {
    const k = str(o.productId);
    if (!offersByProduct.has(k)) offersByProduct.set(k, []);
    offersByProduct.get(k).push(o);
  }
  const ordersByCustomer = new Map();
  for (const o of orders) {
    const k = str(o.customerId);
    if (!ordersByCustomer.has(k)) ordersByCustomer.set(k, []);
    ordersByCustomer.get(k).push(o);
  }

  const customers = users
    .filter((u) => u.role === 'customer')
    .map((u) => {
      const own = ordersByCustomer.get(str(u._id)) || [];
      const valid = own.filter((o) => !['cancelled', 'declined'].includes(o.status));
      return {
        id: str(u._id),
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        address: u.address || '',
        active: u.isActive !== false,
        since: iso(u.createdAt),
        orders: own.length,
        openOrders: own.filter((o) => OPEN_STATUSES.includes(o.status)).length,
        valueMinor: valid.reduce((s, o) => s + (o.totalAmountMinor || 0), 0),
        lastOrderDate: own.map((o) => o.marketDate).sort().pop() || null,
      };
    })
    .sort((a, b) => b.valueMinor - a.valueMinor);

  const metrics = computeMetrics({ orders, offers, reviews, marketNames, farmerNames, period, now });
  const recentFrom = resolvePeriod('90d', { now }).from;
  metrics.platform = {
    farmers: {
      approved: profiles.filter((p) => p.approvalStatus === 'approved').length,
      pending: profiles.filter((p) => p.approvalStatus === 'pending').length,
      suspended: profiles.filter((p) => ['suspended', 'rejected'].includes(p.approvalStatus)).length,
    },
    customers: { total: customers.length, active: customers.filter((c) => c.active).length, ordering: customers.filter((c) => c.orders > 0).length },
    markets: { active: markets.filter((m) => m.isActive !== false).length, total: markets.length },
    products: { listed: products.filter((p) => !p.isArchived && p.status !== 'hidden').length, hidden: products.filter((p) => p.status === 'hidden').length },
    categories: categories.length,
    inquiries: { open: inquiries.filter((i) => i.status !== 'resolved').length },
  };

  return {
    session,
    notices,
    markets: markets.map((m) => marketView(m, today, {
      attendingFarmerCount: profiles.filter((p) => p.approvalStatus === 'approved' && (p.marketIds || []).some((id) => str(id) === str(m._id))).length,
    })),
    farmers: profiles.map((p) => {
      const u = userById.get(str(p.userId));
      return farmerView(p, {
        email: p.email || u?.email || '',
        phone: p.phone || u?.phone || '',
        approvalStatus: p.approvalStatus,
        suspensionReason: p.suspensionReason || '',
        productCount: products.filter((x) => str(x.farmerId) === str(p._id) && !x.isArchived).length,
      });
    }),
    customers,
    products: products.map((p) => productView(p, offersByProduct.get(str(p._id)) || [], categoryName.get(str(p.categoryId)) || 'Produce', {
      farmerName: farmerNames.get(str(p.farmerId)) || '',
      status: p.status || 'active',
    })),
    // Lists are trimmed for transfer; metrics above are computed over every record.
    orders: orders.filter((o) => OPEN_STATUSES.includes(o.status) || o.marketDate >= recentFrom).map((o) => orderView(o, profileIdOf)),
    reviews: [...reviews.filter((r) => r.moderationStatus !== 'approved'), ...reviews.filter((r) => r.moderationStatus === 'approved').slice(0, 150)].map((r) => reviewView(r)),
    announcements: announcements.map(announcementView),
    categories: categories.map((c) => ({
      id: str(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      productCount: products.filter((p) => str(p.categoryId) === str(c._id) && !p.isArchived).length,
    })),
    inquiries: inquiries.map((i) => ({ id: str(i._id), name: i.name, email: i.email, subject: i.subject, message: i.message, status: i.status, at: iso(i.createdAt) })),
    metrics,
  };
}

// ─── Public pulse (homepage intelligence) ─────────────────────────────────────

const toRad = (d) => (d * Math.PI) / 180;
function km([lng1, lat1], [lng2, lat2]) {
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Anonymised, aggregate platform activity for the public homepage. Every figure
 * uses the same definitions as the dashboards (metrics.service.js).
 */
export async function getPulseService({ now = new Date() } = {}) {
  const db = getDB();
  const period = resolvePeriod('30d', { now });
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const [markets, profiles, products, orders, reviews] = await Promise.all([
    db.collection('markets').find({ isActive: { $ne: false } }).toArray(),
    db.collection('farmerProfiles').find({ approvalStatus: 'approved' }).toArray(),
    db.collection('products').find({ isArchived: { $ne: true }, status: { $ne: 'hidden' } }).toArray(),
    db.collection('orders').find({}).toArray(),
    db.collection('reviews').find({ moderationStatus: 'approved' }).sort({ createdAt: -1 }).toArray(),
  ]);
  const approved = new Set(profiles.map((p) => str(p._id)));
  const listed = products.filter((p) => approved.has(str(p.farmerId)));
  const marketById = new Map(markets.map((m) => [str(m._id), m]));
  const profileById = new Map(profiles.map((p) => [str(p._id), p]));
  const marketNames = new Map(markets.map((m) => [str(m._id), m.name]));
  const farmerNames = new Map(profiles.map((p) => [str(p._id), p.businessName]));
  const metrics = computeMetrics({ orders, reviews, marketNames, farmerNames, period, now });

  const cities = new Map();
  for (const m of markets) {
    const key = m.city || 'Lahore';
    const c = cities.get(key) || { city: key, region: m.region || '', markets: 0, growers: new Set(), coordinates: null };
    c.markets += 1;
    c.coordinates = c.coordinates || m.coordinates?.coordinates;
    for (const p of profiles) if ((p.marketIds || []).some((id) => str(id) === str(m._id))) c.growers.add(str(p._id));
    cities.set(key, c);
  }

  const profileIdOfOrder = (o) => str(o.farmerProfileId) || str(o.farmerId);
  const activity = orders
    .filter((o) => o.createdAt && o.createdAt <= now)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10)
    .map((o) => {
      const item = (o.items || [])[0] || {};
      const m = marketById.get(str(o.marketId));
      return {
        at: iso(o.createdAt),
        quantity: item.quantity || 1,
        unit: item.unit || '',
        product: item.name || 'produce',
        grower: o.farmerSnapshot?.businessName || farmerNames.get(profileIdOfOrder(o)) || '',
        market: m?.name || o.marketSnapshot?.name || '',
        city: m?.city || o.marketSnapshot?.city || '',
        status: o.status,
      };
    });

  const routes = [];
  for (const p of profiles) {
    const from = p.stallCoordinates?.coordinates;
    if (!from) continue;
    for (const mid of p.marketIds || []) {
      const m = marketById.get(str(mid));
      const to = m?.coordinates?.coordinates;
      if (!to) continue;
      routes.push({
        grower: p.businessName,
        market: m.name,
        city: m.city || 'Lahore',
        from: { lng: from[0], lat: from[1] },
        to: { lng: to[0], lat: to[1] },
        km: km(from, to),
      });
    }
  }
  const localRoutes = routes.filter((r) => r.km <= 150);

  // Restock candidate: the listed product whose upcoming stock sells through fastest.
  const today = todayPk(now);
  const offers = await db.collection('stockOffers').find({ date: { $gte: today } }).toArray();
  const fastest = offers
    .filter((o) => o.totalQuantity > 0 && approved.has(str(o.farmerId)))
    .map((o) => ({ o, rate: o.reservedQuantity / o.totalQuantity }))
    .sort((a, b) => b.rate - a.rate)[0];
  const restockProduct = fastest && listed.find((p) => str(p._id) === str(fastest.o.productId));

  const recentOrders = orders.filter((o) => o.createdAt >= weekAgo && o.createdAt <= now);
  const upcomingDates = [...new Set(markets.flatMap((m) => nextDatesFor(m.operatingDays || [], firstBookableDate(now), 1)))].sort();
  const byCityValue = new Map();
  for (const x of metrics.byMarket) {
    const city = marketById.get(x.id)?.city || 'Lahore';
    byCityValue.set(city, (byCityValue.get(city) || 0) + x.valueMinor);
  }
  const topMarket = metrics.byMarket[0];

  return {
    generatedAt: now.toISOString(),
    network: {
      countries: new Set(markets.map((m) => m.countryCode || 'PK')).size,
      cities: [...cities.values()].map((c) => ({
        city: c.city,
        region: c.region,
        markets: c.markets,
        growers: c.growers.size,
        coordinates: c.coordinates ? { lng: c.coordinates[0], lat: c.coordinates[1] } : null,
        bookedValueMinor: byCityValue.get(c.city) || 0,
      })),
      markets: markets.length,
      growers: profiles.length,
      products: listed.length,
      categories: new Set(listed.map((p) => str(p.categoryId))).size,
    },
    week: {
      reservations: recentOrders.length,
      openReservations: metrics.open.total,
      unitsReserved: metrics.open.nextMarketDayUnits,
      nextMarketDate: upcomingDates[0] || null,
    },
    trust: {
      fulfilmentRate: metrics.totals.fulfilmentRate,
      ordersCollected: orders.filter((o) => o.status === 'completed').length,
      rating: metrics.reviews.average,
      reviews: metrics.reviews.count,
      repeatCustomers: metrics.totals.repeatCustomers,
      customers: metrics.totals.uniqueCustomers,
      bookedValueMinor: metrics.totals.bookedValueMinor,
    },
    highlights: {
      topProduct: metrics.topProducts[0]
        ? { name: metrics.topProducts[0].name, units: metrics.topProducts[0].units, valueMinor: metrics.topProducts[0].valueMinor }
        : null,
      strongestMarket: topMarket
        ? { name: topMarket.name, city: marketById.get(topMarket.id)?.city || '', orders: topMarket.orders, valueMinor: topMarket.valueMinor }
        : null,
      topGrower: metrics.byFarmer[0] ? { name: metrics.byFarmer[0].name, orders: metrics.byFarmer[0].orders } : null,
      restock: restockProduct
        ? {
            name: restockProduct.name,
            grower: profileById.get(str(restockProduct.farmerId))?.businessName || '',
            sellThrough: Math.round(fastest.rate * 100),
            market: marketById.get(str(fastest.o.marketId))?.name || '',
          }
        : null,
      growthPct: metrics.change.bookedValue,
    },
    activity,
    routes: localRoutes,
    averageRouteKm: localRoutes.length ? Math.round(localRoutes.reduce((s, r) => s + r.km, 0) / localRoutes.length) : null,
    reviews: reviews
      .filter((r) => r.rating >= 4 && r.comment && r.comment.length > 30)
      .slice(0, 14)
      .map((r) => {
        const [first, last] = (r.customerName || 'Customer').split(/\s+/);
        return {
          text: r.comment,
          rating: r.rating,
          author: last ? `${first} ${last[0]}.` : first,
          grower: r.targetType === 'farmer' ? profileById.get(str(r.targetId))?.businessName || '' : '',
        };
      }),
  };
}
