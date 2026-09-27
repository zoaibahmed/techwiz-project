import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useMarket, useAction, Favourite } from "../ui";
import { date, money } from "../../data/market";
import type { Farmer, Market, Product } from "../../data/market";
import { EASE } from "../../motion/motion";
import "./directory.css";

export type ShelfFilters = {
  q: string;
  category: string;
  farmer: string;
  market: string;
  sort: string;
  available: boolean;
};

/** One product on the shelf: live availability, next market date and quick add. */
function ShelfCard({ p, farmer, market, index }: { p: Product; farmer?: Farmer; market?: Market; index: number }) {
  const s = useMarket();
  const act = useAction();
  const reduce = useReducedMotion();
  const [added, setAdded] = useState(false);
  const left = Math.max(0, p.stock - p.reserved - (s.basket[p.id] ?? 0));
  const share = p.stock ? left / p.stock : 0;
  const soldOut = !p.available || left <= 0;
  const add = () => {
    if (act({ type: "basket", id: p.id, quantity: (s.basket[p.id] ?? 0) + 1 }, `${p.name} added to your market bag.`)) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1600);
    }
  };
  return (
    <motion.article
      className={`ps-card${soldOut ? " is-out" : ""}`}
      layout={!reduce}
      initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0%)", y: 20 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)", y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      exit={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
      transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : (index % 4) * 0.06, ease: EASE.riseCurve }}
    >
      <div className="ps-media">
        <Link to={`/products/${p.id}`} tabIndex={-1} aria-hidden="true">
          <img src={p.image} alt="" loading="lazy" width={400} height={400} />
        </Link>
        <Favourite id={p.id} />
        {soldOut ? (
          <span className="ps-badge ps-badge-out">{p.available ? "Sold out" : "Unavailable"}</span>
        ) : share < 0.25 ? (
          <span className="ps-badge">Selling fast</span>
        ) : null}
      </div>
      <div className="ps-info">
        <span className="ps-meta">
          {p.category}
          {farmer && (
            <>
              {" · "}
              <Link to={`/farmers/${farmer.id}`}>{farmer.name}</Link>
            </>
          )}
        </span>
        <h3>
          <Link to={`/products/${p.id}`}>{p.name}</Link>
        </h3>
        <div className="ps-stock">
          <span className="ps-meter" aria-hidden="true">
            <i style={{ width: `${Math.round(share * 100)}%` }} />
          </span>
          <small>
            {soldOut ? "None left" : `${left} of ${p.stock} left`}
            {p.date && ` · ${date(p.date)}`}
            {market && <span className="ps-market"> · {market.name}</span>}
          </small>
        </div>
        <div className="ps-foot">
          <span className="ps-price">
            <strong>{money(p.price, p.currency)}</strong> <small>/ {p.unit}</small>
          </span>
          <motion.button
            className="ps-add"
            aria-label={`Add ${p.name} to basket`}
            disabled={soldOut}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            onClick={add}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={added ? "added" : "add"}
                initial={reduce ? false : { y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? undefined : { y: -12, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {added ? <Check size={16} /> : <Plus size={16} />} {added ? "Added" : "Add"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

export function ProduceShelf({
  products,
  allCount,
  categories,
  farmers,
  markets,
  filters,
  onChange,
  onReset,
}: {
  products: Product[];
  allCount: number;
  categories: { name: string; count: number }[];
  farmers: Farmer[];
  markets: Market[];
  filters: ShelfFilters;
  onChange: (key: keyof ShelfFilters, value: string) => void;
  onReset: () => void;
}) {
  const reduce = useReducedMotion();
  const [more, setMore] = useState(!!(filters.farmer || filters.market));
  const active = [filters.q, filters.category, filters.farmer, filters.market, filters.available ? "1" : ""].filter(Boolean).length;
  return (
    <section className="ps" id="harvest-filters" aria-label="Produce">
      <p className="ps-photo-note">Choose your variety, farmer and pickup day. Stock photography is illustrative; listing details describe the produce offered.</p>
      <div className="ps-bar">
        <div className="ps-tools">
          <label className="ps-search">
            <Search size={17} />
            <input value={filters.q} onChange={(e) => onChange("q", e.target.value)} placeholder="Search produce" aria-label="Search produce" />
          </label>
          <label className={`ps-toggle${filters.available ? " on" : ""}`}>
            <input type="checkbox" checked={filters.available} onChange={(e) => onChange("available", e.target.checked ? "true" : "")} />
            <span aria-hidden="true" />
            In stock only
          </label>
          <button className="ps-more-btn" aria-expanded={more} onClick={() => setMore((v) => !v)}>
            <SlidersHorizontal size={16} /> Market &amp; grower
          </button>
          <label className="ps-select">
            <span>Sort</span>
            <select value={filters.sort} onChange={(e) => onChange("sort", e.target.value)} aria-label="Sort produce">
              <option value="name">A–Z</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="left">Fewest left</option>
            </select>
          </label>
          <span className="ps-count" aria-live="polite">
            {products.length} of {allCount}
          </span>
          <label className="ps-select ps-category-dropdown"><span>Category</span><select aria-label="Filter by category" value={filters.category} onChange={e=>onChange("category",e.target.value)}><option value="">All products ({allCount})</option>{categories.map(c=><option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}</select></label>
          {active > 0 && (
            <button className="ps-reset" onClick={onReset}>
              <X size={14} /> Clear {active}
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {more && (
            <motion.div
              className="ps-more"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE.riseCurve }}
            >
              <label className="ps-select">
                <span>Market</span>
                <select value={filters.market} onChange={(e) => onChange("market", e.target.value)}>
                  <option value="">All markets</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ps-select">
                <span>Grower</span>
                <select value={filters.farmer} onChange={(e) => onChange("farmer", e.target.value)}>
                  <option value="">All growers</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="ps-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {products.map((p, i) => (
            <ShelfCard
              key={p.id}
              p={p}
              index={i}
              farmer={farmers.find((f) => f.id === p.farmerId)}
              market={markets.find((m) => m.id === p.marketId)}
            />
          ))}
        </AnimatePresence>
      </div>
      {!products.length && (
        <div className="ps-empty">
          <p>Nothing on the shelf matches those filters.</p>
          <button onClick={onReset}>Clear filters</button>
        </div>
      )}
    </section>
  );
}
