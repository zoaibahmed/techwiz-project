# Gather & Grow — project reference draft

> **Note:** For the exhaustive 28-chapter master website documentation, see [COMPLETE_WEBSITE_DOCUMENTATION.md](../COMPLETE_WEBSITE_DOCUMENTATION.md) and the formatted Word document [Gather-and-Grow-Complete-Website-Documentation.docx](./Gather-and-Grow-Complete-Website-Documentation.docx).

This is an AI-assisted technical reference based on the current implementation. It is not a claim of student-only authorship or a final competition submission. The project owner should check it against the official SRS, add their own observations and screenshots, and follow the competition documentation rules.

## Project purpose

Gather & Grow is the public name used by the MarketLink project. It helps customers find farmers, view produce and reserve food for collection at a market. Farmers manage their produce, stock and pickup arrangements. Administrators manage the participating markets and review platform activity.

There is no online payment gateway. Customers pay the farmer at pickup. Booked order value describes reservations and should not be presented as verified payment revenue.

## Who uses the application

Customers browse markets, growers and produce. They can add available produce to a basket, choose pickup windows, review a reservation and follow their orders. Their dashboard includes planning, favourites, messages, notifications, profile and support pages.

Farmers create an account and complete their application. Approval controls access to selling functions. The farmer workspace includes the weekly planner, products, dated stock, recurring templates, pickup windows, orders, pickup queue, market participation, profile, insights, reviews, messages and support.

Administrators review farmer applications and manage customers, markets, categories, moderation, announcements, reports and support. Administrative actions use server-side permissions.

## Main customer flow

1. Choose a location and browse the available markets and produce.
2. Open a product to check the farmer, selling unit, price and dated availability.
3. Add the required quantity to the basket.
4. Choose a pickup window for each farmer and review the reservation.
5. Confirm the reservation. Stock and pickup capacity must still be available on the server.
6. Follow the order through the customer workspace and collect it from the farmer.
7. Pay at pickup. Review eligibility depends on the order rules.

Market opening hours alone do not create a farmer's pickup slots. A farmer needs the relevant market participation, dated stock and available pickup windows. If no window appears at checkout, these records and the selected date must be checked.

## Farmer application and markets

A farm address identifies the farmer's own location. A market venue is a separate place where the farmer participates. Completing an address does not automatically enrol a farmer into every nearby market.

The application must be submitted before an administrator can review it. Rejected applications should show the reason so the farmer can correct their details and resubmit. Market participation is handled through the farmer's Markets page and the administrator's review tools.

## Announcements and support

Published announcements are available through the Market announcements button in the site or workspace header. The public homepage also has an announcement notice. Archived or unpublished records should not appear to ordinary visitors as active announcements.

Customers and farmers open support tickets from their dashboards. Each ticket has a reference, subject, status and conversation. Administrators reply through the support inbox and can close a resolved ticket. Closed tickets remain readable. The administrator also has a separate conversation-ID inspection feature for authorised review of customer–farmer chats.

The support screen separates the ticket list from the selected conversation. On mobile, opening a ticket switches to its thread and the back control returns to the list.

## Authentication

Registration uses email verification before creating an authenticated account. Password fields include visibility controls and a strength checklist. New passwords require at least twelve characters, uppercase and lowercase letters, a number and a symbol. The server also checks the password length limit used by its password hashing library.

Unknown email addresses receive an explicit not-registered message in login and password recovery. This is the owner's requested behaviour. The specifically authorised administrator account retains its existing password-only exception. This should be reviewed before a production deployment.

## AI assistants

Market Guide serves the public website. It explains shopping and pickup and can return published catalogue results. It does not manage accounts, approve farmers or perform dashboard actions. General guidance should not display an unrelated product list.

Dashboard Copilot has role-specific context. Its tools determine what it can read or propose. Consequential actions should show a preview and require confirmation. A drafted action is not a completed database change. AI credentials remain on the server. The normal website must remain usable when the AI service is unavailable.

## Technical organisation

The client uses React, TypeScript and Vite. Shared UI components, domain types and a central API transport support the frontend. Authentication uses server cookies and CSRF protection. The backend uses Express and MongoDB. OpenStreetMap-based map controls provide location selection without a paid Google Maps key.

Client source is in Client/src. Backend source is in Server/src. Frontend engineering notes are in Documentation/Frontend. Environment values belong in server configuration and must not be copied into frontend bundles, screenshots or submitted documentation.

## Local setup

Install dependencies in Client and Server using the package lock files. Configure the server environment using the existing setup notes. Start the backend from Server with npm run dev, then start the frontend from Client with npm run dev. Use the URL reported by Vite. The central client API path is /api/v1.

Email verification requires a working sender configuration. Setting a password alone is not evidence that messages are being delivered. Verify a real inbox separately before demonstrating registration.

## Verification and honest limitations

The frontend build checks TypeScript and creates a production bundle. Frontend unit tests and focused backend tests cover selected behaviour. Browser checks use isolated API fixtures to verify layouts and interactions without creating real user accounts or sending email.

Mocked browser checks do not prove real database integration, email delivery or successful AI actions. The complete Playwright command has previously been blocked by an already-running server on port 5173. The final test report should record the exact checks actually completed, along with unresolved failures.

## Material to add before submission

Add the official SRS requirement mapping, actual team details, selected screenshots, the tested environment, a real end-to-end reservation walkthrough and known limitations. Include only test results that you have reproduced. Check image licences and attribution. Replace this reference wording with your own understanding where the competition requires independent documentation.
