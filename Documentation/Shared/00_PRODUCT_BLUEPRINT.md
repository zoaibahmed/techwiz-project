# MarketLink / eGreen Basket | Shared Product & Engineering Blueprint

**Status:** proposed INTERNAL product brief, version 0.1 for human and agent review. **Do not treat draft choices as officially approved requirements.**

**Authority:** `MarketLink End-to-End Web Solutions_SRS.pdf`, version 1.0, 18 pages, supplied by the user. SRS section/page references below preserve the source. When a suggestion here conflicts with the SRS, the SRS wins. Do not infer evaluation criteria or guaranteed competition results.

## 1. Product thesis

**MarketLink is not another online grocery store. It is the living digital market-day experience:** people see what is actually available, which growers are attending, where to collect it, and whether their reservation is ready; farmers plan harvest/weekly inventory, fulfil pickups and understand demand; administrators maintain trustworthy markets and users. Visual identity: premium agricultural editorial, operationally precise, friendly on a phone.

Signature customer question: **"What is fresh, who has it, where can I collect it, and will it still be there?"**

AI product thesis: **MarketLink Copilot is one permission-aware intelligence layer with three faces:** customer Market Companion, farmer Farm Copilot, admin Market Intelligence. It answers from authorised records, understands the current dashboard/page, prepares safe actions, and lets the user confirm writes. Do not plaster the site with bots, fabricate inventory, or make the application dependent on AI availability.

### Product pillars

1. **Market-day certainty:** real stock, verified schedule, actual seller/pickup location, correct reservation state.
2. **One coherent journey:** map + catalogue + basket + pickup + order status, not disconnected CRUD screens.
3. **Farmer operational clarity:** planning, weekly recurring stock, order queues, pickup schedules, insights and reviews.
4. **Admin stewardship:** seller approval, customer controls, markets, moderation, category/master data, announcements, platform reporting.
5. **Grounded, non-invasive AI:** useful dashboard assistance, natural-language navigation, answers/summaries from live facts, permissioned action previews and auditability.
6. **Original, comprehensible implementation:** the student team meaningfully modifies and understands AI-assisted work and prepares its own submission materials.

## 2. Source-of-truth requirements matrix

The SRS includes mandatory functional/non-functional expectations; its optional customer AI and optional family account sharing are identified below. Source: SRS §§1.2,1.4-1.9, pp.4-18. This matrix is a planning checklist, not a replacement for reading the PDF.

| ID | Classification / SRS location | Requirement / acceptance outcome |
|---|---|---|
| C01 | [SRS] p.8 | Customer signup/login; name, phone, email, address; secure dashboard. |
| C02 | [SRS] pp.8-9 | Save multiple favourite farmers/products; favourite markets/preferred locations and restock alerts. |
| C03 | [SRS] p.8 | Browse nearby markets by location/day and see attending farmers; farmer profile, days, weekly stock. |
| C04 | [SRS] p.8, p.15 | Embedded Google Maps or OpenStreetMap: market/stall markers, directions, accurate pickup coordinates. |
| C05 | [SRS] p.8, p.11 | Product browse/search/sort/filter by category, price, market, day/location; details include price/unit/quantity/farmer. |
| C06 | [SRS] p.9 | Cart; stock-backed pre-order; date/time within farmer windows; in-person payment. |
| C07 | [SRS] p.9 | Order states placed, accepted, ready for pickup, completed; view/modify/cancel before cutoff. |
| C08 | [SRS] p.9 | History and reorder current-availability products; pickup location and directions. |
| C09 | [SRS] p.9 | Review/rate products and farmers after completed order; see others' reviews. |
| F01 | [SRS] p.10 | Farmer register: business/stall name, contact person, phone, email, address; approved before listing. |
| F02 | [SRS] p.10 | Farmer markets/days, pickup windows, address, coordinates/map pin, profile. |
| F03 | [SRS] p.10 | Product CRUD: name, category, price, unit, quantity, description, image; recurring weekly template; sold out/unavailable. |
| F04 | [SRS] p.10 | Incoming order view, accept/decline, ready for pickup, order cutoffs, pickup slots. |
| F05 | [SRS] p.10 | History/insights: total/pending orders, revenue summary, best sellers; optional farmer review replies. |
| A01 | [SRS] pp.10-11 | Separate secure admin login/dashboard; farmer/customer/market/order counts. |
| A02 | [SRS] p.11 | Farmer approval/suspension; customer activation/deactivation. |
| A03 | [SRS] p.11 | Market add/edit/remove: days, times, address and map coordinates/link. |
| A04 | [SRS] p.11 | Moderate inappropriate product listings/reviews. |
| A05 | [SRS] p.11 | Reports across markets: orders, revenue summary, active farmers. |
| A06 | [SRS] p.11 | Category/master data; platform-wide notifications/announcements. |
| X01 | [SRS] p.11-12 | Server-enforced role-based access; responsive, accessible design, search/sort/filter. |
| X02 | [SRS] p.12 | Email OR in-app notifications for confirmations/ready; About Us and Contact Us with Google Maps location. |
| N01 | [SRS] p.14 | Security, usability, speed/catalogue performance, operability, scalability, availability, browser/mobile compatibility, accessibility, safe downloads. |
| O01 | [OPTIONAL SRS] pp.5,9,15 | Basic customer chatbot/product discovery/FAQ about farmers, markets, availability, pickup windows. |
| O02 | [OPTIONAL SRS] p.8 | Family account sharing. Defer unless all other requirements pass. |
| L01 | [SRS] pp.7-8 | No payment gateway; in-person payment at pickup. No delivery/courier. No farmer identity/licensing/organic certification verification. |
| D01 | [SRS] pp.13,18 | Human-understood/modified AI assistance and disclosed tools; human-authored submission; installation instructions; credentials for each role; full-feature demo video; consolidated ZIP and ReadMe.doc; clarify Mongo-vs-SQL deliverable. |

