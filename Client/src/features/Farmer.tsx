import { useState, useMemo } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ClipboardList,
  Sprout,
  Clock,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Edit3,
  Star,
  MapPin,
  Layers,
  Store,
  DollarSign,
  Printer,
  Sliders,
} from "lucide-react";
import {
  useMarket,
  useAction,
  Field,
  Form,
  value,
  Notice,
  Status,
  Empty,
  Confirm,
} from "../components/ui";
import { money, total, date, time, images, activeOrder } from "../data/market";
import type { Product, Order } from "../data/market";
import { Notifications } from "./Customer";
import { NotFound } from "./Public";

export function FarmerPage() {
  const s = useMarket();
  const { pathname } = useLocation();
  const page = pathname.split("/")[2] ?? "";
  const f = s.farmers.find((f) => f.id === s.farmerId)!;
  const ownProducts = s.products.filter((p) => p.farmerId === f.id);
  const ownOrders = s.orders.filter((o) => o.farmerId === f.id);

  // Subpage Routing checks
  if (page === "notifications") return <Notifications />;
  if (page === "products" && pathname.split("/").length > 3)
    return <ProductEditor />;
  if (page === "orders" && pathname.split("/").length > 3)
    return <FarmerOrder />;
  if (page === "access" || f.state !== "Approved")
    return (
      <div className="farmer-workbench container">
        <div className="fw-header">
          <div>
            <span className="fw-status-chip placed">{f.state}</span>
            <h1>Your stall is taking root.</h1>
            <p className="fw-header-sub">
              Your farmer application is under review by the market administrator.
            </p>
          </div>
        </div>
        <div className="fw-prep-card">
          <h3>Verification Status</h3>
          <p>
            {f.state === "Approved"
              ? "Your sample stall is fully approved to publish produce and receive customer reservations."
              : "Publication is restricted. An administrator will review your farm details and verify your market attendance."}
          </p>
          <Link className="button" to="/help">
            Contact Market Support <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    );

  if (page === "profile" || page === "markets")
    return <FarmerProfilePage f={f} page={page} />;
  if (page === "products") return <FarmerCatalogue ownProducts={ownProducts} />;
  if (page === "stock") return <Stock ownProducts={ownProducts} />;
  if (page === "stock-templates") return <StockTemplates ownProducts={ownProducts} />;
  if (page === "pickup-windows") return <PickupWindows f={f} />;
  if (page === "orders") return <FarmerOrdersQueue ownOrders={ownOrders} />;
  if (page === "pickups") return <FarmerPickupsStation ownOrders={ownOrders} />;
  if (page === "insights") return <Reports farmer />;
  if (page === "reviews") return <FarmerReviewsHub f={f} />;

  // Default: Overview Cockpit / Main Workbench
  return <FarmerOverviewCockpit f={f} ownProducts={ownProducts} ownOrders={ownOrders} />;
}

/* =========================================================================
   1. FARMER OVERVIEW COCKPIT
   ========================================================================= */
