# MarketLink — complete frontend master prompt

> Copy this entire document into your coding agent. Keep the source SRS, Agent Blueprint and repository available to that agent. This is an internal implementation brief, not a competition submission report.
>
> Prepared for the owner on 23 September 2026. This document specifies the intended complete frontend; it is **not a claim that these screens already exist**. At the time of writing, the verified frontend contains the React/Vite/TypeScript preparation shell and a central HTTP transport. The earlier Figma work saved tokens and text styles, but no completed screen designs. Figma was deferred at that point; the later resume instruction permits free-quota use without blocking coding. Detailed screen compositions below are implementation specifications extending those foundations, not reconstructions of completed screenshots. A prompt cannot guarantee pixel-identical results across different agents; follow the measurements, hierarchy, tokens and acceptance criteria here to keep the result consistent.

---

## START OF THE PROMPT TO THE CODING AGENT

You are the dedicated principal frontend engineer, UI/UX designer, creative director, accessibility engineer and frontend test engineer for **MarketLink**, theme **eGreen Basket**, in Aptech TechWiz 7, category End-to-End Web Solutions.

Build the complete frontend, not a landing-page demo, static dashboard collection or disconnected set of mock screens. Build coherent customer, farmer and administrator journeys with working frontend interactions and an architecture that can connect to the separately developed backend.

The owner has authorised frontend implementation now. Do not spend the session producing another long plan. Inspect the existing project, preserve working code, then implement and verify it in meaningful phases. Continue across pages without asking for approval after every screen. Stop for genuine missing decisions only when they block the dependent operation; keep independent frontend work moving.

**Latest owner update: Figma may be used again only within the existing free account and available quota. No purchases, upgrades or repeated retries after quota errors. Figma must never block coding.** Continue in React/CSS when access is unavailable, using the visual system here and browser screenshots. Do not misrepresent the existing Figma file as completed designs.

Antigravity independently owns backend/database/business rules/APIs/server-side OpenAI. You exclusively own the frontend. Both agents are building one application. Do not create a second backend, call MongoDB from React or independently finalise an API contract.

### 1. Authority, safety and operating boundaries

Read available source material in this order:

1. Official `MarketLink End-to-End Web Solutions_SRS.pdf`, all pages.
2. `Documentation/Shared/00_PRODUCT_BLUEPRINT.md`.
3. `Documentation/Shared/01_API_AND_DATA_CONTRACT.md`.
4. `Documentation/Shared/02_PHASES_INTEGRATION_AND_QA.md`.
5. `Documentation/Frontend/ASTRA_CODEX_INSTRUCTIONS.md`.
6. Existing frontend architecture, readiness and design notes.
7. This detailed reproduction/implementation prompt.

The source PDF and ZIP were supplied at:

- `C:\Users\NC\Downloads\MarketLink End-to-End Web Solutions_SRS.pdf`
- `C:\Users\NC\Downloads\MarketLink_Agent_Blueprint.zip`

The ZIP includes the shared and frontend documents above. Read archive content without silently overwriting operator-controlled shared files. On another machine, use the owner's supplied equivalents. If the sources are unavailable, use this specification for independent frontend work but report that direct SRS verification is incomplete.

The official SRS defines mandatory scope and exclusions. The blueprint adds proposed design, architecture and enhancements. The proposed API contract remains **DRAFT until the owner approves its exact version**. This document does not approve that contract. Latest direct owner instructions authorise fixture-backed frontend development and permit opportunistic free-quota Figma use without making it a coding gate, despite older preparation/approval language. Competition rules still apply to actual submission: students must understand and meaningfully modify AI-assisted work and disclose tools; this internal prompt is not ready-made final submission documentation.

Repository: `https://github.com/zoaibahmed/techwiz-project`.

Known verified frontend checkout: `D:\TECHWIZ7\.worktrees\frontend`.

Frontend app: `D:\TECHWIZ7\.worktrees\frontend\Client`.

Frontend documents: `D:\TECHWIZ7\.worktrees\frontend\Documentation\Frontend`.

The path `D:\TECHWIZ7.worktrees\frontend\Client` appeared in an earlier owner message; do not create that alternate directory without inspecting the actual checkout. The verified path includes `\.worktrees\` inside `D:\TECHWIZ7`.

Permissions:

- Modify only `Client/` and `Documentation/Frontend/` in the approved frontend checkout.
- Read approved shared documentation. Do not rewrite shared contracts.
- Never modify `Server/`, `Documentation/Backend/`, root configuration or unrelated projects.
- Never open, read, copy, print, log, bundle or transmit `atlas-credentials.env`.
- Do not search secret-file contents as part of broad repository scanning.
- Do not switch the shared original checkout away from the backend's branch.
- Do not create an integration/main worktree, merge branches, force-push, reset or delete shared branches.
- Before implementation and before committing, inspect current branch, working tree, remote and worktree association.
- Work on existing `Client` only. Stage explicit authorised paths. Never use unrestricted `git add .`.
- The owner's frontend development authorisation allows verified frontend commits and push only to `origin/Client`. Verify scope before `git push origin HEAD:Client`. Never push to `main` or `Server`. If credentials/network/configuration block a push, report it without claiming success.
- Do not overwrite existing user changes. Report unexpected state and isolate your own changes safely.

Use installed Frontend Design, UI/UX Pro Max, React Best Practices, React Composition Patterns and Web Design Guidelines when available and relevant. Inspect actual skill instructions and installed packages before changing anything. Do not install duplicate skills or dependencies merely because they are mentioned here.

### 2. The product: The Living Market

Brand name: **MarketLink**.

Theme: **eGreen Basket**.

Creative direction: **The Living Market**.

Core line: **Know your market before you go.**

MarketLink connects a customer's plan for a market day to actual farmers, dated stock, pickup windows and reservations. A customer should always understand:

1. What can I get for the market day I selected?
2. Who is selling it, at what price and unit?
3. Where and when can I pick it up?
4. Has the farmer accepted it, and is it ready?

A farmer should understand what to publish, accept, prepare and carry to the next market. An administrator should understand which people, markets and content need attention.

This is a pickup reservation platform. **Payment happens in person at pickup.** No card checkout, payment gateway, delivery address workflow, courier, delivery tracking, delivery fee or invented tax policy. Registration still needs an address as required by the SRS. Do not confuse contact address with delivery functionality.

Do not introduce organic certification verification, identity certification, claims of verified food safety, carbon savings, fake footfall, fictional live demand or guaranteed harvest yields. Farmer approval means permission to list on the platform, not certification of produce or identity.

The app must work without AI. Copilot supports established tasks; it never replaces navigation, filters, forms, order controls or human judgement.

### 3. Non-negotiable visual rules

Create a premium agricultural editorial identity with operational clarity. Use thoughtful produce photography, generous but purposeful whitespace, strong typography, market schedules, route/pickup context and carefully composed rows. Keep the public experience warm; keep farmer/admin workspaces precise and calm.

Never use gradients: no linear, radial, conic, text, border, image-overlay or skeleton shimmer gradients. Use flat colours and real images. Do not disguise a gradient as a shadow stack.

Avoid:

- A generic grocery homepage full of discount badges and product cards.
- A generic SaaS dashboard with four floating KPI cards above arbitrary charts.
- Identical rounded cards around every piece of content.
- Huge decorative blobs, glassmorphism, neon, unnecessary dark mode or 3D vegetables.
- Excessive uppercase labels, fake serial numbers and decoration posing as information.
- Rainbow status chips, emoji as interface icons and random font families.
- Animated entrances on every row, parallax on critical content and distracting looping graphics.
- Fake counters such as “10,000 happy customers” or “live market activity” without records.
- Dead buttons, `href="#"`, fake success toasts or screens that look interactive but do nothing.

Use true grids where function calls for them, such as a product catalogue or weekly planner. The prohibition concerns repetitive generic composition, not useful structured layouts.

### 4. Exact visual foundations

#### 4.1 Colour tokens

Use semantic CSS variables mapped to these foundations. Do not sprinkle unrelated hex values throughout components.

| Token | Value | Intended use |
|---|---|---|
| `--ml-forest` | `#183B2B` | Primary actions, brand, selected navigation, selected map marker |
| `--ml-forest-deep` | `#0F291D` | Primary hover, dark feature strip and footer |
| `--ml-paper` | `#FAF8F2` | Main canvas |
| `--ml-white` | `#FFFFFF` | Form fields, raised panels, table/receipt surfaces |
| `--ml-ink` | `#242B23` | Main text |
| `--ml-muted` | `#5A665C` | Secondary readable text |
| `--ml-sage` | `#A5B89A` | Supporting fills and selected illustrations |
| `--ml-sage-pale` | `#E8EDE3` | Quiet selected surfaces and grouped sections |
| `--ml-harvest` | `#C98646` | Restrained agricultural accent, chart fill or small decorative mark |
| `--ml-border` | `#D6DCD1` | Nonessential dividers and panel edges |
| `--ml-danger` | `#A1352B` | Destructive actions and error text |
| `--ml-danger-pale` | `#FAEAE6` | Error surface |
| `--ml-focus` | `#245BA8` | Keyboard focus ring |
| `--ml-map` | `#EBEFE5` | Schematic map ground |
| `--ml-river` | `#C6DDE0` | Schematic water |

Semantic aliases: surface=paper, panel=white, text=ink, secondary=muted, primary=forest, primary-hover=forest-deep, inverse=white, soft=sage-pale, accent=harvest, error=danger, error-surface=danger-pale.

Reference contrast calculations from the foundations: ink/paper approximately 13.69:1, white/forest 12.36:1, muted/paper 5.67:1, danger/danger-pale 5.88:1. Recheck actual composition. Harvest/paper and sage/paper fail normal-text contrast; never use them for small text or essential controls on paper. The quiet border token alone is not sufficient for all interactive boundaries: use a darker accessible control border where required.

Selected navigation: pale sage background, forest text and a solid left/inset selection marker. Status always includes readable text and optionally an icon, never colour alone. A pending status is not automatically an error. Do not colour every number.

#### 4.2 Typography

- Editorial family: **Newsreader**, Regular and Medium, for hero, primary page headings, storytelling and selected large figures.
- Interface family: **Public Sans**, Regular, Medium and SemiBold, for body, forms, tabs, navigation, tables and metrics requiring fast scanning.
- Self-host licensed WOFF2 where practical; record source and licence. Use Georgia for editorial fallback and system sans-serif for interface fallback. Do not block first render on font loading; use `font-display: swap`.
- No third decorative font. No monospace as the default for dashboard metadata.

| Role | Desktop size / line height | Mobile size / line height | Weight |
|---|---|---|---|
| Hero display | 72 / 76 px | 42 / 46 px; 36 / 40 at 320 px | Newsreader 400 |
| Page H1 | 48 / 52 px | 34 / 38 px | Newsreader 400–500 |
| Section H2 | 32 / 38 px | 28 / 34 px | Newsreader 500 |
| H3 | 22 / 28 px | 22 / 28 px | Public Sans 600 or Newsreader 500 for narrative |
| Body | 16 / 24 px | 16 / 24 px | Public Sans 400 |
| Small body | 14 / 20 px | 14 / 20 px | Public Sans 400 |
| Control label | 14 / 20 px | 14 / 20 px | Public Sans 500–600 |
| Caption | 12 / 18 px | 12 / 18 px | Public Sans 400 |
| Metric | 36 / 44 px | 30 / 38 px | Public Sans 500; tabular numerals |

Use `clamp()` for display scaling. Main headings are left-aligned except a deliberately centred compact auth title if appropriate. Keep paragraphs around 60–72 characters wide. Sentence case. Do not randomly italicise one hero word or change its colour.

