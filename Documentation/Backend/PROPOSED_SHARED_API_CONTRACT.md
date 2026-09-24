# MarketLink Unified API Integration Contract (Astra Frontend Handoff)

**Document Version:** 2.0.0 (Reconciled from Actual Express Registrations & Multi-Country Architecture)  
**Status:** PROPOSED FOR ARCHITECTURAL APPROVAL (Pending Atlas IP Whitelist & Master Integration Sign-off)  
**Target Audience:** Astra (Frontend Lead), Antigravity (Backend Lead)  
**Scope:** Reconciled REST API specification generated from active Express code, covering Global Multi-Country Public Catalog, Authentication, Customer Engagement, Order Engine, Farmer Multi-Step Onboarding, Administration, Media Uploads, and MarketLink Copilot AI.

---

## 1. Architectural & Multi-Country Invariants

1. **Multi-Country Architecture (Country-Neutral Design)**:
   - Lahore, Pakistan is one demo location (`countryCode: "PK"`), not a platform-wide hardcoding.
   - Markets, farmers, and customers support standard ISO 3166-1 alpha-2 country codes (`PK`, `GB`, `US`, etc.) and ISO 4217 currencies (`PKR`, `GBP`, `USD`, etc.).
   - Monetary values are stored and transferred in integer **minor units** (e.g., 25000 = PKR 250.00, 450 = GBP 4.50). No silent currency conversions occur.
   - Cutoff times and pickup windows are computed according to each market's specific **IANA timezone** (e.g., `Asia/Karachi`, `Europe/London`, `America/New_York`).
2. **Language and Locale Independence**:
   - UI language and geographic country are completely decoupled.
   - The backend stores `preferredLanguage` (e.g. `en`, `ur`) and `preferredCountryCode` per user.
3. **Market Pickup Only**:
   - There are **NO delivery addresses, delivery dispatchers, shipping couriers, or third-party logistics**.
   - Every order represents a pre-order reservation for a specific market date and physical pickup window.
4. **Physical Payment at Pickup**:
   - There are **NO credit card processing, payment gateways (Stripe/PayPal), or online bank transfers**.
   - Customers pay farmers directly in cash or physical stall payment methods at the market stall.
5. **Atomic Stock & Multi-Farmer Splitting**:
   - A single customer checkout spanning multiple farmers is grouped under a `checkoutGroupId` and split into independent farmer orders.
   - If any item in the cart lacks sufficient available stock, the **entire checkout rolls back atomically** with zero stock reserved.
6. **Canonical Order Lifecycle**:
   - Canonical status sequence:
     $$\mathbf{placed} \longrightarrow \mathbf{accepted} \longrightarrow \mathbf{ready\_for\_pickup} \longrightarrow \mathbf{completed}$$
   - Terminal states:
     - `cancelled` (initiated by Customer before cutoff, or by Admin)
     - `declined` (initiated by Farmer with mandatory rejection reason)
   - Compatibility read layer: Legacy database records containing `confirmed` are transparently queried and returned as `accepted`. The public API only returns `accepted`.
7. **No Gradients (Design System Mandate)**:
   - All frontend rendering consuming this API must strictly follow the solid-color luxury/premium design system. No CSS or Tailwind gradients.

---

## 2. Global Request & Response Conventions

### 2.1 Base URLs & Aliases
- Primary Versioned API: `/api/v1`
- Root Convenience Alias: `/api`

### 2.2 Security, Authentication & Session
- **Authentication**: HTTP-Only cookie `token` storing signed JWT (`1d` expiration), or standard `Authorization: Bearer <token>` header.
- **CSRF Defense**: Double-submit cookie pattern. All mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) require:
  - Cookie: `marketlink_csrf=<token>`
  - Header: `x-csrf-token: <token>`
  - Exempt paths: `/auth/login`, `/auth/register`, `/auth/register/customer`, `/auth/register/farmer`, `/contact`.
  - Obtain CSRF token via `GET /api/v1/auth/csrf-token`.

