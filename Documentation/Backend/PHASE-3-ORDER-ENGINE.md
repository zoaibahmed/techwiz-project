# MarketLink Backend Phase 3: Order Engine & Copilot Integration Guide

**Status**: Implemented & Verified (44/44 Passing Tests)  
**Branch**: `Server`  
**Security Model**: Strict HTTP-Only Cookies (`token`) + Double-Submit CSRF Protection (`marketlink_csrf` cookie + `x-csrf-token` header)  
**SRS Invariants Enforced**:
- **Market Pickup Only**: Customers pay the farmer physically at pickup.
- **No Gateways / No Courier**: No Stripe, JazzCash, EasyPaisa, cash-on-delivery, or delivery courier logistics.
- **Stock Reservation Persistence**: Reservations created by checkout remain permanently tied to the order until physical completion, customer cancellation, or farmer decline. No 15-minute premature order release.
- **Idempotency & Concurrency**: Checkout idempotency prevents duplicate pre-orders. Atomic inventory check and decrement (`$gte`, `$inc`) prevents overselling.

---

## 1. API Endpoints Catalog

### A. Customer Checkout & Cart Processing
#### 1. Cart-to-Checkout
- **Method & Path**: `POST /api/v1/orders/checkout`
- **Permissions**: Authenticated Customer (`role: 'customer'`)
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "marketId": "66f200000000000000000001",
  "marketDate": "2026-10-18",
  "pickupWindowId": "66f500000000000000000001",
  "items": [
    {
      "productId": "66f400000000000000000001",
      "quantity": 2
    },
    {
      "productId": "66f400000000000000000004",
      "quantity": 1
    }
  ],
  "idempotencyKey": "c3a9f0e1-4b21-4d92-bcf8-0192837465ab",
  "customerNotes": "Please pack in recyclable paper bags."
}
```
- **Response `201 Created`** (or `200 OK` on idempotent replay):
```json
{
  "data": {
    "isIdempotentReplay": false,
    "checkoutGroupId": "CG-1790191186311-B8CBAF",
    "orders": [
      {
        "id": "6701a1b2c3d4e5f6a7b8c9d1",
        "orderNumber": "ML-20261018-7F3A2B",
        "checkoutGroupId": "CG-1790191186311-B8CBAF",
        "customerId": "66f000000000000000000005",
        "farmerId": "66f000000000000000000002",
        "farmer": {
          "businessName": "Greenfield Organic Orchards",
          "contactPerson": "Tariq Mahmood",
          "stallNumber": "Stall A-12",
          "phone": "+923005550101"
        },
        "marketId": "66f200000000000000000001",
        "market": {
          "name": "Model Town Sunday Organic Bazaar",
          "address": "Model Town Central Park, Block C, Lahore",
          "city": "Lahore"
        },
        "marketDate": "2026-10-18",
        "pickupWindow": {
          "id": "66f500000000000000000001",
          "startTime": "08:30",
          "endTime": "10:30",
          "cutoffAt": "2026-10-17T20:00:00.000Z"
        },
        "items": [
          {
            "productId": "66f400000000000000000001",
            "name": "Organic Cherry Tomatoes",
            "unit": "kg",
            "unitPriceMinor": 25000,
            "quantity": 2,
            "subtotalMinor": 50000
          }
        ],
        "totalAmountMinor": 50000,
        "currency": "PKR",
        "status": "placed",
        "payment": {
          "method": "pay_at_pickup",
          "status": "pending_pickup",
          "paidAmountMinor": 0
        },
        "customerNotes": "Please pack in recyclable paper bags.",
        "createdAt": "2026-09-24T00:15:00.000Z",
        "updatedAt": "2026-09-24T00:15:00.000Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-09-24T00:15:00.000Z"
  }
}
```
- **Error Codes**:
  - `400 CUTOFF_PASSED`: The pre-order cutoff timestamp for the selected pickup window has passed.
  - `400 PICKUP_WINDOW_FULL`: Capacity reached for this pickup window.
  - `400 INSUFFICIENT_STOCK`: Stock unavailable for one or more requested items (details returned).
  - `400 FARMER_NOT_APPROVED`: Product owner is unapproved or suspended.
  - `403 CSRF_TOKEN_INVALID`: Missing or mismatched CSRF token.

---

### B. Customer Order History, Modification & Cancellation
#### 1. List Customer Orders
- **Method & Path**: `GET /api/v1/orders`
- **Permissions**: Authenticated Customer
- **Query Filters**: `status` (`placed`, `confirmed`, `ready_for_pickup`, `completed`, `cancelled`, `declined`), `marketDate`, `marketId`
- **Response `200 OK`**: Returns array of formatted order summaries.

#### 2. Get Single Order Detail
- **Method & Path**: `GET /api/v1/orders/:id`
- **Permissions**: Order Owner Customer

#### 3. Modify Order Items (Before Cutoff)
- **Method & Path**: `PATCH /api/v1/orders/:id/items`
- **Permissions**: Order Owner Customer
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "items": [
    {
      "productId": "66f400000000000000000001",
      "quantity": 4
    }
  ]
}
```
- **Behavior**: Atomically calculates delta; reserves extra stock if increased, releases stock if decreased. Rejects with `400 CUTOFF_PASSED` if past pickup window cutoff.

#### 4. Cancel Order & Release Stock (Before Cutoff)
- **Method & Path**: `PATCH /api/v1/orders/:id/cancel`
- **Permissions**: Order Owner Customer
- **Headers**: `x-csrf-token`
- **Request Body**: `{ "reason": "Change of plans for Sunday morning." }`
- **Behavior**: Sets `status: 'cancelled'`, immediately releases all reserved stock back to `availableQuantity`, and decrements pickup window reservation count.

---

### C. Farmer Order Lifecycle Management
#### 1. List Farmer Orders
- **Method & Path**: `GET /api/v1/farmer/orders`
- **Permissions**: Authenticated Farmer (`role: 'farmer'`)
- **Query Filters**: `status`, `marketDate`, `marketId`
- **Response `200 OK`**: Returns farmer's incoming orders with customer contact and pickup details.

#### 2. Get Farmer Order Detail
- **Method & Path**: `GET /api/v1/farmer/orders/:id`
- **Permissions**: Order Assignee Farmer

#### 3. Update Order Status
- **Method & Path**: `PATCH /api/v1/farmer/orders/:id/status`
- **Permissions**: Order Assignee Farmer
- **Headers**: `x-csrf-token`
- **State Machine Transitions**:
  - `placed` -> `confirmed` (Farmer accepts order)
  - `placed` -> `declined` (Farmer declines with required `reason`; reserved stock immediately released)
  - `confirmed` -> `ready_for_pickup` (Farmer packs produce at market stall; notifies customer)
  - `ready_for_pickup` -> `completed` (Customer collects order at stall and pays cash; updates `payment.status: 'paid_at_pickup'`)
- **Request Body (Accept)**: `{ "status": "confirmed" }`
- **Request Body (Decline)**: `{ "status": "declined", "reason": "Overnight frost damage" }`
- **Request Body (Ready)**: `{ "status": "ready_for_pickup" }`
- **Request Body (Complete)**: `{ "status": "completed" }`

---

### D. In-App Notifications
- **List Notifications**: `GET /api/v1/notifications?limit=50`
- **Mark Single as Read**: `PATCH /api/v1/notifications/:id/read`
- **Mark All as Read**: `PATCH /api/v1/notifications/read-all`

---

### E. Phase 4 Preparation: MarketLink Copilot AI
#### 1. Copilot Conversation
- **Method & Path**: `POST /api/v1/ai/chat`
- **Permissions**: Authenticated User (`customer`, `farmer`, `admin`)
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "message": "Please update my stall location to Stall B-18 for Sunday."
}
```
- **Response `200 OK`**:
```json
{
  "data": {
    "role": "farmer",
    "reply": "I have drafted an action to update your market stall number to \"Stall B-18\". Consequential changes to your farm profile require your explicit confirmation before they take effect. Would you like me to apply this update?",
    "proposedAction": {
      "draftId": "6701a1b2c3d4e5f6a7b8c9e9",
      "actionType": "update_stall_pin",
      "summary": "Update farm stall designation to \"Stall B-18\".",
      "requiresConfirmation": true
    }
  }
}
```

#### 2. Confirm Consequential AI Action
- **Method & Path**: `POST /api/v1/ai/actions/:draftId/confirm`
- **Permissions**: Authenticated User (Draft Creator)
- **Headers**: `x-csrf-token`
- **Response `200 OK`**: Executes verified change and deletes draft.

---

## 2. Test Verification Matrix

| Test Suite | File | Tests | Status |
| :--- | :--- | :---: | :---: |
| Database & Connection Pooling | `tests/db.test.js` | 3 | PASS |
| Health & System Metrics | `tests/health.test.js` | 4 | PASS |
| Auth, HTTP-Only Cookies & CSRF | `tests/auth.test.js` | 10 | PASS |
| Market & Catalogue Engine | `tests/market-catalogue.test.js` | 15 | PASS |
| Order Engine, Concurrency & Copilot | `tests/order-engine.test.js` | 12 | PASS |
| **Total** | | **44** | **100% PASS** |
