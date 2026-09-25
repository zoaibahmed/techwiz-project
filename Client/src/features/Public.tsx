import { SceneHeader, HelpExperience } from "../components/PublicScenes";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useVisitor } from "../data/visitor-context";
import { MarketMap as InteractiveMap } from "../components/MarketMap";
import { lazy, useEffect, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  MapPin,
  Clock,
  Search,
  ShoppingBasket,
  CalendarDays,
  Star,
  Store,
  Sprout,
  Users,
} from "lucide-react";
import {
  useMarket,
  useAction,
  Heading,
  ProductTile,
  Empty,
  Field,
  Favourite,
  Notice,
  Form,
  value,
} from "../components/ui";
import { date, money, images } from "../data/market";
import type { Role } from "../data/market";
import { loginApi, registerCustomerApi, registerFarmerApi } from "../data/api";

// Scope public records without mutating the account/workspace store.
function useDiscoveryState() {
  const state = useMarket();
  const { visitor } = useVisitor();
  const markets = state.markets.filter(
    (m) =>
      m.countryCode === visitor.country &&
      (!visitor.city || m.city?.toLowerCase() === visitor.city.toLowerCase()),
  );
  const ids = new Set(markets.map((m) => m.id));
  const farmers = state.farmers.filter((f) => ids.has(f.marketId));
  const farmerIds = new Set(farmers.map((f) => f.id));
  return {
    ...state,
    markets,
    farmers,
    products: state.products.filter((p) => farmerIds.has(p.farmerId)),
    slots: state.slots.filter((slot) => ids.has(slot.marketId)),
  };
}

export const Home = lazy(() =>
  import("./LivingHome").then((module) => ({ default: module.LivingHome })),
);

