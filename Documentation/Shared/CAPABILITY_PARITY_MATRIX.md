# MarketLink | Platform-Wide Capability Parity Matrix
## Dashboard UI & AI Copilot Unified Business Capability Audit

**Document Status:** Production Reference
**Scope:** Customer Market Companion, Farm Copilot, Admin Market Intelligence

---

### 1. Principle of Dual Operating Interfaces
Every legitimate action available to an authenticated user through their dashboard UI must have a corresponding safe capability in their role-specific AI Copilot. Both the dashboard UI control and the Copilot tool execute the **same authoritative backend business service** in `Server/src/services/`.

---

### 2. Capability Audit Matrix

| Role | Page / Area | UI Action | Backend Service | Copilot Capability ID | Read/Write | Confirmation Required? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer** | `/profile` | View Profile | `customer.service.js: getCustomerProfileService` | `customer.get_profile` | Read | No | **Implemented & Tested** |
| **Customer** | `/profile` | Update Preferences / Address | `customer.service.js: updateCustomerProfileService` | `customer.update_profile` | Write | Yes | **Implemented & Tested** |
| **Customer** | `/markets` | Find / Filter Markets | `market.service.js: listMarketsService` | `customer.get_markets` | Read | No | **Implemented & Tested** |
| **Customer** | `/growers` | Find Farmers & Stalls | `farmer.service.js: listFarmersPublicService` | `customer.get_farmers` | Read | No | **Implemented & Tested** |
| **Customer** | `/products` | Search Produce Catalogue | `product.service.js: listProductsPublicService` | `customer.get_products` | Read | No | **Implemented & Tested** |
| **Customer** | `/market/:id` | Check Dated Stock & Prices | `inventory.service.js: listStockOffersService` | `customer.search_dated_stock` | Read | No | **Implemented & Tested** |
| **Customer** | `/checkout` | View Pickup Time Windows | `inventory.service.js: listPickupWindowsService` | `customer.get_pickup_windows` | Read | No | **Implemented & Tested** |
| **Customer** | `/orders` | View Pre-orders & Statuses | `order.service.js: listCustomerOrdersService` | `customer.get_orders` | Read | No | **Implemented & Tested** |
| **Customer** | `/orders/:id` | View Order Breakdown & Stall | `order.service.js: getCustomerOrderByIdService` | `customer.get_order_details` | Read | No | **Implemented & Tested** |
| **Customer** | `/orders/:id` | Cancel Eligible Pre-order | `order.service.js: cancelCustomerOrderService` | `customer.cancel_order` | Write | Yes | **Implemented & Tested** |
| **Customer** | `/orders/:id` | Modify Item Quantities | `order.service.js: modifyCustomerOrderService` | `customer.modify_order` | Write | Yes | **Implemented & Tested** |
| **Customer** | `/orders/:id` | Reorder Previous Market Items | `order.service.js: reorderCustomerOrderService` | `customer.reorder` | Write | Yes | **Implemented & Tested** |
| **Customer** | `/favourites` | View Saved Farmers & Items | `favourite.service.js: listFavouritesService` | `customer.get_favourites` | Read | No | **Implemented & Tested** |
| **Customer** | Everywhere | Toggle Favourite Farmer/Item | `favourite.service.js: addFavouriteService / remove` | `customer.toggle_favourite` | Write | No | **Implemented & Tested** |
| **Customer** | `/alerts` | View Restock Subscriptions | `restockAlert.service.js: listRestockAlertsService` | `customer.get_restock_alerts` | Read | No | **Implemented & Tested** |
| **Customer** | `/products` | Subscribe to Restock Alert | `restockAlert.service.js: createRestockAlertService` | `customer.subscribe_restock_alert` | Write | No | **Implemented & Tested** |
| **Customer** | `/alerts` | Cancel Restock Subscription | `restockAlert.service.js: cancelRestockAlertService` | `customer.cancel_restock_alert` | Write | No | **Implemented & Tested** |
| **Customer** | Top Nav | View Notification Feed | `notification.service.js: listUserNotifications` | `customer.get_notifications` | Read | No | **Implemented & Tested** |
| **Customer** | Top Nav | Mark Notifications Read | `notification.service.js: markNotificationRead / markAll`| `customer.mark_notifications_read` | Write | No | **Implemented & Tested** |
| **Customer** | `/orders/:id` | Submit Farmer/Produce Review | `review.service.js: createReviewService` | `customer.submit_review` | Write | Yes | **Implemented & Tested** |
| **Customer** | `/basket` | Plan Stall Pickup Route | Domain Itinerary Selector | `customer.analyze_basket_itinerary` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/profile` | View Farm Stall & Approval | `farmer.service.js: getFarmerProfileService` | `farmer.get_profile` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/profile` | Update Stall Designation / Bio | `farmer.service.js: updateFarmerProfileService` | `farmer.update_profile` | Write | Yes | **Implemented & Tested** |
| **Farmer** | `/farmer/products`| List Master Produce Catalogue | `product.service.js: listFarmerProductsService` | `farmer.get_products` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/products`| Add New Produce (Single/Batch) | `product.service.js: createFarmerProductService` | `farmer.create_products` | Write | Yes | **Implemented & Tested** |
| **Farmer** | `/farmer/products`| Edit Price, Unit or Description | `product.service.js: updateFarmerProductService` | `farmer.update_product` | Write | Yes | **Implemented & Tested** |
| **Farmer** | `/farmer/products`| Archive / Discontinue Produce | `product.service.js: archiveFarmerProductService` | `farmer.archive_product` | Write | Yes | **Implemented & Tested** |
| **Farmer** | `/farmer/stock` | View Dated Stock Allocations | `inventory.service.js: listStockOffersService` | `farmer.get_inventory` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/stock` | Publish Dated Market Inventory | `inventory.service.js: createOrUpdateStockOfferService`| `farmer.publish_dated_stock` | Write | Yes | **Implemented & Tested** |
| **Farmer** | `/farmer/stock` | Mark Product Allocation Sold Out | `inventory.service.js: updateStockOfferStatusService` | `farmer.mark_sold_out` | Write | Yes | **Implemented & Tested** |
| **Farmer** | `/farmer/stock` | View Recurring Weekly Template | `inventory.service.js: getWeeklyTemplateService` | `farmer.get_weekly_template` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/stock` | Update Recurring Weekly Template | `inventory.service.js: updateWeeklyTemplateService` | `farmer.update_weekly_template` | Write | Yes | **Implemented & Tested** |
| **Farmer** | `/farmer/orders` | View Incoming Pre-orders | `order.service.js: listFarmerOrdersService` | `farmer.get_orders` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/orders` | View Order Packing Details | `order.service.js: getFarmerOrderByIdService` | `farmer.get_order_details` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/orders` | Progress Order (Accept/Ready/Done) | `order.service.js: updateFarmerOrderStatusService` | `farmer.update_order_status` | Write | Yes | **Implemented & Tested** |
| **Farmer** | `/farmer/orders` | View Aggregated Packing List | Domain Packing Calculator | `farmer.get_packing_workload` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/settings`| View Stall Pickup Windows | `inventory.service.js: listPickupWindowsService` | `farmer.get_pickup_windows` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/settings`| Create Stall Pickup Window | `inventory.service.js: createPickupWindowService` | `farmer.create_pickup_window` | Write | Yes | **Implemented & Tested** |
| **Farmer** | `/farmer/reviews` | View Customer Reviews & Ratings | `review.service.js: getFarmerReviewsService` | `farmer.get_reviews` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/reviews` | Reply to Customer Review | `review.service.js: replyToReviewService` | `farmer.reply_to_review` | Write | Yes | **Implemented & Tested** |
| **Farmer** | `/farmer/reports` | View Revenue & Sales Volume | `farmer.service.js: getFarmerReportsService` | `farmer.get_reports` | Read | No | **Implemented & Tested** |
| **Farmer** | `/farmer/stock` | Benchmark Prices vs Market | Domain Market Pricing Benchmark | `farmer.analyze_performance` | Read | No | **Implemented & Tested** |
| **Admin** | `/admin/farmers` | List Registered Farmers | `farmer.service.js: listFarmersAdminService` | `admin.get_farmers` | Read | No | **Implemented & Tested** |
| **Admin** | `/admin/farmers` | Inspect Application & Bio | `farmer.service.js: getFarmerDetailsAdminService` | `admin.get_farmer_details` | Read | No | **Implemented & Tested** |
| **Admin** | `/admin/farmers` | Approve / Reject / Suspend Farmer | `farmer.service.js: updateFarmerStatusAdminService` | `admin.change_farmer_status` | Write | Yes | **Implemented & Tested** |
| **Admin** | `/admin/markets` | View Active Farmers Markets | `market.service.js: listMarketsService` | `admin.get_markets` | Read | No | **Implemented & Tested** |
| **Admin** | `/admin/markets` | Create New Farmers Market | `market.service.js: createMarketService` | `admin.create_market` | Write | Yes | **Implemented & Tested** |
| **Admin** | `/admin/markets` | Update Market Schedule / Status | `market.service.js: updateMarketService` | `admin.update_market` | Write | Yes | **Implemented & Tested** |
| **Admin** | `/admin/products` | Audit All Listed Produce | `product.service.js: listProductsAdminService` | `admin.get_products` | Read | No | **Implemented & Tested** |
| **Admin** | `/admin/products` | Moderate / Hide Product | `product.service.js: moderateProductAdminService` | `admin.moderate_product` | Write | Yes | **Implemented & Tested** |
| **Admin** | `/admin/categories`| List Product Categories | `category.service.js: listCategoriesService` | `admin.get_categories` | Read | No | **Implemented & Tested** |
| **Admin** | `/admin/categories`| Create Product Category | `category.service.js: createCategoryService` | `admin.create_category` | Write | Yes | **Implemented & Tested** |
| **Admin** | `/admin/categories`| Update Product Category | `category.service.js: updateCategoryService` | `admin.update_category` | Write | Yes | **Implemented & Tested** |
| **Admin** | `/admin/reviews` | View Flagged Reviews Queue | `review.service.js: listAdminReviewsService` | `admin.get_reviews` | Read | No | **Implemented & Tested** |
| **Admin** | `/admin/reviews` | Moderate or Remove Review | `review.service.js: moderateReviewService / delete` | `admin.moderate_review` | Write | Yes | **Implemented & Tested** |
| **Admin** | `/admin` | Broadcast System Announcement | `announcement.service.js: createAnnouncementService` | `admin.publish_announcement` | Write | Yes | **Implemented & Tested** |
| **Admin** | `/admin` | Unpublish / Toggle Announcement | `announcement.service.js: updateAnnouncementStatusService` | `admin.update_announcement_status` | Write | Yes | **Implemented & Tested** |
| **Admin** | `/admin/inquiries`| List Public Support Inquiries | `inquiry.service.js: listInquiriesAdminService` | `admin.get_inquiries` | Read | No | **Implemented & Tested** |
| **Admin** | `/admin/inquiries`| Update Inquiry Resolution Status | `inquiry.service.js: updateInquiryStatusAdminService` | `admin.update_inquiry_status` | Write | Yes | **Implemented & Tested** |
| **Admin** | `/admin/reports` | View Platform GMV & Metrics | `analytics.service.js: getPlatformOverviewAnalyticsService` | `admin.get_analytics` | Read | No | **Implemented & Tested** |
