import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePulse } from "../../data/pulse";
import type { Pulse } from "../../data/pulse";
import { date } from "../../data/market";
import { EASE } from "../../motion/motion";

gsap.registerPlugin(ScrollTrigger);

type Scene = {
  key: string;
  step: string;
  title: string;
  body: string;
  figure: string;
  figureLabel: string;
  image?: string;
};

function scenesFrom(p: Pulse): Scene[] {
  const km = p.averageRouteKm ?? 20;
  return [
    {
      key: "field",
      step: "Field",
      title: "Grown on family farms.",
      body: `Every listing belongs to a named grower. Most farms sit within ${km} km of the market they sell at.`,
      figure: String(p.network.growers),
      figureLabel: "admin-approved growers",
      image: "/images/grower.jpg",
    },
    {
      key: "harvest",
      step: "Harvest",
      title: "Picked for market day.",
      body: "Stock is published for a specific market date, so what you reserve is what is harvested for that morning.",
      figure: String(p.network.products),
      figureLabel: `products across ${p.network.categories} categories`,
      image: "/images/harvest.jpg",
    },
    {
      key: "grower",
      step: "Grower",
      title: "Priced by the person who grew it.",
      body: "Growers set their own prices, stock and pickup windows, and answer your messages directly.",
      figure: p.trust.rating ? `${p.trust.rating.toFixed(1)}★` : "—",
      figureLabel: `from ${p.trust.reviews.toLocaleString("en-PK")} verified reviews`,
      image: "/images/market-person.jpg",
    },
    {
      key: "transport",
      step: "Transport",
      title: "Field to stall, the short way.",
      body: `${p.routes.length} farm-to-market routes. Produce travels about ${km} km before it reaches your bag.`,
      figure: `${km} km`,
      figureLabel: "average farm-to-market distance",
    },
    {
      key: "market",
      step: "Market",
      title: `${p.network.markets} weekend markets, ${p.network.cities.length} cities.`,
      body: p.network.cities.map((c) => `${c.city} (${c.markets})`).join(" · "),
      figure: p.week.nextMarketDate ? date(p.week.nextMarketDate) : "Soon",
      figureLabel: "next market day",
      image: "/images/market.jpg",
    },
    {
      key: "pickup",
      step: "Pickup",
      title: "Collected, then paid at the stall.",
      body: "Reserve online, pick a 90-minute window, inspect your produce and pay the grower in person.",
      figure: p.trust.fulfilmentRate ? `${p.trust.fulfilmentRate}%` : "—",
      figureLabel: "of orders collected as promised",
      image: "/images/tomatoes.jpg",
    },
  ];
}

