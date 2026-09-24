# MarketLink Unified API Integration Contract (Astra Frontend Handoff)

**Document Version:** 1.0.0 (Consolidated Master Backend Contract)  
**Status:** PROPOSED FOR ARCHITECTURAL APPROVAL  
**Target Audience:** Astra (Frontend Lead), Antigravity (Backend Lead)  
**Scope:** Complete unified REST API specification covering Public Catalog, Authentication, Customer Engagement, Order Engine, Farmer Operations, Administration, Media Uploads, and MarketLink Copilot AI.

---

## 1. Core Architectural Invariants

1. **Market Pickup Only**:
   - There are **NO delivery addresses, delivery dispatchers, shipping couriers, or third-party logistics**.
   - Every order represents a pre-order reservation for a specific market date and physical pickup window.
2. **Payment Physical-at-Pickup**:
   - There are **NO credit card processing, payment gateways (Stripe/PayPal), or online bank transfers**.
   - Customers pay farmers directly in cash or local physical merchant methods when collecting produce at the stall.
3. **Atomic Stock & Allocation Invariant**:
   - Products are scheduled for market days via dated stock offers (`stockOffers`).
   - Checkout atomically decrements `availableQuantity` and increments `reservedQuantity`.
   - If any item in a multi-farmer cart cannot be satisfied, the **entire checkout rolls back** with zero partial reservations.
4. **Canonical Order Lifecycle**:
   - Canonical status sequence:
     $$\text{placed} \longrightarrow \text{accepted} \longrightarrow \text{ready\_for\_pickup} \longrightarrow \text{completed}$$
   - Terminal states:
     - `cancelled` (initiated by Customer before cutoff, or Admin)
     - `declined` (initiated by Farmer with mandatory reason)
   - Compatibility read layer: Legacy database records containing `confirmed` are transparently served and queried as `accepted`. The public API returns only `accepted`.
5. **No Gradients (Design System Mandate)**:
   - All frontend rendering consuming this API must strictly follow the solid-color luxury/premium design system. No CSS or Tailwind gradients.

---

## 2. Global Request & Response Conventions

### 2.1 Base URLs
- Primary Versioned API: `/api/v1`
- Backward-Compatible Alias: `/api`

### 2.2 Security, Authentication & Session
- **Authentication**: HTTP-Only cookie `token` storing signed JWT (`1d` expiration), or standard `Authorization: Bearer <token>` header.
- **CSRF Defense**: Double-submit cookie pattern. All mutation methods (`POST`, `PUT`, `PATCH`, `DELETE`) require:
  - Cookie: `marketlink_csrf=<token>`
  - Header: `x-csrf-token: <token>`
  - Obtain CSRF token via `GET /api/v1/auth/csrf-token`.

### 2.3 Standard Success Response Envelope
```json
{
  "data": { ... },
  "meta": {
    "total": 1,
    "timestamp": "2026-09-24T12:00:00.000Z"
  }
}
```

### 2.4 Standard Error Response Envelope
```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient available quantity for product 'Organic Spinach'.",
    "fields": [
      {
        "field": "items.0.quantity",
        "message": "Only 3 items remaining in stock."
      }
    ],
    "requestId": "req-1727180000000"
  }
}
```

---

## 3. Endpoints by Domain

### 3.1 Authentication & Session (`/auth`)

| Method | Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Yes | Register new customer or farmer account | Implemented & Tested |
| `POST` | `/api/v1/auth/login` | Public | Yes | Authenticate and issue HTTP-only `token` cookie | Implemented & Tested |
| `GET` | `/api/v1/auth/me` | Authenticated | No | Return current user profile, role, and farmer profile | Implemented & Tested |
| `POST` | `/api/v1/auth/logout` | Authenticated | Yes | Clear auth cookie session | Implemented & Tested |
| `GET` | `/api/v1/auth/csrf-token` | Public | No | Retrieve active CSRF token | Implemented & Tested |

---

### 3.2 Customer Profile & Engagement (`/customer`)

