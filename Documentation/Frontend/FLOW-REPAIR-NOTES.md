# Application, locations and support changes

Implemented in the existing local checkout. No branch merge or push.

## Application lifecycle

Registration starts a draft. Each step is validated and saved under its canonical onboarding key. Legacy numeric step keys are readable. Location changes invalidate old venue choices. Submission requires identity, location, farm profile, an active market in the same country/city, and acceptance of the seller terms.

Only a completed submitted application can be approved. Approval updates both profile and onboarding states. Returning an application requires a reason, visible to the farmer, who can correct and resubmit. Pending farmers see their setup/planner and support access; selling routes remain unavailable. Profile edits after approval now use the actual profile API rather than a local success message.

The administrator reads every saved application step and map coordinates. Batch approval was removed. Decisions include a stale-record check.

## Maps

Leaflet uses real OpenStreetMap tiles, with attribution, for public discovery and farmer/admin location pickers. No paid Google key is required. Address search is an explicit user action through a cached, throttled server proxy; it is not autocomplete. It falls back to manual map pin selection when the geocoder is unavailable. Nominatim is rate-limited per server process; multiple production instances need a shared queue/cache or a separate provider. External map services require network access and do not guarantee availability.

A worldwide basemap is not a worldwide market directory. Only registered active venues in the selected country/city are offered. Unsupported cities show an empty state and link to support, never substituted Lahore venues.

Provider policies: https://operations.osmfoundation.org/policies/tiles/ and https://operations.osmfoundation.org/policies/nominatim/

## Support

Authenticated customer/farmer users create and reply to their own tickets. Administrators search exact SUP references, reply, and close resolved tickets. Closed tickets reject replies. Conversations persist in supportTickets; IDs are unique MongoDB ObjectIds with a SUP prefix for display. Creation is capped per owner and embedded message count is bounded.

Existing customer–farmer chat IDs are displayed in their inboxes. Administrator lookup is read-only, requires the admin role, and creates an audit record. Ticket IDs never grant access without ownership or admin authorization.

Routes use the existing central API transport and global CSRF middleware: /api/v1/support/tickets, /tickets/:id, /tickets/:id/messages, /tickets/:id/close, /api/v1/support/conversations/:id and /api/v1/locations/search.

## Verification boundaries

Frontend production build and 22 unit tests passed. The 21 focused server flow tests passed with a mocked database. Browser checks used intercepted API fixtures for application and support interactions, including mobile layout, while public desktop/mobile captures used the running public API. The backend was restarted successfully. Server/flow-integration.check.mjs also passed against a uniquely named isolated MongoDB database: draft, submission, rejection reason, resubmission, approval, ticket ownership, replies, closure, and audited chat lookup. The isolated database was removed afterward; existing application data was not modified. These service-level integration checks do not replace a complete authenticated browser-to-database release test.

Photography sources and licences are recorded in PHOTO-SOURCES.json. Seller-uploaded photos are preserved; stock imagery is illustrative.

