# Workflow review — 27 September 2026

Reviewed Antigravity's report against current source code. The report was not treated as evidence of passing tests.

## Corrected findings

- Product creation silently manufactured 50 available units at today's date. Removed; dated stock must use a farmer-entered quantity and approved venue.
- Category lookup silently selected the first category or a hardcoded identifier. Creation now requires an actual active category. Frontend no longer substitutes the first category.
- Farmer approval guard allowed some incomplete applications. Restored completed-and-submitted requirement and draft registration state.
- Frontend stock fallback could select an unrelated market. Removed. Inventory/template/pickup publishing now verifies active approved participation.
- OTP codes were returned to the browser and logged when email was absent. Removed. Email absence reports unavailability. Codes use crypto.randomInt; legacy password-only HTTP login no longer issues a session, and authentication attempts are rate-limited per server process.
- Contact controller claimed an auto-reply before mail completed. It now records the inquiry, attempts admin email and visitor acknowledgment, and reports the actual result. Email template values are escaped.
- Removed evaluator credential buttons, development OTP previews and public demo-location switch controls. Test fixtures and seed tools remain isolated development infrastructure; existing database records were not deleted or reclassified.

## Farmer venue journey

Farm address describes where the grower operates; it does not define customer pickup.

1. Administrator creates an active market venue and schedule.
2. New farmer completes onboarding and chooses a venue in their registered country/city.
3. Administrator reviews the submitted application. Its selected venues become usable when approved.
4. Approved farmer opens Markets to see approved venues, then publishes dated stock and pickup windows for those venues.
5. To join an additional local venue, farmer selects Request to join. Admin opens that farmer's details and reviews Market participation requests. Rejections require a reason and can be resubmitted.
6. Customers collect at the selected market/pickup window and pay physically at pickup.

Farm address/pin editing moved into Stall profile. City changes or unavailable venues require support; the application never invents venues.

Added API routes: GET/POST /api/v1/farmer/market-requests; GET /api/v1/admin/farmers/:id/market-requests; PATCH /api/v1/admin/farmers/:id/market-requests/:marketId. Requests are stored on the farmer profile, and approval atomically adds marketIds. Existing profile PATCH cannot directly change market membership.

## Verification and limits

Production build/typecheck and 22 frontend unit tests passed. The 23 focused server flow tests passed, including OTP response secrecy, delivery failure handling and replay rejection. Isolated MongoDB tests passed for application review/resubmission, support access, venue request approval/rejection/resubmission, wrong-city/duplicate protection, category validation, absence of invented stock and blocked unapproved pickups. Disposable test database removed afterward.

Browser checks passed for all three dashboard desktop/mobile layouts (fixture authentication), visible sticky reviews, access to all 26 published reviews, product review removal, venue request/admin decision UI and removed evaluator controls. Full npm run check reached E2E but stopped because its configured port 5173 was occupied; targeted browser scripts used 5174 instead.

Email delivery has not been end-to-end verified with a real inbox. Configure EMAIL_USER, EMAIL_APP_PASSWORD and EMAIL_FROM privately. No passwords or OTPs belong in browser code. Existing VisualCaptcha is a client-side interaction, not a server-enforced anti-bot security boundary. OTP storage and authentication throttling are in-process and need shared storage before multi-instance deployment. This review is not a complete production security audit.

Potential historical automatic 50-unit stock records were not silently deleted: genuine stock and reservations must be reconciled by their owner. Existing seed users/data were not deleted; rotate evaluation account passwords before deployment.

No commit or push: this checkout is on main, which the owner controls.


Owner-authorized exception: admin@marketlink.com now signs in with its existing password without email OTP, only when the stored account role is admin. Other accounts still require OTP. Session cookies remain HttpOnly; no password or session token is exposed in the login response body.
