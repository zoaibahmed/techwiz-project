# Milestone A review — 25 September 2026

Implemented on the existing Client application, preserving the newer API, authentication and Copilot modules.

- Discovery-first homepage with location/day controls, synchronized market list and schematic map, grower selection, dated produce, quantities, favourites and basket feedback.
- Comprehensive searchable ISO country registry. Public catalogue records are scoped by country/city; unsupported locations show an explicit empty state, including direct catalogue links. No implicit Pakistan selection after dismissing onboarding.
- Visitor choices persist; market-day changes survive reload. Modal supports Escape, keyboard focus containment, focus restoration and reduced motion.
- English/Urdu homepage content and RTL layouts. Urdu remains a **preview**, not a claim of complete application translation. Navigation/map/account coverage is disclosed in onboarding; existing untranslated pages show a fallback notice.
- Removed inherited homepage claims of certification, fixed weather, guaranteed collection, automatic noon release and universal Friday cutoffs. Editorial photographs are not presented as actual participating growers.
- Fictional market IDs use the explicitly labelled schematic map. Existing geographic adapter is preserved for actual records; fabricated fixture coordinate fallbacks are excluded from the geographic renderer.
- Country selection does not change product currency or selling units. Formatters use market currency/timezone; date-only labels do not shift calendar days across timezones.

## Verification

Production build passes, with the existing large main-chunk warning. 22 unit tests pass. Six focused Playwright tests pass for onboarding, country isolation, Urdu persistence/RTL, dated availability, connected basket interactions, motion and 320/390/1440 layouts. API requests are intercepted in these tests; none prove backend integration.

The complete `npm run check` was run and is **not green**. Broader existing route/workflow tests need reconciliation with the newer authentication/Copilot changes; observed failures include obsolete Copilot controls, workflow labels, public directory selectors and product detail overflow at 390px. One homepage locator collision found during that run was fixed and its test now passes. Do not describe this milestone as whole-application QA completion.

Reproduce visual evidence with `node tests/capture-global-entrance.mjs` while Vite runs on 5173. Captures are under `Client/test-results/` (ignored), including desktop/mobile/Urdu/unsupported-country screens and an actual browser walkthrough. The recorder intercepts APIs to avoid modifying backend data.

## Review boundary

Stop for visual approval before milestone B. Real API reconciliation, complete translations, real market coverage and full workflow QA remain pending. No Server or shared-contract edits; no claim of verified backend integration.

Existing licensed editorial images and credits remain as documented in CREATIVE-RESET-REVIEW.md. Country registry source: https://github.com/michaelwittig/node-i18n-iso-countries.