#### 4.3 Spacing, geometry and layout

- Spacing scale: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 px.
- Radii: 0 for tables/flat strips; 4 for small surfaces; 8 for inputs/buttons; 12 for composed panels; 24 only for a special media composition; 999 for chips/avatar circles.
- Public content max-width: 1280 px. At 1440 px use approximately 80 px outer margins.
- Public desktop grid: 12 columns, 24 px gutters. Tablet: 8 columns, 20 px gutters. Phone: 4 columns, 16 px gutters with 20 px side padding; use 16 px padding at 320 px.
- Dashboard sidebar: 232 px. Desktop workspace padding: 32 px. Dense records remain readable, not microscopic.
- Public header: 80 px desktop, 64 px mobile. Dashboard topbar: 72 px desktop, 64 px mobile. Account for any fixture banner above these.
- Desktop section spacing: 64–80 px; phone: 40–48 px.
- Form controls: minimum 48 px high, 12–16 px horizontal padding. Search controls may be 52–56 px on hero/discovery.
- Icon-only buttons: 44 px minimum hit area, preferably 48 px. Icons generally 18–22 px with consistent stroke.
- Desktop form reading width: 640–720 px. Auth form width: 400–440 px. Never stretch a single text field over a 1200 px screen.
- Quiet 1 px separators; shadows only for overlays/popovers and genuinely floating controls. Suggested overlay shadow `0 18px 60px rgba(15, 41, 29, 0.16)`.

#### 4.4 Responsive breakpoints

- 320–479: narrow phone, one main column, full-width primary actions when helpful.
- 480–767: large phone, catalogue may use two columns if content remains readable.
- 768–1023: tablet, two-column compositions where appropriate; dashboards use a navigation drawer.
- 1024–1279: compact desktop, persistent sidebar if main content still fits, adaptive detail panels.
- 1280+: full desktop composition.

These are UI rules, not device detection. Reflow based on available space. No whole-page horizontal scrolling at 320 px. Permit labelled horizontal scroll only for inherently two-dimensional content with a mobile alternative. Do not reduce text size until it barely fits.

#### 4.5 Imagery and iconography

The homepage's memorable element is a beautiful produce/market composition and strong editorial headline. Use natural light, tactile leaves, wooden crates, woven baskets and honest close crops. Avoid supermarket packs, fake glossy vegetables and images implying fictional fixtures are real farmers.

Homepage hero image: portrait-ish 4:5 or 5:6 crop on desktop, landscape 4:3 on mobile. Product imagery: consistent 4:3 crops; farmer story: 3:2; market detail banner: 16:7 on desktop, 4:3 mobile. Preserve image dimensions to avoid layout shifts. Use AVIF/WebP where supported, appropriate `srcset`, lazy loading below the fold and a single prioritised hero image.

Candidate sources previously identified, not yet adopted or uploaded:

- Harvest basket, fr0ggy5: https://unsplash.com/photos/D80mU0JCEes
- Market vegetables, Kate Asplin: https://unsplash.com/photos/Kljrykekuwo
- Tomatoes, Mustafa Akın: https://unsplash.com/photos/-Hpx8dtEoSo
- Carrots, Nick Fewings: https://unsplash.com/photos/d9gDUaDpnes

Verify current licence and asset availability before using them. Record credits. Do not scrape arbitrary copyrighted images or falsely attribute a stock photograph to a fixture seller. If assets are unavailable, use original clean SVG still-life placeholders labelled as illustrative rather than broken images or unlicensed replacements.

Use Lucide React icons sparingly: MapPin, CalendarDays, ShoppingBasket, Search, Heart, Clock, ArrowUpRight, ChevronRight, Check, Plus, Minus, Bell, SlidersHorizontal, Sprout, ClipboardList, Package, Users, Menu and X or their installed equivalents. Use actual available exports. Decorative icons are hidden from assistive technology. Icon-only controls have accessible names.

Logo: restrained MarketLink wordmark with a simple original leaf/market-path SVG symbol if needed. Do not spend the session creating an elaborate identity package. Brand remains legible at 24–32 px high.

#### 4.6 Motion

- 120–160 ms for press/hover feedback.
- 180–220 ms for selection, accordion and compact UI changes.
- 220–280 ms for a drawer/dialog opening.
- One restrained 300–400 ms hero introduction is optional, with no essential content initially hidden if JS fails.
- Use transform and opacity where suitable; avoid layout thrash.
- Animate map/list selection and basket acknowledgement only when caused by a user action.
- Prefer CSS for simple transitions. Use Motion for React for complex state transitions if it is already installed. Use GSAP only for a concrete need; do not run two animation engines for the same effect.
- Honour `prefers-reduced-motion`; disable nonessential travel and looping motion. Focus, content and success state must not depend on an animation completing.
- Flat static or opacity-based skeletons only; no gradient shimmer.

### 5. Global shells and navigation

#### 5.1 Public shell

Desktop header: logo left; Markets, Produce, How it works navigation centre; Search, Sign in and Basket right. “How it works” links to a real homepage section. Signed-in users see their dashboard entry and account menu instead of redundant sign-in. Basket count reflects actual current fixture/live state.

Mobile: logo, basket and menu. Menu opens an accessible drawer with all primary links and auth/dashboard entry. Search remains reachable without navigating through several menus. Do not cram desktop links into a tiny bar.

Footer: forest-deep flat background, white brand and one short purpose statement; Explore links, For farmers links, About/Contact/Help; a plain “Pre-order online. Pay at pickup.” line. Include verified team information only. Do not invent policies, addresses, social profiles or legal assurances.

Fixture mode adds a persistent, concise, accessible banner: **“Development preview — fictional sample data. Actions are simulated.”** It must be visible on deep links, dashboards, checkout, auth and Copilot. Keep it visually separate from actual announcements. A small developer panel may offer reset, role demo and error scenarios. Do not mix developer controls into production navigation.

#### 5.2 Customer shell

Keep public brand continuity. Desktop account subnavigation: Market day, Orders, Favourites, Notifications, Profile. The customer dashboard remains airy and focused on pickups, not an admin-looking analytics screen.

Phone bottom navigation can use five entries: Explore, Market day, Basket, Orders, Account. Account opens favourites, notifications, profile and sign-out. Include icon plus visible label. Reserve bottom safe-area space so content and sticky actions are never covered. On checkout use one decisive sticky action strip rather than two competing fixed bars.

#### 5.3 Farmer shell

Forest brand rail/sidebar with clear white text or a paper sidebar with a forest brand header; use one treatment consistently. Group navigation:

- Today and planning: Weekly planner, Orders, Pickup queue.
- Your stall: Products, Dated stock, Weekly templates, Pickup windows, Markets, Profile.
- Business: Insights, Reviews, Notifications.

Bottom area: signed-in fixture/live stall identity, account/access state and sign-out. Topbar: breadcrumb/current workspace, selected market/date context where relevant, Copilot trigger and notifications. Never use a role dropdown to change a live user's permissions. Demo switching belongs in labelled development controls.

#### 5.4 Administrator shell

Same token system, denser layout. Navigation: Command centre, Farmers, Customers, Markets, Moderation, Reports, Categories, Announcements, Notifications. Topbar states “Administration” plainly. Action queues lead; metrics provide context. No fake security shield or verification seal.

#### 5.5 Shared interaction standards

- One clear H1 per route. Browser title includes page name and MarketLink.
- Breadcrumbs on detail/edit routes. Back links preserve list filters/page when possible.
- Route changes move focus to the main heading or appropriate landmark and restore scroll deliberately.
- Loading, empty, error, not-found, forbidden and stale-data states exist for every data-dependent route.
- Filters are reflected in frontend URL search parameters so reload/back/links behave consistently; these are not backend endpoint definitions.
- Forms use native semantic fields, persistent labels, helpful hints, inline errors and an error summary when there are several errors.
- Destructive actions show exact target and consequence in a confirmation dialog. Loading prevents duplicate submission; success appears only after the selected adapter reports success.
- No success-only fake toast for an unimplemented action. Either implement its fixture behaviour or clearly disable it with a reason.

### 6. Complete frontend route inventory

These are **frontend navigation paths**, not approved backend endpoints. Preserve a coherent equivalent if the existing app already uses routes, but do not omit any mandatory journey.

| Audience | Route | Page |
|---|---|---|
| Public | `/` | Editorial home |
| Public | `/markets` | Market discovery and Living Market Map |
| Public | `/markets/:marketId` | Market detail and attendance |
| Public | `/farmers` | Farmer discovery |
| Public | `/farmers/:farmerId` | Farmer story, schedule and offers |
| Public | `/products` | Product discovery |
| Public | `/products/:productId` | Product detail with dated offer selection |
| Public | `/about` | Platform and team |
| Public | `/contact` | Contact and Google Maps location |
| Public | `/help` | Pickup FAQ and help |
| Auth | `/login` | Customer/farmer sign-in |
| Auth | `/register` | Choose customer or farmer registration |
| Auth | `/register/customer` | Customer sign-up |
| Auth | `/register/farmer` | Farmer sign-up |
| Auth | `/admin/login` | Separate administrator sign-in |
| Conditional auth | `/forgot-password` | Recovery request, only when supported or explicitly marked fixture |
| Conditional auth | `/reset-password` | Reset form, only when supported or explicitly marked fixture |
| Customer | `/customer` | Your Market Day overview |
| Customer | `/customer/market-day` | Detailed Market Day Planner |
| Customer | `/basket` | Basket by farmer |
| Customer | `/checkout` | Pickup reservation review |
| Customer | `/customer/orders` | Active orders and history |
| Customer | `/customer/orders/:orderId` | Order detail and Pickup Passport |
| Customer | `/customer/orders/:orderId/edit` | Edit eligible reservation |
| Customer | `/customer/orders/:orderId/review` | Product/farmer review |
| Customer | `/customer/favourites` | Farmers, products and preferred markets |
| Customer | `/customer/notifications` | Customer notifications |
| Customer | `/customer/profile` | Account contact details and preferences |
| Farmer | `/farmer` | Weekly Market Planner |
| Farmer | `/farmer/access` | Pending/suspended/access status |
| Farmer | `/farmer/profile` | Stall profile |
| Farmer | `/farmer/markets` | Market attendance and stall location |
| Farmer | `/farmer/products` | Product catalogue management |
| Farmer | `/farmer/products/new` | Add product |
| Farmer | `/farmer/products/:productId/edit` | Edit product |
| Farmer | `/farmer/stock` | Dated stock offers |
| Farmer | `/farmer/stock-templates` | Recurring weekly stock templates |
| Farmer | `/farmer/pickup-windows` | Pickup slots and cutoffs |
| Farmer | `/farmer/orders` | Incoming/active/history orders |
| Farmer | `/farmer/orders/:orderId` | Farmer order detail |
| Farmer | `/farmer/pickups` | Time-sorted pickup queue/prep worklist |
| Farmer | `/farmer/insights` | Order value and sales insights |
| Farmer | `/farmer/reviews` | Reviews and optional replies |
| Farmer | `/farmer/notifications` | Farmer notifications |
| Admin | `/admin` | Command Centre |
| Admin | `/admin/farmers` | Farmer directory/approval queue |
| Admin | `/admin/farmers/:farmerId` | Farmer review and account action |
| Admin | `/admin/customers` | Customer management |
| Admin | `/admin/customers/:customerId` | Customer account detail |
| Admin | `/admin/markets` | Market management |
| Admin | `/admin/markets/new` | Create market |
| Admin | `/admin/markets/:marketId/edit` | Edit market |
| Admin | `/admin/moderation` | Listing/review moderation |
| Admin | `/admin/reports` | Platform reports |
| Admin | `/admin/categories` | Categories/master data |
| Admin | `/admin/announcements` | Draft, preview and publish announcements |
| Admin | `/admin/notifications` | Administrative notifications |
| System | `/403` or equivalent | Access denied |
| System | Unmatched route | Not found |

