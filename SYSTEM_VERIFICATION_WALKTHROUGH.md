# Gather & Grow (MarketLink) — Complete System Verification Walkthrough & Test Runbook

This runbook provides a complete, structured, step-by-step verification plan for the entire **Gather & Grow** web application. It guides you from the very beginning of the system to the final sign-off, detailing every dashboard, workflow, role transition, and edge case.

---

## Quick Reference: Test Credentials & Access URLs

Both servers should be running locally:
- **Client (Frontend):** `http://localhost:5173` (or `http://127.0.0.1:5173`)
- **Server (Backend API):** `http://localhost:5000` (or `http://127.0.0.1:5000`)

### Seed Accounts (Ready for Immediate Login)

| Role | Name & Location | Email | Password | Primary Dashboard |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Mehwish Raza (Central Ops) | `admin@marketlink.com` | Set privately for evaluation | `/admin` |
| **Administrator (Alt)** | System Administrator | `admin@gatherandgrow.internal` | Set privately for evaluation | `/admin` |
| **Grower / Farmer** | Tariq Mahmood (Greenfield Farm, Lahore) | `farmer.greenfield@marketlink.com` | Set privately for evaluation | `/farmer` |
| **Grower / Farmer** | Ayesha Siddiqui (The Kitchen Garden, Lahore) | `farmer.kitchengarden@marketlink.com` | Set privately for evaluation | `/farmer` |
| **Grower / Farmer** | Khurram Shahzad (Indus Valley Orchards, Karachi) | `farmer.indus@marketlink.com` | Set privately for evaluation | `/farmer` |
| **Grower / Farmer** | Oliver Bennett (Surrey Hills Organics, London) | `farmer.surrey@marketlink.com` | Set privately for evaluation | `/farmer` |
| **Customer / Shopper** | Sarah Ahmed (Lahore, PK) | `customer.sarah@marketlink.com` | Set privately for evaluation | `/customer` |
| **Customer / Shopper** | Bilal Khan (Lahore, PK) | `customer.bilal@marketlink.com` | Set privately for evaluation | `/customer` |
| **Customer / Shopper** | Arthur Pendelton (London, GB) | `customer.arthur@marketlink.com` | Set privately for evaluation | `/customer` |
| **Customer / Shopper** | David Cohen (New York, US) | `customer.david@marketlink.com` | Set privately for evaluation | `/customer` |

---

## Master Verification Sequence: Where to Start & Where to Stop

Follow these 7 sequential phases in order:

```
[Phase 1: Public Discovery & AI Assistant]
                 ↓
[Phase 2: User Registration & Onboarding]
                 ↓
[Phase 3: Customer Market Day Journey (Order Placement)]
                 ↓
[Phase 4: Grower Workbench & Order Fulfillment]
                 ↓
[Phase 5: Collection, Review & Messaging]
                 ↓
[Phase 6: Administrator Command Cockpit & Inquiries Desk]
                 ↓
[Phase 7: Final System Sign-Off (Stop Here)]
```

---

## Phase 1: Public Experience, Discovery & AI Assistant (Start Here)

**Goal:** Verify that visitors without an account can smoothly discover markets, browse produce, filter by country/city/day, interact with the AI Chatbot, and submit contact messages.

### Step 1.1: Home Page & Dynamic Location/Day Filtering
1. Open your browser and navigate to `http://localhost:5173/`.
2. **Observe:** The Hero section displays with clean typography, compact vertical spacing, and solid background styling (zero gradients).
3. **Test Location Selector:** In the top header or hero filter bar:
   - Change Country to **Pakistan** $\rightarrow$ City **Lahore**.
   - Notice that the markets shown update automatically to Lahore venues (e.g., *The Orchard Market*, *Liberty Green Market*).
   - Change Country to **United Kingdom** $\rightarrow$ City **London** $\rightarrow$ Observe London venues (e.g., *Borough Saturday Market*, *Marylebone Farmers Market*).
4. **Test Day Filter:**
   - Select **Saturday** $\rightarrow$ Notice only Saturday markets and growers scheduled for Saturday appear.
   - Select **Sunday** $\rightarrow$ Notice only Sunday markets appear.
   - Reset to **Any Day** $\rightarrow$ All venues in that city re-appear.