function FarmerOverviewCockpit({
  f,
  ownProducts,
  ownOrders,
}: {
  f: any;
  ownProducts: Product[];
  ownOrders: Order[];
}) {
  const s = useMarket();
  const act = useAction();
  const pendingOrders = ownOrders.filter((o) => o.stage === "Placed");

  const totalReservedValue = ownOrders
    .filter((o) => !["Cancelled", "Declined"].includes(o.stage))
    .reduce((n, o) => n + total(o.lines), 0);

  const activeReservationsCount = ownOrders.filter(activeOrder).length;

  // Packing progress calculation
  const totalItemsToPack = ownOrders
    .filter(activeOrder)
    .reduce((sum, o) => sum + o.lines.reduce((lsum, l) => lsum + l.quantity, 0), 0);
  const packedItemsCount = s.checklist.filter((id) => id.startsWith("prep-")).length;
  const prepProgressPct = totalItemsToPack > 0 ? Math.min(100, Math.round((packedItemsCount / Math.max(1, ownProducts.length)) * 100)) : 100;

  return (
    <div className="farmer-workbench container">
      {/* Executive Header */}
      <div className="fw-header">
        <div className="fw-header-info">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="fw-status-chip accepted">
              <Sprout size={13} /> Active Producer
            </span>
            <span style={{ fontSize: "13px", color: "var(--fw-muted)" }}>
              Stall #14 · Gulberg & Orchard Markets
            </span>
          </div>
          <h1>{f.name} Workbench</h1>
          <p className="fw-header-sub">
            Welcome back, {f.person}. Market Day preparations are in progress for Saturday, 3 October.
          </p>
        </div>
        <div className="fw-header-actions">
          <Link className="button secondary" to="/farmer/pickups">
            <ClipboardList size={16} /> Packing List ({activeReservationsCount})
          </Link>
          <Link className="button" to="/farmer/stock">
            <Sliders size={16} /> Manage Saturday Stock
          </Link>
        </div>
      </div>

      {/* Next Market Day Hero Card */}
      <div className="fw-next-market-card">
        <div>
          <span className="fw-nm-badge">Next Market Occurrence</span>
          <h2>The Orchard Market · Lahore</h2>
          <p className="fw-nm-location">
            <MapPin size={14} /> Model Town Park Entrance 3, Lahore · Sat 08:00–13:00
          </p>
        </div>
        <div className="fw-nm-stat-block">
          <p className="fw-nm-stat-label">Order Cutoff</p>
          <p className="fw-nm-stat-val">Friday 20:00</p>
          <p className="fw-nm-stat-sub">Asia/Karachi timezone</p>
        </div>
        <div className="fw-nm-stat-block">
          <p className="fw-nm-stat-label">Pre-order Status</p>
          <p className="fw-nm-stat-val" style={{ color: "#a8dba8" }}>Open for Booking</p>
          <p className="fw-nm-stat-sub">{activeReservationsCount} bags reserved</p>
        </div>
        <div>
          <Link
            className="button"
            to="/farmer/pickups"
            style={{ background: "var(--fw-paper)", color: "var(--fw-forest)", border: "none", fontWeight: "600" }}
          >
            Open Prep Station <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      {/* High-Density Operational KPI Grid */}
      <div className="fw-kpi-grid">
        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Awaiting Acceptance</span>
            <div className="fw-kpi-icon" style={{ background: "var(--fw-harvest-light)", color: "var(--fw-harvest)" }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <p className="fw-kpi-val">{pendingOrders.length}</p>
          <div className="fw-kpi-meta">
            {pendingOrders.length > 0 ? (
              <span style={{ color: "var(--fw-harvest)", fontWeight: "600" }}>Requires action before cutoff</span>
            ) : (
              <span style={{ color: "var(--fw-success)" }}>All pending orders cleared</span>
            )}
          </div>
        </div>

        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Reserved Harvest Value</span>
            <div className="fw-kpi-icon">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="fw-kpi-val">{money(totalReservedValue)}</p>
          <div className="fw-kpi-meta">
            <span>Across {ownOrders.filter((o) => !["Cancelled", "Declined"].includes(o.stage)).length} customer bags</span>
          </div>
        </div>

        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Prep & Pack Progress</span>
            <div className="fw-kpi-icon">
              <PackageCheck size={18} />
            </div>
          </div>
          <p className="fw-kpi-val">{prepProgressPct}%</p>
          <div className="fw-kpi-meta">
            <span>{packedItemsCount} of {ownProducts.length} produce varieties packed</span>
          </div>
        </div>

        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Active Catalogue</span>
            <div className="fw-kpi-icon">
              <Store size={18} />
            </div>
          </div>
          <p className="fw-kpi-val">{ownProducts.filter((p) => p.visible).length}</p>
          <div className="fw-kpi-meta">
            <span>{ownProducts.filter((p) => p.available).length} listed as in-stock</span>
          </div>
        </div>
      </div>

      {/* Priority Action Section: Orders Awaiting Response */}
      {pendingOrders.length > 0 && (
        <section className="fw-prep-card" style={{ borderLeft: "4px solid var(--fw-harvest)" }}>
          <div className="fw-prep-header">
            <div>
              <span className="fw-status-chip placed" style={{ marginBottom: "6px" }}>
                Urgent Action Required
              </span>
              <h2 style={{ fontSize: "22px", margin: "4px 0" }}>
                {pendingOrders.length} Sample Pre-order{pendingOrders.length > 1 ? "s" : ""} Awaiting Your Response
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--fw-muted)" }}>
                Accepting these reservations locks customer inventory and schedules packing time.
              </p>
            </div>
            <button
              className="button"
              onClick={() => {
                pendingOrders.forEach((o) => {
                  act({ type: "stage", id: o.id, stage: "Accepted" });
                });
              }}
            >
              <CheckCircle2 size={16} /> Batch Accept All ({pendingOrders.length})
            </button>
          </div>
          <div className="fw-orders-container">
            {pendingOrders.map((o) => (
              <FarmerOrderCard key={o.id} o={o} />
            ))}
          </div>
        </section>
      )}

      {/* Week-at-a-Glance Rhythm & Schedule */}
      <section className="fw-prep-card">
        <div className="fw-prep-header">
          <div>
            <h2 style={{ fontSize: "22px", margin: "0 0 4px" }}>Weekly Market Rhythm</h2>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--fw-muted)" }}>
              Scheduled harvest updates, customer reservation cutoffs, and Saturday market day.
            </p>
          </div>
          <Link className="button secondary compact" to="/farmer/markets">
            View All Markets <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="week-board">
          {[
            { day: "Mon 28", label: "Field prep", active: false },
            { day: "Tue 29", label: "Catalog update", active: false },
            { day: "Wed 30", label: "Inventory check", active: false },
            { day: "Thu 1", label: "Pre-orders live", active: false },
            { day: "Fri 2", label: "Cutoff 20:00", active: true, highlight: "Harvest & pack" },
            { day: "Sat 3", label: "Orchard Market", active: true, market: true },
            { day: "Sun 4", label: "Stall rest", active: false },
          ].map((item) => (
            <div key={item.day} className={item.market ? "market-day" : ""}>
              <p style={{ fontWeight: item.active ? "600" : "400" }}>{item.day}</p>
              {item.market ? (
                <>
                  <Sprout size={24} />
                  <strong>The Orchard</strong>
                  <span style={{ fontSize: "12px" }}>08:00 - 13:00</span>
                  <Link to="/farmer/pickups" style={{ fontSize: "12px", textDecoration: "underline", marginTop: "4px" }}>
                    Pack List
                  </Link>
                </>
              ) : item.highlight ? (
                <>
                  <ClipboardList size={22} />
                  <strong>{item.highlight}</strong>
                  <span style={{ fontSize: "12px" }}>{item.label}</span>
                </>
              ) : (
                <span className="muted" style={{ fontSize: "13px" }}>{item.label}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "24px" }}>
        <Link to="/farmer/orders" className="fw-kpi-card" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <ClipboardList size={20} color="var(--fw-forest)" />
            <h3 style={{ margin: 0, fontSize: "17px" }}>Order Queue</h3>
          </div>
          <p style={{ fontSize: "13px", color: "var(--fw-muted)", margin: 0 }}>
            {ownOrders.length} total orders · Track fulfillment stages
          </p>
        </Link>

        <Link to="/farmer/stock" className="fw-kpi-card" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <Sliders size={20} color="var(--fw-forest)" />
            <h3 style={{ margin: 0, fontSize: "17px" }}>Stock Ledger</h3>
          </div>
          <p style={{ fontSize: "13px", color: "var(--fw-muted)", margin: 0 }}>
            Adjust Saturday quotas & reserved allocations
          </p>
        </Link>

        <Link to="/farmer/reviews" className="fw-kpi-card" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <Star size={20} color="var(--fw-forest)" />
            <h3 style={{ margin: 0, fontSize: "17px" }}>Customer Reviews</h3>
          </div>
          <p style={{ fontSize: "13px", color: "var(--fw-muted)", margin: 0 }}>
            Respond to verified buyer feedback
          </p>
        </Link>
      </div>
    </div>
  );
}

/* =========================================================================
   2. ORDERS QUEUE COMPONENT
   ========================================================================= */
function FarmerOrdersQueue({ ownOrders }: { ownOrders: Order[] }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const act = useAction();

  const stages = ["All", "Placed", "Accepted", "Ready for pickup", "Completed", "Cancelled", "Declined"];

  const filtered = useMemo(() => {
    return ownOrders.filter((o) => {
      const matchStage = filter === "All" || o.stage.toLowerCase() === filter.toLowerCase();
      const matchSearch =
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.lines.some((l) => l.name.toLowerCase().includes(search.toLowerCase()));
      return matchStage && matchSearch;
    });
  }, [ownOrders, filter, search]);

  const placedOrders = ownOrders.filter((o) => o.stage === "Placed");
  const acceptedOrders = ownOrders.filter((o) => o.stage === "Accepted");

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Fulfillment Station</span>
          <h1>Market Day Order Queue</h1>
          <p className="fw-header-sub">
            Review customer reservations, advance prep stages, and hand over bags at the stall.
          </p>
        </div>
        <div className="fw-header-actions">
          {placedOrders.length > 0 && (
            <button
              className="button"
              onClick={() => {
                placedOrders.forEach((o) => act({ type: "stage", id: o.id, stage: "Accepted" }));
              }}
            >
              <CheckCircle2 size={16} /> Accept All Placed ({placedOrders.length})
            </button>
          )}
          {acceptedOrders.length > 0 && (
            <button
              className="button secondary"
              onClick={() => {
                acceptedOrders.forEach((o) => act({ type: "stage", id: o.id, stage: "Ready for pickup" }));
              }}
            >
              <PackageCheck size={16} /> Mark All Packed as Ready ({acceptedOrders.length})
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="fw-action-bar">
        <div className="fw-filter-pills">
          {stages.map((stage) => {
            const count =
              stage === "All"
                ? ownOrders.length
                : ownOrders.filter((o) => o.stage.toLowerCase() === stage.toLowerCase()).length;
            return (
              <button
                key={stage}
                className={`fw-pill ${filter === stage ? "active" : ""}`}
                onClick={() => setFilter(stage)}
              >
                {stage} ({count})
              </button>
            );
          })}
        </div>
        <div className="fw-search-box">
          <Search size={15} />
          <input
            placeholder="Search order ID or produce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Orders List */}
      {filtered.length > 0 ? (
        <div className="fw-orders-container">
          {filtered.map((o) => (
            <FarmerOrderCard key={o.id} o={o} />
          ))}
        </div>
      ) : (
        <Empty
          title="No orders match your filter."
          href="/farmer"
          action="Back to Workbench"
        >
          No reservations found in the {filter} queue.
        </Empty>
      )}
    </div>
  );
}

/* =========================================================================
   ORDER CARD COMPONENT WITH 1-CLICK ACTIONS
   ========================================================================= */
function FarmerOrderCard({ o }: { o: Order }) {
  const s = useMarket();
  const act = useAction();
  const slot = s.slots.find((x) => x.id === o.slotId);

  const stageClass = o.stage.toLowerCase().replace(/\s+/g, "");

  return (
    <article className={`fw-order-card ${o.stage === "Placed" ? "urgent" : o.stage === "Ready for pickup" ? "ready" : ""}`}>
      <div className="fw-order-header">
        <div className="fw-order-id-group">
          <span className="fw-order-ref">{o.id}</span>
          <span className={`fw-status-chip ${stageClass}`}>{o.stage}</span>
          {slot && (
            <span className="fw-order-slot">
              <Clock size={14} /> {date(slot.start)} · {time(slot.start)}–{time(slot.end)}
            </span>
          )}
        </div>
        <div style={{ fontSize: "13px", color: "var(--fw-muted)" }}>
          The Orchard Market · Customer Pickup
        </div>
      </div>

      <div className="fw-order-body">
        <div className="fw-order-lines">
          {o.lines.map((l) => (
            <div key={l.productId} className="fw-order-item-row">
              <span className="fw-order-item-name">{l.name}</span>
              <span className="fw-order-item-qty">
                {l.quantity} × {l.unit} ({money(l.price * l.quantity)})
              </span>
            </div>
          ))}
        </div>

        <div className="fw-order-total-block">
          <div className="fw-order-total-label">Total Value</div>
          <div className="fw-order-total-val">{money(total(o.lines))}</div>
        </div>

        <div className="fw-order-actions-col">
          {o.stage === "Placed" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="button compact"
                onClick={() => act({ type: "stage", id: o.id, stage: "Accepted" }, `Order ${o.id} accepted.`)}
              >
                <CheckCircle2 size={14} /> Accept
              </button>
              <button
                className="button secondary compact"
                style={{ color: "var(--fw-danger)", borderColor: "#f8c8c8" }}
                onClick={() => act({ type: "stage", id: o.id, stage: "Declined" }, `Order ${o.id} declined.`)}
              >
                Decline
              </button>
            </div>
          )}

          {o.stage === "Accepted" && (
            <button
              className="button compact"
              onClick={() => act({ type: "stage", id: o.id, stage: "Ready for pickup" }, `Order ${o.id} ready for pickup.`)}
            >
              <PackageCheck size={14} /> Mark Ready
            </button>
          )}

          {o.stage === "Ready for pickup" && (
            <button
              className="button compact"
              style={{ background: "var(--fw-success)", color: "#fff", borderColor: "var(--fw-success)" }}
              onClick={() => act({ type: "stage", id: o.id, stage: "Completed" }, `Order ${o.id} pickup completed.`)}
            >
              <CheckCircle2 size={14} /> Handed to Customer
            </button>
          )}

          {o.stage === "Completed" && (
            <span style={{ fontSize: "13px", color: "var(--fw-muted)", fontWeight: "500" }}>
              ✓ Completed at Stall
            </span>
          )}

          <Link
            to={`/farmer/orders/${o.id}`}
            style={{ fontSize: "12px", color: "var(--fw-forest)", textDecoration: "underline", marginTop: "4px" }}
          >
            Full receipt & history →
          </Link>
        </div>
      </div>
    </article>
  );
}

/* =========================================================================
   3. PACKING & PREP STATION
   ========================================================================= */
function FarmerPickupsStation({
  ownOrders,
}: {
  ownOrders: Order[];
}) {
  const s = useMarket();
  const act = useAction();

  const active = ownOrders.filter(activeOrder);

  // Aggregate quantities needed across all active reservations
  const quantities = new Map<string, number>();
  active.forEach((o) =>
    o.lines.forEach((l) =>
      quantities.set(l.productId, (quantities.get(l.productId) ?? 0) + l.quantity)
    )
  );

  const totalVarieties = quantities.size;
  const checkedVarieties = [...quantities.keys()].filter((id) =>
    s.checklist.includes(`prep-${id}`)
  ).length;

  const progressPct = totalVarieties > 0 ? Math.round((checkedVarieties / totalVarieties) * 100) : 100;

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Morning Rush Prep</span>
          <h1>Market Day Packing Station</h1>
          <p className="fw-header-sub">
            Aggregate harvest quantities for bag assembly and customer pickup scheduling.
          </p>
        </div>
        <div className="fw-header-actions">
          <button className="button secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print Packing Slips
          </button>
          <button
            className="button"
            onClick={() => {
              // Check all items
              [...quantities.keys()].forEach((id) => {
                if (!s.checklist.includes(`prep-${id}`)) {
                  act({ type: "check", id: `prep-${id}` });
                }
              });
            }}
          >
            <CheckCircle2 size={16} /> Mark All Packed
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="fw-prep-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "20px", margin: 0 }}>Packing Manifest Readiness</h2>
          <strong style={{ fontSize: "18px", color: "var(--fw-forest)" }}>
            {checkedVarieties} of {totalVarieties} produce lines packed ({progressPct}%)
          </strong>
        </div>
        <div className="fw-progress-track">
          <div className="fw-progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>
          Check items as your team crates and weighs them for morning bag packaging.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "24px" }}>
        {/* Produce Aggregate Checklist */}
        <section className="fw-prep-card">
          <h2 style={{ fontSize: "20px", margin: "0 0 16px" }}>1. Harvest Crating List</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[...quantities].map(([id, q]) => {
              const prod = s.products.find((p) => p.id === id);
              const isChecked = s.checklist.includes(`prep-${id}`);
              return (
                <label
                  key={id}
                  className={`fw-prep-item ${isChecked ? "checked" : ""}`}
                  onClick={() => act({ type: "check", id: `prep-${id}` }, "Packing list updated.")}
                >
                  <input type="checkbox" checked={isChecked} readOnly />
                  <div style={{ flexGrow: 1 }}>
                    <strong style={{ fontSize: "15px", display: "block" }}>{prod?.name}</strong>
                    <span style={{ fontSize: "12px", color: "var(--fw-muted)" }}>
                      Category: {prod?.category}
                    </span>
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: "600", color: "var(--fw-forest)" }}>
                    {q} × {prod?.unit}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Customer Bags Schedule */}
        <section className="fw-prep-card">
          <h2 style={{ fontSize: "20px", margin: "0 0 16px" }}>2. Customer Bags by Pickup Slot</h2>
          <div className="fw-orders-container">
            {active.length > 0 ? (
              active
                .sort((a, b) =>
                  (s.slots.find((x) => x.id === a.slotId)?.start ?? "").localeCompare(
                    s.slots.find((x) => x.id === b.slotId)?.start ?? ""
                  )
                )
                .map((o) => <FarmerOrderCard key={o.id} o={o} />)
            ) : (
              <p style={{ color: "var(--fw-muted)", fontStyle: "italic" }}>
                No active pre-orders to assemble at this time.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================================================
   4. STOCK & HARVEST LEDGER
   ========================================================================= */
function Stock({ ownProducts }: { ownProducts: Product[] }) {
  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Inventory Control</span>
          <h1>Saturday Market Stock Ledger</h1>
          <p className="fw-header-sub">
            The Orchard Market · Saturday, 3 October · Adjust live quotas, reservation buffers, and prices.
          </p>
        </div>
        <div className="fw-header-actions">
          <Link className="button secondary" to="/farmer/stock-templates">
            <Layers size={16} /> Recurring Templates
          </Link>
          <Link className="button" to="/farmer/products/new">
            <Plus size={16} /> Add Produce
          </Link>
        </div>
      </div>

      <Notice>
        Published stock and reserved allocations are dynamically balanced. You cannot reduce published stock below active customer reservations.
      </Notice>

      <table className="fw-stock-table" style={{ marginTop: "20px" }}>
        <thead>
          <tr>
            <th>Produce Line</th>
            <th>Category</th>
            <th>Price (PKR / Unit)</th>
            <th>Published Total</th>
            <th>Reserved</th>
            <th>Available</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {ownProducts.map((p) => (
            <StockTableRow key={p.id} p={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StockTableRow({ p }: { p: Product }) {
  const act = useAction();
  const [stock, setStock] = useState(p.stock);
  const [price, setPrice] = useState(p.price / 100);

  const available = Math.max(0, stock - p.reserved);

  const handleStockChange = (newVal: number) => {
    if (newVal < p.reserved) return;
    setStock(newVal);
    act({ type: "product", value: { ...p, stock: newVal } }, `Stock for ${p.name} updated to ${newVal}.`);
  };

  return (
    <tr>
      <td>
        <div className="fw-stock-item-cell">
          <img src={p.image} alt={p.name} className="fw-stock-img" />
          <div>
            <strong>{p.name}</strong>
            <div style={{ fontSize: "12px", color: "var(--fw-muted)" }}>Unit: {p.unit}</div>
          </div>
        </div>
      </td>
      <td>
        <span style={{ fontSize: "13px", color: "var(--fw-muted)" }}>{p.category}</span>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span>PKR</span>
          <input
            type="number"
            value={price}
            style={{ width: "70px", padding: "4px 6px", border: "1px solid var(--fw-border)", borderRadius: "4px" }}
            onChange={(e) => setPrice(Number(e.target.value))}
            onBlur={() => {
              act({ type: "product", value: { ...p, price: Math.round(price * 100) } });
            }}
          />
        </div>
      </td>
      <td>
        <div className="fw-stepper">
          <button
            className="fw-stepper-btn"
            disabled={stock <= p.reserved}
            onClick={() => handleStockChange(stock - 1)}
          >
            -
          </button>
          <input
            className="fw-stepper-input"
            type="number"
            value={stock}
            min={p.reserved}
            onChange={(e) => handleStockChange(Number(e.target.value))}
          />
          <button className="fw-stepper-btn" onClick={() => handleStockChange(stock + 1)}>
            +
          </button>
        </div>
      </td>
      <td>
        <strong style={{ color: "var(--fw-harvest)" }}>{p.reserved}</strong>
      </td>
      <td>
        <strong style={{ color: available > 5 ? "var(--fw-success)" : "var(--fw-danger)" }}>
          {available}
        </strong>
      </td>
      <td>
        <span className={`fw-status-chip ${p.available ? "accepted" : "declined"}`}>
          {p.available ? "Available" : "Sold Out"}
        </span>
      </td>
      <td>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="button quiet compact"
            onClick={() => act({ type: "product", value: { ...p, available: !p.available } })}
          >
            {p.available ? "Mark Out" : "Mark Active"}
          </button>
          <Link className="button secondary compact" to={`/farmer/products/${p.id}/edit`}>
            <Edit3 size={13} />
          </Link>
        </div>
      </td>
    </tr>
  );
}

/* =========================================================================
   5. CATALOGUE & RECURRING TEMPLATES
   ========================================================================= */
function FarmerCatalogue({ ownProducts }: { ownProducts: Product[] }) {
  const act = useAction();
  const [search, setSearch] = useState("");

  const filtered = ownProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Master Produce Catalog</span>
          <h1>Your Harvest Catalogue</h1>
          <p className="fw-header-sub">
            Manage product images, descriptions, pricing units, and discovery visibility.
          </p>
        </div>
        <div className="fw-header-actions">
          <Link className="button" to="/farmer/products/new">
            <Plus size={16} /> Add New Listing
          </Link>
        </div>
      </div>

      <div className="fw-action-bar">
        <div className="fw-search-box" style={{ width: "100%", maxWidth: "360px" }}>
          <Search size={15} />
          <input
            placeholder="Search produce by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="record-list" style={{ marginTop: "16px" }}>
        {filtered.map((p) => (
          <article className="product-management" key={p.id}>
            <img src={p.image} alt={p.name} />
            <div>
              <h3>{p.name}</h3>
              <p>
                {p.category} · {p.unit}
              </p>
              <p style={{ fontSize: "13px", color: "var(--fw-muted)", marginTop: "4px" }}>
                {p.description}
              </p>
            </div>
            <div>
              <strong>{money(p.price)}</strong>
              <p className="small muted">per {p.unit}</p>
            </div>
            <Status>
              {!p.visible ? "Hidden" : p.available ? "Listed" : "Unavailable"}
            </Status>
            <div className="actions">
              <Link className="button secondary compact" to={`/farmer/products/${p.id}/edit`}>
                Edit
              </Link>
              <Confirm
                label={p.visible ? "Archive" : "Restore"}
                title={`${p.visible ? "Archive" : "Restore"} ${p.name}?`}
                onConfirm={() => act({ type: "product", value: { ...p, visible: !p.visible } })}
              >
                Archiving hides this listing from customer discovery. Past order history is preserved.
              </Confirm>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StockTemplates({ ownProducts }: { ownProducts: Product[] }) {
  const s = useMarket();
  const act = useAction();

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Stock Automation</span>
          <h1>Weekly Rhythm Templates</h1>
          <p className="fw-header-sub">
            Save standard weekly harvest quotas and apply them with one click before Saturday.
          </p>
        </div>
      </div>

      <div className="two-col">
        <div>
          <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Saved Harvest Templates</h2>
          {s.templates.map((t) => (
            <section className="paper-panel" key={t.id} style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", margin: "0 0 12px" }}>{t.name}</h3>
              {Object.entries(t.quantities).map(([id, q]) => (
                <div className="receipt-row" key={id} style={{ padding: "4px 0" }}>
                  <span>{s.products.find((p) => p.id === id)?.name}</span>
                  <strong>{q} units</strong>
                </div>
              ))}
              <div style={{ marginTop: "16px" }}>
                <Confirm
                  label="Apply to Saturday Stock"
                  title={`Apply "${t.name}" template?`}
                  onConfirm={() => act({ type: "apply-template", id: t.id }, `Template ${t.name} applied to Saturday.`)}
                >
                  This updates published quantities for Saturday. Protected customer reservations are kept intact.
                </Confirm>
              </div>
            </section>
          ))}
        </div>

        <Form
          onSubmit={(d) =>
            act(
              {
                type: "template",
                name: value(d, "name"),
                quantities: Object.fromEntries(ownProducts.map((p) => [p.id, p.stock])),
              },
              "New weekly template saved."
            )
          }
        >
          <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>Save Current Quantities as Template</h2>
          <Field label="Template Name">
            <input name="name" placeholder="e.g. Standard Peak Season Saturday" required />
          </Field>
          <p style={{ fontSize: "13px", color: "var(--fw-muted)" }}>
            Captures current stock numbers across all your {ownProducts.length} produce varieties.
          </p>
          <button className="button">Save Template</button>
        </Form>
      </div>
    </div>
  );
}

/* =========================================================================
   6. PICKUP WINDOWS & PROFILE
   ========================================================================= */
function PickupWindows({ f }: { f: any }) {
  const s = useMarket();
  const act = useAction();
  const ownSlots = s.slots.filter((x) => x.farmerId === f.id);

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Stall Operations</span>
          <h1>Pickup Windows & Capacity</h1>
          <p className="fw-header-sub">
            Manage staggered customer pickup arrival windows to avoid stall congestion in Lahore.
          </p>
        </div>
      </div>

      <div className="two-col">
        <div>
          <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Scheduled Pickup Windows</h2>
          {ownSlots.map((x) => {
            const activeRes = s.orders.filter((o) => o.slotId === x.id && activeOrder(o)).length;
            return (
              <div className="record-row" key={x.id} style={{ marginBottom: "12px", padding: "16px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px" }}>
                    {date(x.start)} · {time(x.start)}–{time(x.end)}
                  </h3>
                  <p style={{ margin: "0 0 6px", fontSize: "13px", color: "var(--fw-muted)" }}>
                    Order Cutoff: {date(x.cutoff)}, {time(x.cutoff)}
                  </p>
                  <span className="fw-status-chip accepted" style={{ fontSize: "11px" }}>
                    {activeRes} active customer reservation{activeRes !== 1 ? "s" : ""}
                  </span>
                </div>
                <Clock size={20} color="var(--fw-forest)" />
              </div>
            );
          })}
        </div>

        <Form
          onSubmit={(d) =>
            act({
              type: "slot",
              value: {
                id: `demo-s-${crypto.randomUUID().slice(0, 8)}`,
                farmerId: f.id,
                marketId: f.marketId,
                start: `${value(d, "day")}T${value(d, "start")}:00+05:00`,
                end: `${value(d, "day")}T${value(d, "end")}:00+05:00`,
                cutoff: `${value(d, "cutoff")}:00+05:00`,
              },
            })
          }
        >
          <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>Add Scheduled Window</h2>
          <Field label="Market Day Date">
            <input type="date" name="day" defaultValue="2026-10-03" required />
          </Field>
          <div className="two-col">
            <Field label="Window Start">
              <input type="time" name="start" defaultValue="08:00" required />
            </Field>
            <Field label="Window End">
              <input type="time" name="end" defaultValue="09:30" required />
            </Field>
          </div>
          <Field label="Reservation Cutoff">
            <input type="datetime-local" name="cutoff" defaultValue="2026-10-02T20:00" required />
          </Field>
          <button className="button">Add Pickup Window</button>
        </Form>
      </div>
    </div>
  );
}

function FarmerProfilePage({ f, page }: { f: any; page: string }) {
  const s = useMarket();
  const [validated, setValidated] = useState(false);

  return (
    <div className="farmer-workbench container narrow">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Stall Identity</span>
          <h1>{page === "profile" ? "Producer Story & Details" : "Market Presence & Stall Location"}</h1>
          <p className="fw-header-sub">
            Customize how customers discover your farm, your growing practices, and your stall pins in Lahore.
          </p>
        </div>
      </div>

      <Form onSubmit={() => setValidated(true)}>
        {page === "profile" ? (
          <>
            <Field label="Stall / Farm Name">
              <input required defaultValue={f.name} />
            </Field>
            <Field label="Contact Person">
              <input required defaultValue={f.person} />
            </Field>
            <Field label="Your Public Harvest Story">
              <textarea rows={5} required defaultValue={f.story} />
            </Field>
            <Field label="Hero Banner Image URL">
              <input defaultValue={f.image} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Primary Market">
              <select defaultValue={f.marketId}>
                {s.markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.city})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stall Location Instructions">
              <textarea
                required
                rows={3}
                defaultValue="Stall #14, near the South Gate, under the shade trees by the organic dairy section."
              />
            </Field>
            <div className="two-col">
              <Field label="Latitude">
                <input type="number" step="any" defaultValue="31.4707" required />
              </Field>
              <Field label="Longitude">
                <input type="number" step="any" defaultValue="74.3168" required />
              </Field>
            </div>
          </>
        )}
        <button className="button">Save Profile Updates</button>
        {validated && (
          <p role="status" style={{ color: "var(--fw-success)", marginTop: "12px", fontWeight: "500" }}>
            ✓ Stall settings verified and updated in development workspace.
          </p>
        )}
      </Form>
    </div>
  );
}

/* =========================================================================
   7. REVIEWS & COMMUNITY HUB
   ========================================================================= */
function FarmerReviewsHub({ f }: { f: any }) {
  const s = useMarket();
  const act = useAction();

  const farmerReviews = s.reviews.filter(
    (r) => s.orders.find((o) => o.id === r.orderId)?.farmerId === f.id && r.visible
  );

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Community Relations</span>
          <h1>Customer Reviews & Feedback</h1>
          <p className="fw-header-sub">
            Read ratings from completed market pickups and reply to build long-term subscriber trust.
          </p>
        </div>
      </div>

      {farmerReviews.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {farmerReviews.map((r) => (
            <article className="paper-panel review" key={r.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", color: "#c98646" }}>
                    {[...Array(r.rating)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <strong style={{ fontSize: "14px" }}>Verified Customer · {r.orderId}</strong>
                </div>
                <span style={{ fontSize: "12px", color: "var(--fw-muted)" }}>Order completed at Orchard Market</span>
              </div>
              <p style={{ fontSize: "15px", margin: "0 0 12px", color: "var(--fw-ink)" }}>{r.text}</p>
              {r.reply && (
                <blockquote style={{ borderLeft: "3px solid var(--fw-forest)", paddingLeft: "14px", margin: "12px 0", color: "var(--fw-forest)", fontStyle: "italic" }}>
                  <strong>Your Reply:</strong> {r.reply}
                </blockquote>
              )}
              <Form onSubmit={(d) => act({ type: "reply", id: r.id, text: value(d, "reply") }, "Response published to customer.")}>
                <Field label="Public Reply">
                  <textarea name="reply" defaultValue={r.reply} required rows={2} placeholder="Thank the customer or provide harvest context..." />
                </Field>
                <button className="button secondary compact">Publish Reply</button>
              </Form>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No reviews yet." href="/farmer" action="Back to Workbench">
          Completed pickup reviews from customers will appear here.
        </Empty>
      )}
    </div>
  );
}

/* =========================================================================
   8. PRODUCT EDITOR & ORDER DETAIL
   ========================================================================= */
function ProductEditor() {
  const s = useMarket();
  const act = useAction();
  const { productId } = useParams();
  const navigate = useNavigate();
  const p = s.products.find((p) => p.id === productId && p.farmerId === s.farmerId);
  const [image, setImage] = useState(p?.image ?? images.tomatoes);

  if (productId && !p) return <NotFound />;

  return (
    <div className="farmer-workbench container narrow">
      <Link className="back-link" to="/farmer/products">
        ← Back to Catalogue
      </Link>
      <div className="fw-header" style={{ marginTop: "16px" }}>
        <div>
          <h1>{p ? `Edit ${p.name}` : "Add New Produce Listing"}</h1>
          <p className="fw-header-sub">Configure harvest description, pricing, and initial Saturday stock.</p>
        </div>
      </div>

      <Form
        onSubmit={(d) => {
          const product: Product = {
            id: p?.id ?? `demo-p-${crypto.randomUUID().slice(0, 8)}`,
            farmerId: s.farmerId,
            name: value(d, "name"),
            category: value(d, "category"),
            unit: value(d, "unit"),
            price: Math.round(Number(value(d, "price")) * 100),
            stock: Number(value(d, "stock")),
            reserved: p?.reserved ?? 0,
            description: value(d, "description"),
            image,
            visible: p?.visible ?? true,
            available: p?.available ?? true,
          };
          if (act({ type: "product", value: product }, "Produce listing saved.")) {
            navigate("/farmer/products");
          }
        }}
      >
        <Field label="Produce Name">
          <input name="name" required defaultValue={p?.name} placeholder="e.g. Organic Heirloom Tomatoes" />
        </Field>
        <div className="two-col">
          <Field label="Category">
            <select name="category" defaultValue={p?.category}>
              {s.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Selling Unit">
            <input name="unit" required defaultValue={p?.unit ?? "kg"} placeholder="e.g. kg, bunch, box" />
          </Field>
        </div>
        <div className="two-col">
          <Field label="Unit Price (PKR)">
            <input
              type="number"
              name="price"
              min={1}
              step="0.01"
              required
              defaultValue={p ? p.price / 100 : ""}
              placeholder="e.g. 250"
            />
          </Field>
          <Field label="Saturday Published Stock Quantity">
            <input
              type="number"
              name="stock"
              min={p?.reserved ?? 0}
              step={1}
              required
              defaultValue={p?.stock ?? 50}
            />
          </Field>
        </div>
        <Field label="Produce Description">
          <textarea
            name="description"
            rows={4}
            required
            defaultValue={p?.description}
            placeholder="Describe harvest method, freshness, culinary notes..."
          />
        </Field>
        <Field label="Editorial Preview Image">
          <select value={image} onChange={(e) => setImage(e.target.value)}>
            {Object.entries(images).map(([name, url]) => (
              <option key={name} value={url}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <img className="form-image" src={image} alt="Selected produce preview" style={{ borderRadius: "6px", maxHeight: "240px", objectFit: "cover" }} />

        <div className="actions" style={{ marginTop: "24px" }}>
          <button className="button">Save Produce Listing</button>
          <Link className="button quiet" to="/farmer/products">
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}

function FarmerOrder() {
  const s = useMarket();
  const act = useAction();
  const { orderId } = useParams();
  const o = s.orders.find((o) => o.id === orderId && o.farmerId === s.farmerId);

  if (!o) return <NotFound />;
  const slot = s.slots.find((x) => x.id === o.slotId)!;

  return (
    <div className="farmer-workbench container narrow">
      <Link className="back-link" to="/farmer/orders">
        ← Back to Order Queue
      </Link>
      <div className="fw-header" style={{ marginTop: "16px" }}>
        <div>
          <span className="fw-status-chip accepted">{o.stage}</span>
          <h1>Reservation Reference: {o.id}</h1>
          <p className="fw-header-sub">
            {slot ? `${date(slot.start)} · ${time(slot.start)}–${time(slot.end)}` : "Market Day Pickup"}
          </p>
        </div>
      </div>

      <div className="paper-panel">
        <h2 style={{ fontSize: "20px", margin: "0 0 16px" }}>Reserved Produce Breakdown</h2>
        {o.lines.map((l) => (
          <div className="receipt-row" key={l.productId} style={{ padding: "8px 0" }}>
            <div>
              <h3 style={{ margin: "0 0 2px" }}>{l.name}</h3>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>
                {l.quantity} × {l.unit}
              </p>
            </div>
            <strong>{money(l.price * l.quantity)}</strong>
          </div>
        ))}
        <div className="receipt-row total" style={{ marginTop: "16px", paddingTop: "12px", borderTop: "2px solid var(--fw-border)" }}>
          <span>Total Order Value</span>
          <strong>{money(total(o.lines))}</strong>
        </div>

        <div className="actions" style={{ marginTop: "24px" }}>
          {o.stage === "Placed" && (
            <>
              <button
                className="button"
                onClick={() => act({ type: "stage", id: o.id, stage: "Accepted" })}
              >
                Accept Reservation
              </button>
              <button
                className="button secondary"
                style={{ color: "var(--fw-danger)" }}
                onClick={() => act({ type: "stage", id: o.id, stage: "Declined" })}
              >
                Decline & Release Stock
              </button>
            </>
          )}
          {o.stage === "Accepted" && (
            <button
              className="button"
              onClick={() => act({ type: "stage", id: o.id, stage: "Ready for pickup" })}
            >
              Mark Packed & Ready
            </button>
          )}
          {o.stage === "Ready for pickup" && (
            <button
              className="button"
              style={{ background: "var(--fw-success)", color: "#fff" }}
              onClick={() => act({ type: "stage", id: o.id, stage: "Completed" })}
            >
              Complete Stall Handover
            </button>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: "20px", marginTop: "32px", marginBottom: "16px" }}>Timeline & History</h2>
      <div className="paper-panel">
        {o.events.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < o.events.length - 1 ? "1px solid var(--fw-border-subtle)" : "none" }}>
            <span>{e.label}</span>
            <span style={{ fontSize: "13px", color: "var(--fw-muted)" }}>
              {date(e.at)} {time(e.at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   9. FINANCIAL & YIELD REPORTS
   ========================================================================= */
export function Reports({ farmer = false }: { farmer?: boolean }) {
  const s = useMarket();
  const [filter, setFilter] = useState("all");

  const orders = s.orders.filter(
    (o) => (!farmer || o.farmerId === s.farmerId) && (filter === "all" || o.marketId === filter)
  );

  const valid = orders.filter((o) => !["Cancelled", "Declined"].includes(o.stage));
  const sum = valid.reduce((n, o) => n + total(o.lines), 0);

  const ranks = s.products
    .filter((p) => !farmer || p.farmerId === s.farmerId)
    .map((p) => ({
      ...p,
      value: valid.reduce(
        (n, o) =>
          n +
          o.lines
            .filter((l) => l.productId === p.id)
            .reduce((v, l) => v + l.price * l.quantity, 0),
        0
      ),
    }))
    .sort((a, b) => b.value - a.value);

  const max = Math.max(1, ...ranks.map((p) => p.value));

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Yield & Financials</span>
          <h1>{farmer ? "Harvest Performance & Revenue" : "Platform Market Perspective"}</h1>
          <p className="fw-header-sub">
            Real order metrics computed directly from active market reservations.
          </p>
        </div>
        <div>
          <Field label="Market Scope">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Market Locations</option>
              {s.markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="fw-kpi-grid">
        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Total Reservations</span>
            <div className="fw-kpi-icon"><ClipboardList size={18} /></div>
          </div>
          <p className="fw-kpi-val">{orders.length}</p>
          <div className="fw-kpi-meta"><span>Across all recorded customer bags</span></div>
        </div>

        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Gross Reservation Value</span>
            <div className="fw-kpi-icon"><DollarSign size={18} /></div>
          </div>
          <p className="fw-kpi-val">{money(sum)}</p>
          <div className="fw-kpi-meta"><span>Excluding cancelled/declined</span></div>
        </div>

        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Fulfillment Rate</span>
            <div className="fw-kpi-icon"><PackageCheck size={18} /></div>
          </div>
          <p className="fw-kpi-val">
            {orders.length > 0
              ? `${Math.round((valid.length / orders.length) * 100)}%`
              : "100%"}
          </p>
          <div className="fw-kpi-meta"><span>Active customer satisfaction</span></div>
        </div>
      </div>

      {/* Produce Breakdown Chart */}
      <section className="fw-prep-card" style={{ marginTop: "24px" }}>
        <h2 style={{ fontSize: "20px", margin: "0 0 16px" }}>Top Produce by Revenue Contribution</h2>
        <div className="bar-chart">
          {ranks.map((p) => (
            <div className="bar-row" key={p.id} style={{ display: "grid", gridTemplateColumns: "180px 1fr 120px", alignItems: "center", gap: "16px", padding: "8px 0" }}>
              <span style={{ fontWeight: "500", fontSize: "14px" }}>{p.name}</span>
              <div className="bar-track" style={{ height: "12px", background: "var(--fw-sage)", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ width: `${(p.value / max) * 100}%`, height: "100%", background: "var(--fw-forest)", transition: "width 0.4s ease" }} />
              </div>
              <strong style={{ textAlign: "right", fontSize: "15px", color: "var(--fw-forest)" }}>{money(p.value)}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
