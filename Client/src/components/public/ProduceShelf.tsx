import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Plus, Search, X, ChevronDown, Tag, ArrowUpDown, Store, Users } from "lucide-react";
import { useMarket, useAction, Favourite } from "../ui";
import { date, money } from "../../data/market";
import type { Farmer, Market, Product } from "../../data/market";
import "./directory.css";

export type ShelfFilters = {
  q: string;
  category: string;
  farmer: string;
  market: string;
  sort: string;
  available: boolean;
};

const PRODUCE_SORT_OPTIONS = [
  { id: "name", label: "A–Z", desc: "Alphabetical" },
  { id: "low", label: "Price: low to high", desc: "Most affordable" },
  { id: "high", label: "Price: high to low", desc: "Premium selection" },
  { id: "left", label: "Fewest left", desc: "Urgent seasonal stock" },
];

function ProduceSortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (sort: string) => void;
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

  const current = PRODUCE_SORT_OPTIONS.find((o) => o.id === value) || PRODUCE_SORT_OPTIONS[0];

  return (
    <div className={`ps-custom-select-wrap ${open ? "is-open" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="ps-custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="ps-custom-select-left">
          <ArrowUpDown size={14} className="ps-select-icon" />
          <span className="ps-select-label-text">
            <span className="ps-select-prefix">Sort:</span>{" "}
            <strong>{current.label}</strong>
          </span>
        </span>
        <ChevronDown size={15} className={`ps-select-chevron ${open ? "rotated" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="ps-custom-select-menu"
            role="listbox"
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="ps-custom-select-header">Sort produce</div>
            {PRODUCE_SORT_OPTIONS.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`ps-custom-select-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <span className="ps-item-text">
                    <strong>{opt.label}</strong>
                    <small>{opt.desc}</small>
                  </span>
                  {isSelected && <Check size={14} className="ps-item-check" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProduceCategoryDropdown({
  categories,
  allCount,
  selected,
  onChange,
}: {
  categories: { name: string; count: number }[];
  allCount: number;
  selected: string;
  onChange: (category: string) => void;
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

  const currentCategory = categories.find((c) => c.name === selected);
  const currentCount = currentCategory ? currentCategory.count : allCount;
  const currentLabel = selected || "All Products";

  return (
    <div className={`ps-custom-select-wrap ps-category-dropdown ${open ? "is-open" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="ps-custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="ps-custom-select-left">
          <Tag size={14} className="ps-select-icon" />
          <span className="ps-select-label-text">
            <span className="ps-select-prefix">Category:</span>{" "}
            <strong>{currentLabel}</strong>
          </span>
          <span className="ps-select-badge">{currentCount}</span>
        </span>
        <ChevronDown size={15} className={`ps-select-chevron ${open ? "rotated" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="ps-custom-select-menu"
            role="listbox"
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="ps-custom-select-header">Category filter</div>
            <button
              type="button"
              role="option"
              aria-selected={!selected}
              className={`ps-custom-select-item ${!selected ? "selected" : ""}`}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <span className="ps-item-text">All products</span>
              <span className="ps-item-right">
                <span className="ps-item-count">{allCount}</span>
                {!selected && <Check size={14} className="ps-item-check" />}
              </span>
            </button>
            {categories.length > 0 && <div className="ps-custom-select-divider" />}
            <div className="ps-custom-select-scroll">
              {categories.map((c) => {
                const isSelected = selected === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`ps-custom-select-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      onChange(c.name);
                      setOpen(false);
                    }}
                  >
                    <span className="ps-item-text">{c.name}</span>
                    <span className="ps-item-right">
                      <span className="ps-item-count">{c.count}</span>
                      {isSelected && <Check size={14} className="ps-item-check" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProduceMarketDropdown({
  markets,
  selected,
  onChange,
}: {
  markets: Market[];
  selected: string;
  onChange: (marketId: string) => void;
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

  const currentMarket = markets.find((m) => m.id === selected);
  const currentLabel = currentMarket ? currentMarket.name : "All markets";

  return (
    <div className={`ps-custom-select-wrap ps-market-dropdown ${open ? "is-open" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="ps-custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="ps-custom-select-left">
          <Store size={14} className="ps-select-icon" />
          <span className="ps-select-label-text">
            <span className="ps-select-prefix">Market:</span>{" "}
            <strong>{currentLabel}</strong>
          </span>
          {selected && <span className="ps-select-badge">Active</span>}
        </span>
        <ChevronDown size={15} className={`ps-select-chevron ${open ? "rotated" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="ps-custom-select-menu"
            role="listbox"
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="ps-custom-select-header">Filter by market venue</div>
            <button
              type="button"
              role="option"
              aria-selected={!selected}
              className={`ps-custom-select-item ${!selected ? "selected" : ""}`}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <span className="ps-item-text">
                <strong>All markets</strong>
                <small>Show produce across all venues</small>
              </span>
              {!selected && <Check size={14} className="ps-item-check" />}
            </button>
            <div className="ps-custom-select-divider" />
            <div className="ps-custom-select-scroll">
              {markets.map((m) => {
                const isSelected = selected === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`ps-custom-select-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                  >
                    <span className="ps-item-text">
                      <strong>{m.name}</strong>
                      <small>{m.city}, {m.countryName || m.countryCode}</small>
                    </span>
                    {isSelected && <Check size={14} className="ps-item-check" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProduceGrowerDropdown({
  farmers,
  selected,
  onChange,
}: {
  farmers: Farmer[];
  selected: string;
  onChange: (farmerId: string) => void;
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

  const currentFarmer = farmers.find((f) => f.id === selected);
  const currentLabel = currentFarmer ? currentFarmer.name : "All growers";

  return (
    <div className={`ps-custom-select-wrap ps-grower-dropdown ${open ? "is-open" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="ps-custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="ps-custom-select-left">
          <Users size={14} className="ps-select-icon" />
          <span className="ps-select-label-text">
            <span className="ps-select-prefix">Grower:</span>{" "}
            <strong>{currentLabel}</strong>
          </span>
          {selected && <span className="ps-select-badge">Active</span>}
        </span>
        <ChevronDown size={15} className={`ps-select-chevron ${open ? "rotated" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="ps-custom-select-menu"
            role="listbox"
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="ps-custom-select-header">Filter by farmstead &amp; grower</div>
            <button
              type="button"
              role="option"
              aria-selected={!selected}
              className={`ps-custom-select-item ${!selected ? "selected" : ""}`}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <span className="ps-item-text">
                <strong>All growers</strong>
                <small>Show produce from all farmsteads</small>
              </span>
              {!selected && <Check size={14} className="ps-item-check" />}
            </button>
            <div className="ps-custom-select-divider" />
            <div className="ps-custom-select-scroll">
              {farmers.map((f) => {
                const isSelected = selected === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`ps-custom-select-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      onChange(f.id);
                      setOpen(false);
                    }}
                  >
                    <span className="ps-item-text">
                      <strong>{f.name}</strong>
                      <small>{f.city || f.location || f.person}</small>
                    </span>
                    {isSelected && <Check size={14} className="ps-item-check" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
      transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : (index % 4) * 0.03, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="ps-media">
        <Link to={`/products/${p.id}`} className="ps-media-link" aria-label={`View details for ${p.name}`}>
          <img src={p.image} alt={p.name} loading="lazy" width={400} height={400} />
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
          <ProduceCategoryDropdown
            categories={categories}
            allCount={allCount}
            selected={filters.category}
            onChange={(cat) => onChange("category", cat)}
          />
          <ProduceMarketDropdown
            markets={markets}
            selected={filters.market}
            onChange={(m) => onChange("market", m)}
          />
          <ProduceGrowerDropdown
            farmers={farmers}
            selected={filters.farmer}
            onChange={(f) => onChange("farmer", f)}
          />
          <ProduceSortDropdown value={filters.sort} onChange={(s) => onChange("sort", s)} />
          <span className="ps-count" aria-live="polite">
            {products.length} of {allCount}
          </span>
          {active > 0 && (
            <button className="ps-reset" onClick={onReset}>
              <X size={14} /> Clear {active}
            </button>
          )}
        </div>
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