### 2.3 Status Categorization Key
- **`IMPLEMENTED AND TESTED`**: Route registered, service implemented, verified with passing automated test suite.
- **`IMPLEMENTED BUT NOT VERIFIED`**: Route registered and service implemented, but live database-backed execution blocked pending Atlas IP allowlist.
- **`PROPOSED / NOT IMPLEMENTED`**: Planned feature not yet implemented in Express.

---

## 3. Reconciled Endpoints by Domain

### 3.1 Authentication & Session (`/auth`)

| Method | Reconciled Endpoint | Role | CSRF | Request Payload | Response Data | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/csrf-token` | Public | No | None | `{ csrfToken: string }` | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/auth/register` | Public | No | `{ role: 'customer'\|'farmer', email, password, firstName, lastName, phone, businessName? }` | `{ user: { id, email, role, name } }` | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/auth/register/customer` | Public | No | `{ email, password, firstName, lastName, phone }` | `{ user: { id, email, role: 'customer' } }` | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/auth/register/farmer` | Public | No | `{ email, password, firstName, lastName, phone, businessName, countryCode? }` | `{ user: { id, email, role: 'farmer' } }` | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/auth/login` | Public | No | `{ email, password }` | `{ user: { id, email, role, farmerProfile? } }` | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/auth/me` | Authenticated | No | None | `{ user: { id, email, role, farmerProfile? } }` | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/auth/logout` | Authenticated | Yes | None | `{ success: true, message: 'Logged out' }` | IMPLEMENTED AND TESTED |

---

### 3.2 Customer Profile, Preferences & Engagement

*Both canonical paths and `/customer/` prefixed aliases are registered in Express for 100% frontend compatibility.*

| Method | Reconciled Endpoint | Role | CSRF | Request Payload | Response Data | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/customer/profile` (or `/me/profile`) | Customer | No | None | Customer profile object | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/customer/profile` | Customer | Yes | `{ firstName?, lastName?, phone?, preferredCountryCode?, preferredLanguage?, preferredCurrency? }` | Updated customer profile | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/customer/preferences` (or `/me/preferences`) | Customer | No | None | `{ preferredMarketId, preferredCountryCode, preferredLanguage, preferredCurrency, dietaryPreferences, defaultPickupNotes, phone }` | IMPLEMENTED AND TESTED |
| `PUT` / `PATCH` | `/api/v1/customer/preferences` | Customer | Yes | Same as above | Updated customer preferences | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/favourites` (or `/api/v1/customer/favourites`) | Customer | No | None | Array of favourite items | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/favourites/check` (or `/customer/favourites/check`) | Customer | No | Query: `?targetType=farmer\|product\|market&targetId=...` | `{ isFavourited: boolean, favouriteId? }` | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/favourites` (or `/api/v1/customer/favourites`) | Customer | Yes | `{ targetType: 'farmer'\|'product'\|'market', targetId: string }` | Created favourite record | IMPLEMENTED AND TESTED |
| `DELETE`| `/api/v1/favourites/:targetType/:targetId` (or `/customer/...`) | Customer | Yes | None | `{ success: true, message: 'Favourite removed' }` | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/restock-alerts` (or `/api/v1/customer/restock-alerts`) | Customer | No | None | Array of active restock alert subscriptions | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/restock-alerts` (or `/customer/restock-alerts`) | Customer | Yes | `{ productId: string, marketId: string }` | Created restock alert | IMPLEMENTED AND TESTED |
| `DELETE`| `/api/v1/restock-alerts/:id` (or `/customer/restock-alerts/:id`)| Customer | Yes | None | `{ success: true, message: 'Alert cancelled' }` | IMPLEMENTED AND TESTED |

---

### 3.3 Public Multi-Country Catalog & Discovery

| Method | Reconciled Endpoint | Role | Query Parameters | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/markets` | Public | `countryCode`, `region`, `city`, `date`, `day`, `search`, `lat`, `lng`, `radiusKm`, `page`, `limit` | List markets filtered by country, region, city, or date | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/markets/:id` | Public | None | Market details, IANA timezone, currency, schedule exceptions, attending approved farmers, stall locations | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/categories` | Public | None | List active produce categories | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/products` | Public | `categoryId`, `farmerId`, `search`, `page`, `limit` | Public products with active unarchived status | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/products/:id` | Public | None | Single product details, grower profile snapshot | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/farmers/:id` | Public | None | Public grower profile, bio, stall pin, attending markets, active stock offers | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/pickup-windows` | Public | `marketId`, `farmerId`, `date` | Available pickup time slots and remaining capacity | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/reviews/farmer/:id` | Public | `page`, `limit` | Public ratings and customer reviews for farmer | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/reviews/product/:id` | Public | `page`, `limit` | Public ratings and reviews for product | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/announcements` | Public | `marketId?` | Active platform and market notices | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/contact` | Public | Body: `{ name, email, phone?, subject, message }` | Submit general/wholesale inquiry | IMPLEMENTED AND TESTED |