Do not treat example schema fields in the PDF (pp.16-17) as a prescribed SQL implementation; the SRS explicitly calls them examples and allows MongoDB (p.15).

## 3. Role experiences, visual/functional signature

### 3.1 Customer | "Your Market Day"

**Entry:** premium public editorial homepage, living market discovery, no fake stock metrics. Primary CTA "Explore markets"; secondary "Plan my market day". Provide obvious login/sign-up, About, Contact, FAQ, accessibility.

**Discovery:** day/location controls; map/list synchronised; focus marker updates market/farmer/product results; farmer profiles show schedule, stall photo/story, stock, pickup coords. Product cards show unit, price, accurate availability, seller and day, not ambiguous shopping labels. Fast keyboard/mobile filters; true empty/loading/error states.

**Basket/pickup:** group by farmer/market/pickup windows. *[ENHANCEMENT]* Basket by Farmer prevents a misleading universal checkout; user sees distinct pickup commitments. Prices and quantities revalidated server-side. Do not silently split into multiple orders until contract approved. Clear 'Pay at pickup' copy everywhere relevant.

**Orders:** statuses, cutoff countdown or human-readable cutoff, modify/cancel eligibility, directions, notifications, history, reorder based on current stock. *[ENHANCEMENT]* "Pickup Passport" is an integrated mobile summary of farmer, market pin, time, products, order status, pay-at-pickup instruction.

**Reviews/favourites:** verified completed-order review eligibility, favourite farmer/product and restock updates, preferred market locations.

### 3.2 Farmer | "Weekly Market Planner"

Farmer dashboard hierarchy: next market day / what needs attention / pickup worklist / live stock / weekly stock template / orders / insights / profile and reviews. Avoid generic all-card dashboards.

Important operational experiences:

- Register, pending admin approval, approved/suspended views; unapproved farmer cannot publish listings.
- Set market participation/operating days/map pin/pickup slots/cutoff time; show timezone visibly.
- Manage product catalogue separately from stock offered for **a specific market occurrence/week**; recurring stock template defaults, editable before publish.
- Accept/decline orders, mark ready, complete via approved state transition; report any ambiguity about who completes.
- Group pickup preparations by date/time/market; only real reserved quantities count.
- Revenue summary describes **order value, not verified payments collected** (no online payments, no payment confirmation requirement).
- Optional review replies are a low-cost polish feature after core functionality.

*[ENHANCEMENT]* one-click human-approved "Saturday prep checklist", "low-stock spotlight", demand vs stock suggestion and AI-drafted produce descriptions. AI must never automatically edit published inventory or make factual organic/certification claims.

