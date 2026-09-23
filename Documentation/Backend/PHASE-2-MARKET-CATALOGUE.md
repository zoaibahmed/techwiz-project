# MarketLink Backend Phase 2: Market & Catalogue Engine Documentation

**Status**: Implemented & Verified (32/32 Passing Tests)  
**Branch**: `Server`  
**Security Model**: Strict HTTP-Only Cookies (No session tokens in JavaScript/localStorage) + Double-Submit CSRF Protection  
**Demo Geography**: Lahore, Pakistan (`PKR`, `Asia/Karachi`)

---

## 1. Authentication & Security Architecture

### A. HTTP-Only Cookie Session Management
- **Token Delivery**: Session JWTs are issued via strict HTTP-only cookies (`token`). Frontend JavaScript cannot access or read session tokens.
- **Cookie Flags**:
  - `token`: `httpOnly: true`, `secure: isProduction`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 7 days`.
  - `marketlink_csrf`: `httpOnly: false`, `secure: isProduction`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 7 days`.
- **Session Hydration**:
  - `GET /api/v1/auth/me` reads the HTTP-only cookie automatically when `credentials: 'include'` (fetch) or `withCredentials: true` (axios) is supplied.
  - Returns authenticated user profile and nested `farmerProfile` (if farmer).

### B. CSRF Protection
- **Double-Submit Cookie Pattern**:
  - On login or registration, the server issues a non-HttpOnly cookie `marketlink_csrf`.
  - On any mutating HTTP request (`POST`, `PATCH`, `PUT`, `DELETE`), client JavaScript must read `marketlink_csrf` and submit it in the header `x-csrf-token`.
  - Exempt paths: `/api/v1/auth/register/*` and `/api/v1/auth/login`.

### C. Review Model Correction
- **Compound Unique Index**:
  - Index: `{ orderId: 1, customerId: 1, targetType: 1, targetId: 1 }` (unique: true).
  - Permits reviewing the farmer (`targetType: 'farmer'`, `targetId: farmerId`) and each distinct purchased product (`targetType: 'product'`, `targetId: productId`) from the same completed order without duplicate restrictions.

---

## 2. API Endpoints Catalog

### A. Public Market Discovery
#### 1. List Active Markets
- **Method & Path**: `GET /api/v1/markets`
- **Permissions**: Public
- **Query Parameters**:
  - `city` (optional): Filter by city (e.g. `Lahore`)
  - `dayOfWeek` (optional, 0-6): Filter by operating day (0=Sunday, 6=Saturday)
- **Response `200 OK`**:
```json
{
  "data": [
    {
      "id": "6701a1b2c3d4e5f6a7b8c9d0",
      "name": "Model Town Sunday Organic Bazaar",
      "slug": "model-town-sunday-organic-bazaar",
      "city": "Lahore",
      "address": "Model Town Central Park, Block C, Lahore",
      "coordinates": {
        "latitude": 31.4822,
        "longitude": 74.3186
      },
      "operatingDays": [0],
      "operatingHours": {
        "open": "07:00",
        "close": "13:00"
      },
      "attendingFarmerCount": 2,
      "attendingFarmers": [
        {
          "id": "6701a1b2c3d4e5f6a7b8c9d1",
          "businessName": "Greenfield Organic Orchards",
          "stallNumber": "Stall A-12"
        }
      ]
    }
  ],
  "meta": {
    "total": 1,
    "timestamp": "2026-09-23T18:35:00.000Z"
  }
}
```

#### 2. Get Market Details
- **Method & Path**: `GET /api/v1/markets/:id`
- **Permissions**: Public
- **Response `200 OK`**: Returns full market metadata, coordinates, operating hours, and populated attending farmers list.
- **Errors**: `404 NOT_FOUND` if market does not exist or is inactive.

---