Copilot is a consistent drawer/panel attached to appropriate routes, not a disconnected compulsory fourth application. A full-screen mobile assistant view can share the current role's shell and return location without inventing a server endpoint.

### 7. Public pages — exact section-by-section direction

#### P01. Homepage `/`

**Purpose:** introduce the market-day journey and start discovery quickly.

1. Public header and fixture banner where applicable.
2. Hero: 5/12 text, 7/12 photography; roughly 560–640 px tall at desktop, naturally sized on mobile. Headline: “Know your market before you go.” Supporting copy: “Find the growers, choose what is in season, and reserve your pickup before market day.” Do not imply guaranteed availability without reservation. Primary “Explore markets”; secondary “Plan my market day”. Small readable line: “Pre-order online. Pay in person at pickup.”
3. Hero discovery control: location input/select, market day picker and “Find my market”. It actually navigates to matching discovery filters. Manual location works without geolocation. Do not request location permission on page load.
4. Photograph: large original crop, no text gradient. A compact solid-paper caption may show a selected fixture market/date, explicitly sample. Never overlay text over busy produce without a readable solid surface.
5. “Your next market day”: one leading market row/composition and two quieter alternatives, not a row of identical promotional cards. Show address/area, actual session date, opening time and attending farmer count derived from records. No fake distance before a location is supplied.
6. “On the stalls”: curated available offers for the selected day, typically four on desktop and a readable two/one-column mobile layout. Show seller, unit, price and dated availability. Link “Browse all produce”.
7. “A better way to market day”: genuine three-step sequence: Find your market; Reserve from your farmers; Collect and pay at pickup. Use modest SVG icons and direct language.
8. Farmer story: asymmetric 6/6 photo and text composition, stall profile link, operating day and original approved story. In demo, explicitly fictional narrative; do not invent certification or real people.
9. Market Day Planner preview: show a small honest pickup timeline from fixtures or the user's own data, with context and link. Public preview must not expose someone else's orders.
10. Farmer invitation: quiet forest panel, “Bring your stall to MarketLink”, explain listing/weekly planning and “Register your stall”. No fabricated business growth claims.
11. Footer.

**Mobile:** headline and search before image; controls stacked; image cropped rather than squashed; market alternatives become rows. All CTAs reachable without a carousel. Empty markets produce a helpful location/day reset state, not invented listings.

#### P02. Market discovery and Living Market Map `/markets`

1. H1 “Find your next market day.” Short context sentence.
2. Search by location/market, day/date control, optional “Use my location”, clear filters and results count.
3. Desktop main split: approximately 420 px results column and remaining map width, minimum reasonable height 600 px. Results list scroll must not trap page navigation. Map can be sticky within its section.
4. Each market result: name, area/address, selected occurrence day/time, attending farmer count, available offer count when known, save button and “View market”. Selected row uses sage-pale background and forest outline/marker.
5. Selecting a row focuses its marker. Selecting a marker highlights and brings the row into view without stealing keyboard focus unpredictably. Marker labels must distinguish market from stall when both appear.
6. Map details popover: name, date/time, address, “View market” and “Directions”. Avoid giant popups obscuring all results.
7. Filters can include category and attending farmer only if backed by the selected data. List and map use identical filtered records.
8. Empty: “No markets match this day and location.” Offer reset/change day. Error: retry plus available address/list fallback.

**Map boundary:** use an approved Google Maps/OpenStreetMap implementation when ready. Until then, an explicitly labelled schematic or fixture map is acceptable in development. Do not present invented map coordinates as actual pickup points or fake computed travel time. Keep a provider adapter. External directions use actual approved/fixture-labelled coordinates, not arbitrary redirect URLs. Location denied/unsupported/map failed must leave list discovery usable.

**Mobile:** prominent List/Map toggle; list default; map selected result in a compact bottom sheet; no side-by-side miniature panels. Filters in an accessible sheet with Apply and Clear. Do not rely on map gestures for all functionality.

#### P03. Market detail `/markets/:marketId`

1. Breadcrumb and market name.
2. Wide market photograph or honest fallback; adjacent/overlaid solid context panel with address and next published session.
3. Session selector with date, opening/closing time and timezone. Do not infer attendance from a farmer's usual weekday alone.
4. Attendance section: farmers present for that occurrence, stall location, categories and profile links. Empty attendance differs from market closed.
5. Available produce section scoped to the selected session with category controls and product links.
6. Pickup/location block: embedded map, plain address, stall instructions if provided, directions and accessible location text.
7. Save preferred market toggle; published announcements scoped to the market if supported.
8. Small help strip explaining separate farmer pickups and pay at pickup.

**Mobile:** title/session above photo; attendance rows; full-width directions. Closed/cancelled session replaces reservation actions with a factual message and alternative dates. Do not erase existing affected reservations from the customer's account.

#### P04. Farmer discovery `/farmers`

1. H1 “Meet the people behind your market.”
2. Search stall/farmer; market and day filters; result count and clear control.
3. Editorial directory rows: stall photograph/logo, name, approved public description excerpt, next attending session and categories. Favourite control and “Visit stall”.
4. Empty/error/pagination states consistent with catalogue.

Use varied row rhythm or a featured story followed by directory, not a wall of indistinguishable biography cards. In production list only records permitted for public visibility. “Approved to list” must not become “certified organic”.

#### P05. Farmer profile `/farmers/:farmerId`

1. Breadcrumb; portrait/produce story banner and stall name.
2. Public story, location, ordinary operating days and farmer-provided imagery. Do not expose private contact/address fields simply because the backend has them.
3. “At the market next”: dated attendance, selected market, stall pin, pickup window and cutoff.
4. “From this stall”: offers scoped to market/day, with stock/unit/price and filter controls.
5. Reviews: aggregate only when available, count, farmer vs product distinction, review list and permitted replies.
6. Favourite farmer and restock preference affordance; require sign-in if applicable.
7. Location and directions fallback.

**Mobile:** story becomes a concise expand/collapse area after key availability details; buying context is not buried below a long biography. Unavailable farmer has no active add-to-basket controls and a clear explanation.

#### P06. Product discovery `/products`

1. H1 “Fresh for your market day.” Selected market/date context immediately below.
2. Search input with clear button, results count, sort selector and filter entry.
3. Desktop left filter rail around 224 px: category, valid price range, market, date/day, farmer and available-only when supported. Avoid arbitrary filter categories not present in master data.
4. Main catalogue: three columns at wide desktop, two at compact desktop/tablet, two on wide phone only if every card stays legible, otherwise one. Cards are quiet image-led entries without heavy borders/shadows.
5. Product entry: 4:3 image, product name link, farmer, selected occurrence/market, formatted price with unit, available quantity in matching units, favourite toggle and “Choose pickup” or “View offer”. Quick add only if offer and pickup context are unambiguous.
6. Applied filter chips with remove buttons. Sorting: meaningful choices supported by data, such as price ascending/descending and name. Do not sort invalid unit comparisons as if equivalent.
7. Pagination/load-more with actual state and accessible announcement, no fake infinite scroll.
8. No result/error/stale data views and reset action.

**Mobile:** search and Filters/Sort row above results; accessible filter sheet; applied filters remain visible. Preserve query on opening/returning from product detail. Loading maintains image/text geometry.

#### P07. Product detail `/products/:productId`

1. Breadcrumb back to preserved discovery context.
2. Left 7/12 product image with optional actual thumbnails; right 5/12 information and purchase panel.
3. Product name, linked farmer, category, concise description and real review summary if any.
4. Dated offer selector: market/session first, then pickup date/window as required by chosen flow. Distinguish product identity from stock offered at a particular market occurrence.
5. Price, exact selling unit and available quantity; “Pay at pickup”. Do not label an unknown price as zero.
6. Quantity stepper with numeric input, min/step/unit rules and accessible increment/decrement labels. Respect fixed-scale units when approved; no floating-point drift.
7. Availability, cutoff and selected market/time summary.
8. Primary “Add to basket”; secondary favourite. Success changes the actual basket and offers “View basket”; no forced modal every time.
9. Below: About this produce, farmer link/story, pickup location, product reviews and a small set of genuinely related available offers.
10. Optional contextual Copilot “Help me choose for this market day” opens the assistant with selected offer context; it never automatically orders.

**States:** sold out, temporarily unavailable, no published offer, cutoff passed, price changed, stale quantity, loading, not found. For restock notification, show actual subscription state or fixture label; no promise of an email unless supported.

**Mobile:** image, name/price, offer selector, quantity, action; sticky bottom summary/action only once a valid offer is chosen. It must not cover errors or the consent/review area. Product details remain readable without sticky UI.

#### P08. About `/about`

1. Editorial heading “A closer connection to market day.”
2. Plain description of the problem: uncertain attendance, availability and pickup planning.
3. Three role perspectives in an alternating text/image composition: customers, farmers, market operators.
4. Explain the reserve/collect/pay-in-person model.
5. Team section using supplied real team details only; label missing details as awaiting owner content in development.
6. Link to markets and contact.

No fake founding date, awards, impact statistics or testimonials. Avoid a generic corporate values grid.

#### P09. Contact `/contact`

1. H1 and short purpose.
2. Static approved team contact details: name/organisation, email, phone and location as supplied. Missing actual details are an explicit content dependency.
3. Google Maps location embed required by the SRS, with descriptive iframe title, external directions and plain-address fallback. Do not silently replace this specific requirement with a schematic production map.
4. Link to help for pickup questions and relevant account order route.

A contact form is not mandatory. Do not add a fake working form; implement only if a real approved submission mechanism exists, otherwise provide the static contact information. In demo, label a sample map/location as sample. Do not invent a team address.

#### P10. Help `/help`

1. Search/filterable FAQ or clear category navigation.
2. Topics: finding markets, product units, reserving stock, separate farmers, pickup windows, pay at pickup, changes/cancellation before cutoff, favourites/restock, reviews, farmer approval and AI limitations.
3. Accessible accordions with meaningful questions; answers reflect current approved policy, not guessed cancellation eligibility.
4. Contextual links to relevant pages and contact.
5. Optional Copilot entry; FAQ still works with AI disabled.

### 8. Authentication and account access

Shared auth styling: desktop split composition, approximately 48% editorial photo/brand promise and 52% paper form area; form max-width 440 px. The photo is decorative/contextual, not a giant advertisement. Mobile hides or greatly reduces secondary imagery, leaves logo, title and form. No gradient image overlays. Visible labels, 48 px fields, readable password requirements and clear errors.

#### AU01. Sign-in `/login`

1. Logo/back to markets.
2. Heading “Welcome back to your market.” Short explanation.
3. Email and password, properly typed autocomplete attributes, accessible show/hide password toggle.
4. “Sign in” primary, pending label “Signing in…”, inline/global failure.
5. Link to registration. Recovery link only when a corresponding supported or explicitly demo flow exists.
6. Optional clearly separated “Try a development account” entry in fixture mode. It must not look like real authentication or accept/store a real password as a credential.

Live role comes from verified session. Do not let a role selector grant privileges. After login redirect to customer/farmer destination or a validated internal intended route; never accept arbitrary external redirect URLs. Suspended/pending accounts receive appropriate state pages. Clear sensitive password state after completion.

#### AU02. Role selection `/register`