| Method | Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/customer/profile` | Customer | No | Get current customer profile details | Implemented & Tested |
| `PATCH` | `/api/v1/customer/profile` | Customer | Yes | Update customer name, phone, preferences | Implemented & Tested |
| `GET` | `/api/v1/customer/preferences` | Customer | No | Get customer pickup notes & dietary preferences | Implemented & Tested |
| `PUT` | `/api/v1/customer/preferences` | Customer | Yes | Update customer default market & preferences | Implemented & Tested |
| `GET` | `/api/v1/customer/favourites` | Customer | No | List saved favourite farmers, products, markets | Implemented & Tested |
| `POST` | `/api/v1/customer/favourites` | Customer | Yes | Add target to favourites (`farmer`, `product`, `market`)| Implemented & Tested |
| `DELETE`| `/api/v1/customer/favourites/:id`| Customer | Yes | Remove favourite by ID | Implemented & Tested |
| `GET` | `/api/v1/customer/restock-alerts`| Customer | No | List registered restock notifications | Implemented & Tested |
| `POST` | `/api/v1/customer/restock-alerts`| Customer | Yes | Subscribe to product restock notification | Implemented & Tested |
| `DELETE`| `/api/v1/customer/restock-alerts/:id`| Customer | Yes | Unsubscribe from restock notification | Implemented & Tested |

---

### 3.3 Public Catalog & Markets

| Method | Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/markets` | Public | No | List active farmers markets with geo-search & days | Implemented & Tested |
| `GET` | `/api/v1/markets/:id` | Public | No | Get market details and attending approved farmers | Implemented & Tested |
| `GET` | `/api/v1/categories` | Public | No | List active produce categories | Implemented & Tested |
| `GET` | `/api/v1/products` | Public | No | Search public products by category, search, farmer | Implemented & Tested |
| `GET` | `/api/v1/products/:id` | Public | No | Get detailed product profile & seller details | Implemented & Tested |
| `GET` | `/api/v1/farmers/:id` | Public | No | Public farmer profile, bio, stall pin, ratings | Implemented & Tested |
| `GET` | `/api/v1/pickup-windows` | Public | No | List pickup slots for a market date | Implemented & Tested |
| `GET` | `/api/v1/reviews/farmer/:id` | Public | No | Get public reviews for a farmer | Implemented & Tested |
| `GET` | `/api/v1/reviews/product/:id` | Public | No | Get public reviews for a product | Implemented & Tested |
| `GET` | `/api/v1/announcements` | Public | No | Get active platform & market announcements | Implemented & Tested |
| `POST` | `/api/v1/contact` | Public | No | Submit general or wholesale contact inquiry | Implemented & Tested |

---

### 3.4 Order Processing (`/orders`)

| Method | Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/orders/validate-cart` | Customer | Yes | Pre-validate cart stock, pricing, and cutoff | Implemented & Tested |
| `POST` | `/api/v1/orders/checkout` | Customer | Yes | Atomic checkout with multi-farmer splitting | Implemented & Tested |
| `GET` | `/api/v1/orders` | Customer | No | List customer pre-orders with status filter | Implemented & Tested |
| `GET` | `/api/v1/orders/:id` | Customer | No | Get single pre-order details | Implemented & Tested |
| `PATCH` | `/api/v1/orders/:id/cancel` | Customer | Yes | Cancel order before cutoff time | Implemented & Tested |
| `POST` | `/api/v1/reviews` | Customer | Yes | Leave review on completed order (`1-5` stars) | Implemented & Tested |

#### Checkout Request Payload (`POST /api/v1/orders/checkout`):
```json
{
  "marketId": "651fbc102e3b2a001a111111",
  "marketDate": "2026-10-18",
  "pickupWindowId": "651fbc102e3b2a001a222222",
  "items": [
    { "productId": "651fbc102e3b2a001a333333", "quantity": 2 },
    { "productId": "651fbc102e3b2a001a444444", "quantity": 1 }
  ],
  "customerNotes": "Please pack in paper bags if available."
}
```
*Optional Header:* `Idempotency-Key: <unique-uuid>` prevents duplicate checkouts on network retries.

#### Checkout Response:
```json
{
  "data": {
    "checkoutGroupId": "grp-1727181000-abc1234",
    "orders": [
      {
        "id": "651fbc102e3b2a001a555555",
        "orderNumber": "ORD-20261018-0001",
        "farmerId": "651fbc102e3b2a001a888888",
        "farmerBusinessName": "Greenfield Organic Orchards",
        "marketName": "Liberty Sunday Farmers Market",
        "marketDate": "2026-10-18",
        "status": "placed",
        "items": [ ... ],
        "totalAmountMinor": 50000,
        "currency": "PKR",
        "payment": {
          "method": "pay_at_pickup",
          "status": "pending_pickup"
        }
      }
    ]
  }
}
```

---

### 3.5 Farmer Portal (`/farmer`)

| Method | Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/farmer/profile` | Farmer | No | Get farmer's business profile & stall info | Implemented & Tested |
| `PATCH` | `/api/v1/farmer/profile` | Farmer | Yes | Update farm description, phone, stall coords | Implemented & Tested |
| `GET` | `/api/v1/farmer/products` | Farmer | No | List farmer's product catalog | Implemented & Tested |
| `POST` | `/api/v1/farmer/products` | Approved Farmer | Yes | Create new produce listing | Implemented & Tested |
| `PATCH` | `/api/v1/farmer/products/:id` | Approved Farmer | Yes | Edit product title, price, description | Implemented & Tested |
| `DELETE`| `/api/v1/farmer/products/:id` | Approved Farmer | Yes | Archive product (blocks if active reservations exist) | Implemented & Tested |
| `GET` | `/api/v1/farmer/inventory/templates` | Farmer | No | Get weekly recurring stock template | Implemented & Tested |
| `PUT` | `/api/v1/farmer/inventory/templates` | Approved Farmer | Yes | Save weekly recurring stock template | Implemented & Tested |
| `GET` | `/api/v1/farmer/inventory/offers` | Farmer | No | List dated stock offers for upcoming market | Implemented & Tested |
| `POST` | `/api/v1/farmer/inventory/offers` | Approved Farmer | Yes | Publish/update dated stock allocation | Implemented & Tested |
| `PATCH` | `/api/v1/farmer/inventory/offers/:id/status` | Approved Farmer | Yes | Update offer status (`available`, `sold_out`, `paused`) | Implemented & Tested |
| `GET` | `/api/v1/farmer/orders` | Farmer | No | List incoming pre-orders with status & date filters | Implemented & Tested |
| `GET` | `/api/v1/farmer/orders/:id` | Farmer | No | Get complete order details with customer contact | Implemented & Tested |
| `PATCH` | `/api/v1/farmer/orders/:id/status` | Approved Farmer | Yes | Advance order status (`accepted`, `ready_for_pickup`, `completed`, `declined`)| Implemented & Tested |
| `POST` | `/api/v1/farmer/pickup-windows` | Approved Farmer | Yes | Configure custom pickup slot & capacity | Implemented & Tested |
| `GET` | `/api/v1/farmer/reports` | Farmer | No | Get sales reports, booked value & completed revenue | Implemented & Tested |
| `GET` | `/api/v1/farmer/reviews` | Farmer | No | List customer reviews received | Implemented & Tested |
| `POST` | `/api/v1/farmer/reviews/:id/reply` | Farmer | Yes | Post a farmer response to customer review | Implemented & Tested |