### Step 1.2: Markets & Venues Discovery
1. Navigate to `/markets` in the top navigation.
2. Filter by city or search for a venue (e.g. `Liberty`).
3. Click on **The Orchard Market** to open `/markets/the-orchard-market`.
4. **Verify:**
   - Interactive venue map displays exact pin location.
   - Market hours, day of the week, and locality are accurate.
   - Stall list shows participating growers (e.g. *Greenfield Farm*, *The Kitchen Garden*).
   - Listed produce shows seasonal badges and current pricing in local currency (e.g. PKR).

### Step 1.3: Produce Catalogue & Produce Page Dropdowns
1. Navigate to `/produce`.
2. **Test Category Dropdown:**
   - Open the category filter dropdown and select **Fresh Vegetables** $\rightarrow$ Only vegetables display.
   - Select **Orchard Fruits** $\rightarrow$ Only tree fruit and berries display.
   - Select **Pantry & Honey** $\rightarrow$ Only honey, oils, and provisions display.
3. Click on any product (e.g. *Desi Tomatoes*) to open `/products/:productId`.
4. **Verify:**
   - Product title, grower stall name, price per unit (e.g. `PKR 180 / kg`), and next market date.
   - "Reserve for Market Day" button is visible.

### Step 1.4: AI Public Guide Chatbot (Floating Widget)
1. On any public page, look at the bottom-right corner and click the **Public Guide** chat bubble.
2. **Test Question 1 (Cheapest Product):**
   - Type: `Show me the cheapest tomatoes`
   - **Verify:** The chatbot responds with the lowest-priced tomato listing, price per kg, grower name, and next market date, with clean clickable links.
3. **Test Question 2 (Market Schedule):**
   - Type: `When is the market open in Model Town Lahore?`
   - **Verify:** The chatbot provides the exact Saturday 08:00–13:00 hours for The Orchard Market.
4. **Test Question 3 (Contact Inquiry via Chatbot):**
   - Type: `I want to send a message to admin`
   - **Observe:** The chatbot explains that to send your message it needs your **Name**, **Email**, **Subject**, and **Message**.
   - Now type:
     ```
     Name: Ali Raza
     Email: ali.raza.test@example.com
     Subject: Stall inquiry for winter season
     Message: Hello Gather & Grow team, we have an organic citrus orchard in Sargodha and would like to reserve a stall for winter markets.
     ```
   - **Verify:**
     - The chatbot acknowledges receipt with a green confirmation card:
       `✅ Your message has been successfully sent to the admin team!`
     - Provides a Reference ID (e.g., `#INQ-...`).
     - Confirms that an email was dispatched to the admin inbox and an auto-reply was sent to `ali.raza.test@example.com`.
     - *Note: We will inspect this message in Phase 6 in the Admin Inquiries Desk!*

### Step 1.5: Public Contact Page
1. Navigate to `/contact`.
2. Fill out the contact form:
   - Name: `Zohaib Ahmed`
   - Email: `zohaibshakil.ahmed@gmail.com`
   - Phone: `+923001234567`
   - Subject: `Corporate bulk harvest query`
   - Message: `We are interested in sourcing weekly fresh produce boxes for our corporate office in Lahore.`
3. Click **Send Message**.
4. **Verify:** Success alert appears confirming receipt.

---

## Phase 2: User Authentication & Onboarding

**Goal:** Verify registration and secure login for both Customers and Growers.

### Step 2.1: Customer Registration & OTP Login
1. Navigate to `/register/customer`.
2. Register a new customer test account:
   - Name: `Test Shopper`
   - Email: `test.shopper@example.com`
   - Password: `Password123!`
   - Phone: `+923210001122`
   - City: `Lahore`, Address: `DHA Phase 5, Lahore`
3. Click **Create customer account**.
4. Log out using the avatar menu $\rightarrow$ **Sign out**.
5. Navigate to `/login`. Enter `test.shopper@example.com` and `Password123!`.
6. Verify login succeeds and redirects to the Customer dashboard (`/customer`).
7. Sign out again.

### Step 2.2: Farmer Onboarding Application Workflow
1. Navigate to `/register/farmer`.
2. Register a new farmstead account:
   - Name: `Fahad Khan`
   - Email: `fahad.orchards@example.com`
   - Password: `Farmer123!`