Two distinct choices: “Shop your local market” and “Bring your stall online”. Each has a brief benefit, required next step and button. This is a justified two-choice layout, not generic feature cards. No administrator self-registration option.

#### AU03. Customer registration `/register/customer`

Fields: full name, contact number, email, address, password and confirm password if using a password-based approved strategy. The SRS-required contact fields are mandatory. Show all required fields clearly, sensible `autocomplete`, appropriate input modes and persistent validation text.

Use a single readable form, grouped as “Your details” and “Account access”. On desktop name/phone may share a row; email/address remain comfortable width. Phone is not a number field; allow international formatting pending approved validation. Do not invent exact password rules; display backend-approved rules or explicitly documented fixture rules. Terms checkbox only if actual reviewed terms exist, not a dead link.

Submit creates a fixture account flow or calls the approved adapter; duplicate email/field errors map to fields. No fake verification email. On success redirect per approved auth behaviour; explain if sign-in is still required. In demo do not persist genuine entered PII/passwords beyond necessary transient form state.

#### AU04. Farmer registration `/register/farmer`

Step 1: stall/business name, contact person, phone, email, address.

Step 2: account access/password controls if approved, review the entered details and explanation: “Your stall must be approved before products can be listed.”

Use a visible two-step progress indicator because the sequence is real. Preserve inputs on back. No mandatory certification upload or identity verification; those are excluded. Market participation and detailed stock setup can follow approval/onboarding rather than bloating sign-up.

Success goes to pending approval experience, not an immediately public seller store. Fixture success is explicitly simulated. Never silently turn the new farmer into approved.

#### AU05. Administrator login `/admin/login`

Separate restrained administration sign-in, same brand, minimal imagery. Email/password fields, server-derived role, clear “Administrator access” context. No public sign-up or client-only secret-code gate. Customer/farmer sessions cannot enter merely by changing the URL. Frontend route guards improve navigation; backend enforcement is still required and must be tested later.

#### AU06. Conditional recovery `/forgot-password` and `/reset-password`

These are completeness enhancements, not explicit SRS requirements. Implement live only with an approved recovery contract.

Request page: email, submit and neutral confirmation that does not reveal whether an account exists. Reset page: new/confirm password, token expiry/invalid states, success link to sign-in. Do not generate real tokens in the browser or invent email delivery. If fixture-only, visibly label the preview and simulated result. If no contract/UI preview is wanted, omit recovery entry rather than ship a dead action.

#### AU07. Access states and expiry

Pending farmer: heading “Your stall is awaiting approval”, submitted details, clear listing restriction and contact/help link. No made-up review deadline.

Suspended farmer/inactive customer: explain access restriction using safe authorised reason if provided; no publishing/order controls; sign-out and support route remain available.

Expired session: preserve nonsensitive draft where safe, ask to sign in, return to permitted route, revalidate inventory before any resumed checkout. A 403 does not trigger an infinite login loop. Admin routes do not leak records while session is loading.

### 9. Customer workspace — every page

#### C01. Overview `/customer` — Your Market Day

1. Greeting without excessive personal data, H1 “Your market day, in order.” Selected upcoming date and link to detailed planner.
2. Leading next-pickup composition: time, market, farmer, status and directions. If no reservation, a purposeful invitation to choose a market, not empty fake metrics.
3. Pickup timeline: chronological seller-specific commitments, aligned time rail and meaningful status labels. Show overlapping windows honestly; do not invent optimal travel routing.
4. “Needs your attention”: actual changed availability, cutoff reminders or relevant unread notification records; omit when none rather than manufacture urgency.
5. Favourite stalls/produce returning for the selected session; current offers only.
6. Recent orders in a compact ledger with “View all orders”.
7. One Market Companion entry with two contextual suggested questions, not multiple chatbot panels.

Desktop: timeline occupies about 8/12, quiet summary/context rail 4/12. Mobile: next pickup first, timeline second, favourites later. No revenue/spend graph unless meaningful approved data justifies it.

#### C02. Market Day Planner `/customer/market-day`

1. Date selector and day summary derived from reservations.
2. Chronological itinerary grouped by market, then pickup window/farmer.
3. Each stop: market address, window, stall, order reference, state, product count and order value.
4. Directions and “Open Pickup Passport”. Optional personal checklist “Added to my packing list”/“Checked” must be explicitly personal and must never mark a backend order completed.
5. Bring-your-bags/pay-at-pickup reminder as static helpful copy, not a shipping instruction.
6. Adjacent map/route context when actual coordinates exist. Do not claim shortest route or calculate false ETA; use external directions as approved.
7. Overlap notice when slots conflict, with link to eligible order edit. Never automatically reschedule.
8. Empty day: link to nearby markets/date change; retain existing bookings on other dates.

Phone: vertical timeline, expandable order lines, one directions action per stop; usable outdoors with readable contrast and large controls. Optional print view hides navigation and demo role controls but retains fixture disclosure.

#### C03. Basket `/basket` — Basket by Farmer

1. H1 “Your basket, by farmer.” Intro makes distinct pickups clear.
2. Group entries by farmer AND compatible market occurrence/pickup arrangement, not merely seller name.
3. Group header: stall, market, selected date and pickup status; link to change eligible context.
4. Line rows: thumbnail, product, unit, quantity stepper/input, unit price, line total, remove. Editing actually updates basket state.
5. Group subtotal and pickup window selection or clear step to choose at checkout.
6. Unavailable/stale items remain visible with explanation and fix/remove actions; do not silently discard them or show them as reservable.
7. Desktop right sticky summary: group count, item count, estimated order value, pay-at-pickup copy, primary “Review pickup”. Make no universal delivery/fee claims.
8. Clear basket action requires confirmation. Empty basket has a meaningful market discovery CTA.

Multi-seller persistence is unresolved until contract approval. In fixture mode demonstrate explicitly named simulated seller reservations and surface partial success if chosen; do not silently assert atomic all-seller checkout. Production behaviour must match the approved grouping policy.

Mobile: seller sections as compact ledgers; image small, product name wraps, quantity and totals remain legible; total/action strip safe-area aware. Never use a six-column table that overflows the viewport.

#### C04. Checkout `/checkout` — Reserve your pickup

No payment screen. No delivery address. No card logos.

1. Context/progress: Basket → Pickup details → Review. It may be one page with clear sections rather than forced multi-page steps.
2. For each farmer group: selected market/session, available pickup date and slot, timezone, cutoff and location.
3. Contact confirmation from current account, editable through an approved contact mechanism if supported. Do not add unsupported message-to-farmer fields as required contract data.
4. Item/price/quantity summary; pay at pickup explanation; total described as order value.
5. Review acknowledgment and primary “Confirm reservation” or explicit per-group equivalent.
6. During submit disable duplicate action and show progress; do not optimistically display confirmed inventory before adapter success.
7. Success: actual returned fixture/live references, each farmer, market, slot and next step; “View orders” and “Plan market day”.
8. Conflict: show exact changed product/price/quantity/slot and request review/reconfirmation. Do not automatically accept a higher price or alternative date.
9. Partial success if backend policy permits: distinguish successful from failed groups, retain unreserved items, prevent duplicate retry of successful groups.

Unselected/expired/full slots, signed-out session, inactive farmer, market closed and empty basket all have specific recoverable states. In demo all confirmation copy says it is a simulated reservation.

#### C05. Orders and history `/customer/orders`

1. H1 “Your orders”. Tabs Active and History, or equivalent accessible filters.
2. Search by safe order reference/market/farmer; date/status filters supported by the data.
3. Rows show reference, farmer, market/date, pickup window, readable state, item count, order value and “View order”.
4. Active rows emphasise next pickup and relevant cutoff. Historical rows offer “Review” only when eligible and “Reorder” as a fresh availability check.
5. Pagination, no results, error and loading states.

No fabricated delivery tracker. SRS display stages are Placed, Accepted, Ready for pickup and Completed. Cancelled/declined are necessary outcome displays when supported; these human-facing labels do not establish final backend enum spelling.

#### C06. Order detail `/customer/orders/:orderId` — Pickup Passport

1. Back to orders; order reference and current state.
2. Status timeline with actual timestamps/events when provided. Do not draw all steps as complete by default.
3. Prominent pickup panel: farmer, market, plain address, date/window, timezone, stall instructions and directions.
4. Line-item receipt uses historical name/unit/price snapshots, not today's catalogue values.
5. Total order value and “Pay in person at pickup”. Do not display “Paid” without an approved actual payment record.
6. Change/cancel controls only when currently permitted; cutoff shown absolutely and relative where useful. Server remains authoritative.
7. Explanation/notification history relevant to this order.
8. Reorder or review once eligible; contextual “Explain this order” Copilot action.

Phone Passport: large readable status and pickup details, compact receipt, directions button. No fake scannable QR claiming authentication or completion. Add a QR only if the approved server defines its token and scanning flow. A local personal checklist does not change order status.

#### C07. Edit order `/customer/orders/:orderId/edit`

1. Current reservation identity/cutoff and eligible changes.
2. Quantity changes and permitted slot changes with current availability.
3. Before/after receipt: changed lines, old/new totals and pickup details.
4. “Save changes” confirms via adapter; “Keep original order” returns without mutation.
5. Stale version/cutoff conflict preserves draft and displays server/fixture reason. Never edit completed/declined/cancelled records casually.

Cancellation is a separate explicit confirmation showing order, farmer and consequences. The fixture engine must release reserved stock once, not every time Cancel is clicked. Final production policy for ready orders and cutoff is contract-dependent.

#### C08. Review `/customer/orders/:orderId/review`

1. Completed order context and eligibility status.
2. Farmer rating and comment; separate product target/rating/comment for purchased products according to approved model.
3. Accessible 1–5 rating radio group with labels, keyboard support and textual selection.
4. Character count/validation if defined; plain-text review input; preview optional.
5. Submit with pending/error/success. Prevent duplicate reviews if policy requires; show existing review and permitted edit behaviour rather than creating duplicates.

Do not expose this as a working action before completion. Fixture tests must enforce eligibility. Display review moderation state honestly; don't promise instant publication unless supported.

#### C09. Favourites `/customer/favourites`

Tabs: Products, Farmers, Markets. Each tab uses its natural layout: product entries, farmer rows, market schedule rows.

Show current availability for selected market day, favourite toggle, restock subscription state where supported, preferred market selection and direct detail links. A saved product is not a stock reservation. Distinguish unavailable/deleted/private favourites and allow removal. Restock alerts cannot be claimed delivered merely because a toggle changes. Empty states explain what saving does and lead to relevant discovery.

#### C10. Notifications `/customer/notifications`

Readable inbox grouped by date, All/Unread control, single and mark-all-read when supported. Notification shows type, concise content, timestamp and valid destination. Confirmation/ready/restock/market announcement examples must derive from fixture or live events. Don't create duplicate notifications on repeated mutation retries. Unread count updates consistently. Missing/deleted target provides safe fallback. Avoid colour-only unread indication.

#### C11. Profile `/customer/profile`

Contact form: name, phone, email and address with approved edit policy. Preferred markets and notification preferences may be grouped beneath. Save/cancel and unsaved-change protection. If email changes require verification, follow actual contract; do not improvise. Security/password change is conditional on backend support and should not become a fake button. No account deletion function unless separately approved.

Fixture privacy: do not save real form content/passwords in persistent demo storage. Make demonstration data resettable. On mobile place form sections in one column, not tabs hiding error fields.

### 10. Farmer workspace — every page

#### F01. Weekly Market Planner `/farmer`

The farmer dashboard is a working market-week board, not generic analytics.