---

### 3.6 Administration Portal (`/admin`)

| Method | Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/farmers` | Admin | No | List all farmer accounts & approval status | Implemented & Tested |
| `PATCH` | `/api/v1/admin/farmers/:id/status` | Admin | Yes | Approve or suspend farmer account | Implemented & Tested |
| `GET` | `/api/v1/admin/customers` | Admin | No | List registered customer accounts | Implemented & Tested |
| `GET` | `/api/v1/admin/customers/:id` | Admin | No | Detailed customer account metrics & order history | Implemented & Tested |
| `PATCH` | `/api/v1/admin/customers/:id/status` | Admin | Yes | Suspend or reactivate customer account | Implemented & Tested |
| `POST` | `/api/v1/admin/markets` | Admin | Yes | Create new farmers market location | Implemented & Tested |
| `PATCH` | `/api/v1/admin/markets/:id` | Admin | Yes | Update market operating hours & coordinates | Implemented & Tested |
| `DELETE`| `/api/v1/admin/markets/:id` | Admin | Yes | Soft-delete market (blocks if active reservations exist) | Implemented & Tested |
| `POST` | `/api/v1/admin/categories` | Admin | Yes | Create product category | Implemented & Tested |
| `PATCH` | `/api/v1/admin/categories/:id` | Admin | Yes | Update category name & icon | Implemented & Tested |
| `DELETE`| `/api/v1/admin/categories/:id` | Admin | Yes | Soft-delete category (blocks if active products exist) | Implemented & Tested |
| `GET` | `/api/v1/admin/products` | Admin | No | List all products with farmer & moderation status | Implemented & Tested |
| `PATCH` | `/api/v1/admin/products/:id/status` | Admin | Yes | Moderate product status (`active`, `rejected`, `flagged`) | Implemented & Tested |
| `GET` | `/api/v1/admin/reviews` | Admin | No | List all customer reviews for moderation | Implemented & Tested |
| `PATCH` | `/api/v1/admin/reviews/:id/status` | Admin | Yes | Moderate review status (`approved`, `flagged`, `hidden`) | Implemented & Tested |
| `DELETE`| `/api/v1/admin/reviews/:id` | Admin | Yes | Permanently remove inappropriate review | Implemented & Tested |
| `GET` | `/api/v1/admin/analytics` | Admin | No | Platform overview, booked value & order counts | Implemented & Tested |
| `GET` | `/api/v1/admin/reports/farmers` | Admin | No | Ranked most active farmers report | Implemented & Tested |
| `GET` | `/api/v1/admin/announcements` | Admin | No | List all platform announcements | Implemented & Tested |
| `POST` | `/api/v1/admin/announcements` | Admin | Yes | Create announcement | Implemented & Tested |
| `PATCH` | `/api/v1/admin/announcements/:id`| Admin | Yes | Update announcement text, priority, visibility | Implemented & Tested |
| `DELETE`| `/api/v1/admin/announcements/:id`| Admin | Yes | Delete announcement | Implemented & Tested |
| `GET` | `/api/v1/admin/inquiries` | Admin | No | List public contact inquiries | Implemented & Tested |
| `PATCH` | `/api/v1/admin/inquiries/:id` | Admin | Yes | Update inquiry status (`new`, `in_progress`, `resolved`) | Implemented & Tested |

---

### 3.7 Media & Image Uploads (`/uploads`)

| Method | Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/uploads/image` | Authenticated | Yes | Upload image (`multipart/form-data`, max 5MB) | Implemented & Tested |