### 3.3 Administrator | "MarketLink Command Centre"

Dedicated admin experience: queue of farmer approvals, active markets/market sessions, listing/review moderation, platform metrics, categories/announcements and reporting. Distinguish "requires action" from general analytics. Admin does NOT verify organic/food-safety certification (explicit exclusion). Customer and farmer state changes have reason/actor/time audit records as an enhancement.

*[ENHANCEMENT]* AI provides grounded period summaries, drafts announcements and prepares moderated actions, but never silently suspends users or publishes announcements.

## 4. Distinctive enhancements, prioritised rather than unlimited scope

| ID | Proposed enhancement | Value / dependency / priority |
|---|---|---|
| E01 | Living Market Map | Map/list synchronisation with day/category and farmer selection; mainly excellent UX on mandatory maps; early. |
| E02 | Market Day Planner | Consolidated reservations and pickup timeline; needs reliable C06-C08; early after core. |
| E03 | Basket by Farmer | Group valid pickup arrangements; requires agreed cart/order semantics; early. |
| E04 | Pickup Passport | One mobile order view with maps/status/collection; needs C07/X02; early. |
| E05 | Market Pulse | Honest actual data: upcoming market dates, attending farmers, available products; derived from market/session/inventory; medium. |
| E06 | Farmer's Story | Original, licensed visual and human narrative; do not invent claims or certifications; medium. |
| E07 | Prep Worklist | Grouped reserved quantities, upcoming slots, cutoff awareness; derived from F04; early. |
| E08 | Replenishment Suggestions | Read-only history/stock-based advice, label not forecasts or guaranteed yield; late. |
| E09 | Contextual Empty States | e.g., helpful no-stock alternatives by market day; early polish. |
| E10 | AI dashboard command palette | Natural-language filters/navigation for authorised views; after stable routes/data; medium. |
| E11 | AI Smart Market Basket | Propose real available products, group by seller/window, user confirms; late. |
| E12 | AI Farmer Copilot | Briefing, prepare checklists, low-stock explanations, *previewed* stock edits; medium/late. |
| E13 | AI Admin Intelligence | Grounded reports, moderation summaries, announcement drafts; late. |
| E14 | AI explain-my-order | Customer-specific authorised status/cutoff explanation, not fabricated delivery tracking; medium. |

**Do not implement unrelated payments, delivery, certification, social network or speculative dynamic AI pricing.** Enhancement proposals not in the SRS are optional and not evidence of extra evaluation credit.

## 5. AI as a system, not a decorative chatbot

**Single AI core; three role-aware user experiences.** Product branding: "MarketLink Copilot" with Market Companion (customer), Farm Copilot (farmer), Market Intelligence (admin). UI: one predictable assistant entry point per dashboard, contextual suggestion only at genuine decision points, no chatbot popup on every field. Ordinary pages must work if API key is absent or OpenAI is unavailable.

### 5.1 AI context model [PROPOSAL]

Supply server-generated, permission-scoped **context envelope**: `userId`, `role`, `pageId`, `selectedMarketId`, `selectedFarmerId`, `dateRange`, `activeFilter`, `basketSnapshotId` (if authorised), locale/timezone and a restricted set of retrieved facts. Do not send whole MongoDB collections or other users' private records. Never trust frontend-supplied userId/role; derive from verified session. Limit data and retention.

### 5.2 Capability ladder

- A0: FAQ from approved static market help and retrieved facts, no writes.
- A1: Retrieval-based questions about actual inventory, location, slots, user-owned orders, farmer-owned business records, admin-authorised aggregate reports. Answer with product/market/order identifiers and as-of time when freshness matters.
- A2: Safe UI navigation/filter suggestions: `navigateTo`, `applyFilter`, `openOrder`, `focusMapMarker`. Validate against allowlist and authorised data. Does not write the database.
- A3: Draft artefacts: basket suggestion, order prep checklist, product copy, review reply, announcement. Clearly marked drafts. No false claims.
- A4: Consequential action previews: prepare stock/status/listing/announcement updates, show exact before/after and affected orders, explicit human confirmation; server revalidates on execution, audit logs.
- A5: Broader patterns/insights using verified aggregations, not model-made numbers. Optional and late.

