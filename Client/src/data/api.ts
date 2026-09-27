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

let csrfBootstrap: Promise<string | null> | null = null;
async function ensureCsrfToken(force = false): Promise<string | null> {
  if (!force && getCsrfToken()) return getCsrfToken();
  if (typeof window === 'undefined') return null;
  if (!csrfBootstrap) {
    csrfBootstrap = fetch(`${BASE}/auth/csrf-token`, {credentials:'include',signal:AbortSignal.timeout(12000)})
      .then(async res => {if (!res.ok) throw new Error('Could not verify this request. Please try again.'); const body=await res.json(); return body?.data?.csrfToken || getCsrfToken();})
      .finally(() => {csrfBootstrap=null;});
  }
  return csrfBootstrap;
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
  options: RequestInit = {},
  attempt = 0,
  csrfRetried = false
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

  // Read requests may recover from a brief backend restart; never replay writes on gateway errors.
  if (method === 'GET' && [502,503,504].includes(response.status) && attempt < 2 && !options.signal?.aborted) {
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    return request<T>(endpoint, options, attempt + 1, csrfRetried);
  }

  if (!response.ok) {
    let errBody: any = null;
    try {
      errBody = await response.json();
    } catch {
      errBody = { message: await response.text().catch(() => 'Network error') };
    }
    // This specific rejection occurs before mutation, so refreshing its token is safe once.
    if (response.status === 403 && errBody?.error?.code === 'CSRF_TOKEN_INVALID' && !csrfRetried) {
      const csrf = await ensureCsrfToken(true);
      const retryHeaders = new Headers(options.headers);
      if (csrf) retryHeaders.set('x-csrf-token',csrf);
      return request<T>(endpoint,{...options,headers:retryHeaders},attempt,true);
    }
    const error: any = new Error(
      errBody?.error?.message || errBody?.message || ([502,503,504].includes(response.status) ? 'The server is temporarily unavailable. Please try again shortly.' : `Request failed with status ${response.status}`)
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

export async function addFavouriteApi(targetType: 'farmer' | 'product' | 'market', targetId: string): Promise<any> {
  return request<any>('/favourites', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId }),
  });
}