3. After registration, the system guides you to the **Grower Onboarding Wizard**:
   - **Step 1 (Identity):** Farm Name: `Fahad Citrus Orchards`, Contact Person: `Fahad Khan`, Phone: `+923009988776`. Click *Save and continue*.
   - **Step 2 (Location):** Country: `Pakistan`, City: `Lahore`, Farm Address: `Canal Road, Bhalwal / Lahore`. Click *Save and continue*.
   - **Step 3 (Profile & Story):** Bio: `Kinnow and citrus specialist. 20 acres of drip-irrigated heritage groves.` Click *Save and continue*.
   - **Step 4 (Venue):** Select `The Orchard Market` (Lahore). Stall preferred: `C-12`.
4. Click **Submit application for review**.
5. **Verify:** The farmer sees the status card: `Application Pending Admin Review`. Listing products is disabled until admin approval. Sign out.

---

## Phase 3: Customer Market Day Journey (Order Placement)

**Goal:** Test the complete customer experience from browsing, building a basket, selecting pickup windows, and placing a reservation.

1. Navigate to `/login`.
2. Log in as an existing customer:
   - Email: `customer.sarah@marketlink.com`
   - Password: `Customer123!`
3. You are redirected to `/customer` (Customer Hub).

### Step 3.1: Customer Dashboard Check
- Verify upcoming market day banner shows the next date (e.g. upcoming Saturday).
- Open orders count and account summary display accurately.

### Step 3.2: Build Basket & Reserve Produce
1. Go to `/produce` or `/markets/the-orchard-market`.
2. Find **Desi Tomatoes** (by *Greenfield Farm*) $\rightarrow$ Click `+ Add to basket` (quantity 2 kg).
3. Find **Field Strawberries** or **Raw Honey** (by *The Kitchen Garden* or *Indus Valley Orchards*) $\rightarrow$ Click `+ Add to basket`.
4. Click the **Basket** icon in the header $\rightarrow$ Navigate to `/basket`.
5. **Verify Basket Summary:**
   - Items grouped by stall/grower.
   - Unit prices and total in local currency (e.g. PKR).
   - Next market pickup date clearly stated.
6. Click **Proceed to checkout** (`/checkout`).

### Step 3.3: Checkout & Pickup Window Selection
1. On the checkout screen, review your customer collection details.
2. **Select Pickup Window:** Choose an available time slot (e.g., `09:00 – 10:00 AM`).
3. Add optional collection note: `Please pack firm tomatoes for salad.`
4. Click **Confirm Market Day Reservation**.
5. **Verify:**
   - Order confirmation screen displays with a unique **Order Number** (e.g. `#ORD-...`).
   - Notice confirms: *"No online card required — payment is made in cash or direct transfer at the grower's stall upon collection."*
   - Note down this Order Number for Phase 4!

### Step 3.4: Customer Orders & Tracking
1. Navigate to `/customer/orders`.
2. Click on the order you just placed.
3. **Verify:**
   - Current status badge is **Placed** (waiting for grower confirmation).
   - Item breakdown, pickup date, and selected time window appear clearly.
   - Customer has an option to cancel before the cutoff if needed.

### Step 3.5: Customer-to-Grower Messaging
1. Navigate to `/customer/messages`.
2. Select the conversation with **Greenfield Farm** (Tariq Mahmood).
3. Send a message: `Hi Tariq, will you also have fresh spinach bunches this Saturday?`
4. **Verify:** Message bubble appears as sent. Sign out.

---

## Phase 4: Grower / Farmer Workbench & Order Fulfillment

**Goal:** Test the grower workbench, stock management, pickup windows, and advancing orders through their lifecycle.

1. Navigate to `/login`.
2. Log in as the grower:
   - Email: `farmer.greenfield@marketlink.com`
   - Password: `Farmer123!`
3. You are redirected to `/farmer` (Grower Workbench).

### Step 4.1: Farmer Dashboard & KPI Check
- Verify Gross Booked Value, Units Sold, and Next Market Day collection metrics are live.
- Check the **Active Reservations** queue.

### Step 4.2: Order Fulfillment Lifecycle
1. Navigate to `/farmer/orders` in the sidebar.
2. Locate the reservation placed by Sarah Ahmed in Phase 3 (status: **Placed**).
3. Click to open the order details.
4. **Action 1 (Accept Reservation):**
   - Click **Accept Reservation**.
   - **Verify:** Status changes to **Accepted**.
5. **Action 2 (Pack & Mark Ready for Pickup):**
   - When preparing harvest morning stock, click **Mark Ready for Pickup**.
   - **Verify:** Status changes to **Ready for Pickup**.

