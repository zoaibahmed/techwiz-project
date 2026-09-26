/**
 * Gather & Grow motion language.
 *
 * Two signature gestures, used everywhere so the product is recognisable
 * through motion:
 *  1. "Rise"  — content is revealed upward from a mask, the way a crop breaks
 *     the soil (clip-path inset from the bottom, never a plain fade).
 *  2. "Harvest line" — a thin harvest-coloured line that draws to connect
 *     steps, routes and progress, explaining how things relate.
 *
 * Depth comes from three layers moving at different speeds (background slow,
 * copy medium, figures fast). Every motion must explain, guide attention,
 * increase immersion or improve usability.
 */
export const EASE = {
  /** Default for reveals: fast start, long settle. */
  rise: "expo.out",
  /** Scene changes tied to scroll. */
  scene: "none",
  /** CSS/Motion equivalent of expo.out. */
  riseCurve: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export const DURATION = {
  micro: 0.16,
  base: 0.3,
  reveal: 0.9,
  scene: 1.2,
};

/** Clip-path states for the "rise" reveal. */
export const RISE_FROM = "inset(100% 0% 0% 0%)";
export const RISE_TO = "inset(0% 0% 0% 0%)";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