1. H1 “Your week at the market.” Stall name, date range, week navigation and selected market.
2. Next-session band: market, date/time, cutoff and published stock summary with “Review stock”.
3. Needs-attention queue: pending orders, unpublished stock or conflicting slot/stock issues; each row has a concrete action. Counts derive from records.
4. Weekly schedule: desktop day columns/lanes for actual market sessions with attendance, published offer count and reserved quantity. No empty pseudo-calendar filled with invented events.
5. Today's/next-session pickup worklist preview, ordered by time, with order and preparation state.
6. Stock spotlight: meaningful low/zero available offers and reserved quantities; link to dated stock. Thresholds labelled if illustrative.
7. Business summary strip: total orders, pending orders and order value for selected period. Flat typography/separators, not four identical metric cards.
8. Farm Copilot entry: “What needs attention for my next market?” and “Prepare a pickup checklist”.

Mobile: next session, attention queue and pickup tasks first; weekly board becomes day selector plus list. Do not force sideways scrolling for essential actions. Pending/suspended farmer routes to access state and cannot publish.

#### F02. Access `/farmer/access`

Show pending, approved or suspended state based on actual adapter data. Submitted stall details, safe reason/next step, last update if known and support path. Approval arrival may enable profile/planning navigation; do not fabricate a timer. Suspended users cannot bypass controls via direct product routes in live mode. Frontend only simulates these gates until actual backend integration.

#### F03. Stall profile `/farmer/profile`

1. H1 and public profile preview link.
2. Identity: stall name, contact person, public description/story, image/logo if uploads supported.
3. Contact: private vs public fields clearly separated; do not publish owner address automatically.
4. Location/market links: lead to dedicated attendance editor rather than duplicate contradictory schedule forms.
5. Image upload: accepted types/size from approved policy, preview/remove, accessible alternative text, progress/error; fixture uses local preview with explicit no-upload label.
6. Save/cancel and public preview; changed fields persist through the selected adapter.

No organic/verified badges inferred from description. AI may draft copy but user must review; no fabricated origin or certification claims.

#### F04. Markets and attendance `/farmer/markets`

1. Current associations and next dated attendance.
2. Select an existing approved market; show its public schedule/address.
3. Configure permitted operating days or participation requests per actual policy, then dated session attendance. Do not assume a farmer can create a new market.
4. Stall location: text instructions, address where applicable, latitude/longitude and accessible map pin selection with manual equivalent.
5. Preview selected stall against market; validate coordinate ranges and alignment using approved constraints.
6. Save/cancel; warn about affecting existing reservations and block disallowed changes.

Mobile: list and full-width editor; map optional to interact, manual coordinates/address always reachable. Don't silently reuse one market's coordinates for every session.

#### F05. Products `/farmer/products`

1. Heading, product search, category/visibility filter and “Add product”.
2. Desktop structured table: thumbnail/name, category, unit, base/catalogue information, published-offer context, visibility and actions. Exact price/quantity belongs to dated offers where the model separates them; do not merge these concepts accidentally.
3. Row actions: Edit, View public listing and Delete/archive according to approved lifecycle. Destructive action explains affected offers/orders and preserves historical receipts.
4. Bulk operations only if implemented with preview and actual policy; no decorative selection checkboxes.
5. Empty state leads to add product; unavailable image has a clean fallback.

Mobile: row cards with name/unit/category and explicit actions, not a squeezed wide table.

#### F06. Add/edit product `/farmer/products/new`, `/farmer/products/:productId/edit`

Form sections:

1. Product identity: name and controlled category.
2. Description: plain text, useful pickup/product facts, no unsupported claims.
3. Selling unit and price fields as approved; when publishing requires a dated offer, explain that this is a catalogue item/default and link the stock editor. The overall SRS flow must still let the farmer set price and available quantity.
4. Photo upload/preview/alt text with safe constraints. Don't use a text URL field to accept arbitrary executable resources.
5. Availability/default publishing options only if supported, clearly distinguished from actual reserved stock.
6. Preview summary, Save product, Cancel. On edit show unsaved-change warning and stale-version conflict.

Validate required values, controlled category, money precision, quantity/unit consistency, image type/size and text length per agreed contract. No arbitrary production limits invented from UI convenience. Fixture limits are labelled/local.

#### F07. Dated stock `/farmer/stock`

1. Market/session selector is required before editing stock.
2. Summary: published, reserved and available quantities with units; never sum unlike units into a meaningless total.
3. Editable stock ledger per product: unit, price, published quantity, reserved quantity, available quantity and availability control.
4. “Add product to this market day” and “Apply weekly template” open real preview flows.
5. Sold out/unavailable controls explain whether they stop new reservations; they must not cancel existing orders silently.
6. Lowering stock or changing price presents impact preview. Block lowering below protected reservations according to approved inventory model.
7. Save/publish with exact before/after changes and feedback. Version conflict keeps the user's draft and offers refresh/review.

Use reserved-versus-available comparison bars only when quantities are commensurate and labels remain clear. No decorative realtime stock chart. Mobile has one product editor at a time or readable accordion rows.

#### F08. Weekly templates `/farmer/stock-templates`

1. Template list by name/market/weekday as appropriate.
2. Create/edit template: recurring day, selected products, default quantities/prices only if supported and description.
3. Preview application to a specific dated market session.
4. Show differences from existing dated offers and possible protected reservations.
5. “Apply to selected market day” requires confirmation; applying does not mean every future week has guaranteed stock.
6. Delete template confirmation; existing dated offers/orders remain governed by actual contract.

Clearly state: “A weekly template is a starting point. Review this market day's stock before publishing.” Templates are never a stock reservation pool.

#### F09. Pickup windows `/farmer/pickup-windows`

1. Market/date context with timezone.
2. Existing slots as chronological rows: start, end, cutoff, capacity only if supported, booked count/eligibility and actions.
3. Add/edit form: session, start/end times, order cutoff and optional approved capacity.
4. Validate end after start, cutoff relationship and session boundaries; backend decides overlaps/capacity policy.
5. Warn/block changes affecting existing orders; show impacted count when available.
6. Remove/close window confirmation distinguishes closing new bookings from altering reservations.

Desktop schedule plus editor; mobile list plus full-width sheet/page. No ambiguous local timestamps: display market timezone explicitly, especially in confirmations.

#### F10. Orders `/farmer/orders`

1. Heading and selected market/date.
2. Tabs or state filters: Needs response, Preparing, Ready, History, based on approved display mapping.
3. Search reference or permitted customer display name; pickup-window filter and sort earliest first.
4. Rows show reference, customer permitted display identity, item count, pickup window, state, value and action.
5. Accept/decline on eligible incoming orders; mark ready on eligible accepted orders; details for all. Decline requires a reason when policy does.
6. Pending action feedback; duplicate submission disabled; conflict refresh is recoverable.

No unapproved bulk accept/complete. No private customer information beyond operational need. Empty queue says there is nothing awaiting response, not “sales are booming”.

#### F11. Farmer order detail `/farmer/orders/:orderId`

1. Reference, status, pickup date/time and market.
2. Preparation list of historical ordered items/units/quantities.
3. Customer contact only as authorised for the order.
4. Status/event history and cutoff/constraints.
5. Clear eligible action area: Accept, Decline, Mark ready. Completion action only for the approved actor/policy; don't decide it yourself.
6. Confirmation dialog for consequential actions and exact result after adapter response.
7. Print/prep view optional, no secrets or unrelated customer data.

Changing status in fixture mode updates the same fixture order visible to the customer and generates matching fixture notifications. Do not maintain separate contradictory customer/farmer demo objects.

#### F12. Pickup queue `/farmer/pickups`

1. Selected market/day, next slot and queue filters.
2. Time-sorted orders with safe reference, customer display name, quantity summary and readiness.
3. Preparation aggregation groups the farmer's actual reserved quantities by product/unit for this session.
4. Personal packing checkboxes are local preparation state, separate from order lifecycle.
5. Open order and permitted ready/complete action. Do not claim scan-to-complete without an approved credential/token mechanism.
6. Summary of unresolved orders and already handled orders, calculated from source records.

Mobile field use: large rows, high contrast, no hover-only controls, compact safe identifiers. Printable prep list retains selected date/market and fixture disclosure.

#### F13. Insights `/farmer/insights`

1. Date range and market selector; defined timezone.
2. Flat metric strip: total orders, pending orders, order value; definitions available beside labels.
3. Primary chart: orders or order value by period, based on actual fixture/live aggregates. Simple accessible SVG/chart implementation; no meaningless curves.
4. Best sellers ranked by compatible quantity/order value with unit clarity.
5. Order history table or link filtered to the period.
6. Optional week-over-week comparison only when both complete comparable periods are available; zero baseline is “not comparable”, not infinite percentage.
7. “Explain this view” Copilot trigger with period/context, not invented insights.

Always call money “Order value” or explicitly define revenue summary as booked order value. No verified cash-collected claims. Chart includes textual summary and table alternative. Empty data doesn't draw a sample chart in live mode.

#### F14. Reviews `/farmer/reviews`

1. Review summary/count, product/farmer scope filter and rating/date sort where supported.
2. Review rows with target, rating text, safe author display name, date and comment.
3. Optional reply editor for own eligible reviews, with save/cancel, preview and existing reply state.
4. AI draft reply is editable and never auto-posted. No deleting customer reviews from the farmer interface unless explicitly authorised; moderation belongs to admin.

#### F15. Notifications `/farmer/notifications`

Reuse accessible inbox structure with farmer-specific events: new order, changed/cancelled order, approval/account change and relevant announcement when actually generated. Destination links remain within permitted role routes. Notification read state is shared with topbar count. No imaginary email delivery claim.

### 11. Administrator workspace — every page

#### A01. Command Centre `/admin`

1. H1 “Keep the market running.” Date/period and relevant market scope.
2. Leading action queue, not metrics: farmer registrations awaiting review, content requiring moderation and actual market setup issues. Each count is a link to a filtered queue.
3. Platform overview strip: total farmers, customers, markets and orders with definitions/time scope. These are SRS metrics, not invented business health scores.
4. Selected market-day operator snapshot: participating farmers, published offers and reservation summary, no live crowds/footfall.
5. Recent administrative activity only if audit data exists; otherwise omit, don't fabricate a feed.
6. Report preview with a simple period comparison and link to Reports.
7. Market Intelligence entry: “Summarise this period”/“Help draft an announcement”.

Desktop: 8/12 action workspace, 4/12 market-day context; overview strip below or between logical sections. Mobile: queues first, scope controls wrap, metrics form readable definition rows. Administrative UI remains usable without charts or AI.

#### A02. Farmers `/admin/farmers`

1. Approval-state tabs and search stall/contact name.
2. Table: stall, contact display name, submitted date, market association, state and Review action.
3. Pending rows clearly separated from approved/suspended. Pagination and useful empty states.
4. Approve/suspend action opens review/confirmation rather than an unlabelled toggle. Do not conflate platform approval with identity/organic certification.

Mobile: compact record list with state and Review. No unnecessary private addresses in every row.

#### A03. Farmer detail `/admin/farmers/:farmerId`

1. Stall name, state and registration summary.
2. Submitted business/contact/address information available to authorised administrator.
3. Public profile, associated markets and listing preview.
4. Decision panel: approve or suspend as permitted, optional required reason per policy, clear impact explanation.
5. Confirm action, then show authoritative result and timestamp/actor if supplied.
6. Existing orders impact: display backend-provided implications; never silently cancel orders or delete seller history.
7. Audit history only when supported.

No document verification workflow outside SRS scope. A stale decision conflict reloads state rather than overwriting another administrator's action.

#### A04. Customers `/admin/customers`

