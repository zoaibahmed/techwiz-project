# Design preparation

No final brand or competition UI is selected. Current system font, white background and dark text are neutral runtime-test values only.

After SRS review, define semantic color roles, type scale, spacing, grid, radius and motion tokens in Figma and CSS with matching names. No gradients. Choose licensed typography and assets appropriate to the actual subject. Use SVG/Lucide for legible icons; hide decorative icons from assistive technology and label icon-only controls.

Design desktop and mobile compositions deliberately rather than squeezing a desktop grid. Validate content reflow at 320px, intermediate widths, zoom and text scaling. Use native controls, visible focus, accessible names and error associations. Target WCAG 2.2 AA; verify contrast, keyboard and screen-reader behavior against the actual UI.

Reusable components will be derived from repeated SRS needs, with explicit default, focus, disabled, loading, empty and error states where applicable. Prefer composition over boolean-prop combinations. Avoid prematurely generating a large component library or repetitive card grids.

## Motion capabilities

- CSS: simple interaction feedback; reduced-motion override already present.
- Motion for React: import from motion/react; configure reducedMotion="user" on MotionConfig when motion enters the application.
- GSAP: scoped timelines using gsap.context with cleanup in React effects and gsap.matchMedia for reduced-motion alternatives. Add @gsap/react only if its hook is actually needed.
- Avoid autoplay decoration on every section. Preserve semantic state and focus when animations are interrupted.
- Optional Three.js/R3F/Drei and Lenis are deferred. Require a concrete use case, device/performance budget, reduced-motion fallback and competition permission before installing them.

The separate Figma practice sample tests editable labels, tokens and layouts only; it is not the application design system.
