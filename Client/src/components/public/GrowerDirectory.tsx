import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, MapPin, Search, Star, ArrowUpDown, ChevronDown, Check } from "lucide-react";
import { usePulse } from "../../data/pulse";
import type { Pulse } from "../../data/pulse";
import { date } from "../../data/market";
import type { Farmer, Market, Product } from "../../data/market";
import { EASE } from "../../motion/motion";
import "./directory.css";

type Route = Pulse["routes"][number];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const SKETCH = { w: 320, h: 124 };

/** How far a grower's farm is from each market they attend, on one axis shared by every card. */
function RouteSketch({ routes, maxKm, reduce }: { routes: Route[]; maxKm: number; reduce: boolean }) {
  const { w, h } = SKETCH;
  const x0 = 26;
  const x1 = w - 26;
  const axis = h - 44;
  const at = (km: number) => x0 + (Math.min(km, maxKm) / maxKm) * (x1 - x0);
  const sorted = [...routes].sort((a, b) => a.km - b.km);
  // Labels sit under the axis; one that would touch its neighbour drops to a second row.
  const rowRight = [-Infinity, -Infinity];
  const marks = sorted.map((r) => {
    const x = at(r.km);
    const text = `${r.km} km`;
    const half = (text.length * 6.4) / 2;
    const row = x - half > rowRight[0] + 6 ? 0 : 1;
    rowRight[row] = x + half;
    return { r, x, text, row };
  });
  return (
    <svg className="gd-route" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <line className="gd-route-axis" x1={x0} y1={axis} x2={x1} y2={axis} />
      {Array.from({ length: maxKm / 10 + 1 }, (_, i) => (
        <line key={i} className="gd-route-tick" x1={at(i * 10)} y1={axis - 3} x2={at(i * 10)} y2={axis + 3} />
      ))}
      {marks.map(({ r, x }, i) => (
        <motion.path
          key={r.market}
          className="gd-route-line"
          d={`M${x0},${axis} Q${(x0 + x) / 2},${axis - 18 - (x - x0) * 0.28} ${x},${axis}`}
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.1, delay: 0.2 + i * 0.15, ease: EASE.riseCurve }}
        />
      ))}
      {marks.map(({ r, x, text, row }) => (
        <g key={r.market}>
          <rect className="gd-route-market" x={x - 6} y={axis - 6} width={12} height={12} rx={3}>
            <title>{r.market}</title>
          </rect>
          <text className="gd-route-km" x={x} y={axis + 22 + row * 15} textAnchor="middle">
            {text}
          </text>
        </g>
      ))}
      <circle className="gd-route-farm" cx={x0} cy={axis} r={6} />
    </svg>
  );
}