export function Markets() {
  const s = useDiscoveryState();
  const reduceMotion = useReducedMotion();
  const [params, set] = useSearchParams();
  const [selected, select] = useState(s.markets[0]?.id ?? "");
  const [map, showMap] = useState(false);
  const query = params.get("q") ?? "";
  const day = params.get("day") ?? "";

  const filtered = s.markets.filter(
    (m) =>
      m.active &&
      `${m.name} ${m.area} ${m.city ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!day || m.day === day),
  );

  const selectedMarket = filtered.some((m) => m.id === selected)
    ? selected
    : (filtered[0]?.id ?? "");

  const update = (key: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(key, v);
    else next.delete(key);
    set(next);
  };

  return (
    <div className="public-atlas living-discovery-page">
      <SceneHeader kind="markets" target="market-directory" />
      <div className="filter-bar" id="market-directory">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Search markets"
            placeholder="Search venue or neighbourhood..."
            value={query}
            onChange={(e) => update("q", e.target.value)}
          />
        </label>
        <label className="inline-field">
          Market Day{" "}
          <select
            aria-label="Market day"
            value={day}
            onChange={(e) => update("day", e.target.value)}
          >
            <option value="">All Market Days</option>
            {[...new Set(s.markets.map((m) => m.day))].sort().map((d) => (
              <option key={d} value={d}>
                {date(d)}
              </option>
            ))}
          </select>
        </label>
        <button className="button quiet" onClick={() => set({})}>
          Clear filters
        </button>
        <button
          className="button secondary map-toggle"
          onClick={() => showMap(!map)}
        >
          {map ? "Show list" : "Show interactive map"}
        </button>
      </div>

      <p className="small muted">
        {filtered.length} operating market venues · Click a market card or map
        pin to synchronise.
      </p>

      {filtered.length ? (
        <div className={`discovery ${map ? "mobile-map" : ""}`}>
          <div className="market-results">
            {filtered.map((m) => {
              const attendingFarmers = s.farmers.filter(
                (f) => f.marketId === m.id && f.state === "Approved",
              );
              const marketProducts = s.products.filter(
                (p) =>
                  p.visible &&
                  attendingFarmers.some((f) => f.id === p.farmerId),
              );
              const isSelected = selectedMarket === m.id;

              return (
                <motion.article
                  layout={!reduceMotion}
                  animate={{
                    backgroundColor: isSelected ? "#e0e8c9" : "#faf9f2",
                  }}
                  transition={{ duration: reduceMotion ? 0 : 0.3 }}
                  className={`market-result ${isSelected ? "selected" : ""}`}
                  key={m.id}
                  onClick={() => select(m.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="spread">
                    <span className="eyebrow">{date(m.day)}</span>
                    <Favourite id={m.id} />
                  </div>
                  <div className="market-select">
                    <h2>
                      <button
                        className="atlas-select"
                        onClick={() => select(m.id)}
                        aria-pressed={isSelected}
                      >
                        {m.name}
                        <ArrowRight size={20} />
                      </button>
                    </h2>
                    <p
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <MapPin size={15} color="var(--pe-forest)" />
                      {m.address}
                    </p>
                  </div>
                  <p
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Clock size={15} color="var(--pe-forest)" />
                    {m.hours} · {m.timeZone}
                  </p>
                  <div
                    className="spread"
                    style={{
                      marginTop: "12px",
                      paddingTop: "10px",
                      borderTop: "1px solid var(--pe-border-subtle)",
                    }}
                  >
                    <span className="small">
                      <Sprout
                        size={13}
                        style={{
                          display: "inline",
                          verticalAlign: "middle",
                          marginRight: "3px",
                        }}
                      />
                      <strong>{attendingFarmers.length}</strong> attending
                      growers · <strong>{marketProducts.length}</strong> items
                    </span>
                    <Link
                      className="text-link"
                      to={`/markets/${m.id}`}
                      style={{ fontWeight: "600", color: "var(--pe-forest)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Venue details <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <InteractiveMap
            selected={selectedMarket}
            onSelect={select}
            markets={filtered}
          />
        </div>
      ) : (
        <Empty title="No market matches this filter.">
          Try clearing your search term or select "All Market Days".
        </Empty>
      )}
    </div>
  );
}

export function MarketDetail() {
  const s = useDiscoveryState();
  const { marketId } = useParams();
  const m = s.markets.find((m) => m.id === marketId);
  if (!m) return <NotFound />;

  const farmers = s.farmers.filter(
    (f) => f.marketId === m.id && f.state === "Approved",
  );
  const marketProducts = s.products.filter(
    (p) => p.visible && farmers.some((f) => f.id === p.farmerId),
  );

  return (
    <div className="container section">
      <Link className="back-link" to="/markets">
        ← Back to All Markets
      </Link>

      <div className="pe-detail-hero">
        <div className="pe-detail-gallery">
          <img src={images.market} alt={m.name} />
        </div>
        <div className="pe-detail-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              marginBottom: "8px",
            }}
          >
            <span className="pe-pilot-badge">Verified Lahore Venue</span>
            <Favourite id={m.id} />
          </div>
          <h1
            style={{
              fontFamily: "Newsreader",
              fontSize: "38px",
              margin: "8px 0 12px",
              color: "var(--pe-forest)",
            }}
          >
            {m.name}
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "var(--pe-muted)",
              margin: "0 0 16px",
            }}
          >
            {m.area} · Lahore, Pakistan
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              padding: "16px 0",
              borderTop: "1px solid var(--pe-border)",
              borderBottom: "1px solid var(--pe-border)",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
              }}
            >
              <CalendarDays size={16} color="var(--pe-forest)" />
              <strong>{date(m.day)}</strong>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
              }}
            >
              <Clock size={16} color="var(--pe-forest)" />
              <span>{m.hours} · Asia/Karachi (PKT)</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
              }}
            >
              <MapPin size={16} color="var(--pe-forest)" />
              <span>{m.address}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href={`https://maps.google.com/?q=${m.coordinates?.latitude ?? 31.4707},${m.coordinates?.longitude ?? 74.3168}`}
              target="_blank"
              rel="noreferrer"
              className="button secondary"
              style={{ fontSize: "13px" }}
            >
              <MapPin size={15} /> Open Navigation Map
            </a>
            <a
              href="#market-harvest"
              className="button"
              style={{ fontSize: "13px" }}
            >
              Explore Harvest ({marketProducts.length}) <ArrowDown size={15} />
            </a>
          </div>
        </div>
      </div>

      {/* Attending Producers Section */}
      <section className="section">
        <div className="pe-section-header">
          <span className="pe-eyebrow">
            <Users size={14} /> Participating Producers
          </span>
          <h2 className="pe-section-title">Growers attending this venue.</h2>
          <p className="pe-section-lead">
            Meet the independent farmers hosting stalls at {m.name}. Reserve
            produce directly with them for Saturday pickup.
          </p>
        </div>

        {farmers.length ? (
          <div className="pe-growers-grid">
            {farmers.map((f, i) => {
              const prodsCount = s.products.filter(
                (p) => p.farmerId === f.id && p.visible,
              ).length;
              return (
                <Link
                  className="pe-grower-card"
                  key={f.id}
                  to={`/farmers/${f.id}`}
                >
                  <div className="pe-grower-img-box">
                    <img
                      src={i % 2 === 0 ? images.carrots : images.tomatoes}
                      alt={f.name}
                    />
                    <span className="pe-grower-badge">Stall #1{i + 1}</span>
                  </div>
                  <div className="pe-grower-body">
                    <div>
                      <h3>{f.name}</h3>
                      <div className="pe-grower-person">
                        Managed by {f.person}
                      </div>
                      <p className="pe-grower-story">{f.story}</p>
                    </div>
                    <div className="pe-grower-footer">
                      <span>{prodsCount} Produce lines</span>
                      <span>Visit Stall →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty title="Stall roster is being finalized for this date." />
        )}
      </section>

      {/* Available Produce Section */}
      <section id="market-harvest" className="section">
        <div className="pe-section-header">
          <span className="pe-eyebrow">
            <Sprout size={14} /> Available Harvest
          </span>
          <h2 className="pe-section-title">
            Produce available for pre-order at {m.name}.
          </h2>
          <p className="pe-section-lead">
            Lock in your fresh market bags before the Friday 20:00 cutoff.
          </p>
        </div>

        <div className="pe-produce-grid">
          {marketProducts.map((p) => (
            <ProductTile product={p} key={p.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function Farmers() {
  const s = useDiscoveryState();
  const [q, set] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const reduce = useReducedMotion();
  const fs = s.farmers.filter(
    (f) =>
      f.state === "Approved" &&
      `${f.name} ${f.person}`.toLowerCase().includes(q.toLowerCase()) &&
      (!selectedMarket || f.marketId === selectedMarket),
  );
  return (
    <div className="grower-editorial-page">
      <SceneHeader kind="growers" target="grower-directory" />
      <div className="grower-directory-heading" id="grower-directory">
        <div>
          <span>The people behind the produce</span>
          <h2>Meet the growers.</h2>
        </div>
        <p>
          Profiles in this preview are labelled records. The photographs are
          editorial imagery, not portraits of these growers.
        </p>
      </div>
      <div className="filter-bar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Search growers"
            placeholder="A farm, a person, a familiar name"
            value={q}
            onChange={(e) => set(e.target.value)}
          />
        </label>
        <label className="inline-field">
          Market venue
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
          >
            <option value="">All market venues</option>
            {s.markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <span>{fs.length} growers</span>
      </div>
      <div className="grower-editorial-list">
        <AnimatePresence mode="popLayout" initial={false}>
          {fs.map((f, i) => {
            const m = s.markets.find((m) => m.id === f.marketId);
            const count = s.products.filter(
              (p) => p.farmerId === f.id && p.visible,
            ).length;
            return (
              <motion.article
                className="grower-editorial-row"
                key={f.id}
                layout={!reduce}
                initial={{
                  clipPath: reduce ? "inset(0%)" : "inset(0 0 100% 0)",
                }}
                whileInView={{ clipPath: "inset(0%)" }}
                viewport={{ once: true, amount: 0.15 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                transition={{
                  duration: reduce ? 0 : 0.65,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <figure>
                  <img
                    loading="lazy"
                    src={
                      i % 2 === 0
                        ? "/images/grower.jpg"
                        : "/images/market-person.jpg"
                    }
                    alt="Editorial agricultural photograph, not the listed grower"
                  />
                  <figcaption>
                    Editorial photograph /{" "}
                    {i % 2 === 0 ? "Heather Gill" : "Ravi Sharma"}
                  </figcaption>
                </figure>
                <div className="grower-editorial-story">
                  <span>
                    0{i + 1} /{" "}
                    {f.id.startsWith("demo-")
                      ? "Sample grower"
                      : "Grower profile"}
                  </span>
                  <h2>{f.name}</h2>
                  <p className="grower-person">{f.person}</p>
                  <p>{f.story}</p>
                  <dl>
                    <div>
                      <dt>Meet at</dt>
                      <dd>{m?.name ?? "Market to be confirmed"}</dd>
                    </div>
                    <div>
                      <dt>On the stall</dt>
                      <dd>{count} listed products</dd>
                    </div>
                    <div>
                      <dt>Market day</dt>
                      <dd>{m ? date(m.day) : "To be confirmed"}</dd>
                    </div>
                  </dl>
                  <Link to={`/farmers/${f.id}`}>
                    Step into their story
                    <ArrowUpRight size={21} />
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
        {!fs.length && <Empty title="No growers match this search." />}
      </div>
    </div>
  );
}

export function FarmerDetail() {
  const s = useDiscoveryState();
  const { farmerId } = useParams();
  const f = s.farmers.find((f) => f.id === farmerId && f.state === "Approved");
  if (!f) return <NotFound />;

  const m = s.markets.find((m) => m.id === f.marketId);
  const ownProducts = s.products.filter(
    (p) => p.farmerId === f.id && p.visible,
  );
  const farmerReviews = s.reviews.filter((r) => r.visible && r.target === f.id);

  return (
    <div className="container section">
      <Link className="back-link" to="/farmers">
        ← Meet the growers
      </Link>

      <div className="pe-detail-hero" style={{ marginTop: "16px" }}>
        <div className="pe-detail-gallery">
          <img src={images.carrots} alt={f.name} />
        </div>
        <div className="pe-detail-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              marginBottom: "8px",
            }}
          >
            <span className="pe-pilot-badge">Verified Producer</span>
            <Favourite id={f.id} />
          </div>
          <h1
            style={{
              fontFamily: "Newsreader",
              fontSize: "38px",
              margin: "8px 0 6px",
              color: "var(--pe-forest)",
            }}
          >
            {f.name}
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "var(--pe-muted)",
              margin: "0 0 16px",
            }}
          >
            Lead Grower: {f.person} · Lahore Pilot Region
          </p>

          <p
            style={{
              fontSize: "15px",
              lineHeight: "1.6",
              color: "var(--pe-ink)",
              marginBottom: "20px",
            }}
          >
            {f.story}
          </p>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <span
              className="pe-cat-btn"
              style={{ fontSize: "12px", background: "var(--pe-sage)" }}
            >
              ✓ 100% Organically Grown
            </span>
            <span
              className="pe-cat-btn"
              style={{ fontSize: "12px", background: "var(--pe-sage)" }}
            >
              ✓ Family Farm
            </span>
            <span
              className="pe-cat-btn"
              style={{ fontSize: "12px", background: "var(--pe-sage)" }}
            >
              ✓ Direct Stall Handover
            </span>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--pe-border)",
              paddingTop: "16px",
            }}
          >
            <p style={{ fontSize: "14px", margin: "0 0 8px" }}>
              <Store
                size={15}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: "6px",
                }}
              />
              <strong>Stall Location:</strong> Stall #14, near South Gate
            </p>
            <p style={{ fontSize: "14px", margin: "0 0 16px" }}>
              <CalendarDays
                size={15}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: "6px",
                }}
              />
              <strong>Next Market:</strong>{" "}
              {m ? `${m.name} (${date(m.day)})` : "The Orchard Market"}
            </p>
            {m && (
              <Link
                to={`/markets/${m.id}`}
                className="button secondary compact"
              >
                Explore Venue Details →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Produce Catalogue Section */}
      <section className="section">
        <div className="pe-section-header">
          <span className="pe-eyebrow">
            <Sprout size={14} /> Fresh Harvest
          </span>
          <h2 className="pe-section-title">Available from {f.name}.</h2>
          <p className="pe-section-lead">
            Reserve fresh produce directly from this producer. Pre-orders are
            harvested fresh and crated in your name for Saturday collection.
          </p>
        </div>

        <div className="pe-produce-grid">
          {ownProducts.map((p) => (
            <ProductTile product={p} key={p.id} />
          ))}
        </div>
      </section>

      {/* Community Reviews Section */}
      <section className="section">
        <div className="pe-section-header">
          <span className="pe-eyebrow">
            <Star size={14} /> Verified Buyer Feedback
          </span>
          <h2 className="pe-section-title">Words from the market community.</h2>
        </div>

        {farmerReviews.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {farmerReviews.map((r) => (
              <blockquote
                className="review"
                key={r.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--pe-border)",
                  borderRadius: "6px",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "8px",
                    color: "var(--pe-harvest)",
                  }}
                >
                  {[...Array(r.rating)].map((_, idx) => (
                    <Star key={idx} size={14} fill="currentColor" />
                  ))}
                  <strong
                    style={{
                      fontSize: "13px",
                      color: "var(--pe-ink)",
                      marginLeft: "4px",
                    }}
                  >
                    Verified Pickup · Order {r.orderId}
                  </strong>
                </div>
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: "1.55",
                    margin: "0 0 10px",
                  }}
                >
                  “{r.text}”
                </p>
                {r.reply && (
                  <div
                    style={{
                      borderLeft: "3px solid var(--pe-forest)",
                      paddingLeft: "12px",
                      marginTop: "10px",
                      color: "var(--pe-forest)",
                      fontSize: "13.5px",
                    }}
                  >
                    <strong>Farmer Reply:</strong> {r.reply}
                  </div>
                )}
              </blockquote>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--pe-muted)", fontStyle: "italic" }}>
            No customer reviews have been submitted for this stall yet.
          </p>
        )}
      </section>
    </div>
  );
}

export function Products() {
  const s = useDiscoveryState();
  const reduce = useReducedMotion();
  const [params, set] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const farmer = params.get("farmer") ?? "";
  const market = params.get("market") ?? "";
  const day = params.get("day") ?? "";
  const [available, setAvailable] = useState(
    params.get("available") === "true",
  );

  useEffect(() => setAvailable(params.get("available") === "true"), [params]);

  const sort = params.get("sort") ?? "name";
  const max = Number(params.get("max") ?? 1000);

  const update = (key: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(key, v);
    else n.delete(key);
    set(n);
  };

  const products = s.products
    .filter(
      (p) =>
        p.visible &&
        s.farmers.find((f) => f.id === p.farmerId)?.state === "Approved" &&
        p.name.toLowerCase().includes(q.toLowerCase()) &&
        (!category || p.category === category) &&
        (!farmer || p.farmerId === farmer) &&
        (!market ||
          s.farmers.find((f) => f.id === p.farmerId)?.marketId === market) &&
        (!day ||
          s.slots.some(
            (slot) =>
              slot.farmerId === p.farmerId && slot.start.startsWith(day),
          )) &&
        (!available || (p.available && p.stock > p.reserved)) &&
        p.price <= max * 100,
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : a.name.localeCompare(b.name),
    );

  return (
    <div className="produce-gallery-page">
      <SceneHeader kind="produce" target="harvest-filters" />
      {/* Category Pills Strip */}
      <div className="pe-categories-tabs" id="harvest-filters">
        <button
          className={`pe-cat-btn ${!category ? "active" : ""}`}
          onClick={() => update("category", "")}
        >
          All Produce ({s.products.filter((p) => p.visible).length})
        </button>
        {s.categories.map((c) => {
          const count = s.products.filter(
            (p) => p.visible && p.category === c,
          ).length;
          return (
            <button
              key={c}
              className={`pe-cat-btn ${category === c ? "active" : ""}`}
              onClick={() => update("category", c)}
            >
              {c} ({count})
            </button>
          );
        })}
      </div>

      <div className="filter-bar">
        <label className="search">
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => update("q", e.target.value)}
            placeholder="Search produce name, category or description..."
            aria-label="Search produce"
          />
        </label>
        <select
          aria-label="Sort produce"
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="name">Sort by Name</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
        </select>
      </div>

      <div className="catalogue">
        <aside className="filter-rail">
          <h3>Filter Options</h3>
          <Field label="Market Venue">
            <select
              value={market}
              onChange={(e) => update("market", e.target.value)}
            >
              <option value="">All Market Locations</option>
              {s.markets
                .filter((m) => m.active)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Grower / Stall">
            <select
              value={farmer}
              onChange={(e) => update("farmer", e.target.value)}
            >
              <option value="">All Verified Growers</option>
              {s.farmers
                .filter((f) => f.state === "Approved")
                .map((f) => (
                  <option value={f.id} key={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label={`Max Price: ${money(max * 100)}`}>
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={max}
              onChange={(e) => update("max", e.target.value)}
            />
          </Field>

          <label
            className="checkbox"
            style={{
              marginTop: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => {
                setAvailable(e.target.checked);
                update("available", String(e.target.checked));
              }}
            />
            <span>In-stock items only</span>
          </label>

          <button
            className="button quiet"
            onClick={() => set({})}
            style={{ marginTop: "16px" }}
          >
            Reset Filters
          </button>
        </aside>

        <div>
          <p className="small muted" style={{ marginBottom: "16px" }}>
            {products.length} matching offers · review dates and pickup details
            on each listing.
          </p>

          <div className="pe-produce-grid three">
            <AnimatePresence mode="popLayout" initial={false}>
              {products.map((p) => (
                <motion.div
                  key={p.id}
                  layout={!reduce}
                  initial={{
                    opacity: 0,
                    clipPath: reduce ? "inset(0%)" : "inset(0 100% 0 0)",
                  }}
                  animate={{ opacity: 1, clipPath: "inset(0%)" }}
                  exit={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                  transition={{
                    duration: reduce ? 0 : 0.36,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <ProductTile product={p} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {!products.length && (
            <Empty title="No produce matches your active filter.">
              Try adjusting the price slider or select "All Produce".
            </Empty>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductDetail() {
  const s = useDiscoveryState();
  const reduceDetailMotion = useReducedMotion();
  const act = useAction();
  const { productId } = useParams();
  const p = s.products.find((p) => p.id === productId && p.visible);
  const [quantity, set] = useState(1);
  const [added, setAdded] = useState(false);

  if (!p || s.farmers.find((f) => f.id === p.farmerId)?.state !== "Approved")
    return <NotFound />;

  const f = s.farmers.find((f) => f.id === p.farmerId)!;
  const m = s.markets.find((m) => m.id === f.marketId);
  const slots = s.slots.filter(
    (x) => x.farmerId === f.id && new Date(x.start) > new Date(s.now),
  );
  const stock = Math.max(0, p.stock - p.reserved);

  return (
    <div className="container section harvest-detail">
      <Link className="back-link" to="/products">
        ← Back to Produce Catalogue
      </Link>

      <div className="pe-detail-hero" style={{ marginTop: "16px" }}>
        <motion.div className="pe-detail-gallery" initial={reduceDetailMotion ? false : {clipPath:"inset(0 100% 0 0)"}} animate={{clipPath:"inset(0 0% 0 0)"}} transition={{duration:.75,ease:[.76,0,.24,1]}}> 
          <img src={p.image} alt={p.name} />
          <span className="detail-photo-label">{p.category} / {p.unit}</span>
        </motion.div>

        <div className="pe-detail-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              marginBottom: "8px",
            }}
          >
            <Link className="eyebrow" to={`/farmers/${f.id}`}>
              {f.name}
            </Link>
            <Favourite id={p.id} />
          </div>

          <h1
            style={{
              fontFamily: "Newsreader",
              fontSize: "38px",
              margin: "4px 0 10px",
              color: "var(--pe-forest)",
            }}
          >
            {p.name}
          </h1>

          <div
            className="pe-produce-price-row"
            style={{ marginBottom: "16px" }}
          >
            <span className="pe-produce-price-val" style={{ fontSize: "28px" }}>
              {money(p.price)}
            </span>
            <span className="pe-produce-unit" style={{ fontSize: "16px" }}>
              / {p.unit}
            </span>
          </div>

          <p
            style={{
              fontSize: "15px",
              lineHeight: "1.6",
              color: "var(--pe-ink)",
              marginBottom: "20px",
            }}
          >
            {p.description}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "16px 0",
              borderTop: "1px solid var(--pe-border)",
              borderBottom: "1px solid var(--pe-border)",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13.5px",
              }}
            >
              <MapPin size={15} color="var(--pe-forest)" />
              <span>
                {m?.name ?? "Market to be confirmed"} · {m?.address}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13.5px",
              }}
            >
              <CalendarDays size={15} color="var(--pe-forest)" />
              <span>{m?.day ? `Market day: ${m.day}` : "Market date not published"}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13.5px",
              }}
            >
              <Clock size={15} color="var(--pe-forest)" />
              <span>
                Available pickup windows:{" "}
                {slots.length > 0
                  ? `${slots.length} scheduled slots`
                  : "No upcoming windows published"}
              </span>
            </div>
          </div>

          <div className="spread" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600" }}>
                Quantity:
              </span>
              <div className="fw-stepper">
                <button
                  type="button"
                  className="fw-stepper-btn"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => set(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  className="fw-stepper-input"
                  aria-label="Selected quantity"
                  value={quantity}
                  min={1}
                  max={Math.max(1, stock)}
                  readOnly
                />
                <button
                  type="button"
                  className="fw-stepper-btn"
                  aria-label="Increase quantity"
                  disabled={quantity >= stock}
                  onClick={() => set(Math.min(stock, quantity + 1))}
                >
                  +
                </button>
              </div>
              <span style={{ fontSize: "13px", color: "var(--pe-muted)" }}>
                {p.unit}
              </span>
            </div>

            <span
              className={`fw-status-chip ${stock > 0 ? "accepted" : "declined"}`}
            >
              {stock > 0 ? `${stock} available` : "Sold Out"}
            </span>
          </div>

          <div className="actions" style={{ marginBottom: "16px" }}>
            <button
              className="button grow"
              disabled={!p.available || stock < 1}
              onClick={() => {
                if (
                  act(
                    {
                      type: "basket",
                      id: p.id,
                      quantity: (s.basket[p.id] ?? 0) + quantity,
                    },
                    `Added ${quantity} ${p.unit} of ${p.name} to your market bag.`,
                  )
                ) {
                  setAdded(true);
                  setTimeout(() => setAdded(false), 3000);
                }
              }}
            >
              <ShoppingBasket size={18} />
              {added
                ? "Added to Market Bag!"
                : `Add to Bag (${money(p.price * quantity)})`}
            </button>
          </div>

          <p className="small muted" style={{ margin: 0 }}>
            Pay in person at pickup. No online card processing fees. Inspect
            your produce directly at the stall.
          </p>
        </div>
      </div>

      {/* More From This Stall */}
      <section className="section">
        <div className="pe-section-header">
          <span className="pe-eyebrow">
            <Sprout size={14} /> Stall Offerings
          </span>
          <h2 className="pe-section-title">More from {f.name}.</h2>
        </div>

        <div className="pe-produce-grid">
          {s.products
            .filter((x) => x.farmerId === f.id && x.id !== p.id && x.visible)
            .map((x) => (
              <ProductTile product={x} key={x.id} />
            ))}
        </div>
      </section>

      {/* Community Produce Reviews Section */}
      <section className="section">
        <div className="pe-section-header">
          <span className="pe-eyebrow">
            <Star size={14} /> Community feedback
          </span>
          <h2 className="pe-section-title">
            Community tasting notes & reviews.
          </h2>
        </div>

        {s.reviews.filter((r) => r.visible && r.target === p.id).length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {s.reviews
              .filter((r) => r.visible && r.target === p.id)
              .map((r) => (
                <blockquote
                  className="review"
                  key={r.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--pe-border)",
                    borderRadius: "6px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "8px",
                      color: "var(--pe-harvest)",
                    }}
                  >
                    {[...Array(r.rating || 5)].map((_, idx) => (
                      <Star key={idx} size={14} fill="currentColor" />
                    ))}
                    <strong
                      style={{
                        fontSize: "13px",
                        color: "var(--pe-ink)",
                        marginLeft: "4px",
                      }}
                    >
                      Order reference · {r.orderId}
                    </strong>
                  </div>
                  <p
                    style={{
                      fontSize: "15px",
                      lineHeight: "1.55",
                      margin: "0 0 10px",
                    }}
                  >
                    “{r.text}”
                  </p>
                  {r.reply && (
                    <div
                      style={{
                        borderLeft: "3px solid var(--pe-forest)",
                        paddingLeft: "12px",
                        marginTop: "10px",
                        color: "var(--pe-forest)",
                        fontSize: "13.5px",
                      }}
                    >
                      <strong>Farmer Reply:</strong> {r.reply}
                    </div>
                  )}
                </blockquote>
              ))}
          </div>
        ) : (
          <p style={{ color: "var(--pe-muted)", fontStyle: "italic" }}>
            No customer reviews have been recorded for this item yet. Verified
            customers can leave feedback after completing pickup.
          </p>
        )}
      </section>
    </div>
  );
}

export function Auth() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const act = useAction();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const register = pathname.startsWith("/register");
  const choose = pathname === "/register";
  const role: Role = pathname.includes("farmer")
    ? "farmer"
    : pathname.includes("admin")
      ? "admin"
      : "customer";
  const [loginRole, setRole] = useState<Role>(role);
  const [error, setError] = useState("");

  const enter = async (r: Role, creds?: { email: string; pass: string }) => {
    setError("");
    setLoading(true);
    try {
      const email =
        creds?.email ||
        (r === "admin"
          ? "admin@marketlink.pk"
          : r === "farmer"
            ? "tariq@goodearthgrowers.pk"
            : "hira.khan@example.com");
      const pass =
        creds?.pass ||
        (r === "admin"
          ? "AdminPass123!"
          : r === "farmer"
            ? "FarmerPass123!"
            : "CustomerPass123!");
      const session = await loginApi(email, pass);
      act(
        { type: "role", role: session.role || r },
        `Authenticated as ${session.name || session.email}.`,
      );
      const next = params.get("next");
      navigate(
        next &&
          next.startsWith(`/${session.role || r}`) &&
          !next.startsWith("//")
          ? next
          : `/${session.role || r}`,
      );
    } catch (err: any) {
      setError(
        err?.message || "Sign in failed. Please verify your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (d: FormData) => {
    setError("");
    setLoading(true);
    const email = (emailInput || value(d, "email")).trim();
    const password = passwordInput || value(d, "password");

    if (register) {
      const confirmPass = value(d, "confirm");
      if (password !== confirmPass) {
        setError("The passwords must match.");
        setLoading(false);
        return;
      }
      try {
        if (role === "farmer") {
          await registerFarmerApi({
            name: value(d, "name"),
            contactPerson: value(d, "person") || value(d, "name"),
            email,
            password,
            phone: value(d, "phone"),
            address: value(d, "address"),
            businessName: value(d, "name"),
            bio: "Organic field grower registered on Gather & Grow.",
          });
          act(
            { type: "role", role: "farmer" },
            "Farmer account created. Welcome to Gather & Grow!",
          );
          navigate("/farmer");
        } else {
          await registerCustomerApi({
            name: value(d, "name"),
            email,
            password,
            phone: value(d, "phone"),
            address: value(d, "address"),
          });
          act(
            { type: "role", role: "customer" },
            "Customer account created. Welcome to Gather & Grow!",
          );
          navigate("/customer");
        }
      } catch (err: any) {
        setError(
          err?.message ||
            "Registration failed. Please check the provided information.",
        );
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const session = await loginApi(email, password);
        const resolvedRole =
          session.role || (role === "admin" ? "admin" : loginRole);
        act(
          { type: "role", role: resolvedRole },
          `Signed in as ${session.name || resolvedRole}.`,
        );
        const next = params.get("next");
        navigate(
          next && next.startsWith(`/${resolvedRole}`) && !next.startsWith("//")
            ? next
            : `/${resolvedRole}`,
        );
      } catch (err: any) {
        setError(
          err?.message ||
            "Invalid email or password. Please verify your credentials.",
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth">
      <div className="auth-photo">
        <img src={images.market} alt="Produce laid out at a market" />
        <div>
          <p>The Living Market</p>
          <h2>
            Good mornings
            <br />
            start here.
          </h2>
        </div>
      </div>
      <div className="auth-form">
        <p className="eyebrow">
          {role === "admin" ? "Administration" : "A place at the market"}
        </p>
        <h1>
          {choose
            ? "How will you join us?"
            : register
              ? role === "farmer"
                ? "Bring your stall."
                : "Make market day yours."
              : "Welcome back."}
        </h1>
        {choose ? (
          <div className="stack">
            <Link className="choice" to="/register/customer">
              <h3>I’m here for the harvest</h3>
              <p>Discover growers and plan your pickups.</p>
              <ArrowUpRight />
            </Link>
            <Link className="choice" to="/register/farmer">
              <h3>I’m bringing my stall</h3>
              <p>Plan your stock and prepare for market day.</p>
              <ArrowUpRight />
            </Link>
          </div>
        ) : (
          <>
            {!register && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--pe-muted)",
                    alignSelf: "center",
                  }}
                >
                  Quick Fill:
                </span>
                <button
                  type="button"
                  className="pe-cat-btn"
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                  onClick={() => {
                    setEmailInput("hira.khan@example.com");
                    setPasswordInput("CustomerPass123!");
                    setRole("customer");
                  }}
                >
                  Customer Demo
                </button>
                <button
                  type="button"
                  className="pe-cat-btn"
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                  onClick={() => {
                    setEmailInput("tariq@goodearthgrowers.pk");
                    setPasswordInput("FarmerPass123!");
                    setRole("farmer");
                  }}
                >
                  Farmer Demo
                </button>
                {role === "admin" && (
                  <button
                    type="button"
                    className="pe-cat-btn"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                    onClick={() => {
                      setEmailInput("admin@marketlink.pk");
                      setPasswordInput("AdminPass123!");
                      setRole("admin");
                    }}
                  >
                    Admin Demo
                  </button>
                )}
              </div>
            )}
            <Form onSubmit={handleFormSubmit}>
              {register && (
                <>
                  <Field
                    label={
                      role === "farmer" ? "Stall or business name" : "Full name"
                    }
                  >
                    <input name="name" required autoComplete="off" />
                  </Field>
                  {role === "farmer" && (
                    <Field label="Contact person">
                      <input name="person" required autoComplete="off" />
                    </Field>
                  )}
                  <Field label="Contact number">
                    <input
                      name="phone"
                      type="tel"
                      required
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Address">
                    <textarea name="address" required rows={2} />
                  </Field>
                </>
              )}
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="sample@example.test"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
              </Field>
              <Field
                label="Password"
                hint="Password rule: at least 8 characters. Securely hashed on MongoDB Atlas."
              >
                <div className="password-field">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="off"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </Field>
              {register && (
                <Field label="Confirm password">
                  <input
                    name="confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="off"
                  />
                </Field>
              )}
              {!register && role !== "admin" && (
                <Field label="Target Role">
                  <select
                    value={loginRole}
                    onChange={(e) => setRole(e.target.value as Role)}
                  >
                    <option value="customer">Customer Account</option>
                    <option value="farmer">Farmer Stall Account</option>
                  </select>
                </Field>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="button" type="submit" disabled={loading}>
                {loading
                  ? "Verifying credentials..."
                  : register
                    ? "Complete Registration"
                    : "Sign in to Gather & Grow"}
                <ArrowRight size={18} />
              </button>
            </Form>
            <div className="auth-links">
              {register ? (
                <Link to="/login">Already have an account? Sign in</Link>
              ) : (
                <>
                  <Link to="/register">New to the market? Join us</Link>
                  <button
                    className="text-button"
                    onClick={() =>
                      enter(role === "admin" ? "admin" : loginRole)
                    }
                  >
                    Direct Sign In as {role === "admin" ? "Admin" : loginRole}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Info() {
  const { pathname } = useLocation();
  if (pathname === "/help") return <HelpExperience />;
  if (pathname === "/contact")
    return (
      <div className="container section">
        <Heading
          title="Let’s keep in touch."
          intro="Questions about Gather & Grow? Start here."
        />
        <div className="two-col">
          <div>
            <h2>The Gather & Grow team</h2>
            <Notice>
              Verified team email, phone, address and Google Maps location are
              awaiting owner-provided content. No fictional contact details are
              presented as real.
            </Notice>
            <p>
              For reservation questions, review your order and the pickup
              details first.
            </p>
            <Link className="button secondary" to="/customer/orders">
              Open my orders
            </Link>
          </div>
          <div className="contact-map">
            <MapPin size={40} />
            <h2>A real place, soon.</h2>
            <p>
              The required Google Maps embed will be configured when the team
              supplies its public location.
            </p>
          </div>
        </div>
      </div>
    );
  return (
    <div className="container section">
      <div className="story">
        <div>
          <p className="eyebrow">Our purpose</p>
          <h1>
            A closer connection
            <br />
            to market day.
          </h1>
          <p className="lead">
            A great market is about more than what is on the table. It is
            knowing who will be there, what they are bringing, and when you can
            meet them.
          </p>
          <p>
            Gather & Grow brings discovery, pre-orders and pickup planning into one
            shared place for customers, growers and market operators.
          </p>
          <Link className="button" to="/markets">
            Find your next market <ArrowUpRight size={18} />
          </Link>
        </div>
        <img src={images.basket} alt="A basket filled with a garden harvest" />
      </div>
      <section className="section">
        <h2>Made for the whole market.</h2>
        <div className="steps">
          {[
            [
              "For customers",
              "A clearer plan, from the first search to the last pickup.",
            ],
            [
              "For growers",
              "A place to share weekly stock, prepare orders and plan ahead.",
            ],
            [
              "For market operators",
              "Thoughtful tools to manage the people and places that bring it together.",
            ],
          ].map(([h, p]) => (
            <div key={h}>
              <h3>{h}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
      <Notice>
        TechWiz 7 · eGreen Basket. Team biography and final submission content
        will be supplied and reviewed by the owner.
      </Notice>
    </div>
  );
}
export function NotFound() {
  return (
    <div className="container section">
      <Heading
        title="This path has wandered off."
        intro="The page or sample record could not be found."
      />
      <Link className="button" to="/markets">
        Back to the market <ArrowRight size={18} />
      </Link>
    </div>
  );
}
