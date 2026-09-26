import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowUpRight, Check, Clock, MapPin, Navigation, Plus, Search, ShoppingBasket, Star } from "lucide-react";
import { useMarket, useAction } from "../ui";
import { MarketMap } from "../MarketMap";
import { date, money, time } from "../../data/market";
import type { Market, Product } from "../../data/market";
import { EASE } from "../../motion/motion";
import "./explorer.css";

gsap.registerPlugin(ScrollTrigger);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/**
 * "Pick a market. See who’s coming." A live map with a floating sheet: the
 * sheet lists the day’s markets, then opens one to show attending growers,
 * what is in season there that day (with quick add) and pickup windows.
 */
export function MarketExplorer({
  city,
  country,
  day: chosenDay = "",
  onDay,
}: {
  city: string;
  country: string;
  /** Shared with the hero's day picker. */
  day?: string;
  onDay?: (day: string) => void;
}) {
  const s = useMarket();
  const act = useAction();
  const reduce = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [grower, setGrower] = useState<string>("all");
  const [added, setAdded] = useState<string>("");

  const local = s.markets.filter(
    (m) => m.active && m.countryCode === country && (!city || (m.city ?? "").toLowerCase() === city.toLowerCase()),
  );
  const days = [...new Set(local.flatMap((m) => m.nextDates ?? [m.day]).filter(Boolean))].sort().slice(0, 4);
  const [dayChoice, setDayChoice] = useState(chosenDay);
  const picked = onDay ? chosenDay : dayChoice;
  const day = days.includes(picked) ? picked : (days[0] ?? "");
  const setDay = (d: string) => {
    setDayChoice(d);
    onDay?.(d);
  };
  const markets = local
    .filter((m) => (m.nextDates ?? [m.day]).includes(day))
    .filter((m) => `${m.name} ${m.area}`.toLowerCase().includes(query.trim().toLowerCase()));

  // What each market offers on the chosen day, from dated stock offers.
  const offerAt = (p: Product, m: Market) => p.offers?.find((o) => o.marketId === m.id && o.date === day);
  const stats = useMemo(() => {
    const out = new Map<string, { growers: number; products: number }>();
    for (const m of markets) {
      const products = s.products.filter((p) => p.visible && (offerAt(p, m)?.available ?? 0) > 0);
      out.set(m.id, { growers: new Set(products.map((p) => p.farmerId)).size, products: products.length });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markets.map((m) => m.id).join(), day, s.products]);

  const market = markets.find((m) => m.id === open) ?? null;
  const inSeason = market ? s.products.filter((p) => p.visible && (offerAt(p, market)?.available ?? 0) > 0) : [];
  const attending = market ? s.farmers.filter((f) => f.state === "Approved" && inSeason.some((p) => p.farmerId === f.id)) : [];
  const shown = grower === "all" ? inSeason : inSeason.filter((p) => p.farmerId === grower);
  const windows = market
    ? s.slots
        .filter((x) => x.marketId === market.id && (x.date ?? x.start.slice(0, 10)) === day && (grower === "all" || x.farmerId === grower) && x.cutoff > s.now)
        .sort((a, b) => a.start.localeCompare(b.start))
    : [];
  const uniqueWindows = [...new Map(windows.map((w) => [`${time(w.start)}–${time(w.end)}`, w])).values()];
  const basketCount = Object.values(s.basket).reduce((a, b) => a + b, 0);
  // On wide screens the sheet floats over the map's right side.
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches;

  const choose = (id: string) => {
    setOpen(id);
    setGrower("all");
  };
  const quickAdd = (p: Product) => {
    if (act({ type: "basket", id: p.id, quantity: (s.basket[p.id] ?? 0) + 1 }, "")) {
      setAdded(p.id);
      window.setTimeout(() => setAdded((x) => (x === p.id ? "" : x)), 1600);
    }
  };

  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top 72%", once: true } })
          .from(".mx-head h2 .rise-line > span", { yPercent: 110, duration: 1, stagger: 0.08, ease: EASE.rise })
          .from(".mx-stage", { clipPath: "inset(12% 6% 12% 6% round 28px)", duration: 1.2, ease: EASE.rise }, 0.1)
          .from(".mx-sheet", { y: 48, opacity: 0, duration: 0.9, ease: EASE.rise }, 0.5);
      }, root);
      return () => ctx.revert();
    });
    requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });
    return () => media.revert();
  }, []);

  const slide = reduce ? {} : { initial: { x: 40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -40, opacity: 0 } };

  return (
    <section id="market-explorer" className="mx" ref={root} aria-labelledby="mx-title">
      <header className="mx-head">
        <div>
          <span className="mx-kicker">
            <MapPin size={14} /> {city || "Your city"} · next {days.length} market days
          </span>
          <h2 id="mx-title">
            <span className="rise-line"><span>Pick a market.</span></span>
            <span className="rise-line"><span>See who’s coming.</span></span>
          </h2>
        </div>
        <div className="mx-controls">
          <div className="mx-days" role="group" aria-label="Market day">
            {days.map((d) => (
              <button key={d} aria-pressed={d === day} onClick={() => setDay(d)}>
                {d === day && <motion.span className="mx-day-active" layoutId="mx-day" transition={{ duration: reduce ? 0 : 0.3 }} />}
                <span>{date(d)}</span>
              </button>
            ))}
          </div>
          <label className="mx-search">
            <Search size={16} />
            <input aria-label="Search markets" placeholder="Search market or area" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
      </header>

      <div className="mx-stage">
        <div className="mx-map">
          <MarketMap markets={markets} selected={market?.id ?? ""} onSelect={choose} occludeRight={wide ? 470 : 0} />
        </div>

        <aside className="mx-sheet" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {!market ? (
              <motion.div key="list" className="mx-list" {...slide} transition={{ duration: 0.35, ease: EASE.riseCurve }}>
                <p className="mx-sheet-title">
                  {markets.length} market{markets.length === 1 ? "" : "s"} open {date(day)}
                </p>
                {markets.map((m, i) => {
                  const st = stats.get(m.id);
                  return (
                    <button key={m.id} className="mx-market" onClick={() => choose(m.id)}>
                      <span className="mx-market-n">0{i + 1}</span>
                      <span className="mx-market-body">
                        <strong>{m.name}</strong>
                        <small>
                          {m.area} · {m.hours}
                        </small>
                        <span className="mx-market-meta">
                          <em>{st?.growers ?? 0} growers</em>
                          <em>{st?.products ?? 0} products</em>
                        </span>
                      </span>
                      <ArrowUpRight size={18} />
                    </button>
                  );
                })}
                {!markets.length && <p className="mx-empty">No market matches that search on {date(day)}.</p>}
              </motion.div>
            ) : (
              <motion.div key={market.id} className="mx-detail" {...slide} transition={{ duration: 0.35, ease: EASE.riseCurve }}>
                <button className="mx-back" onClick={() => setOpen(null)}>
                  <ArrowLeft size={16} /> All markets
                </button>
                <h3>{market.name}</h3>
                <p className="mx-where">
                  {market.area} · {date(day)} · {market.hours}
                </p>
                <div className="mx-actions">
                  <Link to={`/markets/${market.id}`}>
                    Market page <ArrowUpRight size={14} />
                  </Link>
                  {market.coordinates && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${market.coordinates.latitude},${market.coordinates.longitude}`} target="_blank" rel="noreferrer">
                      <Navigation size={14} /> Directions
                    </a>
                  )}
                </div>

                <p className="mx-label">Growers attending · {attending.length}</p>
                <div className="mx-growers">
                  <button aria-pressed={grower === "all"} onClick={() => setGrower("all")} className="mx-grower-all">
                    All
                  </button>
                  {attending.map((f) => (
                    <button key={f.id} aria-pressed={grower === f.id} onClick={() => setGrower(f.id)} title={f.name}>
                      <span className="mx-avatar" aria-hidden="true">
                        {initials(f.name)}
                      </span>
                      <span className="mx-grower-name">{f.name}</span>
                      {f.rating ? (
                        <span className="mx-grower-rating">
                          <Star size={11} fill="currentColor" /> {f.rating.toFixed(1)}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>

                <p className="mx-label">In season here · {shown.length}</p>
                <div className="mx-products">
                  {shown.slice(0, 8).map((p) => {
                    const o = offerAt(p, market)!;
                    return (
                      <article key={p.id} className="mx-product">
                        <Link to={`/products/${p.id}`} className="mx-product-img">
                          <img src={p.image} alt="" loading="lazy" />
                        </Link>
                        <div>
                          <Link to={`/products/${p.id}`} className="mx-product-name">
                            {p.name}
                          </Link>
                          <span className="mx-product-price">
                            {money(o.price)} <small>/ {p.unit}</small>
                          </span>
                          <span className="mx-product-left">
                            <span className="mx-meter" aria-hidden="true"><i style={{ width: `${Math.round((o.available / Math.max(1, o.total)) * 100)}%` }} /></span> {o.available} left
                          </span>
                        </div>
                        <motion.button
                          className="mx-add"
                          aria-label={`Add ${p.name} to basket`}
                          whileTap={reduce ? undefined : { scale: 0.9 }}
                          onClick={() => quickAdd(p)}
                        >
                          {added === p.id ? <Check size={16} /> : <Plus size={16} />}
                        </motion.button>
                      </article>
                    );
                  })}
                  {shown.length > 8 && (
                    <Link className="mx-more" to={`/markets/${market.id}`}>
                      See all {shown.length} at this market <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>

                {uniqueWindows.length > 0 && (
                  <>
                    <p className="mx-label">Pickup windows</p>
                    <div className="mx-windows">
                      {uniqueWindows.map((w) => (
                        <span key={w.id}>
                          <Clock size={13} /> {time(w.start)}–{time(w.end)}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mx-bag">
            <ShoppingBasket size={18} />
            <motion.strong key={basketCount} initial={reduce ? false : { scale: 1.5 }} animate={{ scale: 1 }}>
              {basketCount}
            </motion.strong>
            <span>in your market bag · pay at the stall</span>
            <Link to="/basket">
              Review <ArrowUpRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