### B. Admin Market & Category Management
#### 1. Create Market
- **Method & Path**: `POST /api/v1/admin/markets`
- **Permissions**: Authenticated Admin (`role: 'admin'`)
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "name": "Gulberg Fresh Agri Market",
  "address": "Main Boulevard, Gulberg III, Lahore",
  "city": "Lahore",
  "timezone": "Asia/Karachi",
  "coordinates": {
    "latitude": 31.5102,
    "longitude": 74.3441
  },
  "operatingDays": [0, 6],
  "operatingHours": {
    "open": "07:30",
    "close": "12:30"
  },
  "mapProvider": "google"
}
```
- **Response `201 Created`**: Market object with generated `id` and slug.
- **Errors**: `400 VALIDATION_ERROR`, `403 FORBIDDEN`.

#### 2. Update Market
- **Method & Path**: `PATCH /api/v1/admin/markets/:id`
- **Permissions**: Authenticated Admin

#### 3. Category Management
- **List Categories (Public)**: `GET /api/v1/categories`
- **Create Category (Admin)**: `POST /api/v1/admin/categories`
  - Body: `{ "name": "Organic Vegetables", "slug": "organic-vegetables", "description": "Farm-fresh greens", "icon": "carrot" }`
  - Returns: `201 Created`
- **Update Category (Admin)**: `PATCH /api/v1/admin/categories/:id`
- **Delete Category (Admin)**: `DELETE /api/v1/admin/categories/:id` (Soft delete)

---

### C. Farmer Profiles & Market Attendance
#### 1. Public Farmer Profile & Produce Showcase
- **Method & Path**: `GET /api/v1/farmers/:id`
- **Permissions**: Public
- **Response `200 OK`**:
```json
{
  "data": {
    "id": "6701a1b2c3d4e5f6a7b8c9d1",
    "businessName": "Greenfield Organic Orchards",
    "contactPerson": "Tariq Mahmood",
    "bio": "Specialising in chemical-free heirloom vegetables.",
    "avatarUrl": "https://images.unsplash.com/photo-1542838132-92c53300491e",
    "stallNumber": "Stall A-12",
    "attendingMarkets": [
      {
        "id": "6701a1b2c3d4e5f6a7b8c9d0",
        "name": "Model Town Sunday Organic Bazaar",
        "city": "Lahore"
      }
    ],
    "currentOffers": [
      {
        "id": "6701a1b2c3d4e5f6a7b8c9d9",
        "name": "Farm Fresh Red Tomatoes",
        "date": "2026-09-27",
        "priceMinor": 25000,
        "availableQuantity": 50,
        "unit": "kg"
      }
    ]
  }
}
```

#### 2. Get Authenticated Farmer Profile
- **Method & Path**: `GET /api/v1/farmer/profile`
- **Permissions**: Authenticated Farmer (`role: 'farmer'`)

#### 3. Update Farmer Profile
- **Method & Path**: `PATCH /api/v1/farmer/profile`
- **Permissions**: Authenticated Farmer
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "businessName": "Greenfield Organic Orchards & Dairy",
  "bio": "Heirloom produce and artisanal farm dairy.",
  "stallNumber": "Stall A-14",
  "attendingMarketIds": ["6701a1b2c3d4e5f6a7b8c9d0"]
}
```

---

### D. Farmer Product Management (Master Catalogue)
#### 1. Create Product
- **Method & Path**: `POST /api/v1/farmer/products`
- **Permissions**: Authenticated & **Approved** Farmer (`approvalStatus: 'approved'`)
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "name": "Heirloom Beefsteak Tomatoes",
  "description": "Sweet, juicy, ripened on the vine.",
  "categoryId": "6701a1b2c3d4e5f6a7b8c9c1",
  "unit": "kg",
  "basePriceMinor": 25000,
  "images": ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea"],
  "tags": ["organic", "seasonal", "vine-ripened"]
}
```
- **Response `201 Created`**: Product object with `status: 'active'`.
- **Errors**: `403 FARMER_NOT_APPROVED` if farmer status is `pending` or `suspended`.

#### 2. List Farmer's Own Products
- **Method & Path**: `GET /api/v1/farmer/products`
- **Permissions**: Authenticated Farmer
- **Query Parameters**: `status` (`active`, `archived`)

#### 3. Edit Product
- **Method & Path**: `PATCH /api/v1/farmer/products/:id`
- **Permissions**: Authenticated Farmer (Product Owner)
- **Headers**: `x-csrf-token`

#### 4. Archive Product
- **Method & Path**: `DELETE /api/v1/farmer/products/:id`
- **Permissions**: Authenticated Farmer (Product Owner)
- **Headers**: `x-csrf-token`
- **Behavior**: Sets `status: 'archived'`, preserving historical order line items.

---

### E. Inventory & Dated Stock Offers
#### 1. Weekly Recurring Stock Template
- **Method & Path**: `PUT /api/v1/farmer/stock-templates`
- **Permissions**: Authenticated & Approved Farmer
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "marketId": "6701a1b2c3d4e5f6a7b8c9d0",
  "dayOfWeek": 0,
  "items": [
    {
      "productId": "6701a1b2c3d4e5f6a7b8c9e1",
      "defaultQuantity": 50,
      "defaultPriceMinor": 25000,
      "unit": "kg"
    }
  ]
}
```
- **Response `200 OK`**: Upserted recurring stock template.