### Step 4.3: Farmer Messages Inbox
1. Navigate to `/farmer/messages`.
2. Click the message thread from **Sarah Ahmed**.
3. **Observe:** The question Sarah sent in Phase 3 (*"will you also have fresh spinach bunches this Saturday?"*) is visible.
4. Reply: `Hello Sarah, yes! We harvested 30 bunches of baby spinach this morning. I will set two aside for your stall pickup.`
5. **Verify:** Message appears in thread.

### Step 4.4: Produce & Stock Management
1. Navigate to `/farmer/products`.
2. Verify existing listings: *Desi Tomatoes*, *Seasonal Spinach*, etc.
3. Click **Add Produce** (`/farmer/products/new`).
4. Fill in:
   - Product Name: `Organic Coriander & Mint Bunch`
   - Category: `Fresh Herbs`
   - Price: `80`
   - Unit: `bunch`
   - Available Stock: `25`
   - Description: `Freshly clipped aromatic coriander and mountain mint.`
5. Click **Save produce listing**.
6. **Verify:** The new product appears in the farmer's stall catalog with stock level 25.

### Step 4.5: Pickup Windows Management
1. Navigate to `/farmer/pickup-windows`.
2. **Verify:** Scheduled windows for Saturday (e.g. 08:00–09:00, 09:00–10:00, 10:00–11:00).
3. Check slot capacity and current reservation counts.

### Step 4.6: Stall Profile & Review Responses
1. Navigate to `/farmer/profile` $\rightarrow$ inspect stall bio, story, and specialties.
2. Navigate to `/farmer/reviews` $\rightarrow$ inspect customer reviews and check reply capability.
3. Sign out.

---

## Phase 5: Customer Collection & Review Lifecycle

**Goal:** Verify customer notification of order readiness, completion, and rating.

1. Navigate to `/login`.
2. Log in as Customer `customer.sarah@marketlink.com` / `Customer123!`.
3. Click **Notifications** (`/customer/notifications`).
4. **Verify:** Alerts for:
   - "Your reservation #ORD-... was accepted by Greenfield Farm"
   - "Your reservation is packed and ready for pickup at Stall A-14!"
5. Navigate to `/customer/messages` $\rightarrow$ verify the reply from Tariq Mahmood is displayed.
6. Navigate to `/customer/orders/:orderId`.
7. Once pickup is completed at the market stall, the order moves to **Completed**.
8. Click **Leave a Review** (`/customer/orders/:orderId/review`).
9. Select **5 Stars** $\rightarrow$ Text: `Outstanding heirloom tomatoes! Freshly picked and packed with care.` $\rightarrow$ Submit.
10. Sign out.

---

## Phase 6: Administrator Command Cockpit & Inquiries Desk

**Goal:** Test administrative oversight, application approvals, contact inquiries resolution, support desk, and platform analytics.

1. Navigate to `/admin/login` (or `/login`).
2. Log in as Administrator:
   - Email: `admin@marketlink.com`
   - Password: `Admin123!`
3. You are redirected to `/admin` (Command Centre).

### Step 6.1: Command Centre Overview & Needs Attention Strip
1. **Inspect Command Centre KPIs:**
   - Total Markets active across all countries.
   - Total Approved Growers.
   - Total Active Customers.
   - Next market day load summary.
2. **Inspect the "Needs attention" Strip:**
   - **Grower applications:** Shows pending application count (includes Fahad Citrus Orchards from Phase 2!).
   - **Contact inquiries:** Shows unresolved inquiries count (includes Ali Raza & Zohaib Ahmed from Phase 1!).
   - **Reviews to check:** Moderation queue count.

### Step 6.2: Grower Application Review & Approval
1. In the Attention Strip, click **submitted applications** (or sidebar $\rightarrow$ `/admin/farmers`).
2. In the list, click on **Fahad Citrus Orchards** (Fahad Khan) submitted in Phase 2.
3. Review the application:
   - Personal credentials and phone.
   - Farm location: `Canal Road, Bhalwal / Lahore`.
   - Farm story & bio.
   - Requested venue: `The Orchard Market`, Stall `C-12`.
4. Click **Approve Grower Application**.
5. **Verify:** Status changes to `Approved`. Fahad's farm is now authorized to sell produce on market days!

