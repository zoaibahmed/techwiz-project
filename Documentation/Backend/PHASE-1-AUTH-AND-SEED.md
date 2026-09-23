# Phase 1: Authentication, RBAC & Demonstration Seed Report

**Project**: Aptech TechWiz 7 — MarketLink (eGreen Basket)  
**Component**: Backend (`Server/`)  
**Status**: Implemented, Seeded, and Verified with 100% Passing Tests  
**Localization**: Pakistan (Lahore) | Currency: `PKR` | Timezone: `Asia/Karachi`  

---

## 1. Implemented Capabilities

### A. Authentication & Session Management
- **Customer Registration**: `POST /api/v1/auth/register/customer` (validates name, email uniqueness, phone, address, bcrypt password).
- **Farmer Registration**: `POST /api/v1/auth/register/farmer` (validates business name, contact person, phone, address, bio; assigns `approvalStatus: 'pending'`).
- **Dual-Transport Authentication**:
  - Sets HTTP-only, SameSite secure cookie `token`.
  - Also returns token in JSON response `{ data: { token, user } }` for API/mobile transport.
- **Login & Logout**: `POST /api/v1/auth/login` and `POST /api/v1/auth/logout`.
- **Identity Hydration**: `GET /api/v1/auth/me` returns caller profile and associated farmer profile if applicable.

### B. Role-Based Access Control (RBAC) & Farmer Gatekeeper
- Middleware `authenticateToken`: Validates JWT signature, checks `isActive === true`.
- Middleware `requireRole(['admin', 'farmer', 'customer'])`: Strict server-enforced role perimeter.
- Middleware `requireApprovedFarmer`: Enforces that farmers with `approvalStatus === 'pending'` or `'suspended'` cannot publish listings or accept orders.

### C. Administrator Farmer Approval Workflow
- `GET /api/v1/admin/farmers`: Lists all registered farmers with approval statuses and registration dates.
- `PATCH /api/v1/admin/farmers/:id/status`: Updates farmer approval status (`approved` / `suspended`), records admin ID, and writes an audit log in `auditLogs`.

---

## 2. Demonstration Seed Dataset (Lahore)

*All data below is strictly development demonstration data; not affiliated with real commercial farms or certified bodies.*

### Demo User Accounts
| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@marketlink.com` | `Admin123!` | System Administrator (Demo) |
| **Approved Farmer 1** | `farmer.greenfield@marketlink.com` | `Farmer123!` | Tariq Mahmood, Greenfield Farm Produce (Bedian Road) |
| **Approved Farmer 2** | `farmer.indus@marketlink.com` | `Farmer123!` | Khurram Shahzad, Indus Valley Harvest (Multan Road) |
| **Pending Farmer** | `farmer.pending@marketlink.com` | `Farmer123!` | Rashid Minhas, Margalla Valley Fresh (Awaiting approval) |
| **Customer 1** | `customer.sarah@marketlink.com` | `Customer123!` | Sarah Ahmed, Model Town, Lahore (with pre-seeded orders) |
| **Customer 2** | `customer.bilal@marketlink.com` | `Customer123!` | Bilal Khan, DHA Phase 5, Lahore |

### Demonstration Markets
1. **Model Town Community Market (Demo)**: Central Park Area, Model Town (`31.4822° N, 74.3214° E`), Saturdays 08:00 - 13:00.
2. **Gulberg Weekend Bazaar (Demo)**: Main Boulevard, Gulberg III (`31.5204° N, 74.3587° E`), Saturdays & Sundays 08:30 - 14:00.
3. **DHA Phase 3 Fresh Market (Demo)**: Sector Y Commercial Area (`31.4707° N, 74.3775° E`), Sundays 08:00 - 13:30.

---

## 3. Verification & Automated Test Results

Running `npm test` across all test files:
- `tests/db.test.js` (3 passing unit tests)
- `tests/health.test.js` (4 passing integration tests)
- `tests/auth.test.js` (8 passing integration tests):
  - Customer registration with token return
  - Email uniqueness 409 rejection
  - Farmer registration with pending status
  - Login success and cookie issuance
  - Invalid password 401 rejection
  - Authenticated `/api/v1/auth/me` verification
  - Customer RBAC rejection on admin routes (403 Forbidden)
  - Admin listing and approving pending farmer
- **Total: 15 / 15 tests passed (100% success)**.