---

### 3.4 Order Engine (`/orders`)

| Method | Reconciled Endpoint | Role | CSRF | Request Payload | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/orders/checkout` (or `/orders`) | Customer | Yes | `{ marketId, marketDate, pickupWindowId, items: [{ productId, quantity }], customerNotes? }` | Atomic pre-order reservation, split by farmer; header `Idempotency-Key` supported | IMPLEMENTED BUT NOT VERIFIED |
| `GET` | `/api/v1/orders` | Customer | No | Query: `status?`, `page?`, `limit?` | List customer orders; status mapped to canonical `accepted` | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/orders/:id` | Customer | No | None | Get pre-order details | IMPLEMENTED AND TESTED |
| `PATCH`/`PUT` | `/api/v1/orders/:id/items` | Customer | Yes | `{ items: [{ productId, quantity }] }` | Modify order items before pre-order cutoff time | IMPLEMENTED AND TESTED |
| `PATCH`/`POST`| `/api/v1/orders/:id/cancel` | Customer | Yes | `{ reason?: string }` | Cancel pre-order before cutoff time | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/orders/:id/reorder` | Customer | Yes | None | Reorders items from past order if currently in stock | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/reviews` | Customer | Yes | `{ orderId, targetType: 'farmer'\|'product', targetId, rating: 1-5, comment }` | Submit review on `completed` order | IMPLEMENTED BUT NOT VERIFIED |

---

### 3.5 Farmer Portal & Guided Onboarding Wizard (`/farmer`)

*Provides sensible multi-step save-and-resume onboarding. Account creation does not require a complete product catalog. Unapproved farmers cannot publish live stock or process orders.*