function nextDay(f: Farmer, products: Product[], today: string) {
  const dates = products
    .filter((p) => p.farmerId === f.id && p.visible)
    .flatMap((p) => p.offers ?? [])
    .filter((o) => o.date >= today && o.available > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return dates[0];
}

type Sort = "rating" | "nearest" | "name";

const GROWER_SORT_OPTIONS: { id: Sort; label: string; desc: string; icon: any }[] = [
  { id: "rating", label: "Top rated", desc: "Highest customer review score", icon: Star },
  { id: "nearest", label: "Nearest farm", desc: "Shortest farm-to-market distance", icon: MapPin },
  { id: "name", label: "A–Z", desc: "Alphabetical business name", icon: ArrowUpDown },
];

function GrowerSortDropdown({
  value,
  onChange,
}: {
  value: Sort;
  onChange: (sort: Sort) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const current = GROWER_SORT_OPTIONS.find((o) => o.id === value) || GROWER_SORT_OPTIONS[0];
  const Icon = current.icon;

  return (
    <div className={`gd-custom-select-wrap ${open ? "is-open" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="gd-custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="gd-custom-select-left">
          <Icon size={14} className="gd-select-icon" />
          <span className="gd-select-label-text">
            <span className="gd-select-prefix">Sort:</span>{" "}
            <strong>{current.label}</strong>
          </span>
        </span>
        <ChevronDown size={15} className={`gd-select-chevron ${open ? "rotated" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="gd-custom-select-menu"
            role="listbox"
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="gd-custom-select-header">Sort growers by</div>
            {GROWER_SORT_OPTIONS.map((opt) => {
              const isSelected = opt.id === value;
              const OptIcon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`gd-custom-select-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <span className="gd-item-left">
                    <span className="gd-item-icon-box">
                      <OptIcon size={14} />
                    </span>
                    <span className="gd-item-text">
                      <strong>{opt.label}</strong>
                      <small>{opt.desc}</small>
                    </span>
                  </span>
                  {isSelected && <Check size={16} className="gd-item-check" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function GrowerDirectory({
  farmers,
  markets,
  products,
  today,
}: {
  farmers: Farmer[];
  markets: Market[];
  products: Product[];
  today: string;
}) {
  const reduce = !!useReducedMotion();
  const pulse = usePulse();
  const [q, setQ] = useState("");
  const [market, setMarket] = useState("");
  const [sort, setSort] = useState<Sort>("rating");

  const attends = (f: Farmer, id: string) => f.marketId === id || (f.marketIds ?? []).includes(id);
  const approved = farmers.filter(
    (f) => String(f.state).toLowerCase() === "approved" || f.approvalStatus === "approved"
  );
  const routesFor = useMemo(() => {
    const map = new Map<string, Route[]>();
    for (const r of pulse?.routes ?? []) map.set(r.grower, [...(map.get(r.grower) ?? []), r]);
    return map;
  }, [pulse]);
  // One axis for the whole page (this city's growers), rounded up to the next 10 km.
  const localKm = approved.flatMap((f) => (routesFor.get(f.name) ?? []).map((r) => r.km));
  const maxKm = Math.max(10, Math.ceil(Math.max(0, ...localKm) / 10) * 10);
  const nearest = (f: Farmer) => Math.min(...(routesFor.get(f.name) ?? []).map((r) => r.km), Infinity);

  const shown = approved
    .filter((f) => `${f.name} ${f.person} ${f.location ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((f) => !market || attends(f, market))
    .sort((a, b) =>
      sort === "rating"
        ? (b.rating ?? 0) - (a.rating ?? 0)
        : sort === "nearest"
          ? nearest(a) - nearest(b)
          : a.name.localeCompare(b.name),
    );

  const rated = approved.filter((f) => f.rating);
  const avgRating = rated.length ? rated.reduce((a, f) => a + (f.rating ?? 0), 0) / rated.length : null;
  const kms = approved.map(nearest).filter(Number.isFinite);
  const avgKm = kms.length ? Math.round(kms.reduce((a, b) => a + b, 0) / kms.length) : null;

  return (
    <section className="gd" id="grower-directory" aria-labelledby="gd-title">
      <header className="gd-head">
        <div>
          <span className="gd-kicker">The people behind the produce</span>
          <h2 id="gd-title">Meet the growers.</h2>
        </div>
        <dl className="gd-facts-strip">
          <div>
            <dt>Approved growers</dt>
            <dd>{approved.length}</dd>
          </div>
          {avgKm !== null && (
            <div>
              <dt>Average farm-to-market</dt>
              <dd>{avgKm} km</dd>
            </div>
          )}
          {avgRating !== null && (
            <div>
              <dt>Average rating</dt>
              <dd>
                {avgRating.toFixed(1)} <Star size={16} fill="currentColor" />
              </dd>
            </div>
          )}
        </dl>
      </header>

      <div className="gd-tools">
        <label className="gd-search">
          <Search size={17} />
          <input aria-label="Search growers" placeholder="A farm, a person, a place" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="gd-chips" role="group" aria-label="Filter by market">
          {[{ id: "", name: "All markets" }, ...markets].map((m) => {
            const count = m.id ? approved.filter((f) => attends(f, m.id)).length : approved.length;
            if (!count) return null;
            return (
              <button key={m.id || "all"} aria-pressed={market === m.id} onClick={() => setMarket(m.id)}>
                {market === m.id && <motion.span className="gd-chip-active" layoutId="gd-chip" transition={{ duration: reduce ? 0 : 0.3 }} />}
                <span>
                  {m.name} <em>{count}</em>
                </span>
              </button>
            );
          })}
        </div>
        <GrowerSortDropdown value={sort} onChange={setSort} />
      </div>

      <div className="gd-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((f, i) => {
            const routes = routesFor.get(f.name) ?? [];
            const stall = products.filter((p) => p.farmerId === f.id && p.visible);
            const next = nextDay(f, products, today);
            const nextMarket = markets.find((m) => m.id === next?.marketId);
            return (
              <motion.article
                key={f.id}
                className="gd-card"
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : (i % 6) * 0.04 }}
              >
                <div className="gd-map">
                  {routes.length ? (
                    <RouteSketch routes={routes} maxKm={maxKm} reduce={reduce} />
                  ) : (
                    <p className="gd-map-empty">
                      <MapPin size={15} /> {f.location ?? "Farm location shared at the stall"}
                    </p>
                  )}
                  <span className="gd-map-legend">
                    <i className="gd-dot" /> Farm <i className="gd-square" /> Markets they attend <b>0–{maxKm} km</b>
                  </span>
                </div>
                <div className="gd-body">
                  <div className="gd-id">
                    <span className="gd-mono" aria-hidden="true">
                      {initials(f.name)}
                    </span>
                    <div>
                      <h3>
                        <Link to={`/farmers/${f.id}`} className="gd-link">
                          {f.name}
                        </Link>
                      </h3>
                      <p>
                        {f.person}
                        {f.since ? ` · growing since ${f.since}` : ""}
                      </p>
                    </div>
                    {f.rating ? (
                      <span className="gd-rating" aria-label={`Rated ${f.rating.toFixed(1)} from ${f.reviewCount ?? 0} reviews`}>
                        <Star size={13} fill="currentColor" /> {f.rating.toFixed(1)}
                        <small>({f.reviewCount ?? 0})</small>
                      </span>
                    ) : null}
                  </div>
                  {f.location && (
                    <p className="gd-where">
                      <MapPin size={13} /> {f.location}
                    </p>
                  )}
                  <p className="gd-story">{f.story}</p>
                  <div className="gd-stall">
                    <ul aria-label={`${stall.length} products on the stall`}>
                      {stall.slice(0, 4).map((p) => (
                        <li key={p.id} title={p.name}>
                          <img src={p.image} alt="" loading="lazy" />
                        </li>
                      ))}
                      {stall.length > 4 && <li className="gd-more">+{stall.length - 4}</li>}
                    </ul>
                    <span>{stall.length} on the stall</span>
                  </div>
                  <footer className="gd-foot">
                    <span>
                      {next && nextMarket ? (
                        <>
                          Next: <strong>{date(next.date)}</strong> · {nextMarket.name}
                        </>
                      ) : (
                        "No market date booked yet"
                      )}
                    </span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </footer>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
      {!shown.length && (
        <div className="gd-empty">
          <p>No grower matches that search.</p>
          <button
            onClick={() => {
              setQ("");
              setMarket("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