### 5.3 Action governance

`question -> auth -> role-specific retrieval -> model proposes answer / typed draft -> policy & schema validation -> preview -> explicit user confirmation -> backend mutation -> audit and verified result`. The model never calls arbitrary URL/SQL/Mongo commands from prompt text, never changes credentials, never directly executes arbitrary JS, and cannot obtain hidden role privileges through prompt injection. Allowed tools are implemented and authorised in Express. Admin writes require extra checks; high-risk bulk operations defer. Use rate limits, timeouts, bounded token budgets/cost, error fallback, sanitized logs and safe markdown rendering. Never store raw API keys or arbitrary private conversation history by default. Do not claim AI "knows everything": it knows only authorised data deliberately supplied by backend queries.

### 5.4 Minimum truthful AI demonstrations

1. "What tomatoes are available Saturday?" -> query actual stock/day, cite or link actual records; show no availability if none.
2. "What needs my attention?" farmer -> pending orders and pickup schedule; numbers match backend queries.
3. "Show pending orders" -> existing dashboard filter; no fake magic.
4. "Mark strawberries sold out" -> typed proposed change and **no write until confirmed**.
5. Customer tries to ask for another farmer's private orders -> refused at service/policy layer.
6. API key disabled -> all mandatory non-AI UI works normally.

## 6. Visual system [PROPOSAL]

Visual direction: premium editorial farm-to-market, not generic grocery template or fantasy 3D. Proposed tokens: forest `#183B2B`, ivory `#FAF8F2`, sage `#A5B89A`, harvest `#C98646`, ink `#242B23`; these are ideas for the student team's approval, not required brand values. Use expressive serif only for hero/editorial headings, clear sans-serif for dense controls. Licensed/original grower photography, still-life produce textures, no unverifiable labels or stock images misrepresented as real farmer listings. No gradients. Meaningful map-marker, basket and state-change motion with reduced-motion fallback; no animation blocking a critical form. Design mobile pickup/reservation first, responsive desktop analytics second. Strong focus states, keyboard map/list alternative, labels, loading/empty/error states and contrast.

## 7. Data model [PROPOSAL: validate against SRS + contract]

Define stable domain IDs as strings at API boundary (Mongo ObjectId internally), ISO timestamps in UTC plus IANA timezone for market/pickup, money as integer smallest unit or unambiguous decimal string with currency, quantity with controlled unit. Collections can include:

- `users`: customer/farmer/admin role, contact, password hash, active state, timestamps.
- `farmerProfiles`: owner userId, business/stall, contact, approval state, market associations, latitude/longitude, description/media.
- `markets`: address, coords, timezone, operating days/times, active state.
- `marketSessions`: dated market occurrence + participating farmer relationships (or equivalent joins) so day/location queries are true.
- `pickupWindows`: farmer + market + date, start/end, cutoff, optional capacity.
- `products`: stable item/catalogue, unit, category, images, description, farmer.
- `weeklyStockTemplates`: recurring stock intent, not itself a reservation pool.
- `stockOffers` or `inventoryLots`: farmer + product + market/day, price/quantity, reserved/available, availability and version.
- `orders`: customer, one seller/market/session per order unless team approves a correct grouping model, snapshot line items/price/unit, pickup slot, state/cutoff, timestamps and history.
- `reviews`: completed-order eligibility, product/farmer target, rating, comment, moderation and optional farmer reply.
- `favourites`, `notifications`, `announcements`, `categories`, `auditEvents` (enhancement), `aiActionDrafts` (enhancement, short expiry).

Order snapshots preserve historical price even when current listing price changes. Prevent duplicate successful reservation/overselling with atomic checked stock operations, transactions if infrastructure supports them, or carefully tested compensating logic. Never rely on a React quantity limit as inventory integrity. Cross-farmer baskets may be UI-grouped and converted to separate seller orders; confirm this policy before coding. Don't make assumptions about tax, currency, or location defaults without operator approval.

## 8. Critical edge cases / quality criteria