#### 2. Allocate Dated Stock Offer for Market Day
- **Method & Path**: `POST /api/v1/farmer/stock-offers`
- **Permissions**: Authenticated & Approved Farmer
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "marketId": "6701a1b2c3d4e5f6a7b8c9d0",
  "productId": "6701a1b2c3d4e5f6a7b8c9e1",
  "date": "2026-09-27",
  "priceMinor": 25000,
  "totalQuantity": 40,
  "unit": "kg"
}
```
- **Response `201 Created`**:
```json
{
  "data": {
    "id": "6701a1b2c3d4e5f6a7b8c9f5",
    "marketId": "6701a1b2c3d4e5f6a7b8c9d0",
    "productId": "6701a1b2c3d4e5f6a7b8c9e1",
    "date": "2026-09-27",
    "priceMinor": 25000,
    "totalQuantity": 40,
    "reservedQuantity": 0,
    "availableQuantity": 40,
    "status": "available"
  }
}
```

---

### F. Pickup Windows & Order Cutoff Engine
#### 1. Farmer Creates Pickup Window Slot
- **Method & Path**: `POST /api/v1/farmer/pickup-windows`
- **Permissions**: Authenticated & Approved Farmer
- **Headers**: `x-csrf-token`
- **Request Body**:
```json
{
  "marketId": "6701a1b2c3d4e5f6a7b8c9d0",
  "marketDate": "2026-09-27",
  "startTime": "08:00",
  "endTime": "10:00",
  "capacity": 25,
  "cutoffHoursBefore": 4
}
```
- **Response `201 Created`**: Returns slot with computed `cutoffAt` timestamp (`2026-09-27T04:00:00+05:00`).

#### 2. Discover Pickup Windows for Customer Checkout
- **Method & Path**: `GET /api/v1/pickup-windows?marketId=...&marketDate=2026-09-27`
- **Permissions**: Public
- **Computed Indicators**:
  - `isCutoffPassed`: `true` if current server time exceeds `cutoffAt`.
  - `isSlotAvailable`: `true` if `reservedOrdersCount < capacity` AND `!isCutoffPassed`.

---

### G. Public Product Discovery Join
- **Method & Path**: `GET /api/v1/products`
- **Permissions**: Public
- **Supported Query Filters**:
  - `marketId`: Filter products available at a specific market
  - `marketDate`: Filter products available on a specific market date (e.g. `2026-09-27`)
  - `categoryId`: Filter by category ID
  - `search`: Case-insensitive text search across product name, description, and tags
  - `page`: Page index (default: 1)
  - `limit`: Items per page (default: 20)
- **Response Structure**:
```json
{
  "data": [
    {
      "id": "6701a1b2c3d4e5f6a7b8c9e1",
      "name": "Farm Fresh Red Tomatoes",
      "description": "Vine-ripened organic tomatoes grown in Bedian organic soil.",
      "unit": "kg",
      "basePriceMinor": 25000,
      "category": {
        "id": "6701a1b2c3d4e5f6a7b8c9c1",
        "name": "Fresh Vegetables",
        "slug": "fresh-vegetables"
      },
      "farmer": {
        "id": "6701a1b2c3d4e5f6a7b8c9d1",
        "businessName": "Greenfield Organic Orchards",
        "stallNumber": "Stall A-12"
      },
      "currentOffer": {
        "date": "2026-09-27",
        "priceMinor": 25000,
        "availableQuantity": 45,
        "unit": "kg",
        "status": "available"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "timestamp": "2026-09-23T18:35:00.000Z"
  }
}
```

---

## 3. Test Identifiers & Verification Summary

| Test Suite | Tests | Passing | Highlights |
| :--- | :--- | :--- | :--- |
| `tests/db.test.js` | 3 | 3 | Ping, Atlas connection, database query |
| `tests/health.test.js` | 4 | 4 | API health, memory metrics, 404 handler |
| `tests/auth.test.js` | 10 | 10 | HTTP-only cookies, session hydration, double-submit CSRF, admin farmer approvals |
| `tests/market-catalogue.test.js` | 15 | 15 | Market discovery, admin categories, approved farmer gate, recurring templates, dated stock offers, pickup cutoffs, compound product join |
| **Total** | **32** | **32** | **100% Pass Rate** |

### Development Seed Credentials
- **Admin**: `admin@marketlink.com` / `Admin123!`
- **Approved Farmer 1**: `farmer.greenfield@marketlink.com` / `Farmer123!`
- **Approved Farmer 2**: `farmer.indus@marketlink.com` / `Farmer123!`
- **Pending Farmer**: `farmer.pending@marketlink.com` / `Farmer123!`
- **Customer**: `customer.sarah@marketlink.com` / `Customer123!`
