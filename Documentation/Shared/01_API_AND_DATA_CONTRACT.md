# MarketLink | Proposed API, Data and AI Integration Contract

**STATUS: DRAFT - NOT APPROVED.** Both agents review; human operator resolves decisions and freezes version before parallel implementation. This is an internal technical coordination document, not final SRS submission documentation. It derives required user capabilities from MarketLink SRS pp.8-12; **endpoint names, fields, status codes, and schemas here are OUR PROPOSED engineering design**, not given by the SRS. Never assert an endpoint works until implemented and tested.

## 1. One shared contract, not two independent implementations

- One repo, independent `Client`/`Server` branches and worktrees, **operator-controlled** shared master and `main`.
- Both teams use the SAME approved version of this contract. Neither agent silently edits it. Shared file existing in one branch DOES NOT make it visible in another.
- Interface changes: author proposes change request (reason, affected path/schema, migration compatibility, tests) -> operator approves -> operator propagates version to both agents -> implementation on owned branch -> integration on explicit instruction.
- Server is contract truth for authorisation, calculations, inventory, pickup cutoffs, final totals, state transitions, AI tool permission; client is contract truth for approved layout, accessibility, navigation and experience.
- Use written endpoint examples plus OpenAPI or a validated schema if the team approves the time cost. No speculative endpoints with guessed field names.

## 2. Environment and transport [PROPOSAL]

| Concern | Proposed decision / verification |
|---|---|
| Base API | `/api/v1` (existing preparation endpoint `/api/health` stays as built; changing it requires approval) |
| Dev frontend | Vite actual port must be inspected; expected 127.0.0.1:5173 subject to existing config |
| Dev backend | Express expected port 5000, verify |
| Vite proxy vs CORS | Choose **one** approved integration strategy; use env-based API base; no scattered absolute URLs. If proxy, `/api` forwarding; test actual origins. |
| IDs | Public API uses string IDs. MongoDB ObjectId remains server internal. |
| Dates | UTC ISO-8601 timestamps (`...Z`); day keys `YYYY-MM-DD` in market's explicit IANA timezone. |
| Money | Currency + minor-unit integer (or decimal string if approved); no floating-point totals. No payment processing. |
| Quantities | Strict positive integer where sold in discrete units; if weight units needed, explicit fixed-scale decimal; do not assume all stock is integer kilograms. |
| Auth | Human-approved secure session strategy; protected endpoints never rely on role from request body. |
| Errors | Consistent machine-readable shape with stable code, message, requestId and field errors; no stack traces/secrets. |
| Pagination | `page`, `limit` (capped), `total`, `hasNext` (or approved cursor standard). Sort whitelist only. |
| API changes | No breaking change without contract revision and owner approval. |

### Example success envelope [PROPOSAL]

```json
{
  "data": { "id": "example-id", "name": "Example Market" },
  "meta": { "requestId": "request-id" }
}
```

### Example error envelope [PROPOSAL]

```json
{
  "error": {
    "code": "STOCK_UNAVAILABLE",
    "message": "The requested quantity is no longer available.",
    "fields": [],
    "requestId": "request-id"
  }
}
```

Core expected error semantics: 400 invalid syntax; 401 not signed in; 403 wrong role/ownership; 404 unavailable/nonexistent; 409 stock/cutoff/state conflict; 422 validated fields; 429 rate-limited; 500 safe unexpected error. Specific semantics require operator approval and tests.

## 3. Data entities and essential shapes [PROPOSAL]

All names below are draft design types, *not final Mongo collection schemas*:

```ts
// Illustrative only; freeze after joint review.
type Role = 'customer' | 'farmer' | 'admin';
type OrderStatus = 'placed' | 'accepted' | 'ready_for_pickup' |
                   'completed' | 'declined' | 'cancelled';
type Money = { amountMinor: number; currency: string };
type GeoPoint = { latitude: number; longitude: number };
type Market = { id: string; name: string; address: string;
  timezone: string; coordinates: GeoPoint; operatingDays: number[] };
type PickupWindow = { id: string; farmerId: string; marketId: string;
  date: string; startsAt: string; endsAt: string; cutoffAt: string };
type StockOffer = { id: string; productId: string; farmerId: string;
  marketId: string; date: string; unit: string; price: Money;
  totalQuantity: number; reservedQuantity: number;
  availableQuantity: number; status: 'available'|'sold_out'|'unavailable';
  version: number };
type OrderLine = { productId: string; stockOfferId: string;
  productNameSnapshot: string; unitSnapshot: string;
  quantity: number; unitPriceSnapshot: Money };
type Order = { id: string; customerId: string; farmerId: string;
  marketId: string; pickupWindowId: string; lines: OrderLine[];
  status: OrderStatus; subtotal: Money;
  cutoffAt: string; createdAt: string; updatedAt: string };
```

