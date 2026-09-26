/**
 * MarketLink metrics: the single source of truth for every number shown on a
 * dashboard, in a report, or quoted by the Copilot.
 *
 * All functions are pure: callers pass the already role-scoped records, so a
 * farmer's metrics and the admin's platform metrics use identical definitions.
 *
 * Definitions
 * - Performance period: past market days in [from, to] (inclusive, Asia/Karachi dates).
 * - Booked value: order value of every order in the period that was not cancelled or declined.
 * - Collected value: value of completed orders (payment is taken at the stall).
 * - Fulfilment rate: completed ÷ (completed + cancelled + declined), for the period.
 * - Open reservations: orders placed, accepted or ready, whatever their date.
 */

export const OPEN_STATUSES = ['placed', 'accepted', 'ready_for_pickup'];
const VOID_STATUSES = ['cancelled', 'declined'];
const TZ_OFFSET_HOURS = 5;

/** Pre-orders for a market day close at 06:00 Pakistan time on that day. */
export const PREORDER_CUTOFF_HOUR = 6;

/** The first market date a customer can still pre-order for. */
export function firstBookableDate(now = new Date()) {
  const pk = new Date(now.getTime() + TZ_OFFSET_HOURS * 3600000);
  const today = pk.toISOString().slice(0, 10);
  return pk.getUTCHours() < PREORDER_CUTOFF_HOUR ? today : addDays(today, 1);
}

export function todayPk(now = new Date()) {
  return new Date(now.getTime() + TZ_OFFSET_HOURS * 3600000).toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const PERIODS = {
  '7d': { days: 7, label: 'Last 7 days' },
  '30d': { days: 30, label: 'Last 30 days' },
  '90d': { days: 90, label: 'Last 90 days' },
};

/** Resolve a period key into inclusive date bounds plus the equal-length previous period. */
export function resolvePeriod(key = '30d', { now = new Date(), from, to } = {}) {
  const today = todayPk(now);
  if (key === 'custom' && from && to) {
    const span = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1);
    return { key, label: `${from} – ${to}`, from, to, prevFrom: addDays(from, -span), prevTo: addDays(from, -1) };
  }
  if (key === 'this_month' || key === 'last_month') {
    const [y, m] = today.split('-').map(Number);
    const start = key === 'this_month' ? new Date(Date.UTC(y, m - 1, 1)) : new Date(Date.UTC(y, m - 2, 1));
    const end = key === 'this_month' ? new Date(`${today}T00:00:00Z`) : new Date(Date.UTC(y, m - 1, 0));
    const f = start.toISOString().slice(0, 10);
    const t = end.toISOString().slice(0, 10);
    const span = Math.round((end - start) / 86400000) + 1;
    return { key, label: key === 'this_month' ? 'This month' : 'Last month', from: f, to: t, prevFrom: addDays(f, -span), prevTo: addDays(f, -1) };
  }
  const p = PERIODS[key] || PERIODS['30d'];
  const resolvedKey = PERIODS[key] ? key : '30d';
  const f = addDays(today, -(p.days - 1));
  return { key: resolvedKey, label: p.label, from: f, to: today, prevFrom: addDays(f, -p.days), prevTo: addDays(f, -1) };
}

const inRange = (date, from, to) => date >= from && date <= to;
const round1 = (n) => Math.round(n * 10) / 10;

function summarise(orders) {
  const valid = orders.filter((o) => !VOID_STATUSES.includes(o.status));
  const completed = orders.filter((o) => o.status === 'completed');
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;
  const declined = orders.filter((o) => o.status === 'declined').length;
  const resolved = completed.length + cancelled + declined;
  const bookedValueMinor = valid.reduce((s, o) => s + (o.totalAmountMinor || 0), 0);
  const customers = new Map();
  for (const o of valid) customers.set(String(o.customerId), (customers.get(String(o.customerId)) || 0) + 1);
  return {
    orders: orders.length,
    bookedOrders: valid.length,
    bookedValueMinor,
    collectedValueMinor: completed.reduce((s, o) => s + (o.totalAmountMinor || 0), 0),
    averageOrderValueMinor: valid.length ? Math.round(bookedValueMinor / valid.length) : 0,
    completed: completed.length,
    cancelled,
    declined,
    fulfilmentRate: resolved ? round1((completed.length / resolved) * 100) : null,
    unitsSold: completed.reduce((s, o) => s + (o.items || []).reduce((n, i) => n + (i.quantity || 0), 0), 0),
    uniqueCustomers: customers.size,
    repeatCustomers: [...customers.values()].filter((n) => n > 1).length,
  };
}

const pctChange = (current, previous) => (previous ? round1(((current - previous) / previous) * 100) : null);

/**
 * @param {object} input
 * @param {object[]} input.orders   role-scoped order documents
 * @param {object[]} [input.offers] role-scoped stock offers (upcoming)
 * @param {object[]} [input.reviews] role-scoped reviews
 * @param {Map<string,string>} [input.marketNames]
 * @param {Map<string,string>} [input.farmerNames] keyed by farmer profile id
 * @param {object} input.period result of resolvePeriod()
 * @param {Date} [input.now]
 */
