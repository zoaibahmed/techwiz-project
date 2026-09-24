# MarketLink Backend Phase 4: Customer Engagement, Favourites, Reviews & Alerts Integration Guide

**Status**: Implemented & Verified (67/67 Passing Tests Across Backend)  
**Branch**: `Server`  
**Security Model**: Strict HTTP-Only Cookies (`token`) + Double-Submit CSRF Protection (`marketlink_csrf` cookie + `x-csrf-token` header)  

---

## 1. Endpoints Catalog & Astra Frontend Contract

### A. Customer Profile & Preferences
#### 1. Get Customer Profile
- **Method & Path**: `GET /api/v1/customer/profile` (aliases: `/api/v1/customers/profile`, `/api/v1/me/profile`)
- **Permissions**: Authenticated Customer (`role: 'customer'`)
- **Response `200 OK`**:
```json
{
  "data": {
    "id": "66f000000000000000000005",
    "firstName": "Sarah",
    "lastName": "Khan",
    "name": "Sarah Khan",
    "email": "customer.sarah@marketlink.com",
    "phone": "03001234567",
    "role": "customer",
    "preferences": {
      "preferredMarketId": "66f200000000000000000001",
      "preferredMarket": {
        "id": "66f200000000000000000001",
        "name": "Gulberg Saturday Farmers Market",
        "address": "Main Boulevard, Gulberg, Lahore"
      },
      "dietaryPreferences": ["Organic", "Pesticide-Free"],
      "defaultPickupNotes": "Please pack in cloth bags",
      "phone": "03001234567"
    }
  }
}
```

#### 2. Update Customer Profile & Preferences
- **Method & Path**: `PATCH /api/v1/customer/profile` (or `PUT`)
- **Permissions**: Authenticated Customer (`role: 'customer'`)
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "phone": "03009988776",
  "preferredMarketId": "66f200000000000000000001",
  "dietaryPreferences": ["Organic", "Pesticide-Free"],
  "defaultPickupNotes": "Pack in paper boxes."
}
```
- **Response `200 OK`**: Returns updated customer profile object.

---

### B. Customer Favourites (Wishlist)
#### 1. Add Favourite
- **Method & Path**: `POST /api/v1/favourites`
- **Permissions**: Authenticated Customer
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "targetType": "farmer", // or "product" or "market"
  "targetId": "66f000000000000000000002"
}
```
- **Response `201 Created`**:
```json
{
  "data": {
    "id": "6702a0...",
    "customerId": "66f000000000000000000005",
    "targetType": "farmer",
    "targetId": "66f000000000000000000002",
    "createdAt": "2026-09-24T06:50:00.000Z",
    "isNew": true
  }
}
```

#### 2. Check Favourite Status
- **Method & Path**: `GET /api/v1/favourites/check?targetType=product&targetId=66f400000000000000000001`
- **Permissions**: Authenticated Customer
- **Response `200 OK`**:
```json
{
  "data": {
    "isFavourited": true
  }
}
```

#### 3. List Favourites
- **Method & Path**: `GET /api/v1/favourites` (alias: `/api/v1/me/favourites`)
- **Permissions**: Authenticated Customer
- **Response `200 OK`**: Enriched array with target details (businessName, bio, rating for farmer; name, basePriceMinor, unit for product; name, address for market).

#### 4. Remove Favourite
- **Method & Path**: `DELETE /api/v1/favourites/:targetType/:targetId`
- **Permissions**: Authenticated Customer
- **Headers**: `x-csrf-token`
- **Response `200 OK`**: `{ "data": { "removed": true } }`

---

