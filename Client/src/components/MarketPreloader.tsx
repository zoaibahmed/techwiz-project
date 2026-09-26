import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE } from "../motion/motion";

const SEEN_KEY = "gather-grow.preloaded";

function alreadyShown() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

const draw = (delay: number) => ({
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { pathLength: { duration: 0.9, delay, ease: EASE.riseCurve }, opacity: { duration: 0.01, delay } },
});

/**
 * First-visit opening: the brand mark draws itself (basket, then sprout), the
 * name rises, a harvest line sweeps, and the panel lifts to reveal the hero
 * once fonts and the hero photograph are ready. Shown once per session, never
 * blocks on a click, and is skipped for reduced motion.
 */
export function MarketPreloader() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(() => !alreadyShown());

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    const done = () => {
      if (!alive) return;
      setVisible(false);
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* storage unavailable */
      }
    };
    const hero = new Image();
    hero.src = "/images/market-arrival.jpg";
    const failSafe = window.setTimeout(done, 2600);
    Promise.allSettled([document.fonts.ready, hero.decode(), new Promise((r) => window.setTimeout(r, 1500))]).then(done);
    return () => {
      alive = false;
      clearTimeout(failSafe);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && !reduced && (
        <motion.div
          className="opening"
          role="status"
          aria-label="Gather & Grow is opening"
          onClick={() => setVisible(false)}
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          <svg className="opening-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <motion.path d="M9 25h30l-4 15H13L9 25Z" strokeWidth="2" strokeLinejoin="round" {...draw(0)} />
            <motion.path d="M20 29v7m8-7v7" strokeWidth="1.8" strokeLinecap="round" {...draw(0.35)} />
            <motion.path d="M16 25c0-10 16-10 16 0" strokeWidth="1.8" strokeLinecap="round" {...draw(0.45)} />
            <motion.path d="M24 18V7" strokeWidth="1.8" strokeLinecap="round" {...draw(0.6)} />
            <motion.path d="M24 14C13 14 13 5 13 5c10 0 11 9 11 9Z" strokeWidth="1.8" strokeLinejoin="round" {...draw(0.75)} />
            <motion.path d="M24 12C24 3 35 3 35 3c0 8-11 9-11 9Z" strokeWidth="1.8" strokeLinejoin="round" {...draw(0.85)} />
          </svg>
          <p className="opening-name">
            <motion.span initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 0.9, delay: 0.35, ease: EASE.riseCurve }}>
              Gather & Grow
            </motion.span>
          </p>
          <motion.i
            className="opening-line"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.1, delay: 0.55, ease: EASE.riseCurve }}
          />
          <motion.small initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.5 }}>
            Good food. A little closer.
          </motion.small>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