/** Farm → market routes around the busiest city, drawn in real coordinates. */
function RouteMap({ pulse }: { pulse: Pulse }) {
  const counts = new Map<string, number>();
  for (const r of pulse.routes) counts.set(r.city, (counts.get(r.city) ?? 0) + 1);
  const city = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const routes = pulse.routes.filter((r) => r.city === city);
  if (!routes.length) return null;
  // Equirectangular around the city: shrink longitude by cos(latitude) so kilometres are equal both ways.
  const k = Math.cos((routes[0].to.lat * Math.PI) / 180);
  const lngs = routes.flatMap((r) => [r.from.lng * k, r.to.lng * k]);
  const lats = routes.flatMap((r) => [r.from.lat, r.to.lat]);
  const [minLng, maxLng, minLat, maxLat] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)];
  const W = 640;
  const H = 520;
  const pad = 56;
  const scale = Math.min((W - 2 * pad) / (maxLng - minLng || 1), (H - 2 * pad) / (maxLat - minLat || 1));
  const px = (lng: number, lat: number) => ({
    x: pad + (lng * k - minLng) * scale + (W - 2 * pad - (maxLng - minLng) * scale) / 2,
    y: H - pad - (lat - minLat) * scale - (H - 2 * pad - (maxLat - minLat) * scale) / 2,
  });
  const marketNames = [...new Set(routes.map((r) => r.market))];
  // Distance rings around the markets' centre: they make "about N km" visible.
  const ends = routes.map((r) => px(r.to.lng, r.to.lat));
  const centre = { x: ends.reduce((a, p) => a + p.x, 0) / ends.length, y: ends.reduce((a, p) => a + p.y, 0) / ends.length };
  const kmPx = scale / 111.32;
  const farthest = Math.max(...routes.map((r) => r.km ?? 0), 10);
  const rings = [10, 20, 30, 40, 50].filter((km) => km <= Math.ceil(farthest / 10) * 10);
  const markets = marketNames.map((name, i) => {
    const r = routes.find((x) => x.market === name)!;
    return { name, n: i + 1, ...px(r.to.lng, r.to.lat) };
  });
  // Farm labels: greedy placement that skips any label that would overlap a
  // market marker or an earlier label.
  const ringLabel = (km: number) => ({ x: centre.x + km * kmPx * 0.7071 + 4, y: centre.y + km * kmPx * 0.7071 + 12 });
  const placed: { x: number; y: number; w: number }[] = [
    ...markets.map((m) => ({ x: m.x - 12, y: m.y, w: 24 })),
    ...rings.map((km) => ({ ...ringLabel(km), w: 40 })),
  ];
  const farms = [...new Map(routes.map((r) => [r.grower, px(r.from.lng, r.from.lat)])).entries()].map(([name, p]) => {
    const w = name.length * 6.4;
    const fits = (x: number) => x > 0 && x + w < W && !placed.some((q) => Math.abs(q.y - p.y) < 18 && x < q.x + q.w && x + w > q.x);
    // Right of the dot first, then left of it; otherwise leave the dot unlabelled.
    const side = fits(p.x + 10) ? "right" : fits(p.x - 10 - w) ? "left" : null;
    if (side) placed.push({ x: side === "right" ? p.x + 10 : p.x - 10 - w, y: p.y, w });
    return { name, ...p, side };
  });
  return (
    <div className="journey-routes-wrap">
      <svg className="journey-routes" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Farm to market routes around ${city}`}>
        <defs>
          <clipPath id="journey-routes-clip">
            <rect width={W} height={H} rx={12} />
          </clipPath>
        </defs>
        <g className="journey-rings" clipPath="url(#journey-routes-clip)" aria-hidden="true">
          {rings.map((km) => (
            <g key={km}>
              <circle cx={centre.x} cy={centre.y} r={km * kmPx} />
              <text {...ringLabel(km)}>{km} km</text>
            </g>
          ))}
        </g>
        {routes.map((r, i) => {
          const a = px(r.from.lng, r.from.lat);
          const b = px(r.to.lng, r.to.lat);
          const mx = (a.x + b.x) / 2 + (i % 2 ? 1 : -1) * Math.abs(b.y - a.y) * 0.2;
          const my = (a.y + b.y) / 2 - Math.abs(b.x - a.x) * 0.15;
          return <path key={i} className="journey-route" d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} pathLength={1} />;
        })}
        {farms.map((f) => (
          <g key={f.name} className="journey-farm" transform={`translate(${f.x},${f.y})`}>
            <circle r={6} />
            {f.side && (
              <text x={f.side === "right" ? 10 : -10} y={4} textAnchor={f.side === "right" ? "start" : "end"}>
                {f.name}
              </text>
            )}
          </g>
        ))}
        {markets.map((m) => (
          <g key={m.name} className="journey-market" transform={`translate(${m.x},${m.y})`}>
            <rect x={-10} y={-10} width={20} height={20} rx={4} />
            <text x={0} y={4} textAnchor="middle">
              {m.n}
            </text>
          </g>
        ))}
      </svg>
      <p className="journey-legend-title">Weekend markets in {city}</p>
      <ol className="journey-legend" aria-label={`Markets in ${city}`}>
        {markets.map((m) => (
          <li key={m.name}>
            <span>{m.n}</span> {m.name}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * "From field to your bag": six scenes that scroll controls. On large screens
 * the stage pins and each scene rises in with three depth layers; on small
 * screens and for reduced motion the scenes simply stack.
 */
export function MarketJourney() {
  const pulse = usePulse();
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!pulse) return;
    const media = gsap.matchMedia();
    media.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const scenes = gsap.utils.toArray<HTMLElement>(".journey-scene");
        gsap.set(scenes.slice(1), { clipPath: "inset(100% 0% 0% 0%)" });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: ".journey-stage",
            start: "top top",
            end: () => `+=${window.innerHeight * (scenes.length - 0.4)}`,
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
          },
        });
        // Progress: the harvest line fills as the story advances.
        tl.fromTo(".journey-progress-fill", { scaleY: 0 }, { scaleY: 1, duration: scenes.length - 1 }, 0);
        scenes.forEach((scene, i) => {
          const at = i - 1;
          // Continuous camera drift inside every scene (background slow, figure fast).
          const bg = scene.querySelector(".journey-bg");
          const card = scene.querySelector(".journey-map-card");
          if (bg) tl.fromTo(bg, { yPercent: 6, scale: 1.14 }, { yPercent: -6, scale: 1.04, duration: 1.4 }, Math.max(0, at));
          if (card) tl.fromTo(card, { yPercent: 8 }, { yPercent: -4, duration: 1.4 }, Math.max(0, at));
          else tl.fromTo(scene.querySelector(".journey-figure"), { yPercent: 40 }, { yPercent: -40, duration: 1.4 }, Math.max(0, at));
          if (i === 0) return;
          const prev = scenes[i - 1];
          tl.to(scene, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7 }, at + 0.3)
            .to(prev.querySelector(".journey-copy"), { yPercent: -30, opacity: 0, duration: 0.5 }, at + 0.3)
            .fromTo(scene.querySelector(".journey-copy"), { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6 }, at + 0.55)
            .to(`.journey-step:nth-child(${i + 1})`, { color: "#faf8f2", duration: 0.2 }, at + 0.5)
            .to(`.journey-step:nth-child(${i})`, { color: "#a8baa3", duration: 0.2 }, at + 0.5);
          const routes = scene.querySelectorAll(".journey-route");
          if (routes.length) tl.fromTo(routes, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, stagger: 0.03 }, at + 0.6);
        });
      }, root);
      return () => ctx.revert();
    });
    // Stacked version: each scene rises into view on its own.
    media.add("(max-width: 899px) and (prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(".journey-scene").forEach((scene) => {
          gsap.from(scene.querySelector(".journey-bg, .journey-routes"), {
            clipPath: "inset(100% 0 0 0)",
            duration: 1,
            ease: EASE.rise,
            scrollTrigger: { trigger: scene, start: "top 80%", once: true },
          });
          const routes = scene.querySelectorAll(".journey-route");
          if (routes.length)
            gsap.from(routes, { strokeDashoffset: 1, duration: 1.2, stagger: 0.05, scrollTrigger: { trigger: scene, start: "top 70%", once: true } });
        });
      }, root);
      return () => ctx.revert();
    });
    // Sections that mount after data arrives insert pin space; re-measure every trigger in page order.
    requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });
    return () => media.revert();
  }, [pulse]);

  if (!pulse) return null;
  const scenes = scenesFrom(pulse);
  return (
    <section className="journey" ref={root} aria-labelledby="journey-title">
      <h2 id="journey-title" className="visually-hidden">
        How produce reaches you
      </h2>
      <div className="journey-stage">
        <nav className="journey-rail" aria-label="Journey steps">
          <span className="journey-progress" aria-hidden="true">
            <span className="journey-progress-fill" />
          </span>
          <ol>
            {scenes.map((s, i) => (
              <li className="journey-step" key={s.key}>
                <span>0{i + 1}</span> {s.step}
              </li>
            ))}
          </ol>
        </nav>
        {scenes.map((s, i) => (
          <article className={`journey-scene journey-scene-${s.key}`} key={s.key} style={{ zIndex: i + 1 }}>
            {!s.image ? (
              // Transport: copy on the left, the route map as its own card on the right, so nothing overlaps.
              <div className="journey-transport">
                <div className="journey-transport-text">
                  <div className="journey-copy">
                    <span className="journey-kicker">
                      0{i + 1} / {s.step}
                    </span>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                  <div className="journey-figure">
                    <strong>{s.figure}</strong>
                    <span>{s.figureLabel}</span>
                  </div>
                </div>
                <div className="journey-map-card">
                  <RouteMap pulse={pulse} />
                </div>
              </div>
            ) : (
              <>
                <div className="journey-bg" aria-hidden="true">
                  <img src={s.image} alt="" loading={i < 2 ? "eager" : "lazy"} />
                </div>
                <div className="journey-shade" aria-hidden="true" />
                <div className="journey-copy">
                  <span className="journey-kicker">
                    0{i + 1} / {s.step}
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
                <div className="journey-figure">
                  <strong>{s.figure}</strong>
                  <span>{s.figureLabel}</span>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
