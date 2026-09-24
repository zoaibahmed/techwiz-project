/**
 * MarketLink Official API Client
 * Connects to the Express/MongoDB Atlas backend at /api/v1.
 * Supports cookie-based authentication, CSRF auto-injection, and typed domain operations.
 */

const BASE = '/api/v1';

export type ApiStatus = 'loading' | 'live' | 'demo' | 'error';

// ─── CSRF Token Extraction ──────────────────────────────────────────────────
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)marketlink_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  let token = getCsrfToken();
  if (!token && typeof window !== 'undefined') {
    try {
      const res = await fetch(`${BASE}/auth/csrf-token`, { credentials: 'include' });
      const json = await res.json();
      token = json?.data?.csrfToken || getCsrfToken();
    } catch {}
  }
  return token;
}

// ─── Base HTTP Helpers ───────────────────────────────────────────────────────
export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp?: string;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Include CSRF token for mutating methods
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    let csrf = getCsrfToken();
    if (!csrf) {
      csrf = await ensureCsrfToken();
    }
    if (csrf) {
      headers.set('x-csrf-token', csrf);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Mandates HTTP-only cookie passing
    signal: options.signal || AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    let errBody: any = null;
    try {
      errBody = await response.json();
    } catch {
      errBody = { message: await response.text().catch(() => 'Network error') };
    }
    const error: any = new Error(
      errBody?.error?.message || errBody?.message || `Request failed with status ${response.status}`
    );
    error.statusCode = response.status;
    error.code = errBody?.error?.code || errBody?.code;
    error.details = errBody?.error?.details || errBody?.details;
    throw error;
  }

  const json = await response.json();
  return (json?.data !== undefined ? json.data : json) as T;
}

// ─── Auth & Session Management ──────────────────────────────────────────────
export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'farmer' | 'admin';
  phone?: string;
  farmerProfileId?: string;
  preferences?: {
    preferredMarketId?: string;
    preferredMarketDay?: string;
    preferredLanguage?: string;
  };
}

export async function loginApi(email: string, password: string): Promise<UserSession> {
  const res = await request<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return (res?.user || res) as UserSession;
}

export async function registerCustomerApi(data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
}): Promise<UserSession> {
  const res = await request<any>('/auth/register/customer', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return (res?.user || res) as UserSession;
}

export async function registerFarmerApi(data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  businessName: string;
  contactPerson: string;
  bio?: string;
}): Promise<UserSession> {
  const res = await request<any>('/auth/register/farmer', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return (res?.user || res) as UserSession;
}

export async function fetchMeApi(): Promise<UserSession> {
  const res = await request<any>('/auth/me');
  return (res?.user || res) as UserSession;
}

export async function logoutApi(): Promise<{ loggedOut: boolean }> {
  return request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' });
}

// ─── Public Markets & Venues ────────────────────────────────────────────────
export interface ApiMarket {
  id: string;
  name: string;
  address: string;
  city?: string;
  region?: string;
  countryCode?: string;
  timezone?: string;
  currency?: string;
  coordinates?: { latitude: number; longitude: number };
  operatingDays?: number[];
  operatingHours?: { open: string; close: string } | null;
  attendingFarmerCount?: number;
  isActive?: boolean;
}

export async function fetchMarketsApi(params: {
  search?: string;
  countryCode?: string;
  city?: string;
  day?: number;
} = {}): Promise<ApiMarket[]> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.countryCode) q.set('countryCode', params.countryCode);
  if (params.city) q.set('city', params.city);
  if (params.day !== undefined) q.set('day', String(params.day));
  const qs = q.toString();
  return request<ApiMarket[]>(`/markets${qs ? '?' + qs : ''}`);
}

export async function fetchMarketByIdApi(id: string): Promise<ApiMarket & { attendingFarmers: any[] }> {
  return request<ApiMarket & { attendingFarmers: any[] }>(`/markets/${id}`);
}

// ─── Public Farmers & Growers ───────────────────────────────────────────────
export interface ApiFarmerProfile {
  id: string;
  userId: string;
  businessName: string;
  contactPerson: string;
  bio: string;
  stallNumber?: string;
  marketId: string;
  marketName?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  phone?: string;
  rating?: number;
  totalReviews?: number;
  currentOffers?: any[];
}

export async function fetchPublicFarmersApi(query: { marketId?: string; search?: string } = {}): Promise<ApiFarmerProfile[]> {
  const q = new URLSearchParams();
  if (query.marketId) q.set('marketId', query.marketId);
  if (query.search) q.set('search', query.search);
  const qs = q.toString();
  return request<ApiFarmerProfile[]>(`/farmers${qs ? '?' + qs : ''}`);
}

export async function fetchFarmerByIdApi(id: string): Promise<ApiFarmerProfile> {
  return request<ApiFarmerProfile>(`/farmers/${id}`);
}

// ─── Public Products & Dated Catalogue ──────────────────────────────────────
export interface ApiProductItem {
  id: string;
  farmerId: string;
  farmerName?: string;
  name: string;
  category: string;
  categoryId?: string;
  unit: string;
  basePriceMinor: number;
  description: string;
  imageUrl?: string;
  status: 'active' | 'inactive';
  availableQuantity?: number;
  reservedQuantity?: number;
  priceMinor?: number;
}