Search and state filter; table/list of authorised identity summary, joined date, active/inactive and detail link. Do not display passwords, password hashes or unrelated private conversation history. Activate/deactivate via explicit detail/confirmation. Counts and pagination reflect actual records.

#### A05. Customer detail `/admin/customers/:customerId`

Account summary, permitted contact fields, status and relevant operational history only if authorised. Activate/deactivate form with consequence, reason if required, confirm/cancel and actual response. Do not invent permanent delete or impersonation. Existing order handling remains contract-driven; show unresolved policy as dependency rather than guess.

#### A06. Markets `/admin/markets`

1. Heading and “Add market”.
2. Search/name/location and active/day filters.
3. Records show name, address, operating days/times, timezone, attendance context and edit action.
4. Optional compact map uses same provider adapter and accessible list.
5. Remove/disable workflow follows approved policy and reports dependent sessions/orders. Never delete referenced records simply to make the demo button work.

#### A07. Create/edit market `/admin/markets/new`, `/admin/markets/:marketId/edit`

Form sections:

1. Identity: market name and address.
2. Schedule: operating days, opening/closing times and explicit timezone.
3. Location: latitude/longitude and map picker/manual fallback; provider/link only if approved.
4. Published description/instructions if supported.
5. Active state if supported, with consequence of changes.
6. Preview of public market entry, Save and Cancel.

Validate coordinate ranges, schedule relationships and required fields. Safe parsing of approved embed links, never arbitrary iframe HTML from an admin text field. Handle existing reservations when schedule/location changes. Mobile groups schedule fields vertically.

#### A08. Moderation `/admin/moderation`

1. Listing/Review tabs, state/date filters and queue count.
2. Left queue and right content review on desktop; list-to-detail on mobile.
3. Show actual flagged/reviewable content, its public context and reason if supplied. Do not pretend an AI score is a factual policy violation.
4. Actions appropriate to approved policy: remove/hide inappropriate content, keep/no action if supported; require explicit confirmation and reason when defined.
5. Preview consequence: visibility changes, preserved order snapshots and no silent inventory mutation.
6. Completed action updates queue and public fixture/live visibility consistently.

Never render untrusted review/product HTML unsanitised. Copilot may summarise content but cannot auto-remove it. No unsupported appeals system invented as a live feature.

#### A09. Reports `/admin/reports`

1. Period, market and relevant scope controls.
2. Total orders, order value across markets and active farmers with exact definitions.
3. Main chart by day/week and market comparison table.
4. Most active farmers ranking with criterion stated, such as completed orders or total valid orders per contract.
5. Underlying aggregate table and data-freshness time where provided.
6. Optional export only if implemented and authorised; user-initiated safe CSV/PDF, no automatic downloads. Protect CSV formula injection when exporting untrusted text.
7. Market Intelligence “Explain this chart” and “What changed?” use computed data only.

Do not sum different currencies as a single amount. Exclude/include cancelled orders according to approved definition, not whichever produces a nicer number. No artificial positive trend arrows when there is no comparison dataset.

#### A10. Categories `/admin/categories`

1. Search and category list: name, description if supported, active/visibility state and usage count when available.
2. Add/edit form in accessible dialog or side panel: name and allowed optional fields.
3. Validation for duplicate names according to policy.
4. Delete/deactivate confirmation explains referenced products. Block or use approved reassignment/archival policy; no dangling category references.
5. Updates propagate to discovery/product forms through central state.

Do not create a giant arbitrary configuration console; master data scope is only what the approved contract supports.

#### A11. Announcements `/admin/announcements`

1. Existing announcements grouped by published/draft if draft persistence exists; otherwise clearly local drafts.
2. Composer: title, body, audience/scope and dates only when supported. Basic platform-wide announcement is required; don't silently add unsupported scheduling or email campaigns.
3. Preview as it will appear to users, with exact audience.
4. Save draft (local or server explicitly identified), Publish confirmation and pending/error/result state.
5. Copilot “Draft an announcement” generates editable proposed wording; never invent closure/weather/stock facts and never auto-publish.
6. Edit/remove existing announcement only as contract permits; preserve audit information if supplied.

No “Sent to all customers” unless the backend confirms delivery semantics. Publishing an in-app announcement does not mean every person received an email.

#### A12. Notifications `/admin/notifications`

Shared inbox with actual farmer submissions, moderation events and system notices defined by contract. Scope and permission checks remain server-owned. Read state and count update consistently. Never surface secret configuration, raw stack traces or private AI prompts as notices.

### 12. MarketLink Copilot — complete interaction specification

#### 12.1 One assistant, three contexts

Brand: **MarketLink Copilot**.

- Customer face: **Market Companion**.
- Farmer face: **Farm Copilot**.
- Administrator face: **Market Intelligence**.

Use one predictable assistant button in each relevant workspace topbar plus occasional meaningful inline prompts at decision points. Do not place a floating bot over every screen or open it automatically. Public discovery may expose a low-key “Ask about this market” entry only when public capabilities are actually supported.

Desktop: right drawer 400–440 px wide, full workspace height below fixed chrome or a clearly modal full-height panel. For wide screens it may sit alongside content; for smaller screens use an overlay. Mobile: full-height accessible sheet/page with close/back, safe-area padding and composer above keyboard. Never cover checkout confirmation unexpectedly.

#### 12.2 Anatomy

1. Header: Copilot brand, role-specific subtitle, close button and explicit demo/live/unavailable state.
2. Context line: selected page, market/date or order, plus a way to clear optional context. Never show another user's identifiers.
3. First-use explanation: “Ask about the information available in this view. Review any proposed changes before applying them.” In fixture mode: “Scripted development preview — no live AI service.”
4. Two or three relevant starter prompts, not a wall of generic suggestions.
5. Conversation with user/assistant labels, readable text, source links and freshness for facts that change.
6. Bounded composer, Send/Stop if supported, pending state, retry and clear conversation.
7. Draft/action preview zone distinct from conversational prose.
8. Non-AI fallback links: open filters, view orders, edit stock or announcements.

Don't invent streaming if the backend only returns a complete answer. Use safe text/Markdown rendering without raw HTML, arbitrary script, external navigation execution or unsanitised links. No automatic private transcript persistence.

#### 12.3 Customer capabilities

- Find actual available products for selected market/day.
- Explain market timing and pickup windows from records.
- Explain the customer's own order status, cutoff and next step.
- Navigate to a valid product, market, order or filter using a validated internal allowlist.
- Suggest a basket from real eligible offers, showing seller groups, units, prices, available quantities and pickup implications.
- An “Add selected suggestions” action changes only a reviewed basket; it does not place orders. Checkout still revalidates and asks for confirmation.
- Ingredient guide links to actual available offers and does not make medical/nutritional claims.
- Do not answer with invented stock, availability, real farmers or prices when retrieval returns nothing.

Sample questions are illustrative queries, not prewritten assertions: “What tomatoes are available for my selected market day?”, “When can I collect this order?”, “Show my next pickup.”

#### 12.4 Farmer capabilities

- Summarise own pending orders and next-session prep quantities.
- Explain own low-stock state without pretending to forecast guaranteed demand.
- Draft a prep checklist, product description or reply.
- Prepare an exact stock-change preview using selected dated offer and protected reservations.
- Show current value, proposed value, affected records, stale/version state and Confirm/Cancel.
- After confirmation, use the same approved mutation path as the ordinary stock form; no separate AI-only business logic.
- Never publish stock, mark an order ready or post a review reply purely because the model suggested it.

Example: “Mark this offer unavailable” produces a draft and explains existing reservations. No write happens until explicit human confirmation and server revalidation.

#### 12.5 Administrator capabilities

- Summarise permission-scoped aggregate reports and period definitions.
- Explain computed week-over-week changes, including insufficient-data warnings.
- Summarise moderation context as assistance, not a verdict.
- Draft an announcement with exact audience and known facts.
- Never autonomously approve/suspend users, delete content or publish announcements.
- High-risk bulk actions remain unavailable unless separately designed and approved.

#### 12.6 Grounding, actions and failures

Every factual answer about records needs permitted references and an as-of time where freshness matters. An unknown answer says what data is missing. Server derives identity and role; client-supplied role is never authority.

Backend owns OpenAI key, model selection, retrieval, tool allowlist, permissions, costs, timeouts, retention and action drafts. Frontend never connects directly to OpenAI or embeds a provider key. Treat retrieved descriptions/reviews as data, not instructions to the agent.

Action sequence: ask → retrieve permitted records → propose typed draft → show preview → user confirms → server revalidates current permission/stock/time/version → mutate through normal service → show verified result. An expired draft requires refresh and renewed review. Double-click/retry must not duplicate mutation.

Required UI states: empty conversation, loading, answer, no relevant data, permission denial, unavailable service, rate limit with retry guidance if provided, network failure, cancelled request, invalid/untrusted response, draft ready, draft expired, confirmation pending, confirmed and conflict.

In development use deterministic scripted fixture responses clearly labelled. Unsupported questions should say the demo cannot answer them and offer real UI controls; do not generate confident nonsense. AI-off tests must leave all mandatory workflows usable.

### 13. Reusable component architecture

Build reusable primitives and domain components without turning every screen into the same template. Prefer composition over many boolean flags. Presentational components accept view models and callbacks, not endpoint URLs or raw response envelopes.

#### 13.1 Primitives

| Component | Required contract/behaviour |
|---|---|
| `Button` / `IconButton` | Primary, secondary, quiet, danger; default/hover/focus/pressed/disabled/pending; accessible name; no duplicate submits |
| `TextField`, `TextArea`, `SelectField` | Visible label, hint, required marker, error association, autocomplete/inputmode, disabled/read-only distinction |
| `Checkbox`, `RadioGroup`, `Switch` | Native keyboard behaviour, full label target, controlled state, no colour-only status |
| `QuantityField` | Unit/step/min/max, numeric entry, increment/decrement names, invalid state without silent coercion |
| `SearchField` | Search icon, clear action, Enter semantics, debounce where needed, cancellation of stale requests |
| `DateSelector`, `TimeWindowPicker` | Market timezone, unavailable slots, keyboard support, selected/disabled/conflict states |
| `Tabs` | Correct tab roles/keyboard pattern if true tabs, otherwise ordinary navigation links |
| `Dialog`, `Drawer`, `Popover` | Focus management, labelled title, Escape, background handling, return focus, mobile layout |
| `Toast` / `InlineNotice` | Polite/urgent announcement appropriately; never sole location of important form errors |
| `StatusLabel` | Human-facing label and accessible icon; mapped from approved data, unknown-state fallback |
| `EmptyState`, `ErrorState`, `Skeleton` | Contextual explanation, recovery action, no invented data, no gradients |
| `DataTable`, `Pagination` | Semantic headers, accessible sort state, row action names, responsive alternative |
| `ConfirmAction` | Exact target, consequence, explicit action wording, cancel, pending/error result |
| `RatingInput` | Native radio semantics, 1–5 labels, selected text, keyboard support |
| `ImageInput` | Allowed types/size, local preview, remove, progress, errors, no fake upload |

#### 13.2 Domain components

Build and reuse: `MarketContextBar`, `MarketResultRow`, `MarketMap`, `MarketMarker`, `FarmerSummary`, `ProductTile`, `OfferSelector`, `AvailabilityLabel`, `FavouriteButton`, `BasketFarmerGroup`, `PickupWindowSummary`, `OrderReceipt`, `OrderProgress`, `PickupPassport`, `MarketDayTimeline`, `WeeklyMarketBoard`, `StockLedger`, `StockImpactPreview`, `PrepWorklist`, `ActionQueue`, `MetricStrip`, `ReportChart`, `NotificationInbox`, `CopilotPanel`, `SourceReference`, `ActionDraftPreview` and role shell components.

