# Living Market — first implemented visual milestone

Scope: redesigned public homepage, market discovery map, customer navigation shell and customer Market Day overview. Existing downstream routes, gateway, order actions and role workspaces are preserved. Farmer/admin visual transformations and broader page redesigns await the owner's direction approval.

The customer day selector derives market choices, available offers and pickup reservations from shared fixture state. Search filters produce; map and list selection stay synchronised; quick-add updates the existing basket; the Companion invitation opens the existing scripted assistant. Cutoff and approved-grower checks exclude offers that cannot be reserved in this fixture model. No production API endpoint, schema or state has been introduced.

The map is explicitly schematic, uses stable sample positions and is not pickup navigation. Photography illustrates the market experience; it is not evidence of a real farmer's participation. Booked value is calculated from sample orders and is not revenue. Physical payment at pickup remains explicit.

Motion: GSAP coordinates the homepage headline/photo/finder entrance, Motion responds to map selection and basket quantity changes, and CSS handles restrained image/zoom transitions. Reduced motion disables these transforms. Existing customer order, planner, review, favourites and account routes remain available.

Additional image: `Client/public/images/grower.jpg`, Heather Gill, [man holding beetroots during daytime](https://unsplash.com/photos/man-holding-beetroots-during-daytime-VJa9L3ZVBIc), published 3 March 2019, downloaded under the [Unsplash License](https://unsplash.com/license). Used as clearly labelled editorial imagery, not as a verified partner portrait.

Validation: TypeScript and production build; 19 unit tests and 11 browser tests, including existing multi-role checkout/order actions and 55 route scenarios at 1440/390/320 px. Added tests cover selected-day consistency, unavailable/cutoff offers, map/list selection, quick-add and Companion access. Standard production stays fail-closed; explicit demo mode exposes labelled fixtures. Neither mode makes an invented API request.

Review artefacts are generated under ignored `Client/test-results/living-{home,customer}-{desktop,mobile}.png`. This checkpoint is for visual approval; it is not a claim of completed backend integration or completion of all requested redesign phases. Existing outstanding functional limitations remain recorded in IMPLEMENTATION-STATUS.md.