| Method | Reconciled Endpoint | Role | CSRF | Request / Response Details | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/farmer/onboarding` | Farmer | No | **Returns current progress:** `{ currentStep: 1-8, status: 'in_progress'\|'submitted'\|'approved', completedSteps: [1,2], stepData: { ... }, approvalStatus }` | IMPLEMENTED AND TESTED |
| `PUT` | `/api/v1/farmer/onboarding` | Farmer | Yes | **Save step progress:** `{ step: 1-8, data: { ...step specific fields... } }`. Automatically updates currentStep, completedSteps, and persists across sessions. | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/farmer/onboarding/submit`| Farmer | Yes | **Submit for admin approval:** Validates steps 1-4 & 8. Transitions `approvalStatus` to `pending` and `onboarding.status` to `submitted`. | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/farmer/profile` | Farmer | No | Farmer business profile & stall info | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/farmer/profile` | Farmer | Yes | Update phone, bio, stall coordinates, operating days | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/farmer/products` | Approved Farmer | No | List farmer products | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/farmer/products` | Approved Farmer | Yes | Create produce listing: `{ name, description?, categoryId, unit, basePriceMinor, currency? }` | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/farmer/products/:id` | Approved Farmer | Yes | Update produce listing | IMPLEMENTED AND TESTED |
| `DELETE`| `/api/v1/farmer/products/:id` | Approved Farmer | Yes | Archive product (blocked if active unfulfilled orders exist) | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/farmer/stock-templates` | Approved Farmer | No | Get weekly recurring allocation template | IMPLEMENTED AND TESTED |
| `PUT` | `/api/v1/farmer/stock-templates` | Approved Farmer | Yes | Save weekly recurring allocation template | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/farmer/stock-offers` | Approved Farmer | No | List dated stock offers for market days | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/farmer/stock-offers` | Approved Farmer | Yes | Publish/update dated stock offer (`availableQuantity`, `priceMinor`) | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/farmer/stock-offers/:id/status`| Approved Farmer | Yes | Toggle status (`available`, `sold_out`, `paused`) | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/farmer/pickup-windows` | Approved Farmer | No | List pickup slots configured by farmer | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/farmer/pickup-windows` | Approved Farmer | Yes | Create custom pickup window slot & capacity | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/farmer/orders` | Farmer | No | Query: `status?`, `marketDate?`. List incoming pre-orders | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/farmer/orders/:id` | Farmer | No | Full pre-order details with customer contact snapshot | IMPLEMENTED AND TESTED |
| `PATCH`/`PUT`| `/api/v1/farmer/orders/:id/status`| Approved Farmer | Yes | Transition status: `accepted`, `ready_for_pickup`, `completed`, `declined` (with mandatory reason) | IMPLEMENTED BUT NOT VERIFIED |
| `POST` | `/api/v1/farmer/orders/:id/accept` | Approved Farmer | Yes | Convenience POST action for status -> `accepted` | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/farmer/orders/:id/ready` | Approved Farmer | Yes | Convenience POST action for status -> `ready_for_pickup` | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/farmer/orders/:id/complete`| Approved Farmer | Yes | Convenience POST action for physical pickup completion | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/farmer/orders/:id/decline` | Approved Farmer | Yes | Convenience POST action: `{ reason: string }` | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/farmer/reports` (or `/insights`)| Farmer | No | Booked order value, collected cash at stall, product sales | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/farmer/reviews` | Farmer | No | List reviews received | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/farmer/reviews/:id/reply` | Farmer | Yes | Reply to customer review: `{ replyText: string }` | IMPLEMENTED AND TESTED |

---

### 3.6 Administration Portal (`/admin`)

| Method | Reconciled Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/farmers` | Admin | No | Query: `status?`, `countryCode?`, `search?`. List farmers & onboarding step | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/admin/farmers/:id/status` | Admin | Yes | `{ status: 'approved'\|'suspended'\|'pending', reason?: string }` | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/admin/customers` | Admin | No | Query: `status?`, `search?`. List customers | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/admin/customers/:id` | Admin | No | Detailed customer account metrics and order breakdown | IMPLEMENTED BUT NOT VERIFIED |
| `PATCH` | `/api/v1/admin/customers/:id/status`| Admin | Yes | Suspend or reactivate customer account | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/admin/markets` | Admin | Yes | Create market with countryCode, currency, IANA timezone, schedule exceptions | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/admin/markets/:id` | Admin | Yes | Update multi-country market attributes | IMPLEMENTED AND TESTED |
| `DELETE`| `/api/v1/admin/markets/:id` | Admin | Yes | Soft-delete market (blocked with 409 if active reservations exist) | IMPLEMENTED BUT NOT VERIFIED |
| `POST` | `/api/v1/admin/categories` | Admin | Yes | Create produce category | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/admin/categories/:id` | Admin | Yes | Update category name & icon | IMPLEMENTED AND TESTED |
| `DELETE`| `/api/v1/admin/categories/:id` | Admin | Yes | Delete category (blocked with 409 if active products linked) | IMPLEMENTED BUT NOT VERIFIED |
| `GET` | `/api/v1/admin/products` | Admin | No | Moderation catalog query with farmer details | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/admin/products/:id/status`| Admin | Yes | Moderate listing: `{ status: 'active'\|'rejected'\|'flagged' }` | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/admin/reviews` | Admin | No | List reviews for moderation | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/admin/reviews/:id/status` | Admin | Yes | Moderate review: `{ moderationStatus: 'approved'\|'flagged'\|'hidden' }` | IMPLEMENTED AND TESTED |
| `DELETE`| `/api/v1/admin/reviews/:id` | Admin | Yes | Permanently remove abusive review | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/admin/analytics` | Admin | No | Platform overview, booked order value, order counts | IMPLEMENTED BUT NOT VERIFIED |
| `GET` | `/api/v1/admin/reports/farmers` | Admin | No | Query: `limit?`, `sortBy?`. Ranked active farmers report | IMPLEMENTED BUT NOT VERIFIED |
| `GET` | `/api/v1/admin/announcements` | Admin | No | List all platform announcements | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/admin/announcements` | Admin | Yes | Create announcement with priority and type | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/admin/announcements/:id`| Admin | Yes | Edit announcement content or active state | IMPLEMENTED AND TESTED |
| `DELETE`| `/api/v1/admin/announcements/:id`| Admin | Yes | Remove announcement | IMPLEMENTED AND TESTED |
| `GET` | `/api/v1/admin/inquiries` | Admin | No | List customer contact inquiries | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/admin/inquiries/:id` | Admin | Yes | Update inquiry status: `{ status: 'new'\|'in_progress'\|'resolved' }` | IMPLEMENTED AND TESTED |

---

### 3.7 Notifications & Media

| Method | Reconciled Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications` | Authenticated | No | List order and alert notifications | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/notifications/:id/read` | Authenticated | Yes | Mark single notification as read | IMPLEMENTED AND TESTED |
| `PATCH` | `/api/v1/notifications/read-all` | Authenticated | Yes | Mark all notifications as read | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/uploads/image` | Authenticated | Yes | Upload image (`multipart/form-data`, field: `image`, max 5MB). Returns static `/uploads/img-...` URL | IMPLEMENTED AND TESTED |

