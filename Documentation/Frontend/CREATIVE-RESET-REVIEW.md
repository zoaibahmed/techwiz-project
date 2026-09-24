# Creative reset — implemented review checkpoint

Scope is one homepage and one customer overview. Previous routes, backend boundaries and fixture lifecycle remain intact. This supersedes the first visual milestone's homepage and customer overview; it does not approve or propagate the design to farmer/admin workspaces.

## What to inspect

Run the existing Vite development server and open `/`. The arrival collage now leads into an interactive market explorer, attending-grower selector and a reservation workbench. Day, search, selected market, grower, product, availability and collection windows share the same fixture state. Selecting a market without approved growers honestly clears reservable offers. Sample adds use the existing stock-checked basket gateway.

Use Demo controls → customer, then My workspace. The customer overview prioritises active reservations, ready pickups, booked value, discovery, available offers, checklists, order history and notifications. The pickup queue supports All/Ready filtering. Public editorial banners are absent from this dashboard.

## Motion evidence and reproduction

`Client/test-results/marketlink-creative-reset.webm` is a short recording of the running React application at 1440×960, not a generated animation. Recreate it with `node tests/capture-creative-reset.mjs` while Vite runs on port 5173. Capture output is ignored by Git.

1. Reload `/`: headline settles, the arrival photo opens its crop, the vendor portrait and market-day ticket enter on staggered timing. Discovery remains clickable throughout.
2. Scroll normally toward the explorer: GSAP ScrollTrigger moves/scales the arrival composition and draws the connecting path. No scroll lock, snapping or pinned scroll region.
3. Switch Sat/Sun: the selected-day surface slides and the market summary changes with its records.
4. Select a map pin or market row: pin scale/colour and list selection agree; the summary transitions to the same market.
5. Select a grower/offer: available produce and pickup windows change together. Add to market bag: button confirmation, bag count and animated receipt give feedback. Review bag opens the existing basket workflow.
6. Enter the customer workspace: a short top-edge route indicator marks navigation. Customer navigation selection moves between sidebar destinations. Reduced-motion preferences remove these transforms and preserve functionality.

Browser tests verify changed scroll transforms, their removal under reduced motion, connected selections, add-to-basket, ready-queue filtering and checklist updates. Screenshots exist for desktop, 390px and 320px. Keyboard-labelled controls, semantic headings, native forms and reduced motion were checked; this is not a claim of a full screen-reader or formal WCAG audit.

## Asset use

- Arrival: `market-arrival.jpg`, [Veera Jayanth](https://unsplash.com/photos/man-selling-fruits-and-vegetables-e2IMdg9vUfA), Tamil Nadu, India. It establishes market activity, not an actual Lahore venue.
- Vendor portrait: `market-person.jpg`, [Ravi Sharma](https://unsplash.com/photos/young-man-selling-fresh-vegetables-at-a-market-stall-Ko7_-phDhbo), Delhi, India. Explicit editorial caption; not attached to a fictional seller's identity.
- Grower story: existing Heather Gill field-harvest photograph, explicitly editorial. Produce-detail photos remain product imagery. Pickup/collection uses real UI reservation records and Passport links rather than fabricated collection photography. The compact dashboard intentionally has no decorative editorial banner.
- Both new images are offered under the [Unsplash License](https://unsplash.com/license), with credit on the homepage. No claimed partnerships or certifications.

## Integration limitations

`src/components/MarketMap.tsx` is a frontend renderer boundary over existing UI models, not a proposed endpoint or API schema. Until a geographic adapter and approved coordinates exist, it displays an explicit temporary-map warning and the schematic renderer. The SRS real-map requirement remains outstanding. Approval of provider, geographic records/coordinates and accessible directions is still needed for real navigation.

`src/data/localization.ts` centralises Lahore/Pakistan, PKR, locale and Asia/Karachi presentation settings. Fixed fixture timestamps remain sample timestamps. Production configuration and API adapters require the owner's approved contract. Orders, stock, accounts and Copilot remain simulated; no MongoDB or OpenAI connection is claimed. Physical payment at pickup remains unchanged.

Validation: `npm run check` passes TypeScript, production build, 19 unit tests and 14 browser tests, including the 55-route 1440/390/320 regression sweep. Production and explicit demo build browser smoke checks pass without invented fetch/XHR calls. Existing functional gaps remain documented in IMPLEMENTATION-STATUS.md.