- **Field Name**: `image`
- **Allowed Formats**: JPEG, PNG, WEBP, GIF
- **Response**:
```json
{
  "success": true,
  "data": {
    "url": "/uploads/img-1727181122-123456789.png",
    "filename": "img-1727181122-123456789.png",
    "mimetype": "image/png",
    "size": 1048576
  }
}
```

---

### 3.8 MarketLink Copilot AI (`/ai`)

| Method | Endpoint | Role | CSRF | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ai/chat` | Authenticated | Yes | Grounded role-based copilot assistance & action draft | Implemented & Tested |
| `POST` | `/api/v1/ai/actions/:draftId/confirm` | Authenticated | Yes | Confirm & execute consequential action with audit log | Implemented & Tested |

- **Two-Phase Action Safety**:
  - Phase 1: Copilot returns draft action preview with `draftId` and `requiresConfirmation: true`.
  - Phase 2: User explicitly clicks confirm -> backend executes action, performs server-side revalidation, logs to `auditLogs` collection, and marks draft executed.
  - Consequential actions supported:
    - Farmer: Stall pin/number update
    - Customer: Order cancellation within pre-cutoff window

---

## 4. Canonical Status Transition Matrix

```
                    ┌──────────────────────────────────────────────┐
                    │                    placed                    │
                    └───────────────────────┬──────────────────────┘
                                            │
                                  Farmer accepts
                                            ▼
                    ┌──────────────────────────────────────────────┐
                    │                   accepted                   │
                    └───────────────────────┬──────────────────────┘
                                            │
                                Farmer prepares order
                                            ▼
                    ┌──────────────────────────────────────────────┐
                    │              ready_for_pickup                │
                    └───────────────────────┬──────────────────────┘
                                            │
                          Customer picks up & pays cash at stall
                                            ▼
                    ┌──────────────────────────────────────────────┐
                    │                  completed                   │
                    └──────────────────────────────────────────────┘

TERMINAL / ABORT PATHS:
- From placed: Farmer can decline (-> declined), Customer can cancel (-> cancelled)
- From accepted: Farmer can decline (-> declined), Customer can cancel before cutoff (-> cancelled)
- From ready_for_pickup: Customer must collect. Cancellation disabled.
- From completed: Terminal. Customer can submit 1 review per product/farmer.
```

---

## 5. Conflict & Error Code Reference

| Code | HTTP Status | Description | Actionable Resolution |
| :--- | :--- | :--- | :--- |
| `INSUFFICIENT_STOCK` | `409` | Not enough stock available for item | Adjust item quantity or remove from cart |
| `PICKUP_WINDOW_FULL` | `409` | Pickup window reached capacity limit | Select another pickup window slot |
| `CUTOFF_PASSED` | `400` | Market pre-order cutoff time has expired | Pre-order closed; visit market for stall walk-in |
| `ACTIVE_RESERVATIONS_EXIST`| `409` | Market or product has active unfulfilled orders | Fulfill or decline active orders before deleting |
| `CATEGORY_IN_USE` | `409` | Category contains active unarchived products | Reassign products before deleting category |
| `CANNOT_CANCEL_STATUS` | `400` | Order already completed, ready, or cancelled | Order cannot be cancelled in this state |
| `DUPLICATE_REVIEW` | `409` | Review already left for this target & order | Edit existing review or view submitted rating |
| `FARMER_NOT_APPROVED` | `403` | Farmer account pending or suspended | Wait for admin approval before publishing stock |
