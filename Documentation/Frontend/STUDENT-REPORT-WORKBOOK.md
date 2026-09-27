# Student report workbook — author the final report yourself

This is a factual preparation checklist, not a ready-made competition submission. The official SRS prohibits using AI tools to fully produce ready-made documentation. Write your report in your own words using your own screenshots and observed results. No AI-detector outcome can be promised.

## Required report sections

- Problem definition: explain the local-market problem and who the customer, farmer and administrator are.
- Design specifications: describe the implemented screens, navigation and responsive behaviour with your own screenshots.
- Flowcharts, activity diagrams and data-flow diagrams: trace actual registration, discovery, reservation, pickup and review flows. Compare each transition with the running application.
- Database design: obtain the actual MongoDB collections and relationships from the implemented backend. Do not invent SQL tables. Ask the organiser how the generic SQL-script requirement applies to MongoDB.
- Test data and results: record inputs, expected results, actual results and dates. Distinguish automated tests from real backend and email delivery checks.
- Installation instructions: record Node requirements, dependency installation, environment variable names, backend/frontend start commands and actual ports. Never include real secrets.
- Judge credentials: the SRS requests accounts for all roles. Prepare disposable judge accounts separately; never publish production passwords.
- ReadMe.doc: write assumptions and startup instructions yourself. Include the required functional demonstration MP4 in the final package.

## Evidence to collect from this website

Public: homepage, markets and market detail, produce search/category filter and product detail, farmer directory/profile/reviews, help, contact, login and registration.
Customer: basket grouped by farmer, reservation/pickup journey, order history/details, favourites and profile.
Farmer: inventory, stock availability, orders, preparation/pickups and profile.
Administrator: approval/moderation and management screens. Capture only functionality you have actually exercised.
Copilot: document its actual configured state and unavailable/error behaviour; do not describe mock answers as live AI integration.

## Current implementation notes to verify in your own words

The produce category selector sits beside the result count and updates the existing filter state. Farmer profiles request approved public reviews from the backend and show loading/error/retry states. Contact enquiries now have a server SMTP handler and a visitor acknowledgement. Payment is physical at pickup; booked order value is not verified revenue.

Frontend production build and 22 unit tests passed during this change. The build still warns about a large main JavaScript chunk. Email service checks use a fake transport; live SMTP delivery is not yet verified. Visual browser verification is not recorded as completed for this change.