export async function fetchProductsApi(params: {
  search?: string;
  category?: string;
  farmerId?: string;
  marketId?: string;
  marketDate?: string;
} = {}): Promise<ApiProductItem[]> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.category) q.set('category', params.category);
  if (params.farmerId) q.set('farmerId', params.farmerId);
  if (params.marketId) q.set('marketId', params.marketId);
  if (params.marketDate) q.set('marketDate', params.marketDate);
  const qs = q.toString();
  return request<ApiProductItem[]>(`/products${qs ? '?' + qs : ''}`);
}

export async function fetchProductByIdApi(id: string): Promise<ApiProductItem> {
  return request<ApiProductItem>(`/products/${id}`);
}

export async function fetchCategoriesApi(): Promise<{ id: string; name: string; slug: string }[]> {
  return request<{ id: string; name: string; slug: string }[]>('/categories');
}

// ─── Customer Orders & Checkout ─────────────────────────────────────────────
export interface CheckoutPayload {
  marketId: string;
  marketDate: string;
  pickupWindowId: string;
  items: { productId: string; quantity: number }[];
  customerNotes?: string;
  idempotencyKey?: string;
}

export async function checkoutApi(payload: CheckoutPayload): Promise<{
  checkoutGroupId: string;
  orders: any[];
  isIdempotentReplay?: boolean;
}> {
  return request<{ checkoutGroupId: string; orders: any[]; isIdempotentReplay?: boolean }>(
    '/orders/checkout',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: payload.idempotencyKey ? { 'Idempotency-Key': payload.idempotencyKey } : {},
    }
  );
}

export async function fetchCustomerOrdersApi(params: { status?: string } = {}): Promise<any[]> {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  const qs = q.toString();
  return request<any[]>(`/orders${qs ? '?' + qs : ''}`);
}

export async function fetchCustomerOrderByIdApi(id: string): Promise<any> {
  return request<any>(`/orders/${id}`);
}