### C. Restock Alerts
#### 1. Subscribe to Restock Alert
- **Method & Path**: `POST /api/v1/restock-alerts`
- **Permissions**: Authenticated Customer
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "productId": "66f400000000000000000001",
  "marketId": "66f200000000000000000001"
}
```
- **Response `201 Created`**: `{ "data": { "id": "...", "status": "active", "productName": "Organic Spinach", "marketName": "Liberty Market" } }`

#### 2. List Active Restock Alerts
- **Method & Path**: `GET /api/v1/restock-alerts`
- **Permissions**: Authenticated Customer
- **Response `200 OK`**: Array of active subscriptions.

#### 3. Automated Trigger & Notification
- When a farmer posts or adjusts a dated stock offer (`availableQuantity > 0`), the backend automatically marks matching active alerts as `triggered` and writes a high-priority in-app notification for the customer.

#### 4. Cancel Restock Alert
- **Method & Path**: `DELETE /api/v1/restock-alerts/:id`
- **Permissions**: Authenticated Customer
- **Headers**: `x-csrf-token`
- **Response `200 OK`**: `{ "data": { "cancelled": true } }`

---

### D. Reviews & Ratings Engine
#### 1. Submit Review (Farmer or Individual Product)
- **Method & Path**: `POST /api/v1/reviews`
- **Permissions**: Authenticated Customer
- **Headers**: `x-csrf-token`
- **Eligibility Invariants**:
  - Order must be in `completed` status (pickup confirmed).
  - Target must match the order contents (farmer must be the order's farmer; product must be an item purchased in the order).
  - One review allowed per target per order (compound index `{ orderId: 1, customerId: 1, targetType: 1, targetId: 1 }` prevents duplicates with `409 Conflict`).
- **Request Body**:
```json
{
  "orderId": "6701a1b2c3d4e5f6a7b8c9d1",
  "targetType": "farmer", // or "product"
  "targetId": "66f000000000000000000002",
  "rating": 5, // 1 to 5 integer
  "comment": "Crisp organic harvest and very polite farmer stall staff."
}
```
- **Response `201 Created`**: Returns created review with auto-approved status and automatically updates the target's aggregate `rating` and `reviewCount`.

#### 2. Public Target Reviews
- **Method & Path**:
  - `GET /api/v1/reviews/farmer/:id`
  - `GET /api/v1/reviews/product/:id`
- **Permissions**: Public (No auth required)
- **Response `200 OK`**:
```json
{
  "data": {
    "targetType": "farmer",
    "targetId": "66f000000000000000000002",
    "averageRating": 4.9,
    "totalReviews": 18,
    "reviews": [...]
  }
}
```

#### 3. Farmer Review Management & Reply
- **Method & Path**: `GET /api/v1/farmer/reviews` (Farmer lists reviews of their farm & products)
- **Method & Path**: `POST /api/v1/farmer/reviews/:id/reply`
- **Permissions**: Authenticated Farmer (only for reviews belonging to them)
- **Headers**: `x-csrf-token`
- **Request Body**: `{ "replyText": "Thank you! We harvest at dawn for maximum freshness." }`
- **Notification**: Automatically dispatches a `review_reply` notification to the customer.

#### 4. Admin Review Moderation
- **Method & Path**: `GET /api/v1/admin/reviews` (Optional `?status=approved|flagged|hidden`)
- **Method & Path**: `PATCH /api/v1/admin/reviews/:id/status`
- **Permissions**: Authenticated Admin
- **Headers**: `x-csrf-token`
- **Request Body**: `{ "moderationStatus": "hidden", "moderationReason": "Inappropriate content" }`

---

### E. Customer Reordering & Farmer Reports
#### 1. Reorder from Past Order
- **Method & Path**: `POST /api/v1/orders/:id/reorder`
- **Permissions**: Authenticated Customer
- **Headers**: `x-csrf-token`
- **Request Body**: `{ "targetMarketDate": "2026-10-31" }`
- **Response `200 OK`**: Returns item-by-item availability report against current stock offers and pre-fills `readyForCheckoutItems` for instantaneous checkout.

#### 2. Farmer Reports & Insights
- **Method & Path**: `GET /api/v1/farmer/reports` (alias: `/api/v1/farmer/insights`)
- **Permissions**: Authenticated Farmer
- **Response `200 OK`**:
  - Metric order counts by status (`placed`, `accepted`, `ready_for_pickup`, `completed`, `declined`, `cancelled`).
  - Booked pre-order value vs physically collected payments.
  - Best-selling products ranked by volume and revenue.
  - Upcoming pickup schedule grouped by market date.