Map, upload, chart and AI providers should be replaceable behind small adapters. Do not bind the whole UI to a map SDK or AI response shape.

#### 13.3 Frontend folder direction

Adapt to existing conventions; a suggested structure inside `Client/` is:

```text
src/
  app/                 routing, providers, role shells, error boundary
  components/ui/       accessible reusable primitives
  components/market/   shared domain UI
  features/public/
  features/auth/
  features/customer/
  features/farmer/
  features/admin/
  features/copilot/
  domain/              frontend view models, formatting, validated calculations
  data/                gateway interfaces and data-mode selection
  data/fixtures/       clearly fictional development records and mutation engine
  data/live/           approved DTO mapping and central API integration later
  lib/                 existing API transport, safe helpers
  styles/              tokens, base, layouts, component and feature styles
public/
  images/              licensed optimised images and original SVGs
tests/                 browser journeys and regression checks
```

Do not make one giant App.tsx with every role and every form. Use route-level lazy loading for noncritical role bundles. Keep meaningful domain operations testable outside React. Use strict TypeScript; avoid `any` and unchecked casts for untrusted responses. Add a schema validation library only when its benefit justifies it and dependencies are compatible.

### 14. Data modes and central API boundary

Use React, Vite and TypeScript. Inspect existing versions and scripts before installing. Existing preparation includes React, Vite, TypeScript, Lucide, Motion, GSAP, Vitest and Playwright. Do not blindly reinstall everything or introduce Next.js, a separate repository or backend. Tailwind is optional; token-based CSS is sufficient and already fits the foundations. No Three.js/R3F/Drei/Lenis unless a concrete owner-approved need appears.

Preserve/improve the existing central HTTP transport at `src/lib/api-client.ts` if present. It returns untrusted data that needs mapping/validation. Final endpoint paths, auth credentials, response envelopes, status codes, errors and enum values come only from the approved contract.

Create a frontend gateway/repository abstraction whose operations describe use cases, such as loading market discovery or reviewing a reservation. These local function names are not proposed server URLs. Pages depend on that abstraction and their view models. A fixture adapter and future approved live adapter satisfy the same UI-facing behaviour.

Do not scatter fetch calls throughout components. Do not copy DRAFT endpoint strings into production integration and call them final. Do not automatically fall back to fixture data after a live API failure.

Development fixture mode:

- Explicitly enabled and conspicuously labelled across all routes.
- Fictional `demo-*` identities and sample dates/currency/locations marked illustrative.
- Deterministic data, fixed controllable demo clock or documented relative-date strategy so cutoffs can be tested reproducibly.
- One shared fixture state for all roles; reservation updates, stock effects, reviews, moderation and notifications stay coherent.
- Stateful local operations for real frontend interaction tests, not success toasts without changes.
- Reset controls and selectable empty/error/conflict/AI-off scenarios in a development-only area.
- No real passwords, secrets or genuine customer PII persisted in local demo state.
- Schema-version any local storage; invalid/old storage recovers safely; disclose whether state survives refresh.
- Fixture quantities/prices never become hidden production defaults.

Production/live mode:

- Fails visibly when API configuration/approved adapter is absent. No silent “working” demo.
- Never ships a public role-switcher pretending to be access control.
- Never exposes secrets through `VITE_*`; all such values are public bundle configuration.
- Handles aborts, stale requests, auth expiry, safe errors and retry appropriately.
- Uses server-provided authority for stock, prices, totals, ownership, transitions and cutoffs.

An explicitly labelled demo build may be provided for review. Document the exact command/mode. It is not a production integration claim.

### 15. Frontend view-model requirements — not final JSON schemas

The UI needs the following concepts. Field descriptions below are semantic requirements for Antigravity, not invented wire contracts.

| Concept | Information the UI requires |
|---|---|
| Session/account | Stable identifier, authenticated role, permitted account state, safe display identity, permitted capabilities and approved expiry/error behaviour |
| Customer | Name/contact/address for owned profile, preferences, saved markets, account state; private data scoped |
| Farmer | Public stall identity/story/images, approval/visibility state, owned contact fields, operating schedule and dated participation |
| Market | Identity, name, address, valid coordinates, timezone, operating schedule, active state, public instructions |
| Market occurrence | Dated session, start/end, cancellation/closure status if supported, attending farmers and related offers |
| Product | Stable identity, farmer, category, name/description, media, controlled selling unit and visibility |
| Dated offer | Product + farmer + market occurrence, exact price/currency, total/reserved/available quantities, availability, version/freshness |
| Pickup window | Farmer/market/session association, start/end, timezone/cutoff, eligibility and capacity policy if supported |
| Basket | Selected offer identities, quantities, user-selected pickup context, current quote versus stale state; storage/grouping policy |
| Order | Owned identity/reference, historical line snapshots, farmer/market/window, lifecycle display mapping, actual totals/currency, cutoff, allowed actions, version/events |
| Review | Eligible order/target, rating/comment, safe author, time, publication/moderation state, optional own-farmer reply |
| Favourite | Product/farmer/market identity, subscription preference if supported, current visibility/availability |
| Notification | Recipient-scoped identity, type, safe text, time, read state and validated target |
| Category | Controlled identity/name, allowed description/order/state, referential constraints |
| Announcement | Identity, title/body, scope/audience, actual publication state/time, allowed editing actions |
| Report | Defined period/timezone, counts, order-value currency/definition, per-market/farmer aggregates, comparison basis, freshness |
| AI answer | Safe answer, permitted references/freshness, validated UI suggestions, optional typed draft and actual service state |
| AI draft | Exact proposed change, current/proposed values, affected entities, expiry/version, confirmation requirements and result |

Money requires an approved exact representation and currency. Dates require UTC instants plus explicit market timezone/date keys. Quantity requires approved units and integer/fixed-scale rules. Do not assume every item is kilograms or every country uses the same currency. Historical orders preserve snapshots when products/prices change. Unknown values must remain unknown, not `0` or fake defaults.

### 16. Required backend handoff from Antigravity

Proceed with isolated frontend fixtures while waiting. Before live integration, obtain owner-approved contract version and examples covering all of the following:

1. API base/origin, proxy or CORS strategy, allowed environment variables, health/readiness behaviour.
2. Login/register/logout/session strategy, cookie/token handling, CSRF requirements where applicable, expiry and role/account-state rules; no guessed localStorage auth.
3. Public vs protected fields for customers, farmers and administrators.
4. Market/day discovery, attendance and accurate map/stall coordinates; geospatial search semantics and pagination/sort/filter rules.
5. Product identity versus dated stock offers, units, fractional quantities, currency and money representation.
6. Pickup windows, capacity, cutoff timing, timezone/DST rules and closed/cancelled session handling.
7. Basket storage/grouping, one seller per order or sub-order model, multi-group atomicity/partial failures and idempotency.
8. Reservation create/quote/revalidation, stock/price conflict examples and immutable order snapshots.
9. Exact lifecycle enum mapping, permitted transitions, decline reasons, completion actor, cutoff eligibility, modification differences and one-time stock release.
10. Farmer product/media management, image storage/upload safety, reserved-stock impact, templates and publishing semantics.
11. Favourites, preferred markets, restock subscription/delivery semantics and notification read state.
12. Completed-order review eligibility, duplicate/edit rules, farmer replies and moderation visibility.
13. Admin farmer/customer list/detail/actions, market CRUD, referenced-record delete policy, categories, moderation and announcements.
14. Report definitions: what counts as an order, which states contribute to order value, active farmer definition, currency handling and period comparisons.
15. AI availability, bounded request context, safe answer/reference/action schemas, confirmation/expiry/version/idempotency rules and permission matrices.
16. Standard validation/field errors, forbidden/not-found behaviour, conflicts, rate limits and safe unexpected errors.
17. Reproducible dedicated demo accounts/records, expected request/response examples and live integration test scenarios.

Do not ask Antigravity to change Server through your tools or quietly edit shared documents. Propose any missing behaviour to the owner with the affected frontend journey. Preserve adapter boundaries so approved DTO mappings can change without rewriting visual components.

### 17. Fixture scenarios and integrity rules

Use a small consistent fictional dataset: at least three markets, several dated sessions, at least four farmer profiles including pending/suspended scenarios, two active seller groups, products in several categories/units, available/sold-out/unavailable offers, multiple pickup windows, customer/admin demos and orders across supported demonstration states.

No fixture name, photo, price, location, stock count or order status may be presented as a real production response. Put illustrative currency/date/location in fixture metadata, not hardcoded throughout UI. Include enough records to exercise pagination, empty filters and mobile long text.

Fixture engine should demonstrate these frontend invariants without claiming real database concurrency/security:

- Selected offer belongs to selected seller/market/date/window.
- Quantity obeys configured unit rules and cannot exceed fixture availability.
- Create reservation updates reserved stock and emits a fixture confirmation.
- Cancel/decline releases quantity once; repeated action is idempotent or rejected cleanly.
- Modify rebalances the difference and preserves historical price according to explicit fixture policy.
- Stale price/stock/version yields a reviewable conflict, not silent acceptance.
- Cutoff uses the controllable clock; exact boundary behaviour is documented as fixture policy pending approval.
- Pending/suspended farmers cannot publish through fixture UI operations.
- Completed-order review eligibility is checked in the fixture domain operation.
- Removing/hiding content updates public fixture visibility without destroying old receipts.
- Templates do not reserve stock until applied/published to a dated offer.
- Personal prep/pickup checklists never alter authoritative order state.
- Demo role visibility is consistent but explicitly not security enforcement.

At least one empty market day, missing image, map failure, denied geolocation, unavailable AI, duplicate submit, stale quote, closed slot, late edit and zero-report scenario must be reviewable.

### 18. Accessibility, responsive behaviour and failure design

Target WCAG 2.2 AA fundamentals and test the actual UI; do not claim compliance without evidence.

- Semantic header/nav/main/footer, headings and skip link.
- Visible focus ring, sensible tab order, no hover-only action.
- Dialog focus trap or correctly implemented native modal, Escape/cancel and focus restoration.
- Keyboard-operable maps through an equivalent results list; map is never the only path.
- Normal text contrast at least 4.5:1; meaningful large text/UI graphics at least applicable 3:1.
- Fields have associated labels/hints/errors; do not rely on placeholder labels.
- Screen-reader announcements for result count, basket changes and mutation status without noisy repeated chatter.
- Reduced motion, 200% zoom/reflow checks, long names/translations, browser text sizing.
- Mobile keyboard does not cover primary action/errors; bottom bars include safe-area padding.
- Images have useful alt text or empty alt when decorative; icon buttons are named.
- Charts expose readable summaries/tables, not tooltip-only numbers.
- Dates/times/currency use locale-aware formatting and explicit market timezone where needed.
- Buttons and links reflect their actual semantic role; no clickable divs as primary controls.

Failure copy describes the issue and next action. Examples:

- No results: “No produce matches these filters. Try another market day or clear a filter.”
- Stock conflict: “The available quantity changed. Review the updated amount before reserving.”
- Cutoff: “This reservation can no longer be changed online. The cutoff for this pickup has passed.” Use actual policy/contact guidance, not invented exceptions.
- AI unavailable: “Copilot is unavailable right now. You can continue using the filters and order controls.”
- Map failure: “The map could not load. Market addresses and directions are still available below.”

Do not promise a retry succeeded when it did not. Preserve safe drafts after errors and avoid duplicate actions.

### 19. Performance and engineering quality

