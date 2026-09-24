/**
 * MarketLink API Client
 * Connects to the Express/MongoDB backend at /api/v1.
 * Falls back to demo fixture state when the server is unreachable.
 */

const BASE = '/api/v1';

export type ApiStatus = 'loading' | 'live' | 'demo' | 'error';

// ─── Shape types that mirror the backend service responses ────────────────────

export interface ApiMarket {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
  locality: string;
  address: string;
  timezone: string;
  currency: string;
  coordinates: { latitude: number; longitude: number };
  operatingDays: number[];   // 0=Sun ... 6=Sat
  operatingHours: { open: string; close: string } | null;
  attendingFarmerCount: number;
}

export interface ApiMarketDetail extends ApiMarket {
  attendingFarmers: {
    id: string;
    businessName: string;
    contactPerson: string;
    bio: string;
    stallNumber: string;
    stallCoordinates: { latitude: number; longitude: number } | null;
    operatingDays: number[];
  }[];
}

export interface ApiMarketsResponse {
  items: ApiMarket[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface ApiPublicFarmer {
  id: string;
  businessName: string;
  contactPerson: string;
  bio: string;
  stallNumber?: string;
  coverImage?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  marketIds: string[];
  operatingDays: number[];
}

export interface ApiProduct {
  id: string;
  farmerId: string;
  name: string;
  category: string;
  unit: string;
  priceMinor: number;
  stockQuantity: number;
  reservedQuantity: number;
  description: string;
  imageUrl?: string;
  isListed: boolean;
  isAvailable: boolean;
  marketIds?: string[];
}

export interface ApiProductsResponse {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body.slice(0, 120)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Markets ──────────────────────────────────────────────────────────────────

export interface MarketFilters {
  search?: string;
  countryCode?: string;
  city?: string;
  day?: number;     // 0-6
  page?: number;
  limit?: number;
}

export async function fetchMarkets(filters: MarketFilters = {}): Promise<ApiMarketsResponse> {
  const q = new URLSearchParams();
  if (filters.search)      q.set('search', filters.search);
  if (filters.countryCode) q.set('countryCode', filters.countryCode);
  if (filters.city)        q.set('city', filters.city);
  if (filters.day !== undefined) q.set('day', String(filters.day));
  if (filters.page)        q.set('page', String(filters.page));
  if (filters.limit)       q.set('limit', String(filters.limit));
  const qs = q.toString();
  return get<ApiMarketsResponse>(`/markets${qs ? '?' + qs : ''}`);
}

export async function fetchMarketById(id: string): Promise<ApiMarketDetail> {
  return get<ApiMarketDetail>(`/markets/${id}`);
}

// ─── Farmers ─────────────────────────────────────────────────────────────────

export async function fetchPublicFarmer(id: string): Promise<ApiPublicFarmer> {
  return get<ApiPublicFarmer>(`/farmers/${id}`);
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductFilters {
  search?: string;
  category?: string;
  farmerId?: string;
  marketId?: string;
  available?: boolean;
  sort?: 'name' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export async function fetchProducts(filters: ProductFilters = {}): Promise<ApiProductsResponse> {
  const q = new URLSearchParams();
  if (filters.search)    q.set('search', filters.search);
  if (filters.category)  q.set('category', filters.category);
  if (filters.farmerId)  q.set('farmerId', filters.farmerId);
  if (filters.marketId)  q.set('marketId', filters.marketId);
  if (filters.available) q.set('available', 'true');
  if (filters.sort)      q.set('sort', filters.sort);
  if (filters.page)      q.set('page', String(filters.page));
  if (filters.limit)     q.set('limit', String(filters.limit));
  const qs = q.toString();
  return get<ApiProductsResponse>(`/products${qs ? '?' + qs : ''}`);
}

export async function fetchProductById(id: string): Promise<ApiProduct> {
  return get<ApiProduct>(`/products/${id}`);
}

// ─── Server health probe (used to decide live vs demo mode) ──────────────────

export async function probeServer(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
