import { ContactForm } from "../components/ContactForm";
import { SceneHeader, HelpExperience } from "../components/PublicScenes";
import { motion, useReducedMotion } from "motion/react";
import { useVisitor } from "../data/visitor-context";
import { MarketMap as InteractiveMap } from "../components/MarketMap";
import { lazy, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useLocation,
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
  Store,
  Sprout,
  Users,
  MessageSquare,
} from "lucide-react";
import { CustomerChatModal } from "../components/CustomerChatModal";
import { GrowerDirectory } from "../components/public/GrowerDirectory";
import { ProduceShelf } from "../components/public/ProduceShelf";
import { StallReviews, Stars } from "../components/public/StallReviews";
import type { ShelfFilters } from "../components/public/ProduceShelf";
import {
  useMarket,
  useAction,
  Heading,
  ProductTile,
  Empty,
  Favourite,
  Notice,
} from "../components/ui";
import { date, money } from "../data/market";
import { growerPhoto, marketPhoto } from "../data/photos";

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

  // Keep growers attending markets in the city, located in the city, or registered without an assigned market
  const cityLower = visitor.city?.toLowerCase().trim();
  const farmers = state.farmers.filter((f) => {
    if (ids.has(f.marketId) || (f.marketIds ?? []).some((id) => ids.has(id))) return true;
    if (cityLower && ((f as any).city?.toLowerCase().trim() === cityLower || f.location?.toLowerCase().includes(cityLower))) return true;
    if (!f.marketIds || f.marketIds.length === 0) return true;
    return false;
  });

  const farmerIds = new Set(farmers.map((f) => f.id));
  return {
    ...state,
    markets: markets.length ? markets : state.markets,
    farmers: farmers.length ? farmers : state.farmers,
    products: state.products.filter((p) => farmerIds.size === 0 || farmerIds.has(p.farmerId)),
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
                (f) =>
                  (f.marketId === m.id || (f.marketIds ?? []).includes(m.id)) &&
                  (String(f.state).toLowerCase() === "approved" || f.approvalStatus === "approved"),
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
                    backgroundColor: isSelected ? "#dfe6d8" : "#faf8f2",
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
  const state = useMarket();
  const { marketId } = useParams();
  const m = state.markets.find((m) => m.id === marketId);
  if (!m) return <NotFound />;

  const farmers = state.farmers.filter(
    (f) =>
      (f.marketId === m.id || (f.marketIds ?? []).includes(m.id)) &&
      (String(f.state).toLowerCase() === "approved" || f.approvalStatus === "approved"),
  );
  const marketProducts = state.products.filter(
    (p) => p.visible && farmers.some((f) => f.id === p.farmerId),
  );

  return (
    <div className="container section">
      <Link className="back-link" to="/markets">
        ← Back to All Markets
      </Link>

      <div className="pe-detail-hero">
        <div className="pe-detail-gallery">
          <img src={marketPhoto(m)} alt={m.name} />
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
              const prodsCount = state.products.filter(
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
                      src={growerPhoto(f, i)}
                      alt={f.name}
                    />
                    {f.stall && <span className="pe-grower-badge">Stall {f.stall}</span>}
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
  const state = useMarket();
  const allApproved = state.farmers.filter(
    (f) => String(f.state).toLowerCase() === "approved" || f.approvalStatus === "approved",
  );

  return (
    <div className="grower-editorial-page">
      <SceneHeader kind="growers" target="grower-directory" />
      <GrowerDirectory
        farmers={allApproved}
        markets={state.markets.filter((m) => m.active)}
        products={state.products}
        today={state.now.slice(0, 10)}
      />
    </div>
  );
}

export function FarmerDetail() {
  const state = useMarket();
  const { farmerId } = useParams();
  const [chatOpen, setChatOpen] = useState(false);
  const f = state.farmers.find(
    (f) => f.id === farmerId && (String(f.state).toLowerCase() === "approved" || f.approvalStatus === "approved"),
  );
  if (!f) return <NotFound />;

  const m = state.markets.find((m) => m.id === f.marketId);
  const ownProducts = state.products.filter(
    (p) => p.farmerId === f.id && p.visible,
  );

  return (
    <div className="container section">
      <Link className="back-link" to="/farmers">
        ← Meet the growers
      </Link>

      <div className="pe-detail-hero" style={{ marginTop: "16px" }}>
        <div className="pe-detail-gallery">
          <img src={growerPhoto(f)} alt={f.name} />
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
            Lead grower: {f.person}
            {f.location ? ` · ${f.location}` : ""}
          </p>

          <a className="fd-rating" href="#reviews">
            {f.rating ? (
              <>
                <Stars value={f.rating} size={16} />
                <strong>{f.rating.toFixed(1)}</strong>
                <span>
                  {f.reviewCount ?? 0} review{f.reviewCount === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span>No reviews yet · be the first</span>
            )}
          </a>
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
              <strong>Stall:</strong> {f.stall ? `Stall ${f.stall}` : "Shown on your pickup confirmation"}
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
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {m && (
                <Link
                  to={`/markets/${m.id}`}
                  className="button secondary compact"
                >
                  Explore Venue Details →
                </Link>
              )}
              <button
                type="button"
                className="button compact"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => setChatOpen(true)}
              >
                <MessageSquare size={14} /> Message Grower
              </button>
            </div>
          </div>
        </div>
      </div>

      <CustomerChatModal
        farmerId={f.id}
        farmerName={f.name}
        farmerPerson={f.person}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

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

      <StallReviews farmer={f} />
    </div>
  );
}

export function Products() {
  const s = useMarket();
  const [params, set] = useSearchParams();
  const filters: ShelfFilters = {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    farmer: params.get("farmer") ?? "",
    market: params.get("market") ?? "",
    sort: params.get("sort") ?? "name",
    available: params.get("available") === "true",
  };
  const day = params.get("day") ?? "";
  const max = Number(params.get("max") ?? 0);

  const update = (key: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(key, v);
    else n.delete(key);
    set(n, { replace: key === "q" });
  };

  const approved = s.farmers.filter(
    (f) => String(f.state).toLowerCase() === "approved" || f.approvalStatus === "approved",
  );
  const approvedIds = new Set(approved.map((f) => f.id));
  const shelf = s.products.filter((p) => p.visible && approvedIds.has(p.farmerId));
  const attends = (farmerId: string, marketId: string) => {
    const f = approved.find((x) => x.id === farmerId);
    return !!f && (f.marketId === marketId || (f.marketIds ?? []).includes(marketId));
  };
  const left = (p: (typeof shelf)[number]) => p.stock - p.reserved;
  const q = filters.q.trim().toLowerCase();
  const products = shelf
    .filter(
      (p) =>
        `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q) &&
        (!filters.category || p.category === filters.category) &&
        (!filters.farmer || p.farmerId === filters.farmer) &&
        (!filters.market || attends(p.farmerId, filters.market) || p.marketId === filters.market) &&
        (!day || (p.offers ?? []).some((o) => o.date === day) || s.slots.some((slot) => slot.farmerId === p.farmerId && slot.start.startsWith(day))) &&
        (!filters.available || (p.available && left(p) > 0)) &&
        (!max || p.price <= max * 100),
    )
    .sort((a, b) =>
      filters.sort === "low"
        ? a.price - b.price
        : filters.sort === "high"
          ? b.price - a.price
          : filters.sort === "left"
            ? left(a) / Math.max(1, a.stock) - left(b) / Math.max(1, b.stock)
            : a.name.localeCompare(b.name),
    );
  // Never offer a category filter that leads nowhere.
  const categories = s.categories
    .map((name) => ({ name, count: shelf.filter((p) => p.category === name).length }))
    .filter((c) => c.count > 0);

  return (
    <div className="produce-gallery-page">
      <SceneHeader kind="produce" target="harvest-filters" />
      <ProduceShelf
        products={products}
        allCount={shelf.length}
        categories={categories}
        farmers={approved}
        markets={s.markets.filter((m) => m.active)}
        filters={filters}
        onChange={update}
        onReset={() => set({})}
      />
    </div>
  );
}

export function ProductDetail() {
  const s = useMarket();
  const reduceDetailMotion = useReducedMotion();
  const act = useAction();
  const { productId } = useParams();
  const p = s.products.find((p) => p.id === productId && p.visible);
  const [quantity, set] = useState(1);
  const [added, setAdded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const f = p
    ? s.farmers.find(
        (f) =>
          f.id === p.farmerId &&
          (String(f.state).toLowerCase() === "approved" || f.approvalStatus === "approved"),
      )
    : undefined;

  if (!p || !f) return <NotFound />;

  const m = s.markets.find((m) => m.id === f.marketId || (f.marketIds ?? []).includes(m.id) || m.id === p.marketId);
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
              {money(p.price, p.currency)}
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
                  value={quantity || ""}
                  min={1}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      set(0);
                    } else {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) set(val);
                    }
                  }}
                />
                <button
                  type="button"
                  className="fw-stepper-btn"
                  aria-label="Increase quantity"
                  onClick={() => set(quantity + 1)}
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

          {quantity > stock && (
            <div
              role="alert"
              style={{
                padding: "10px 14px",
                borderRadius: "6px",
                backgroundColor: "#fef3f2",
                border: "1px solid #fecdca",
                color: "#b42318",
                fontSize: "13px",
                lineHeight: "1.4",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div>
                <strong>Stock not available:</strong> You entered {quantity} {p.unit}, but only {stock} {p.unit} {stock === 1 ? "is" : "are"} currently available in stock. Lower the value to continue.
              </div>
              {stock > 0 && (
                <button
                  type="button"
                  className="button secondary"
                  style={{
                    padding: "4px 8px",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                    borderColor: "#b42318",
                    color: "#b42318",
                  }}
                  onClick={() => set(stock)}
                >
                  Set to {stock}
                </button>
              )}
            </div>
          )}

          <div className="actions" style={{ marginBottom: "16px" }}>
            <button
              className="button grow"
              disabled={!p.available || stock < 1 || quantity < 1 || quantity > stock}
              onClick={() => {
                if (quantity > stock || quantity < 1) return;
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
              {quantity > stock
                ? `Stock not available (Max ${stock} ${p.unit})`
                : added
                  ? "Added to Market Bag!"
                  : `Add to Bag (${money(p.price * Math.max(1, quantity), p.currency)})`}
            </button>
            <button
              type="button"
              className="button secondary grow"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "8px" }}
              onClick={() => setChatOpen(true)}
            >
              <MessageSquare size={16} /> Message Grower about this Produce
            </button>
          </div>

          <p className="small muted" style={{ margin: 0 }}>
            Pay in person at pickup. No online card processing fees. Inspect
            your produce directly at the stall.
          </p>
        </div>
      </div>

      <CustomerChatModal
        farmerId={f.id}
        farmerName={f.name}
        farmerPerson={f.person}
        productId={p.id}
        productName={p.name}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

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


    </div>
  );
}


export {AuthPage as Auth} from './AuthPage';

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
        <div className="contact-layout">
          <div>
            <h2>The Gather & Grow team</h2>
            <p>
              Send us a message and the market operations team will pick it up
              from their inbox.
            </p>
            <p>
              For reservation questions, review your order and the pickup
              details first.
            </p>
            <Link className="button secondary" to="/customer/orders">
              Open my orders
            </Link>
          </div>
          <ContactForm />
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
        <img src="/images/harvest.jpg" alt="A basket filled with a garden harvest" />
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
        intro="That page or record could not be found."
      />
      <Link className="button" to="/markets">
        Back to the market <ArrowRight size={18} />
      </Link>
    </div>
  );
}
