# MarketLink frontend implementation — development preview

This is an internal engineering record, not the student's competition submission report.

## Current result

The neutral preparation shell has been replaced by a responsive React/Vite/TypeScript MarketLink frontend. Public, customer, farmer and administrator routes share a Living Market design system, original layouts, local fonts, licensed editorial images and a central in-memory fixture gateway. No production API endpoints or DTOs have been declared approved. No Express, MongoDB or OpenAI integration has been performed.

Working app: `D:\TECHWIZ7\.worktrees\frontend\Client`, branch `Client`. The alternate `D:\TECHWIZ7.worktrees\frontend\Client` path does not exist. The original checkout remains on `Server` and was not switched.

## Phase status

| Phase | Implemented in this checkpoint | Remaining before full completion |
|---|---|---|
| 1 Foundations | Routing, public/role shells, tokens, local fonts, accessible native dialogs, feedback, field controls, error boundary, data modes | Full accessibility audit and approved live adapter |
| 2 Public | Home, market map/list selection and search/day filtering, market details, farmer discovery/profile, product search/filter/sort/detail, About/Contact/Help | Real map SDK/coordinates/directions; verified team contact and Google Maps embed; large-catalogue pagination |
| 3 Customer | Login/registration form previews, dashboard, basket by farmer, sample checkout, planner, Passport/order detail, quantity edits/cancellation, history/reorder, eligible reviews, favourites/restock preferences, notifications | Actual account creation/session/auth, profile persistence, slot changes in order editor, live alerts and full multi-occurrence model |
| 4 Farmer | Weekly planner, products add/edit/archive, stock/reservation protection, availability, template save/apply, pickup-window creation, order accept/decline/ready/sample completion, prep checklist, computed insights, review replies | Persisted profile/attendance and uploads; template edit/delete, booked-window change policy, approved completion actor, multi-market/date offers, richer period reports |
| 5 Administrator | Command Centre, approve/suspend farmer, customer activate/deactivate, market create/edit/close, visibility moderation, computed reports, category add/remove, announcement preview/confirm/publish, notifications | Full market recurring schedule/coordinates, category rename, policy reasons/audit, approved deletion policy, date-scoped aggregate APIs |
| 6 Copilot | Three role panels, page context, scripted prompts, source links, pending/off states, farmer action preview/confirmation with freshness/expiry guard, admin announcement draft text | Server retrieval/OpenAI/permissions, typed approved action contracts, streamed responses if agreed, Smart Basket and advanced summaries |
| 7 Quality | TypeScript/build, domain tests, multi-role browser journeys, 55 route scenarios at 1440/390/320 px, reviewed desktop/mobile screenshots, reduced-motion CSS | Broader browser matrix, screen-reader/axe audit, real failure/latency scenarios, real backend integration |

These are implemented frontend preview phases, not declarations that every SRS feature is full-stack complete. Mandatory gaps remain explicit above.

## Routes

Public: `/`, `/markets`, `/markets/:marketId`, `/farmers`, `/farmers/:farmerId`, `/products`, `/products/:productId`, `/about`, `/contact`, `/help`.

Auth previews: `/login`, `/register`, `/register/customer`, `/register/farmer`, `/admin/login`. No fake password recovery/email delivery is exposed. Demo role controls are visibly separated from the application; they are not access-control security.

Customer: `/customer`, `/customer/market-day`, `/basket`, `/checkout`, `/customer/orders`, `/customer/orders/:orderId`, `/customer/orders/:orderId/edit`, `/customer/orders/:orderId/review`, `/customer/favourites`, `/customer/notifications`, `/customer/profile`.

Farmer: `/farmer`, `/farmer/access`, `/farmer/profile`, `/farmer/markets`, `/farmer/products`, `/farmer/products/new`, `/farmer/products/:productId/edit`, `/farmer/stock`, `/farmer/stock-templates`, `/farmer/pickup-windows`, `/farmer/orders`, `/farmer/orders/:orderId`, `/farmer/pickups`, `/farmer/insights`, `/farmer/reviews`, `/farmer/notifications`.

Admin: `/admin`, `/admin/farmers`, `/admin/farmers/:farmerId`, `/admin/customers`, `/admin/customers/:customerId`, `/admin/markets`, `/admin/markets/new`, `/admin/markets/:marketId/edit`, `/admin/moderation`, `/admin/reports`, `/admin/categories`, `/admin/announcements`, `/admin/notifications`.

Unknown paths/IDs have not-found screens. Cross-role navigation has a role-denied view. The live backend must enforce all authorisation independently.

## Data and integration boundary

`src/data/market.ts` contains **development view models and fictional seed records**. They are not an approved wire contract. The fixture uses illustrative PKR values, Asia/Karachi, a controlled clock initially 2 October 2026 and market occurrences on 3–4 October. Historical example orders have their own previous pickup window.