- Route-level lazy loading for farmer/admin/AI and heavy map libraries.
- Avoid importing all icons, a giant animation library or all chart modules into the public entry unnecessarily.
- Load critical hero image and fonts deliberately; lazy-load lower images with fixed aspect ratios.
- Debounce search as appropriate, cancel stale requests, don't create request waterfalls for independent data.
- Derive counts/totals from one source; do not store redundant inconsistent computed state.
- Use URL state for shareable discovery filters, local state for ephemeral controls and a clear repository/query layer for domain data.
- Keep unauthorised role data out of live browser responses, not merely hidden with CSS.
- Validate response data at the boundary; unknown lifecycle values get a safe display and restricted actions.
- Use an error boundary for recoverable application rendering failures, plus route-level error states.
- Clean up timers, listeners, object URLs and animation contexts. StrictMode must not double-create orders or notifications.
- No console logging of credentials, tokens, private profile data or full AI conversations.
- Keep dependencies minimal, inspect official instructions, use compatible maintained releases and retain lockfile.
- Never report green tests that were not run or claim real integration from a fixture adapter.

### 20. Implementation phases — keep working through them

This is an execution sequence, not a request to stop after producing a plan.

1. **Inspect and preserve:** branch/worktree, authorised paths, source documents, scripts, dependencies and current modifications. Establish concise requirements checklist.
2. **Foundation:** tokens/fonts/images, responsive shells, accessible primitives, routes, central data-mode boundary, deterministic fixture state and safe developer controls.
3. **Public/auth:** all public pages, discovery/map alternative, farmer/product detail, sign-in/registration/access states.
4. **Customer vertical slice:** basket by farmer, pickup selection, simulated reservation, orders/edit/cancel/history/reorder, Passport/Planner, favourites/reviews/notifications/profile.
5. **Farmer operations:** weekly planner, profile/markets, product forms, dated stock/templates, slots/cutoffs, orders/pickup queue, insights/reviews/notifications.
6. **Administration:** command centre, farmer/customer management, market forms, moderation, reports/categories/announcements/notifications.
7. **Copilot:** all three role surfaces, grounded fixture answers, safe navigation, editable drafts, explicit confirmation, failure/off states and non-AI parity.
8. **Polish and verification:** mobile composition, keyboard/focus, screenshots, empty/error/conflict states, tests, bundle/build, documentation and scoped Client commit/push.
9. **Live integration later:** only after contract approval and compatible backend availability. Replace adapters, run real request/response journeys and report actual integration evidence.

Prioritise all mandatory SRS workflows over optional features. Signature Planner, Basket by Farmer, Passport, weekly board, prep worklist and coherent Copilot should be implemented meaningfully. Later extras below are explicitly tracked instead of silently omitted or presented as mandatory.

### 21. Enhancement inventory and placement

| ID | Enhancement | Placement and completion boundary |
|---|---|---|
| E01 | Living Market Map | Discovery map/list sync and accessible fallback; fixture map labelled until real provider/data |
| E02 | Market Day Planner | Customer timeline from actual owned reservations |
| E03 | Basket by Farmer | Seller/session groups with approved persistence semantics later |
| E04 | Pickup Passport | Mobile order detail; no invented QR authentication |
| E05 | Market Pulse | Honest upcoming sessions/attendance/availability, no fake realtime counters |
| E06 | Farmer story | Profile/home editorial section with approved or labelled fictional content |
| E07 | Prep worklist | Farmer reserved quantities grouped by session/product/unit |
| E08 | Replenishment suggestions | Optional later read-only historical advice, not a forecast guarantee |
| E09 | Contextual empty states | Every role/page with useful recovery |
| E10 | Copilot command palette | Validated navigation/filter suggestions with normal UI equivalent |
| E11 | Smart Market Basket | Optional reviewed suggestions from eligible actual offers, no automatic order |
| E12 | Farmer Copilot | Own-record briefing, checklist and previewed actions |
| E13 | Admin intelligence | Aggregates, summaries and editable announcement drafts |
| E14 | Explain my order | Customer-owned record with actual status/cutoff |
| E15 | Seasonal discovery calendar | Only published future offers, no invented harvest calendar |
| E16 | Unit-price comparison | Only valid comparable units/currency; don't compare box to kg without conversion |
| E17 | Ingredient guide | Discovery assistance linked to actual offers; no health advice |
| E18 | Personal pickup checklist | Local personal state, never backend completion |
| E19 | Farmer pickup queue | Permitted time-sorted operational list |
| E20 | Stock impact preview | Protect reservations before changing dated offers |
| E21 | Market operator snapshot | Admin session/attendance/offer context, no footfall fiction |
| E22 | Explain this chart | Grounded interpretation of displayed calculated aggregates |
| E23 | What changed this week | Only computed comparable periods, insufficient-data handling |
| E24 | Help with form errors | Explain actual validation without submitting or exposing private records |

Optional SRS family account sharing remains deferred until explicitly scoped and all core work passes. Do not add social networks, subscriptions, delivery, payments, dynamic AI pricing or unrelated features to fill screens.

### 22. Required tests and acceptance evidence

Run relevant tests after meaningful changes, fix failures and continue. Use actual configured scripts, not assumed commands. Preserve useful existing HTTP transport tests.

#### 22.1 Unit/domain tests

- Money and quantity formatting/calculation with approved precision or documented fixture rules.
- Basket grouping by compatible seller/session and quantity changes/removal.
- Reservation stock changes, stale quote conflict and repeated-submit handling.
- Cancel/decline releases only once; edit rebalances correctly.
- Cutoff before/at/after boundary with controllable time.
- Template application does not become a global stock pool.
- Review eligibility and duplicate handling.
- Order snapshots remain unchanged when catalogue price/name changes.
- Personal checklist has no order-state side effect.
- Safe route/action allowlist and AI draft expiration/confirmation.
- Adapter response validation and error mapping as implemented.

These tests validate local frontend/fixture behaviour only; real concurrency, authentication and database atomicity must be tested against the backend later.

#### 22.2 Browser journeys

1. Public discovery: choose market/day, search/filter, open farmer/product, return with filters preserved.
2. Customer: demo sign-in, add two farmer groups, choose valid windows, review and create simulated reservation, inspect Passport/Planner.
3. Change/cancel before cutoff; late request and stale stock scenarios produce usable errors.
4. Farmer: demo sign-in, edit product, publish dated fixture stock, apply weekly template with preview, configure slot, accept/ready an order.
5. Customer sees same updated order and fixture notification; completion only via configured demo policy; eligible review works.
6. Reorder uses current availability and does not copy historical price as today's price.
7. Admin: review/approve farmer, account state action with confirmation, market/category forms, moderation, announcement preview/publish and report filters.
8. Copilot in every role: visible fixture disclosure, valid source/navigation, draft does not mutate before confirmation, AI unavailable leaves ordinary controls working.
9. Direct-link guards, unknown IDs, 404, session expiry and forbidden route states.
10. Favourites/restock preference/inbox read state and empty/error scenarios.

#### 22.3 Visual/responsive checks

Inspect actual screenshots, not just DOM existence, for home, discovery, product detail, basket/checkout, customer dashboard, farmer planner, admin command centre and Copilot at desktop and phone sizes.

Check widths 320, 390, 768, 1024 and 1440 px. Check keyboard-only navigation, dialogs, mobile drawer, reduced motion, long text, empty data and failed images. No clipped headings, covered actions, unreadable charts, overlapping sticky bars or whole-page overflow.

Use browser automation if available. Save review screenshots only inside authorised Client paths. Do not commit giant generated test artefacts unless deliberately required. Run build/typecheck and relevant tests; audit dependencies when installation changes justify it. Report exact command outcomes and untested limitations.

#### 22.4 Completion matrix

Track each mandatory requirement separately from enhancements and from integration state:

| Requirement | Frontend coverage required |
|---|---|
| C01 | Registration, login, customer access/profile |
| C02 | Product/farmer favourites, preferred markets, restock UI |
| C03 | Market/day discovery, attendance and farmer profile |
| C04 | Embedded map/directions plus accessible fallback |
| C05 | Product browse/search/filter/sort/detail |
| C06 | Basket, dated pickup reservation, pay-at-pickup |
| C07 | Status, view/edit/cancel with eligibility/conflicts |
| C08 | History/current-availability reorder and pickup details |
| C09 | Eligible farmer/product ratings and reviews |
| F01 | Farmer registration and approval/access states |
| F02 | Profile, markets/days, pin/location, slots |
| F03 | Product CRUD/images, dated stock, recurring template, availability |
| F04 | Incoming orders, accept/decline/ready, cutoffs/pickup queue |
| F05 | History/total/pending/order-value insights and best sellers; reply optional |
| A01 | Dedicated admin login/dashboard/counts |
| A02 | Farmer approval/suspension and customer activation/deactivation |
| A03 | Market add/edit/remove with schedule/location |
| A04 | Listing/review moderation |
| A05 | Platform orders/order-value/active-farmer reports |
| A06 | Category/master data and announcements |
| X01 | Role navigation, responsive/accessibility, search/filter/sort |
| X02 | Notification UI, About, Contact with Google Maps |
| N01 | Performance, safe interaction, browser compatibility and recoverable failure states |
| O01 | Optional SRS AI enhanced into three-role Copilot, clearly graded fixture/live |
| O02 | Optional family sharing deferred unless expressly implemented |

“Frontend implemented”, “fixture-tested”, “live integrated” and “full-stack verified” are different labels. A feature is not fully complete because its screen renders.

### 23. Documentation and Git finish

Keep concise implementation notes in `Documentation/Frontend/`: architecture/data modes, design tokens, dependencies/assets/licences, route coverage, test results and backend blockers. Do not rewrite shared master documents or generate the student's final competition report. Update stale preparation notes where needed within authorised files so they do not claim the SRS is still absent or Figma is currently mandatory.

Before a frontend commit:

1. Verify active branch is `Client` and remote is the intended repository.
2. Review all changed files and preserve unrelated modifications.
3. Confirm all staged paths are `Client/` or `Documentation/Frontend/`.
4. Confirm no credential files, `.env` secrets, backend files, generated bundles, node_modules or unrelated assets are staged.
5. Run applicable typecheck/build/tests and record results truthfully.
6. Commit a clear description of the implemented scope.
7. Push only to `origin/Client` if authorised by the owner and safe; never force-push or touch main/Server.

If this prompt is being used in a different environment without repository access, create the frontend only in the user-designated authorised app folder and report that Git verification/push is unavailable. Do not initialise an unrelated repository and pretend it is the shared project.

### 24. Final report required from the coding agent

When finished, give a concise, factual report with:

1. Completed public, auth, customer, farmer and administrator pages.
2. Working frontend interactions and signature experiences.
3. Copilot functionality and whether it is scripted fixture or real server AI.
4. Tests/build actually run, results and screenshot review coverage.
5. Exactly which features use fixtures and which, if any, were tested against the real backend.
6. Remaining functionality, missing content and unresolved approved-contract dependencies.
7. Changed authorised file areas, Client commit SHA and push outcome.
8. Confirmation that Server/main were not modified and no secrets were committed, supported by actual review.

Do not claim live authentication, persisted reservations, delivered notifications, real-time stock, map accuracy or AI integration based solely on frontend fixtures. Do not say “everything is complete” if required pages are placeholders or integration is unavailable. Do not claim this prompt alone guarantees identical visual output; actual browser verification is essential.

Now inspect the existing frontend, then implement this MarketLink experience with care and continuity. Build the pages and interactions, test and fix them, and keep the frontend ready for the owner-approved backend contract.

## END OF THE PROMPT