export async function removeFavouriteApi(targetType: 'farmer' | 'product' | 'market', targetId: string): Promise<any> {
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
  orderId?: string;
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

export async function fetchFarmerProductsApi(): Promise<any[]> {
  return request<any[]>('/farmer/products');
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

export async function fetchFarmerReportsApi(params: { period?: string; marketId?: string; startDate?: string; endDate?: string } = {}): Promise<any> {
  const q = new URLSearchParams();
  if (params.period) q.set('period', params.period);
  if (params.marketId) q.set('marketId', params.marketId);
  if (params.startDate) q.set('startDate', params.startDate);
  if (params.endDate) q.set('endDate', params.endDate);
  const qs = q.toString();
  return request<any>(`/farmer/reports${qs ? '?' + qs : ''}`);
}

export const fetchFarmerAnalyticsApi = fetchFarmerReportsApi;

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

export async function fetchAdminAnalyticsApi(params: { period?: string; country?: string; marketId?: string; startDate?: string; endDate?: string } = {}): Promise<any> {
  const q = new URLSearchParams();
  if (params.period) q.set('period', params.period);
  if (params.country) q.set('country', params.country);
  if (params.marketId) q.set('marketId', params.marketId);
  if (params.startDate) q.set('startDate', params.startDate);
  if (params.endDate) q.set('endDate', params.endDate);
  const qs = q.toString();
  return request<any>(`/admin/analytics${qs ? '?' + qs : ''}`);
}

export async function fetchAdminReviewsApi(query: { status?: string } = {}): Promise<any[]> {
  const q = new URLSearchParams();
  if (query.status) q.set('status', query.status);
  const qs = q.toString();
  return request<any[]>(`/admin/reviews${qs ? '?' + qs : ''}`);
}

export async function moderateAdminReviewApi(
  id: string,
  moderationStatus: 'approved' | 'rejected' | 'hidden' | 'flagged',
  moderationReason?: string
): Promise<any> {
  return request<any>(`/admin/reviews/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ moderationStatus, moderationReason }),
  });
}

export async function moderateAdminProductApi(id: string, status: 'active' | 'hidden'): Promise<any> {
  return request<any>(`/admin/products/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteAdminMarketApi(id: string): Promise<any> {
  return request<any>(`/admin/markets/${id}`, { method: 'DELETE' });
}

export async function deleteAdminCategoryApi(id: string): Promise<any> {
  return request<any>(`/admin/categories/${id}`, { method: 'DELETE' });
}

export async function createAnnouncementApi(data: {
  title: string;
  message: string;
  type?: 'general' | 'weather_alert' | 'market_update';
  priority?: 'normal' | 'urgent';
  marketId?: string | null;
  isActive?: boolean;
}): Promise<any> {
  return request<any>('/admin/announcements', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAnnouncementApi(id: string, data: { isActive?: boolean; title?: string; message?: string }): Promise<any> {
  return request<any>(`/admin/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// ─── Live catalogue & role workspace (single source of truth) ───────────────
export async function fetchCatalogueApi(): Promise<any> {
  return request<any>('/catalogue');
}

export async function fetchWorkspaceApi(period = '30d'): Promise<any> {
  return request<any>(`/workspace?period=${encodeURIComponent(period)}`);
}

export async function markNotificationReadApi(id: string): Promise<any> {
  return request<any>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsReadApi(): Promise<any> {
  return request<any>('/notifications/read-all', { method: 'PATCH' });
}

export async function createFarmerProductApi(data: {
  name: string;
  description?: string;
  categoryId: string;
  unit: string;
  basePriceMinor: number;
  imageUrl?: string;
}): Promise<any> {
  return request<any>('/farmer/products', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateFarmerProductApi(id: string, data: Partial<{
  name: string;
  description: string;
  categoryId: string;
  unit: string;
  basePriceMinor: number;
  imageUrl: string;
}>): Promise<any> {
  return request<any>(`/farmer/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function updateStockOfferStatusApi(id: string, status: 'available' | 'sold_out' | 'unavailable'): Promise<any> {
  return request<any>(`/farmer/stock-offers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function createPickupWindowApi(data: {
  marketId: string;
  date: string;
  startTime: string;
  endTime: string;
  cutoffAt: string;
  maxCapacity?: number;
}): Promise<any> {
  return request<any>('/farmer/pickup-windows', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteRestockAlertApi(id: string): Promise<any> {
  return request<any>(`/restock-alerts/${id}`, { method: 'DELETE' });
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

// ─── Real Customer <-> Farmer Messaging ──────────────────────────────────────
export interface ChatConversation {
  id: string;
  customerId: string;
  customerName: string;
  farmerProfileId: string;
  farmerUserId?: string;
  farmerBusinessName: string;
  farmerContactPerson?: string;
  relatedProductId?: string | null;
  relatedProductName?: string | null;
  relatedOrderId?: string | null;
  relatedOrderNumber?: string | null;
  status: 'active' | 'archived';
  lastMessageText: string;
  lastMessageAt: string | null;
  lastSenderRole?: 'customer' | 'farmer';
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  productContext?: {
    id: string;
    name: string;
    priceMinor: number;
    currency: string;
    unit: string;
    imageUrl?: string;
  } | null;
  orderContext?: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmountMinor: number;
    currency: string;
    pickupDate: string;
    pickupTimeSlot: string;
    lines: Array<{
      name: string;
      quantity: number;
      unit: string;
      lineTotalMinor: number;
    }>;
  } | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'customer' | 'farmer';
  senderName: string;
  body: string;
  isSelf: boolean;
  readAt?: string | null;
  createdAt: string;
}

export async function fetchUnreadChatCountApi(): Promise<{ unreadConversations: number }> {
  return request<{ unreadConversations: number }>('/chat/unread-count');
}

export async function fetchConversationsApi(
  filter: 'all' | 'unread' | 'order-linked' | 'archived' = 'all',
  search: string = ''
): Promise<ChatConversation[]> {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') params.set('filter', filter);
  if (search.trim()) params.set('search', search.trim());
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<ChatConversation[]>(`/chat/conversations${qs}`);
}

export async function fetchConversationDetailApi(id: string): Promise<ChatConversation> {
  return request<ChatConversation>(`/chat/conversations/${id}`);
}

export async function fetchMessagesApi(
  conversationId: string,
  limit: number = 100
): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/chat/conversations/${conversationId}/messages?limit=${limit}`);
}

export async function startConversationApi(payload: {
  farmerId: string;
  productId?: string | null;
  orderId?: string | null;
  message: string;
}): Promise<{
  conversationId: string;
  messageId: string;
  status: string;
  conversation: ChatConversation;
}> {
  return request<any>('/chat/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendMessageApi(
  conversationId: string,
  message: string
): Promise<ChatMessage> {
  return request<ChatMessage>(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function markConversationReadApi(
  conversationId: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/chat/conversations/${conversationId}/read`, {
    method: 'PATCH',
  });
}

export async function setConversationArchiveApi(
  conversationId: string,
  isArchived: boolean
): Promise<{ success: boolean; status: string }> {
  return request<{ success: boolean; status: string }>(`/chat/conversations/${conversationId}/archive`, {
    method: 'PATCH',
    body: JSON.stringify({ isArchived }),
  });
}

export async function suggestReplyApi(
  conversationId: string
): Promise<{ suggestedReply: string; groundingNotes?: string }> {
  return request<{ suggestedReply: string; groundingNotes?: string }>(
    `/chat/conversations/${conversationId}/suggest-reply`,
    {
      method: 'POST',
    }
  );
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

export async function archiveFarmerProductApi(id: string): Promise<any> {
  return request<any>(`/farmer/products/${id}`, { method: 'DELETE' });
}

export function sendContactApi(data: {name:string;email:string;subject:string;message:string;website:string}): Promise<{accepted:boolean;autoReplySent:boolean}> { return request("/contact",{method:"POST",body:JSON.stringify(data)}); }

export function searchLocationsApi(q:string,country:string):Promise<{label:string;latitude:number;longitude:number}[]> {return request('/locations/search?'+new URLSearchParams({q,country}));}

export interface SupportMessage {
  id: string;
  senderId?: string;
  senderName?: string;
  senderRole: string;
  text: string;
  body?: string;
  createdAt: string;
  readAt?: string;
}
export interface SupportConversationInspect {
  id: string;
  readOnly: boolean;
  conversation?: {
    id: string;
    customerName: string;
    customerEmail?: string;
    farmerBusinessName: string;
    farmerContactPerson?: string;
    relatedProductName?: string;
    relatedOrderNumber?: string;
    status: string;
    createdAt: string;
  };
  messages: SupportMessage[];
}
export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  status: 'open' | 'closed';
  ownerName: string;
  ownerRole: string;
  updatedAt: string;
  messages?: SupportMessage[];
}
export const supportApi = {
  list: (q = '') => request<SupportTicket[]>('/support/tickets?' + new URLSearchParams({ q })),
  get: (id: string) => request<SupportTicket>('/support/tickets/' + encodeURIComponent(id)),
  create: (subject: string, message: string) => request<SupportTicket>('/support/tickets', { method: 'POST', body: JSON.stringify({ subject, message }) }),
  reply: (id: string, message: string) => request<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ message }) }),
  close: (id: string) => request<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}/close`, { method: 'POST' }),
  conversation: (id: string) => request<SupportConversationInspect>('/support/conversations/' + encodeURIComponent(id))
};

// --- Auth Extras -------------------------------------------------------------
export async function sendLoginOtpApi(email: string, password: string): Promise<{ otpSent: boolean; email: string; user?: UserSession }> {
  const res = await request<any>('/auth/login-otp/send', { method: 'POST', body: JSON.stringify({ email, password }) });
  return res || { otpSent: true, email };
}

export async function verifyLoginOtpApi(email: string, otp: string): Promise<UserSession> {
  const res = await request<any>('/auth/login-otp/verify', { method: 'POST', body: JSON.stringify({ email, otp }) });
  return (res?.user || res) as UserSession;
}

export async function forgotPasswordApi(email: string): Promise<{ sent: boolean }> {
  const res = await request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  return res?.sent !== undefined ? res : { sent: true };
}

export async function resetPasswordApi(email: string, otp: string, newPassword: string): Promise<{ reset: boolean }> {
  const res = await request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) });
  return res?.reset !== undefined ? res : { reset: true };
}

export async function verifyCaptchaApi(token: string): Promise<{ success: boolean }> {
  const res = await request<any>('/auth/verify-captcha', { method: 'POST', body: JSON.stringify({ token }) });
  return res?.success !== undefined ? res : { success: true };
}


export interface MarketJoinRequest {marketId:string;marketName:string;status:'pending'|'approved'|'rejected';reason:string;requestedAt:string}
export const marketParticipationApi = {
 list: (farmerId?:string) => request<MarketJoinRequest[]>(farmerId ? `/admin/farmers/${farmerId}/market-requests` : '/farmer/market-requests'),
 apply: (marketId:string) => request<MarketJoinRequest[]>('/farmer/market-requests',{method:'POST',body:JSON.stringify({marketId})}),
 decide: (farmerId:string,marketId:string,status:'approved'|'rejected',reason:string) => request<MarketJoinRequest[]>(`/admin/farmers/${farmerId}/market-requests/${marketId}`,{method:'PATCH',body:JSON.stringify({status,reason})}),
};
