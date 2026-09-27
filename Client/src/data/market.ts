import { localization } from "./localization";

// View models rendered by the UI. They are built from the live API
// (/catalogue and /workspace) in gateway.ts.
export type Role = "customer" | "farmer" | "admin";
export type OrderStage =
  | "Placed"
  | "Accepted"
  | "Ready for pickup"
  | "Completed"
  | "Cancelled"
  | "Declined";
export interface Market {
  id: string;
  name: string;
  area: string;
  address: string;
  /** Next market date (YYYY-MM-DD). */
  day: string;
  hours: string;
  active: boolean;
  region?: string;
  countryCode?: string;
  countryName?: string;
  city?: string;
  currency?: string;
  timeZone?: string;
  coordinates?: { latitude: number; longitude: number };
  operatingDays?: number[];
  dayNames?: string[];
  open?: string;
  close?: string;
  nextDates?: string[];
  attendingFarmerCount?: number;
  farmerIds?: string[];
  productCount?: number;
  description?: string;
  image?: string;
}
export interface Farmer {
  id: string;
  name: string;
  person: string;
  story: string;
  marketId: string;
  state: "Pending" | "Approved" | "Suspended";
  userId?: string;
  bio?: string;
  specialties?: string[];
  since?: number | null;
  location?: string;
  stall?: string;
  marketIds?: string[];
  rating?: number;
  reviewCount?: number;
  productCount?: number;
  image?: string;
  email?: string;
  phone?: string;
  appliedAt?: string | null;
  suspensionReason?: string;
  approvalStatus?: string;
  onboardingStatus?: string;
}
export interface Offer {
  id: string;
  marketId: string;
  date: string;
  price: number;
  total: number;
  reserved: number;
  available: number;
  status: string;
}
export interface Product {
  id: string;
  farmerId: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  reserved: number;
  description: string;
  image: string;
  visible: boolean;
  available: boolean;
  categoryId?: string;
  basePrice?: number;
  currency?: string;
  archived?: boolean;
  /** Market and date of the nearest dated offer that `stock` describes. */
  marketId?: string;
  date?: string;
  offerId?: string;
  offers?: Offer[];
  rating?: number;
  reviewCount?: number;
  farmerName?: string;
  status?: string;
}
export interface Slot {
  id: string;
  farmerId: string;
  marketId: string;
  start: string;
  end: string;
  cutoff: string;
  date?: string;
  capacity?: number;
  reserved?: number;
}
export interface Line {
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  currency?: string;
}
export interface Order {
  id: string;
  farmerId: string;
  marketId: string;
  slotId: string;
  stage: OrderStage;
  lines: Line[];
  events: { label: string; at: string }[];
  /** Human-facing order reference, e.g. ML-20260926-1A2B. */
  number?: string;
  status?: string;
  marketDate?: string;
  window?: { start: string; end: string };
  cutoff?: string | null;
  total?: number;
  currency?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  farmerName?: string;
  marketName?: string;
  notes?: string;
  createdAt?: string | null;
}
export interface Review {
  id: string;
  orderId: string;
  target: string;
  rating: number;
  text: string;
  reply: string;
  visible: boolean;
  targetType?: "farmer" | "product";
  author?: string;
  at?: string | null;
  status?: string;
  reason?: string;
  /** The author collected an order from this grower. */
  verified?: boolean;
  farmerId?: string;
  /** Written by the signed-in customer. */
  mine?: boolean;
}
export interface Notice {
  id: string;
  role: Role;
  title: string;
  text: string;
  href: string;
  read: boolean;
  at?: string | null;
  type?: string;
}
export interface Template {
  id: string;
  name: string;
  quantities: Record<string, number>;
  marketId?: string;
  dayOfWeek?: number;
}
export interface Announcement {
  id: string;
  title: string;
  body: string;
  published: boolean;
  type?: string;
  priority?: string;
  marketId?: string;
  at?: string | null;
}
export interface Session {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  active: boolean;
}
export interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  active: boolean;
  since: string | null;
  orders: number;
  openOrders: number;
  valueMinor: number;
  lastOrderDate: string | null;
}
export interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  at: string | null;
}
export interface SeriesPoint {
  date: string;
  orders: number;
  placed: number;
  accepted: number;
  ready_for_pickup: number;
  completed: number;
  cancelled: number;
  declined: number;
  bookedValueMinor: number;
}
/** Server-computed metrics (Server/src/services/metrics.service.js). */
export interface Metrics {
  period: { key: string; label: string; from: string; to: string };
  totals: {
    orders: number;
    bookedOrders: number;
    bookedValueMinor: number;
    collectedValueMinor: number;
    averageOrderValueMinor: number;
    completed: number;
    cancelled: number;
    declined: number;
    fulfilmentRate: number | null;
    unitsSold: number;
    uniqueCustomers: number;
    repeatCustomers: number;
  };
  previous: { orders: number; bookedValueMinor: number; completed: number; fulfilmentRate: number | null };
  change: { orders: number | null; bookedValue: number | null; completed: number | null };
  open: {
    placed: number;
    accepted: number;
    readyForPickup: number;
    total: number;
    valueMinor: number;
    nextMarketDate: string | null;
    nextMarketDayOrders: number;
    nextMarketDayUnits: number;
  };
  series: SeriesPoint[];
  statusMix: Record<string, number>;
  topProducts: { productId: string; name: string; unit: string; units: number; valueMinor: number; orders: number }[];
  slowProducts: { productId: string; name: string; unit: string; units: number; valueMinor: number; orders: number }[];
  byMarket: { id: string; name: string; orders: number; valueMinor: number }[];
  byFarmer: { id: string; name: string; orders: number; valueMinor: number }[];
  stock: {
    offers: number;
    totalUnits: number;
    reservedUnits: number;
    availableUnits: number;
    lowStock: { offerId: string; productId: string; marketId: string; date: string; available: number; total: number }[];
    soldOut: { offerId: string; productId: string; marketId: string; date: string }[];
  };
  reviews: {
    average: number | null;
    count: number;
    distribution: Record<string, number>;
    awaitingReply: number;
    flagged: number;
  };
  platform?: {
    farmers: { approved: number; pending: number; suspended: number };
    customers: { total: number; active: number; ordering: number };
    markets: { active: number; total: number };
    products: { listed: number; hidden: number };
    categories: number;
    inquiries: { open: number };
  };
}
export type LoadStatus = "loading" | "ready" | "offline";
export interface MarketState {
  role: Role | null;
  status: LoadStatus;
  session: Session | null;
  farmerId: string;
  now: string;
  markets: Market[];
  farmers: Farmer[];
  products: Product[];
  slots: Slot[];
  orders: Order[];
  basket: Record<string, number>;
  basketPrices: Record<string, number>;
  favourites: string[];
  restock: string[];
  restockAlerts: { id: string; productId: string; marketId: string }[];
  reviews: Review[];
  notices: Notice[];
  templates: Template[];
  announcements: Announcement[];
  categories: string[];
  categoryIds: Record<string, string>;
  categoryCounts: Record<string, number>;
  customerActive: boolean;
  checklist: string[];
  metrics: Metrics | null;
  customers: CustomerAccount[];
  inquiries: Inquiry[];
  period: string;
}
export function emptyState(): MarketState {
  return {
    role: null,
    status: "loading",
    session: null,
    farmerId: "",
    now: new Date().toISOString(),
    markets: [],
    farmers: [],
    products: [],
    slots: [],
    orders: [],
    basket: {},
    basketPrices: {},
    favourites: [],
    restock: [],
    restockAlerts: [],
    reviews: [],
    notices: [],
    templates: [],
    announcements: [],
    categories: [],
    categoryIds: {},
    categoryCounts: {},
    customerActive: true,
    checklist: [],
    metrics: null,
    customers: [],
    inquiries: [],
    period: "30d",
  };
}
export const currency = localization.currency;
export const money = (minor: number, curr?: string) => {
  const c = curr || currency;
  const loc =
    c === "GBP" ? "en-GB" :
    c === "USD" ? "en-US" :
    c === "AED" ? "en-AE" :
    localization.locale;
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency: c,
    maximumFractionDigits: c === "PKR" ? 0 : 2,
    minimumFractionDigits: c === "PKR" ? 0 : 2,
  }).format(minor / 100);
};
export const total = (lines: Line[]) =>
  lines.reduce((n, l) => n + l.price * l.quantity, 0);
/** Display reference for an order: its order number when known. */
export const orderRef = (o: Pick<Order, "id" | "number">) => o.number || o.id;
export const time = (value: string) =>
  new Intl.DateTimeFormat(localization.dateLocale, {
    timeZone: localization.timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export const date = (value: string) =>
  new Intl.DateTimeFormat(localization.dateLocale, {
    timeZone: localization.timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00+05:00` : value));
export const activeOrder = (o: Order) =>
  !["Completed", "Cancelled", "Declined"].includes(o.stage);