---

### 3.8 MarketLink Copilot AI (`/ai`)

| Method | Reconciled Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ai/chat` | Authenticated | Yes | Grounded assistance using live MongoDB records. Prepares two-phase action draft | IMPLEMENTED AND TESTED |
| `POST` | `/api/v1/ai/actions/:draftId/confirm`| Authenticated | Yes | Confirms draft, performs server-side revalidation, logs to `auditLogs` collection | IMPLEMENTED AND TESTED |

---

## 4. Error Code Reference

| Error Code | HTTP Status | Meaning | Actionable User Guidance |
| :--- | :--- | :--- | :--- |
| `INSUFFICIENT_STOCK` | 409 | Requested quantity exceeds available allocation | Reduce item quantity or remove item |
| `PICKUP_WINDOW_FULL` | 409 | Pickup window reservations reached max capacity | Select an earlier or later pickup slot |
| `CUTOFF_PASSED` | 400 | Market pre-order cutoff deadline has expired | Pre-order closed; visit the farmer stall in person |
| `ACTIVE_RESERVATIONS_EXIST` | 409 | Market or product has active unfulfilled orders | Fulfill, cancel, or decline active orders first |
| `CATEGORY_IN_USE` | 409 | Category has active products assigned | Reassign products before deleting category |
| `CANNOT_CANCEL_STATUS` | 400 | Order already completed, ready, or cancelled | Cancellation is no longer permitted |
| `DUPLICATE_REVIEW` | 409 | Review already submitted for this order/target | A customer can only review a product/farmer once per order |
| `FARMER_NOT_APPROVED` | 403 | Farmer account is pending or suspended | Product publication and order processing disabled until approved |
| `ONBOARDING_INCOMPLETE` | 400 | Mandatory onboarding wizard steps missing | Complete required contact, location, profile, and market fields |
| `CSRF_TOKEN_INVALID` | 403 | Missing or mismatched CSRF token | Provide valid `x-csrf-token` header matching cookie |
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired session token | Please log in to continue |
| `FORBIDDEN` | 403 | User role lacks permission for this resource | Action restricted to authorized accounts |
