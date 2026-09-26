import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePulse, ago } from "../../data/pulse";
import type { Pulse } from "../../data/pulse";
import { date, money } from "../../data/market";
import { EASE } from "../../motion/motion";

gsap.registerPlugin(ScrollTrigger);

/** Counts up from zero the first time it scrolls into view. */
function Count({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const format = (n: number) => `${n.toLocaleString("en-PK", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    el.textContent = format(value);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const state = { n: 0 };
      el.textContent = format(0);
      const tween = gsap.to(state, {
        n: value,
        duration: 1.6,
        ease: EASE.rise,
        paused: true,
        onUpdate: () => (el.textContent = format(state.n)),
      });
      const st = ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => tween.play() });
      return () => {
        st.kill();
        tween.kill();
        el.textContent = format(value);
      };
    });
    return () => media.revert();
  }, [value, decimals, suffix]);
  return <span ref={ref} className="pulse-count" />;
}

// Coordinate frame that holds every market city (lng 64–80, lat 23.5–35.5), with room for labels.
const FRAME = { minLng: 64, maxLng: 80, minLat: 23.5, maxLat: 35.5, w: 480, h: 400 };
const project = (lng: number, lat: number) => ({
  x: ((lng - FRAME.minLng) / (FRAME.maxLng - FRAME.minLng)) * FRAME.w,
  y: FRAME.h - ((lat - FRAME.minLat) / (FRAME.maxLat - FRAME.minLat)) * FRAME.h,
});

function NetworkMap({ pulse }: { pulse: Pulse }) {
  const cities = pulse.network.cities.filter((c) => c.coordinates);
  const maxValue = Math.max(1, ...cities.map((c) => c.bookedValueMinor));
  const points = cities.map((c) => ({ ...c, ...project(c.coordinates!.lng, c.coordinates!.lat), r: 7 + 15 * Math.sqrt(c.bookedValueMinor / maxValue) }));
  const hub = points.slice().sort((a, b) => b.markets - a.markets)[0];
  return (
    <svg className="pulse-map-svg" viewBox={`-20 -20 ${FRAME.w + 40} ${FRAME.h + 40}`} role="img" aria-label={`Markets in ${cities.map((c) => c.city).join(", ")}`}>
      <g className="pulse-graticule" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => FRAME.minLng + i * 2).map((lng) => {
          const { x } = project(lng, FRAME.minLat);
          return (
            <g key={`lng${lng}`}>
              <line x1={x} y1={0} x2={x} y2={FRAME.h} />
              <text x={x + 4} y={FRAME.h - 6}>{lng}°E</text>
            </g>
          );
        })}
        {Array.from({ length: 7 }, (_, i) => 24 + i * 2).map((lat) => {
          const { y } = project(FRAME.minLng, lat);
          return (
            <g key={`lat${lat}`}>
              <line x1={0} y1={y} x2={FRAME.w} y2={y} />
              <text x={4} y={y - 4}>{lat}°N</text>
            </g>
          );
        })}
      </g>
      {hub &&
        points
          .filter((p) => p !== hub)
          .map((p) => {
            const mx = (hub.x + p.x) / 2 - (p.y - hub.y) * 0.25;
            const my = (hub.y + p.y) / 2 + (p.x - hub.x) * 0.25;
            return <path key={p.city} className="pulse-arc" d={`M${hub.x},${hub.y} Q${mx},${my} ${p.x},${p.y}`} pathLength={1} />;
          })}
      {points.map((p) => (
        <g key={p.city} className="pulse-node" transform={`translate(${p.x},${p.y})`}>
          <circle className="pulse-node-halo" r={p.r + 10} />
          <circle className="pulse-node-core" r={p.r} />
          <text className="pulse-node-city" x={p.r + 14} y={-4}>{p.city}</text>
          <text className="pulse-node-meta" x={p.r + 14} y={14}>
            {p.markets} markets · {p.growers} growers
          </text>
        </g>
      ))}
    </svg>
  );
}

function ActivityFeed({ pulse }: { pulse: Pulse }) {
  const reduce = useReducedMotion();
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);
  const items = pulse.activity;
  useEffect(() => {
    if (reduce || paused || items.length <= 4) return;
    const id = setInterval(() => setStart((s) => (s + 1) % items.length), 3200);
    return () => clearInterval(id);
  }, [reduce, paused, items.length]);
  const visible = Array.from({ length: Math.min(4, items.length) }, (_, i) => items[(start + i) % items.length]);
  return (
    <div className="pulse-feed" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-live="off">
      <p className="pulse-feed-title">
        <i aria-hidden="true" /> Latest reservations
      </p>
      <ol>
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((a) => (
            <motion.li
              key={a.at + a.product}
              layout={!reduce}
              initial={reduce ? false : { clipPath: "inset(100% 0 0 0)", y: 18 }}
              animate={{ clipPath: "inset(0% 0 0 0)", y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -14 }}
              transition={{ duration: 0.6, ease: EASE.riseCurve }}
            >
              <strong>
                {a.quantity} {a.unit} {a.product}
              </strong>
              <span>
                {a.grower} · {a.market}, {a.city}
              </span>
              <time dateTime={a.at}>{ago(a.at)}</time>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}

/** "The network, this week": live platform intelligence right after the hero. */
export function MarketPulse() {
  const pulse = usePulse();
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!pulse) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 70%", once: true } });
        tl.from(".pulse-head h2 .rise-line > span", { yPercent: 110, duration: 1.1, stagger: 0.08, ease: EASE.rise })
          .from(".pulse-figure", { clipPath: "inset(100% 0 0 0)", y: 30, duration: 0.9, stagger: 0.07, ease: EASE.rise }, 0.2)
          .from(".pulse-arc", { strokeDashoffset: 1, duration: 1.4, stagger: 0.2, ease: "power2.inOut" }, 0.4)
          .from(".pulse-node", { scale: 0, transformOrigin: "center", duration: 0.7, stagger: 0.12, ease: "back.out(1.6)" }, 0.5);
      }, root);
      return () => ctx.revert();
    });
    requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });
    return () => media.revert();
  }, [pulse]);

  if (!pulse) return <section className="pulse pulse-loading" aria-busy="true" />;
  const { network, week, trust, highlights } = pulse;
  return (
    <section className="pulse" ref={root} aria-labelledby="pulse-title">
      <div className="pulse-inner">
        <header className="pulse-head">
          <span className="pulse-live">
            <i aria-hidden="true" /> Live across {network.cities.length} cities
          </span>
          <h2 id="pulse-title">
            <span className="rise-line"><span>The network,</span></span>
            <span className="rise-line"><span>this week.</span></span>
          </h2>
          <p>
            Counted from real reservations and refreshed every minute. The next market day is{" "}
            {week.nextMarketDate ? date(week.nextMarketDate) : "coming up"}.
          </p>
        </header>
        <div className="pulse-grid">
          <div className="pulse-figures">
            <div className="pulse-figure pulse-figure-lead">
              <Count value={week.reservations} />
              <span>reservations in the last 7 days</span>
            </div>
            <div className="pulse-figure">
              <Count value={network.markets} />
              <span>weekend markets</span>
            </div>
            <div className="pulse-figure">
              <Count value={network.growers} />
              <span>admin-approved growers</span>
            </div>
            <div className="pulse-figure">
              <Count value={network.products} />
              <span>products in season</span>
            </div>
            <div className="pulse-figure">
              <Count value={trust.fulfilmentRate ?? 0} decimals={1} suffix="%" />
              <span>of orders collected as promised</span>
            </div>
            <div className="pulse-figure">
              <Count value={week.unitsReserved} />
              <span>units packed for the next market</span>
            </div>
            <div className="pulse-figure pulse-figure-note">
              <span>
                {highlights.strongestMarket
                  ? `${highlights.strongestMarket.name} in ${highlights.strongestMarket.city} leads the month with ${money(highlights.strongestMarket.valueMinor)} reserved.`
                  : "Markets are just getting started."}
              </span>
            </div>
          </div>
          <div className="pulse-map">
            <NetworkMap pulse={pulse} />
          </div>
        </div>
        <ActivityFeed pulse={pulse} />
      </div>
    </section>
  );
}