export async function cancelCustomerOrderApi(id: string, reason: string): Promise<any> {
  return request<any>(`/orders/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function modifyCustomerOrderItemsApi(id: string, items: { productId: string; quantity: number }[]): Promise<any> {
  return request<any>(`/orders/${id}/items`, {
    method: 'PATCH',
    body: JSON.stringify({ items }),
  });
}

// ─── Customer Engagement (Favourites, Alerts, Reviews) ─────────────────────
export async function fetchFavouritesApi(): Promise<{ farmers: any[]; products: any[] }> {
  return request<{ farmers: any[]; products: any[] }>('/favourites');
}

export async function addFavouriteApi(targetType: 'farmer' | 'product', targetId: string): Promise<any> {
  return request<any>('/favourites', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId }),
  });
}

export async function removeFavouriteApi(targetType: 'farmer' | 'product', targetId: string): Promise<any> {
  return request<any>(`/favourites/${targetType}/${targetId}`, {
    method: 'DELETE',
  });
}

export async function fetchRestockAlertsApi(): Promise<any[]> {
  return request<any[]>('/restock-alerts');
}

export async function createRestockAlertApi(data: { productId: string; marketId: string }): Promise<any> {
  return request<any>('/restock-alerts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createReviewApi(data: {
  orderId: string;
  targetType: 'farmer' | 'product';
  targetId: string;
  rating: number;
  comment: string;
}): Promise<any> {
  return request<any>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchPublicFarmerReviewsApi(farmerId: string): Promise<{ reviews: any[]; ratingSummary: any }> {
  return request<any>(`/reviews/farmer/${farmerId}`);
}

export async function fetchPublicProductReviewsApi(productId: string): Promise<{ reviews: any[]; ratingSummary: any }> {
  return request<any>(`/reviews/product/${productId}`);
}

export async function fetchFarmerReviewsApi(): Promise<any[]> {
  return request<any[]>('/farmer/reviews');
}

// ─── Customer Profile & Preferences ─────────────────────────────────────────
export async function fetchCustomerProfileApi(): Promise<any> {
  return request<any>('/customer/profile');
}

export async function updateCustomerProfileApi(data: any): Promise<any> {
  return request<any>('/customer/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchCustomerPreferencesApi(): Promise<any> {
  return request<any>('/customer/preferences');
}

export async function updateCustomerPreferencesApi(data: any): Promise<any> {
  return request<any>('/customer/preferences', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Farmer Onboarding ───────────────────────────────────────────────────────
export async function getFarmerOnboardingApi(): Promise<any> {
  return request<any>('/farmer/onboarding');
}

export async function saveFarmerOnboardingStepApi(step: number, data: Record<string, any>): Promise<any> {
  return request<any>('/farmer/onboarding', {
    method: 'PUT',
    body: JSON.stringify({ step, data }),
  });
}

export async function submitFarmerOnboardingApi(): Promise<any> {
  return request<any>('/farmer/onboarding/submit', {
    method: 'POST',
  });
}

// ─── Farmer Operations ──────────────────────────────────────────────────────
export async function fetchFarmerProfileApi(): Promise<any> {
  return request<any>('/farmer/profile');
}

export async function updateFarmerProfileApi(data: any): Promise<any> {
  return request<any>('/farmer/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchFarmerOrdersApi(params: { status?: string; marketDate?: string } = {}): Promise<any[]> {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.marketDate) q.set('marketDate', params.marketDate);
  const qs = q.toString();
  return request<any[]>(`/farmer/orders${qs ? '?' + qs : ''}`);
}

export async function updateFarmerOrderStatusApi(
  orderId: string,
  status: 'accepted' | 'declined' | 'ready_for_pickup' | 'completed',
  reason?: string
): Promise<any> {
  return request<any>(`/farmer/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

export async function fetchWeeklyTemplateApi(marketId: string, dayOfWeek: number): Promise<any> {
  return request<any>(`/farmer/stock-templates?marketId=${marketId}&dayOfWeek=${dayOfWeek}`);
}

export async function updateWeeklyTemplateApi(data: {
  marketId: string;
  dayOfWeek: number;
  items: { productId: string; defaultQuantity: number; defaultPriceMinor: number; unit: string }[];
}): Promise<any> {
  return request<any>('/farmer/stock-templates', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function fetchFarmerStockOffersApi(params: { date?: string; marketId?: string } = {}): Promise<any[]> {
  const q = new URLSearchParams();
  if (params.date) q.set('date', params.date);
  if (params.marketId) q.set('marketId', params.marketId);
  const qs = q.toString();
  return request<any[]>(`/farmer/stock-offers${qs ? '?' + qs : ''}`);
}

export async function saveFarmerStockOfferApi(data: {
  marketId: string;
  productId: string;
  date: string;
  totalQuantity: number;
  priceMinor: number;
  unit: string;
  status?: string;
}): Promise<any> {
  return request<any>('/farmer/stock-offers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function replyToReviewApi(reviewId: string, replyText: string): Promise<any> {
  return request<any>(`/farmer/reviews/${reviewId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply: replyText }),
  });
}

export async function fetchFarmerReportsApi(): Promise<any> {
  return request<any>('/farmer/reports');
}

// ─── Admin Operations ───────────────────────────────────────────────────────
export async function fetchAdminFarmersApi(query: { status?: string } = {}): Promise<any[]> {
  const q = new URLSearchParams();
  if (query.status) q.set('status', query.status);
  const qs = q.toString();
  return request<any[]>(`/admin/farmers${qs ? '?' + qs : ''}`);
}

export async function updateFarmerApprovalStatusApi(
  farmerId: string,
  approvalStatus: 'approved' | 'rejected' | 'suspended',
  reason?: string
): Promise<any> {
  return request<any>(`/admin/farmers/${farmerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ approvalStatus, reason }),
  });
}

export async function fetchAdminCustomersApi(): Promise<any[]> {
  return request<any[]>('/admin/customers');
}

export async function fetchAdminCustomerDetailsApi(id: string): Promise<any> {
  return request<any>(`/admin/customers/${id}`);
}

export async function updateCustomerStatusApi(id: string, isActive: boolean, reason?: string): Promise<any> {
  return request<any>(`/admin/customers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive, reason }),
  });
}

export async function createAdminMarketApi(marketData: any): Promise<any> {
  return request<any>('/admin/markets', {
    method: 'POST',
    body: JSON.stringify(marketData),
  });
}

export async function updateAdminMarketApi(id: string, marketData: any): Promise<any> {
  return request<any>(`/admin/markets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(marketData),
  });
}

export async function createAdminCategoryApi(data: { name: string; slug: string; description?: string }): Promise<any> {
  return request<any>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchAdminAnalyticsApi(): Promise<any> {
  return request<any>('/admin/analytics');
}

export async function fetchAdminReviewsApi(query: { status?: string } = {}): Promise<any[]> {
  const q = new URLSearchParams();
  if (query.status) q.set('status', query.status);
  const qs = q.toString();
  return request<any[]>(`/admin/reviews${qs ? '?' + qs : ''}`);
}

export async function moderateAdminReviewApi(id: string, status: 'published' | 'hidden'): Promise<any> {
  return request<any>(`/admin/reviews/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── AI Copilot Service ─────────────────────────────────────────────────────
export async function chatCopilotApi(message: string, context: any = {}): Promise<{
  reply: string;
  proposedAction?: {
    draftId: string;
    actionType: string;
    summary: string;
    expiresAt?: string;
  } | null;
  groundedRecords?: any;
}> {
  return request<any>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, context }),
  });
}

export async function confirmCopilotActionApi(draftId: string): Promise<{
  actionType: string;
  confirmed: boolean;
  summary: string;
  result: any;
}> {
  return request<any>(`/ai/actions/${draftId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ draftId }),
  });
}

// ─── Media Upload ───────────────────────────────────────────────────────────
export async function uploadImageApi(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append('image', file);
  return request<{ url: string; filename: string }>('/uploads/image', {
    method: 'POST',
    body: formData,
  });
}

// ─── Prober ─────────────────────────────────────────────────────────────────
export async function probeServer(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