export function computeMetrics({ orders = [], offers = [], reviews = [], marketNames = new Map(), farmerNames = new Map(), period, now = new Date() }) {
  const today = todayPk(now);
  const current = orders.filter((o) => inRange(o.marketDate, period.from, period.to));
  const previous = orders.filter((o) => inRange(o.marketDate, period.prevFrom, period.prevTo));
  const totals = summarise(current);
  const prev = summarise(previous);

  // Open reservations are point-in-time, independent of the performance period.
  const open = orders.filter((o) => OPEN_STATUSES.includes(o.status));
  const upcomingDates = [...new Set(open.map((o) => o.marketDate).filter((d) => d >= today))].sort();
  const nextMarketDate = upcomingDates[0] || null;
  const nextDay = open.filter((o) => o.marketDate === nextMarketDate);

  // One series point per market day with activity, so charts show real market days only.
  const byDate = new Map();
  for (const o of current) {
    const p = byDate.get(o.marketDate) || { date: o.marketDate, orders: 0, placed: 0, accepted: 0, ready_for_pickup: 0, completed: 0, cancelled: 0, declined: 0, bookedValueMinor: 0 };
    p.orders += 1;
    p[o.status] = (p[o.status] || 0) + 1;
    if (!VOID_STATUSES.includes(o.status)) p.bookedValueMinor += o.totalAmountMinor || 0;
    byDate.set(o.marketDate, p);
  }
  const series = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  const statusMix = { placed: 0, accepted: 0, ready_for_pickup: 0, completed: 0, cancelled: 0, declined: 0 };
  for (const o of current) statusMix[o.status] = (statusMix[o.status] || 0) + 1;

  const productAgg = new Map();
  for (const o of current.filter((x) => !VOID_STATUSES.includes(x.status))) {
    for (const i of o.items || []) {
      const key = String(i.productId);
      const a = productAgg.get(key) || { productId: key, name: i.name, unit: i.unit, units: 0, valueMinor: 0, orders: 0 };
      a.units += i.quantity || 0;
      a.valueMinor += i.subtotalMinor || (i.unitPriceMinor || 0) * (i.quantity || 0);
      a.orders += 1;
      productAgg.set(key, a);
    }
  }
  const topProducts = [...productAgg.values()].sort((a, b) => b.valueMinor - a.valueMinor);

  const group = (keyOf, names) => {
    const agg = new Map();
    for (const o of current.filter((x) => !VOID_STATUSES.includes(x.status))) {
      const key = String(keyOf(o));
      const a = agg.get(key) || { id: key, name: names.get(key) || '', orders: 0, valueMinor: 0 };
      a.orders += 1;
      a.valueMinor += o.totalAmountMinor || 0;
      agg.set(key, a);
    }
    return [...agg.values()].sort((a, b) => b.valueMinor - a.valueMinor);
  };

  const listedOffers = offers.filter((o) => o.date >= today);
  const lowStock = listedOffers.filter((o) => o.availableQuantity > 0 && o.availableQuantity <= Math.max(3, Math.ceil(o.totalQuantity * 0.2)));
  const soldOut = listedOffers.filter((o) => o.availableQuantity <= 0 || o.status === 'sold_out');

  const approvedReviews = reviews.filter((r) => r.moderationStatus === 'approved');
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of approvedReviews) distribution[r.rating] = (distribution[r.rating] || 0) + 1;

  return {
    period: { key: period.key, label: period.label, from: period.from, to: period.to },
    totals,
    previous: { orders: prev.orders, bookedValueMinor: prev.bookedValueMinor, completed: prev.completed, fulfilmentRate: prev.fulfilmentRate },
    change: {
      orders: pctChange(totals.orders, prev.orders),
      bookedValue: pctChange(totals.bookedValueMinor, prev.bookedValueMinor),
      completed: pctChange(totals.completed, prev.completed),
    },
    open: {
      placed: open.filter((o) => o.status === 'placed').length,
      accepted: open.filter((o) => o.status === 'accepted').length,
      readyForPickup: open.filter((o) => o.status === 'ready_for_pickup').length,
      total: open.length,
      valueMinor: open.reduce((s, o) => s + (o.totalAmountMinor || 0), 0),
      nextMarketDate,
      nextMarketDayOrders: nextDay.length,
      nextMarketDayUnits: nextDay.reduce((s, o) => s + (o.items || []).reduce((n, i) => n + (i.quantity || 0), 0), 0),
    },
    series,
    statusMix,
    topProducts: topProducts.slice(0, 10),
    slowProducts: topProducts.slice(-5).reverse(),
    byMarket: group((o) => o.marketId, marketNames),
    byFarmer: group((o) => o.farmerProfileId || o.farmerId, farmerNames),
    stock: {
      offers: listedOffers.length,
      totalUnits: listedOffers.reduce((s, o) => s + (o.totalQuantity || 0), 0),
      reservedUnits: listedOffers.reduce((s, o) => s + (o.reservedQuantity || 0), 0),
      availableUnits: listedOffers.reduce((s, o) => s + Math.max(0, o.availableQuantity || 0), 0),
      lowStock: lowStock.map((o) => ({ offerId: String(o._id), productId: String(o.productId), marketId: String(o.marketId), date: o.date, available: o.availableQuantity, total: o.totalQuantity })),
      soldOut: soldOut.map((o) => ({ offerId: String(o._id), productId: String(o.productId), marketId: String(o.marketId), date: o.date })),
    },
    reviews: {
      average: approvedReviews.length ? round1(approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length) : null,
      count: approvedReviews.length,
      distribution,
      awaitingReply: approvedReviews.filter((r) => r.targetType === 'farmer' && !r.farmerReply).length,
      flagged: reviews.filter((r) => r.moderationStatus === 'flagged').length,
    },
  };
}