- Two users attempt to reserve the final quantity simultaneously: at most available units are reserved.
- Price/stock changed after cart display: API rejects or re-quotes with user confirmation.
- Farmer disabled/unapproved or market closed: listings/order actions blocked accordingly.
- Pickup selected in different timezone / daylight savings: windows displayed correctly; server enforces cutoff in timezone-safe UTC.
- Farmer declines, customer cancels/modifies: release or rebalance reserved inventory exactly once; idempotency prevents repeat effects.
- Customer reviews before completion: rejected; other customers' private orders never exposed.
- Map API errors/geolocation denial: usable list/address/directions fallback.
- No market/stock/search results: helpful empty state, not empty page.
- Notification delivery fails: order transaction still correct; retry and in-app fallback.
- OpenAI errors/API budget exhausted: normal browsing, ordering and dashboards still work.
- Small-screen, slow network, reduced motion, keyboard and screen reader fundamentals remain usable.

## 9. Decisions needing explicit human approval BEFORE implementation

- Date/time and location of demonstration; supported currency/units/market timezones; authentic vs clearly fictional demo data.
- One farmer per persisted order vs explicit seller sub-orders; how completed orders are confirmed; when to release stock on decline/cancellation; cutoff definition and capacity.
- Auth/session approach, email vs in-app notifications, chosen map provider and fallback; whether uploads are supported and where safely stored.
- Roles and admin seed process; reported revenue as booked order value and not actual collected payment.
- AI scope and spend limit, allowed typed actions, which features to defer to meet SRS deadline.
- How shared documents propagate between independent branch worktrees and when integration is authorised.
- Submission format ambiguity: SRS p.18 asks `.sql` while p.15 permits MongoDB. Ask organiser; do not invent compliance.

**Stop here for operator approval of choices. No agent may treat this document alone as permission to code, merge, push main or create the student submission report.**

## 10. Additional coherent ideas that expand VALUE rather than visual noise

These are **[ENHANCEMENT]** concepts, not mandatory SRS scope. The team should choose a few only after the mandatory checklist is working; group them behind existing journeys instead of adding unrelated navigation sections.

| ID | Idea | User story / honest implementation boundary |
|---|---|---|
| E15 | Seasonal Discovery Calendar | Customer can browse future market days and published seasonal offers. Display only actual farmer-published upcoming offers, not made-up harvest guarantees. |
| E16 | Unit-Price Comparison | Display comparable price per standardised unit only when unit conversion is valid; no misleading comparisons across boxes/kg. |
| E17 | Ingredient-to-Market Guide | AI or static discovery suggests ingredients and links only to current offers; nutritional/medical claims omitted. |
| E18 | One-Tap Pickup Checklist | Customer can view seller-specific pickups and mark personal checklist items; never falsely change server order status. |
| E19 | Farmer Pickup Queue | Time-sorted ready/pending orders; search by safe order code and customer name limited to owning farmer. |
| E20 | Stock Change Impact Preview | Before a farmer lowers stock or marks sold out, show existing reservations and block any action that would violate them. |
| E21 | Market Operator Snapshot | Admin sees farmer attendance and offers for a selected day; no fabricated real-time crowds or footfall. |
| E22 | AI 'Explain This Chart' | Farmer/admin can ask for a plain-language explanation of actual period-scoped computed metrics, with calculation definitions. |
| E23 | AI 'What Changed Since Last Week?' | Server computes actual week-to-week deltas; model only explains; show small-sample warning when appropriate. |
| E24 | AI 'Help Me Fix This Form' | Explain client/server validation errors in plain language without submitting data or exposing hidden records. |

**UX rule:** an enhancement belongs only if it makes a core SRS task faster, clearer or more trustworthy. The acceptance checklist must show which core requirement it reinforces, its data dependency, fallback and completion cost. Avoid building 24 half-finished items.

## 11. Minimal shared definition of 'done'

For any SRS feature to be called DONE, it must have: visible correctly designed UI in relevant roles, server-enforced policy and validation, persisted authoritative data when applicable, a contract-matched request/response, empty/error/conflict handling, automated test or reproducible manual evidence, responsive/accessibility check, operator-understood reasoning, and an actual integration state clearly marked as MOCK or LIVE. Documentation of implementation is **internal notes**, not AI-produced submission paperwork. Features that merely look complete in Figma or on a hardcoded dashboard are NOT DONE.