### Step 6.3: Website & Chatbot Inquiries Desk (`/admin/inquiries`)
1. Click **Website Inquiries** in the left sidebar (or `/admin/inquiries`).
2. **Inspect the Inquiries List:**
   - Look at the top filters: **All**, **New**, **In Progress**, **Resolved**.
   - Notice the inquiry from **Ali Raza** submitted through the AI Chatbot in Phase 1:
     - Badge: `NEW` (amber pill).
     - Subject: *Stall inquiry for winter season*.
     - Source: *Contact Form / AI Assistant*.
   - Notice the inquiry from **Zohaib Ahmed** submitted through the `/contact` form:
     - Subject: *Corporate bulk harvest query*.
3. **Select Ali Raza's Inquiry:**
   - The right inspector pane displays full sender info (Ali Raza, email, phone).
   - Read the message text.
   - Click **Mark as In Progress** $\rightarrow$ Badge updates to `IN PROGRESS` (indigo pill).
   - In the **Internal Staff Notes** box, write:
     `Called Ali. Informed him that citrus stalls open in November for The Orchard Market.`
   - Click **Save internal notes**.
   - Click **Mark as Resolved** $\rightarrow$ Badge updates to `RESOLVED` (green pill).
4. **Test Email Reply Action:**
   - Click **Open Email Reply** (or **Draft Response in Email App**).
   - **Verify:** Your operating system email client opens with `To: ali.raza.test@example.com` and `Subject: Re: Stall inquiry for winter season`.

### Step 6.4: Support Inbox & Registered User Tickets (`/admin/support`)
1. Click **Support inbox** in the left sidebar (or `/admin/support`).
2. Notice the top tabs:
   - `[Website & Chatbot Messages]`
   - `[Platform Support Tickets]`
   - `[Conversation Audit Desk]`
3. Click **Platform Support Tickets**.
4. Click any open ticket (e.g. ticket from a grower requesting a venue).
5. Type a reply in the chat bar $\rightarrow$ Click **Send reply**.
6. When resolved, click **Close resolved ticket** $\rightarrow$ Ticket archives as closed.

### Step 6.5: Customer-Grower Chat Audit Desk
1. On `/admin/support`, click the **Conversation Audit Desk** tab (or scroll down).
2. Enter a 24-character conversation ID (e.g. from the customer-farmer messaging test).
3. Click **Open conversation**.
4. **Verify:** Full message history renders in read-only audit mode with customer name and grower stall badges, logged in the admin audit trail.

### Step 6.6: Content Moderation (`/admin/moderation`)
1. Navigate to `/admin/moderation`.
2. Inspect flagged or pending customer reviews.
3. Review ratings, approving authentic reviews and moderating any abusive language.

### Step 6.7: Market Venues Manager (`/admin/markets`)
1. Navigate to `/admin/markets`.
2. View all 16 international markets (PK, GB, US, AE).
3. Click **Add Market** (`/admin/markets/new`) or edit an existing venue:
   - Adjust day of week, operating hours, locality.
   - Save venue changes.

### Step 6.8: Platform Analytics & Reports (`/admin/reports`)
1. Navigate to `/admin/reports`.
2. **Verify Metrics:**
   - Gross Booked Value across markets.
   - Fulfilment rate percentage.
   - Volume trends by market venue and product category.
   - Top performing farmsteads.
3. Switch time period (e.g. *This Month*, *Last 8 Weeks*).

---

## Phase 7: Where to Stop (System Complete & Verified)

You have reached the end of the full system walkthrough when:

- [x] **Public Visitor:** Filtered by country, city, and day; navigated markets & produce; interacted with the AI Public Guide; and submitted a contact inquiry.
- [x] **New User:** Created customer account and submitted a new grower onboarding application.
- [x] **Customer:** Added produce to basket, selected pickup window, completed checkout, tracked order status, and chatted with grower.
- [x] **Grower:** Reviewed active orders in Workbench, accepted order, packed & marked ready for collection, replenished stock, and replied to shopper chat.
- [x] **Collection & Review:** Customer received collection readiness notification, order completed, and left a 5-star review.
- [x] **Administrator:**
  - Evaluated platform KPIs in Command Centre.
  - Approved the pending grower onboarding application.
  - Managed website & chatbot inquiries in `/admin/inquiries` (status updates, internal notes, email reply).
  - Managed platform support tickets in `/admin/support`.
  - Audited customer-grower conversations.
  - Inspected moderation, market venues, and financial analytics.

Once all 7 phases above pass, the **Gather & Grow (MarketLink)** platform is 100% verified, operationally sound, and production-ready!