Decisions to freeze: market session/date representation, fractional stock units, actual currency, inventory reserve/release semantics, cart with multiple farmers, order completion actor, pickup capacity and treatment of order modifications. All prices/order amounts are **order value**, not verified captured/collected payment.

## 4. Proposed REST surface by domain

**Endpoint inventory only.** Prefix `/api/v1` assumed. Response schemas, validation and request examples must be approved before coding. `PUBLIC`, `CUSTOMER`, `FARMER`, `ADMIN` refer to server-side permissions; some routes need ownership/approval checks in addition to role.

| Route | Auth | Purpose / SRS | Notes |
|---|---|---|---|
| `POST /auth/register/customer` | PUBLIC | C01 | Required contact fields; hashed password. |
| `POST /auth/register/farmer` | PUBLIC | F01 | Pending approval; no listing until approved. |
| `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | mixed | C01,F01,A01 | Chosen session mechanism; demo roles. |
| `GET /markets` | PUBLIC | C03 | day, location, radius, sort, pagination; stable fallback without geolocation. |
| `GET /markets/:id` | PUBLIC | C03,C04 | times, map position, participating farmers. |
| `GET /markets/:id/farmers` | PUBLIC | C03 | by market day/session. |
| `GET /farmers/:id` | PUBLIC | C03 | approved public profile, markets/days, current offers. |
| `GET /products` | PUBLIC | C05 | category, price, market, day, farmer, search/sort/page. |
| `GET /products/:id` | PUBLIC | C05 | exact offer-specific stock, unit, seller. |
| `GET /categories` | PUBLIC | A06,C05 | admin-controlled. |
| `GET /pickup-windows` | PUBLIC | C06,F02 | date, farmer, market; eligibility checked again at checkout. |
| `POST /orders` | CUSTOMER | C06 | server revalidates stock/price/window/cutoff; idempotency key if approved. |
| `GET /orders`, `GET /orders/:id` | CUSTOMER/FARMER | C07,F04 | data scoped to signed-in owner/participating seller. |
| `PATCH /orders/:id` | CUSTOMER | C07 | permitted modifications only before cutoff; safe stock rebalance. |
| `POST /orders/:id/cancel` | CUSTOMER | C07 | before cutoff; idempotent release. |
| `POST /orders/:id/accept` | FARMER | F04 | owns order and approved; state checked. |
| `POST /orders/:id/decline` | FARMER | F04 | release stock exactly once. |
| `POST /orders/:id/ready` | FARMER | F04 | correct transition and notification. |
| `POST /orders/:id/complete` | [OPEN] | C07 | decide authorised completion actor/evidence. |
| `GET /me/favourites`, `PUT /me/favourites/:kind/:id`, `DELETE ...` | CUSTOMER | C02 | kind farmer/product/market as approved. |
| `GET /me/notifications`, `POST /me/notifications/:id/read` | CUSTOMER/FARMER/ADMIN | X02 | in-app or email pathway approved. |
| `GET /reviews`, `POST /reviews` | PUBLIC/CUSTOMER | C09 | creation checks eligible completed order/target; moderation. |
| `POST /reviews/:id/reply` | FARMER | F05 optional reply | Own reviews only. |
| `GET /farmer/me`, `PATCH /farmer/me` | FARMER | F02 | approved profile data; handle pending state. |
| `GET/POST/PATCH/DELETE /farmer/products` | FARMER | F03 | ownership, image safety, stock rules. |
| `GET/POST/PATCH /farmer/stock-templates` | FARMER | F03 | recurring template, not actual reservation pool. |
| `GET/POST/PATCH /farmer/stock-offers` | FARMER | F03 | market session-specific; safe update when reserved. |
| `GET/POST/PATCH /farmer/pickup-windows` | FARMER | F04 | cutoff and time validity. |
| `GET /farmer/insights` | FARMER | F05 | own data only; period filters, definitions. |
| `GET /admin/overview` | ADMIN | A01 | platform metrics. |
| `GET/PATCH /admin/farmers/:id` | ADMIN | A02 | approve/suspend; action/audit. |
| `GET/PATCH /admin/customers/:id` | ADMIN | A02 | activate/deactivate. |
| `GET/POST/PATCH/DELETE /admin/markets` | ADMIN | A03 | geolocation + schedule. |
| `GET/PATCH /admin/moderation` | ADMIN | A04 | listing/review visibility. |
| `GET /admin/reports` | ADMIN | A05 | period/market aggregates, explain revenue measure. |
| `GET/POST/PATCH/DELETE /admin/categories` | ADMIN | A06 | preserve product referential integrity. |
| `GET/POST /admin/announcements` | ADMIN | A06 | publish with explicit confirmation in AI mode. |
| `GET /about`, `GET /contact` or static content | PUBLIC | X02 | Contact page Google Maps embed SRS. |
| `GET /api/health` | PUBLIC/ops | existing preparation | Existing route outside versioned prefix unless approved change. |

Do not infer that every REST spelling above is mandatory: required are the business behaviours, not our naming choices. Implement mutually agreed names only.

## 5. Order and stock integrity contract [high-priority]

**Proposed lifecycle**: `placed -> accepted -> ready_for_pickup -> completed`. Other transitions: `placed -> declined`, eligible `placed/accepted -> cancelled` before cutoff (subject to team-approved policy). `ready_for_pickup` modification/cancellation eligibility needs explicit decision under SRS "before cutoff". No invalid backward changes or silent jump to completed. Track event history separately or embedded with actor/time/reason.

**Reservation invariant:** `available = published - reserved - sold/fulfilled adjustments`, precisely defined once, never negative. `stockOffer` keyed by specific product + farmer + market occurrence/date, not global product stock when multiple markets/weekdays exist. Protect with MongoDB atomic conditional update/version check; multi-line/multi-seller orders require transaction or tested rollback/compensation. Trigger notification only after persistence. Order modification calculates difference; decline/cancel releases **once**. Avoid double-commit on refresh/double click with idempotency strategy.

**Checkout response** should return authoritative snapshot and specific conflict explanation when cart data is stale. UI must display revised price/stock and request new customer confirmation. Farmer cannot publish before admin approval. Completed-order reviews must verify actor + product/farmer target.

## 6. AI endpoint and tool contract [OPTIONAL SRS + ENHANCEMENT; proposed]

`POST /api/v1/ai/chat` accepts a bounded user question, UI context such as `pageId`, a list of permitted selection identifiers, and optional conversation/session ID. **No role/user ID in request is authoritative.** Auth middleware derives identity; backend selects role-specific tool allowlist.

Suggested response:

```json
{
  "data": {
    "answer": "Greenfield has tomatoes for Saturday. Select an offer to see pickup availability.",
    "factsAsOf": "2026-09-23T12:00:00Z",
    "references": [{"type":"stockOffer","id":"offer-id"}],
    "uiActions": [{"type":"focusMarket","marketId":"market-id"}],
    "draft": null,
    "requiresConfirmation": false
  }
}
```

**Tool categories, not arbitrary code:** `searchProducts`, `getMarketsForDay`, `getPickupWindows`, `getMyOrders`, `getMyFarmerStock`, `getMyPendingOrders`, `getMyFarmerInsights`, `getAdminAggregates`, `navigateTo`, `applyFilter`, `prepareStockChange`, `prepareAnnouncement`. Each implemented with distinct role/ownership/data minimisation rules. Prevent prompt injection from product descriptions/reviews driving tool selection or role escalation. Restricted outbound data, no private records in unnecessary LLM context.

**Write workflow:** `POST /ai/action-drafts` (create validated, short-lived action preview), `POST /ai/action-drafts/:id/confirm` (user confirms) only if approved. Re-check auth, role, ownership, item version, current stock/time/cutoff, then call the SAME domain service used by ordinary UI. Store a safe audit event and return real success/error. No direct DB writes from model text, no auto-send email/announcement, no blanket multi-item bulk actions.

**Fallback:** if `OPENAI_API_KEY` absent, provider error, timeout or budget exhausted, show a graceful notice and preserve every mandatory workflow. Secret lives only in local ignored server config; never `VITE_` key/client bundle. Model version and rate/cost limit are deployment choices, not guessed from SRS.

## 7. Contract acceptance and change-control checklist

Before either agent codes a shared flow, the operator approves:

- roles, API prefix, auth strategy, envelope and all basic examples;
- domain IDs, prices/currency/units and timezone;
- one-seller-per-order policy or explicit multi-seller strategy;
- stock reservation, release, cancel/modify cutoff, order completion actor;
- map provider and environment names;
- shared test fixtures and expected assertions;
- AI optional scope and action permission matrix.

On each approved change, record version/date, why, API/schema diff, affected frontend/backend tests and migration notes; notify both agents. Cross-agent requests are **proposals to operator**, not commands to edit the other folder.