`src/data/gateway.ts` owns mutation operations. It clones state before validation; failed multi-group checkout leaves the existing state unchanged. Stock is reserved on sample order creation, released once on cancellation/decline, and consumed on sample completion. Historical line prices remain unchanged. Basket price changes require explicit renewed acceptance. These tests demonstrate local behaviour only, not database atomicity or concurrent-user protection.

The current fixture simplifies product/dated offer separation to one current occurrence per seller. The approved integration must map proper occurrence-specific offers and quantities. It must not reuse this simplification as a production stock model.

`src/lib/api-client.ts` remains the central HTTP transport, uninstantiated. Endpoint spellings, auth credentials, errors, envelopes and server lifecycle values await the approved contract. UI components must not introduce independent network calls to guessed endpoints.

Development state is **memory-only**. Browser refresh or Reset fixtures returns the original sample data and signs out the demo account. Real passwords and profile form data are not persisted. No secrets or provider keys are needed to run the preview.

`npm run dev` enables labelled fixtures. `npm run build:demo` explicitly creates the same labelled showcase. Ordinary `npm run build` displays an integration-not-configured screen; it never silently shows fixtures as production data. It is not deployment-ready until the live adapter exists.

## Design and assets

Newsreader headings, Public Sans interface text; forest `#183B2B`, forest-deep `#0F291D`, paper `#FAF8F2`, sage-pale `#E8EDE3`, harvest `#C98646`, ink `#242B23`. No gradients. Mobile reflows the public hero, lists, basket, schedule and dashboards. The map is deliberately labelled illustrative and does not provide invented real-world directions.

Shared components include Heading, Field/Form, native Modal/Confirm, Quantity, Status, Empty/Notice, Favourite, ProductTile, SchematicMap, OrderRows and Notifications. Farmer/admin modules are lazy loaded. Copilot uses a native modal drawer, local source links and a scripted response delay; it has no provider connection.

Images in `Client/public/images/` are editorial photographs, not portraits or factual inventory evidence for the fictional stalls:

- `harvest.jpg`: fr0ggy5, https://unsplash.com/photos/D80mU0JCEes
- `market.jpg`: Kate Asplin, https://unsplash.com/photos/Kljrykekuwo
- `tomatoes.jpg`: Mustafa Akın, https://unsplash.com/photos/-Hpx8dtEoSo
- `carrots.jpg`: Nick Fewings, https://unsplash.com/photos/d9gDUaDpnes

The [Unsplash licence](https://unsplash.com/license) was retrieved successfully for this implementation. Fonts are provided by `@fontsource/newsreader` and `@fontsource/public-sans`; both are SIL Open Font License 1.1. Full notices are copied into `Client/public/licenses/` so they accompany built assets. Source code uses Lucide icons; existing Motion/GSAP dependencies are retained but unnecessary scripted motion was not added.

## Verification

Commands: `npm run check` (typecheck/production build, Vitest, Edge Playwright), `npm run build:demo`, and `node tests/build-smoke.mjs live|demo` against the matching already-built output. The build smoke starts its own local preview on port 4173 and shuts it down.

Tests cover reservation stock invariants, before/at-cutoff behaviour, historical prices, duplicate state changes, role restrictions in the fixture, reviews, categories/market dependencies, templates, price reconfirmation and restock notification transitions. Browser tests cover every route, search/map selection, two-farmer checkout, cross-role order updates, stock form protection, admin approval/publication and Copilot confirmation/off states. Screenshots are generated in ignored `Client/test-results/` and reviewed directly.

Initial browser expansion exposed a filter-update race and nested paragraph markup in stock confirmation; both were fixed. Final verification: `npm run check` passed (17 unit tests, 9 Edge browser tests, TypeScript and standard build). Both `live` and `demo` build browser smokes passed with zero fetch/XHR API calls. `npm run build:demo` passed; `npm audit --audit-level=high` reported 0 vulnerabilities; `npm ls --depth=0` reported no invalid dependencies. Standard entry JS: 281.47 kB / 90.12 kB gzip; explicit demo entry: 353.42 kB / 107.61 kB gzip. CSS: 36.53 kB / 8.02 kB gzip. No full WCAG conformance, production security or real API integration is claimed.

## Exact next integration requirements

Owner-approved contract version; auth/session strategy; string identifiers; money/units/timezones; market/session/attendance and stock-offer separation; slot/cutoff/capacity rules; order grouping/idempotency/partial failures; state transitions and completion actor; conflict/validation examples; upload/media lifecycle; notification/restock delivery; review/moderation/audit rules; report periods/definitions; AI references/draft/confirm/expiry contracts. Real team contact content and public coordinates are also required.

Figma was not called during this implementation. The owner now permits free-quota use opportunistically, but coding and browser review took priority; the previously saved Figma foundations remain unchanged.

The detailed portable implementation prompt requested by the owner is at `Client/MARKETLINK-MASTER-FRONTEND-PROMPT.md`. Its page specifications describe the intended full scope; consult this status file for what actually exists.
