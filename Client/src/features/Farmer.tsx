import {FarmerMarkets} from './FarmerMarkets';
import {FarmerSettings} from './FarmerSettings';
import {FarmerApplication} from './FarmerApplication';
import {SupportDesk} from './SupportDesk';
import { useState, useMemo } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ClipboardList,
  Sprout,
  Clock,
  PackageCheck,
  CheckCircle2,
  Search,
  Plus,
  Edit3,
  Star,
  MapPin,
  Layers,
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
  Modal,
} from "../components/ui";
import { money, total, date, time, activeOrder, orderRef } from "../data/market";
import { PHOTO_LIBRARY } from "../data/photos";
import type { Product, Order } from "../data/market";
import { Notifications } from "./Customer";
import { NotFound } from "./Public";
import {

} from "../data/api";
import {
  FarmerOperationalStatsArea,
  FarmerInsightsWorkspace,
} from "./FarmerAnalytics";
import { FarmerInboxWorkspace } from "./FarmerInbox";

export function FarmerPage() {
  const s = useMarket();
  const { pathname } = useLocation();
  const page = pathname.split("/")[2] ?? "";
  const f = s.farmers.find((f) => f.id === s.farmerId)!;
  if (!f) return <div className="container section">Loading your farmer profile…</div>;
  if (page === "support") return <SupportDesk />;
  if (page === "access" || page === "onboarding" || f.state !== "Approved") return <FarmerApplication />;
  const ownProducts = s.products.filter((p) => p.farmerId === f.id);
  const ownOrders = s.orders.filter((o) => o.farmerId === f.id);

  // Subpage Routing checks
  if (page === "notifications") return <Notifications />;
  if (page === "messages" || page === "inbox")
    return <FarmerInboxWorkspace f={f} ownProducts={ownProducts} ownOrders={ownOrders} />;
  if (page === "products" && pathname.split("/").length > 3)
    return <ProductEditor />;
  if (page === "orders" && pathname.split("/").length > 3)
    return <FarmerOrder />;


  if (page === "markets") return <FarmerMarkets />;
  if (page === "profile")
    return <FarmerSettings page={page} />;
  if (page === "products") return <FarmerCatalogue ownProducts={ownProducts} />;
  if (page === "stock") return <Stock ownProducts={ownProducts} />;
  if (page === "stock-templates") return <StockTemplates ownProducts={ownProducts} />;
  if (page === "pickup-windows") return <PickupWindows f={f} />;
  if (page === "orders") return <FarmerOrdersQueue ownOrders={ownOrders} />;
  if (page === "pickups") return <FarmerPickupsStation ownOrders={ownOrders} />;
  if (page === "insights" || page === "reports") return <FarmerInsightsWorkspace />;
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
  const act = useAction();
  const s = useMarket();
  const m = s.metrics;
  const pendingOrders = ownOrders.filter((o) => o.stage === "Placed");
  const activeReservationsCount = ownOrders.filter(activeOrder).length;

  const myMarkets = s.markets.filter((x) => (f.marketIds ?? [f.marketId]).includes(x.id) && x.active);
  const upcoming = myMarkets
    .flatMap((x) => (x.nextDates ?? [x.day]).filter(Boolean).map((d) => ({ market: x, day: d })))
    .sort((a, b) => a.day.localeCompare(b.day) || a.market.name.localeCompare(b.market.name));
  const next = upcoming[0];
  const nextSlots = next
    ? s.slots.filter((x) => x.farmerId === f.id && x.marketId === next.market.id && (x.date ?? x.start.slice(0, 10)) === next.day)
    : [];
  const cutoff = nextSlots.map((x) => x.cutoff).sort()[0];
  const open = cutoff ? new Date(s.now) < new Date(cutoff) : false;
  const nextOrders = next ? ownOrders.filter((o) => activeOrder(o) && o.marketDate === next.day && o.marketId === next.market.id) : [];
  const nextUnits = nextOrders.reduce((n, o) => n + o.lines.reduce((u, l) => u + l.quantity, 0), 0);
  const lowStock = (m?.stock.lowStock ?? []).map((x) => ownProducts.find((p) => p.id === x.productId)?.name).filter(Boolean);
  const soldOut = (m?.stock.soldOut ?? []).map((x) => ownProducts.find((p) => p.id === x.productId)?.name).filter(Boolean);

  // The coming seven days, with this stall's real market days and packing days.
  const today = new Date(s.now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() + i * 86400000);
    const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(d);
    const markets = upcoming.filter((u) => u.day === iso).map((u) => u.market);
    const packing = upcoming.some((u) => {
      const before = new Date(`${u.day}T12:00:00+05:00`).getTime() - 86400000;
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(before)) === iso;
    });
    return { iso, markets, packing };
  });

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div className="fw-header-info">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span className={`fw-status-chip ${f.state === "Approved" ? "accepted" : "placed"}`}>
              <Sprout size={13} /> {f.state === "Approved" ? "Approved grower" : f.state}
            </span>
            <span style={{ fontSize: "13px", color: "var(--fw-muted)" }}>
              {[f.stall && `Stall ${f.stall}`, myMarkets.map((x) => x.name).join(" & ")].filter(Boolean).join(" · ")}
            </span>
          </div>
          <h1>{f.name}</h1>
          <p className="fw-header-sub">
            Welcome back, {String(f.person).split(" ")[0]}.{" "}
            {next
              ? `${date(next.day)} at ${next.market.name}: ${nextOrders.length} order${nextOrders.length === 1 ? "" : "s"} and ${nextUnits} units to pack.`
              : "No market day is scheduled yet. Join a market to start taking pre-orders."}
          </p>
        </div>
        <div className="fw-header-actions">
          <Link className="button secondary" to="/farmer/pickups">
            <ClipboardList size={16} /> Packing list ({activeReservationsCount})
          </Link>
          <Link className="button" to="/farmer/stock">
            <Sliders size={16} /> Manage stock
          </Link>
        </div>
      </div>

      {next && (
        <div className="fw-next-market-card">
          <div>
            <span className="fw-nm-badge">Next market day · {date(next.day)}</span>
            <h2>{next.market.name}</h2>
            <p className="fw-nm-location">
              <MapPin size={14} /> {next.market.address} · {next.market.hours}
            </p>
          </div>
          <div className="fw-nm-stat-block">
            <p className="fw-nm-stat-label">Order cutoff</p>
            <p className="fw-nm-stat-val">{cutoff ? `${date(cutoff)} ${time(cutoff)}` : "Add a pickup window"}</p>
            <p className="fw-nm-stat-sub">Asia/Karachi</p>
          </div>
          <div className="fw-nm-stat-block">
            <p className="fw-nm-stat-label">Pre-orders</p>
            <p className="fw-nm-stat-val" style={{ color: open ? "#a8baa3" : "var(--fw-paper)" }}>
              {open ? "Open" : "Closed for changes"}
            </p>
            <p className="fw-nm-stat-sub">{nextOrders.length} reserved · {nextSlots.length} pickup windows</p>
          </div>
          <div>
            <Link
              className="button"
              to="/farmer/pickups"
              style={{ background: "var(--fw-paper)", color: "var(--fw-forest)", border: "none", fontWeight: "600" }}
            >
              Open pickup station <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      )}

      <div className="fw-briefing">
        <div className="fw-briefing-head">
          <span className="fw-briefing-badge">This week</span>
          <strong>What needs your attention</strong>
        </div>
        <div className="fw-briefing-grid">
          <div>
            <strong>Packing</strong>
            <span>
              {nextUnits
                ? `${nextUnits} units across ${nextOrders.length} orders for ${next ? date(next.day) : "your next market"}.`
                : "Nothing reserved for your next market day yet."}
            </span>
          </div>
          <div>
            <strong>Stock</strong>
            <span>
              {soldOut.length
                ? `${soldOut.join(", ")} sold out. `
                : ""}
              {lowStock.length
                ? `${lowStock.join(", ")} running low.`
                : soldOut.length
                  ? ""
                  : "Every listed product has stock left for walk-up shoppers."}
            </span>
          </div>
          <div>
            <strong>Customers</strong>
            <span>
              {pendingOrders.length ? `${pendingOrders.length} pre-order${pendingOrders.length === 1 ? "" : "s"} to accept. ` : "No pre-orders waiting. "}
              {m?.reviews.awaitingReply ? `${m.reviews.awaitingReply} reviews without a reply.` : ""}
            </span>
          </div>
        </div>
      </div>

      <FarmerOperationalStatsArea />

      {pendingOrders.length > 0 && (
        <section className="fw-prep-card" style={{ borderLeft: "4px solid var(--fw-harvest)" }}>
          <div className="fw-prep-header">
            <div>
              <span className="fw-status-chip placed" style={{ marginBottom: "6px" }}>
                Needs a response
              </span>
              <h2 style={{ fontSize: "22px", margin: "4px 0 6px" }}>
                {pendingOrders.length} pre-order{pendingOrders.length > 1 ? "s" : ""} awaiting your response
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--fw-muted)" }}>
                Accepting confirms the reservation to the customer and adds it to your packing list.
              </p>
            </div>
            <button
              className="button"
              onClick={() => {
                pendingOrders.forEach((o) => act({ type: "stage", id: o.id, stage: "Accepted" }, "Orders accepted."));
              }}
            >
              <CheckCircle2 size={16} /> Accept all ({pendingOrders.length})
            </button>
          </div>
          <div className="fw-orders-container">
            {pendingOrders.map((o) => (
              <FarmerOrderCard key={o.id} o={o} />
            ))}
          </div>
        </section>
      )}

      <section className="fw-prep-card">
        <div className="fw-prep-header">
          <div>
            <h2 style={{ fontSize: "22px", margin: "0 0 4px" }}>Your week</h2>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--fw-muted)" }}>
              Market days and the packing day before each one.
            </p>
          </div>
          <Link className="button secondary compact" to="/farmer/markets">
            My markets <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="week-board">
          {week.map((d) => (
            <div key={d.iso} className={d.markets.length ? "market-day" : ""}>
              <p style={{ fontWeight: d.markets.length || d.packing ? 600 : 400 }}>{date(d.iso)}</p>
              {d.markets.length ? (
                <>
                  <Sprout size={24} />
                  {d.markets.map((x) => (
                    <strong key={x.id}>{x.name}</strong>
                  ))}
                  <span style={{ fontSize: "12px" }}>{d.markets[0].hours}</span>
                  <Link to="/farmer/pickups" style={{ fontSize: "12px", textDecoration: "underline", marginTop: "4px" }}>
                    Packing list
                  </Link>
                </>
              ) : d.packing ? (
                <>
                  <ClipboardList size={22} />
                  <strong>Harvest &amp; pack</strong>
                </>
              ) : (
                <span className="muted" style={{ fontSize: "13px" }}>No market</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="fw-quick-links">
        <Link to="/farmer/orders" className="fw-kpi-card">
          <div className="fw-quick-head">
            <ClipboardList size={20} color="var(--fw-forest)" />
            <h3>Orders</h3>
          </div>
          <p>{activeReservationsCount} open · {ownOrders.length} in total</p>
        </Link>
        <Link to="/farmer/stock" className="fw-kpi-card">
          <div className="fw-quick-head">
            <Sliders size={20} color="var(--fw-forest)" />
            <h3>Dated stock</h3>
          </div>
          <p>{m?.stock.offers ?? 0} upcoming offers · {m?.stock.availableUnits ?? 0} units available</p>
        </Link>
        <Link to="/farmer/reviews" className="fw-kpi-card">
          <div className="fw-quick-head">
            <Star size={20} color="var(--fw-forest)" />
            <h3>Reviews</h3>
          </div>
          <p>
            {m?.reviews.average ? `${m.reviews.average.toFixed(1)} ★ from ${m.reviews.count}` : "No reviews yet"}
            {m?.reviews.awaitingReply ? ` · ${m.reviews.awaitingReply} to answer` : ""}
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
  // Open the queue on the orders that need work; history is one tab away.
  const [filter, setFilter] = useState(ownOrders.some((o) => o.stage === "Placed") ? "Placed" : "All");
  const [search, setSearch] = useState("");
  const act = useAction();

  const stages = ["All", "Placed", "Accepted", "Ready for pickup", "Completed", "Cancelled", "Declined"];

  const filtered = useMemo(() => {
    return ownOrders.filter((o) => {
      const matchStage = filter === "All" || o.stage.toLowerCase() === filter.toLowerCase();
      const matchSearch =
        (o.number ?? o.id).toLowerCase().includes(search.toLowerCase()) ||
        (o.customerName ?? "").toLowerCase().includes(search.toLowerCase()) ||
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
   DECLINE ORDER REASON MODAL
   ========================================================================= */
function DeclineOrderModal({
  order,
  onClose,
  onConfirm,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const PRESET_REASONS = [
    "Harvest shortage / produce out of stock",
    "Produce did not meet harvest quality standards",
    "Stall capacity reached for this pickup window",
    "Unable to harvest in time for market day",
  ];
  const [reason, setReason] = useState(PRESET_REASONS[0]);

  return (
    <Modal title="Decline Reservation" onClose={onClose}>
      <div className="fw-decline-modal-body">
        <p style={{ color: "var(--muted)", margin: "0 0 16px", fontSize: "14px", lineHeight: "1.5" }}>
          Please specify a reason for declining reservation <strong>{orderRef(order)}</strong> for{" "}
          <strong>{order.customerName || "Customer"}</strong>. This reason will be recorded and shared with the customer.
        </p>

        <div
          style={{
            background: "var(--soft)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
              Reserved Items
            </span>
            <strong style={{ fontSize: "13px" }}>{money(total(order.lines))}</strong>
          </div>
          <div style={{ fontSize: "13px", color: "var(--ink)" }}>
            {order.lines.map((l) => `${l.quantity} × ${l.name} (${l.unit})`).join(", ")}
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
            Select a common reason:
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`fw-pill ${reason === preset ? "active" : ""}`}
                style={{ fontSize: "12px", padding: "6px 12px", textAlign: "left" }}
                onClick={() => setReason(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px", color: "var(--ink)" }}>
            Or customize the note to customer:
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={250}
            placeholder="Explain why this reservation cannot be fulfilled…"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: "var(--white)",
              color: "var(--ink)",
              fontSize: "13.5px",
              resize: "vertical",
            }}
            required
          />
          <span style={{ display: "block", textAlign: "right", fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
            {reason.length} / 250 characters
          </span>
        </div>

        <div className="actions" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
          <button type="button" className="button secondary" onClick={onClose}>
            Keep Reservation
          </button>
          <button
            type="button"
            className="button danger"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            Confirm Decline & Release Stock
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================================
   ORDER CARD COMPONENT WITH 1-CLICK ACTIONS
   ========================================================================= */
function FarmerOrderCard({ o }: { o: Order }) {
  const s = useMarket();
  const act = useAction();
  const slot = s.slots.find((x) => x.id === o.slotId);
  const [declineOpen, setDeclineOpen] = useState(false);

  const stageClass = o.stage.toLowerCase().replace(/\s+/g, "");

  return (
    <article className={`fw-order-card ${o.stage === "Placed" ? "urgent" : o.stage === "Ready for pickup" ? "ready" : ""}`}>
      <div className="fw-order-header">
        <div className="fw-order-id-group">
          <span className="fw-order-ref">{orderRef(o)}</span>
          <span className={`fw-status-chip ${stageClass}`}>{o.stage}</span>
          {slot && (
            <span className="fw-order-slot">
              <Clock size={14} /> {date(slot.start)} · {time(slot.start)}–{time(slot.end)}
            </span>
          )}
        </div>
        <div style={{ fontSize: "13px", color: "var(--fw-muted)" }}>
          {[o.marketName || s.markets.find((m) => m.id === o.marketId)?.name, o.customerName].filter(Boolean).join(" · ")}
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
                onClick={() => act({ type: "stage", id: o.id, stage: "Accepted" }, `Order ${orderRef(o)} accepted.`)}
              >
                <CheckCircle2 size={14} /> Accept
              </button>
              <button
                className="button secondary compact"
                style={{ color: "var(--fw-danger)", borderColor: "#f6e8e4" }}
                onClick={() => setDeclineOpen(true)}
              >
                Decline
              </button>
            </div>
          )}

          {o.stage === "Accepted" && (
            <button
              className="button compact"
              onClick={() => act({ type: "stage", id: o.id, stage: "Ready for pickup" }, `Order ${orderRef(o)} is ready for pickup.`)}
            >
              <PackageCheck size={14} /> Mark Ready
            </button>
          )}

          {o.stage === "Ready for pickup" && (
            <button
              className="button compact"
              style={{ background: "var(--fw-success)", color: "#ffffff", borderColor: "var(--fw-success)" }}
              onClick={() => act({ type: "stage", id: o.id, stage: "Completed" }, `Order ${orderRef(o)} collected.`)}
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
      {declineOpen && (
        <DeclineOrderModal
          order={o}
          onClose={() => setDeclineOpen(false)}
          onConfirm={(reason) => {
            act(
              { type: "stage", id: o.id, stage: "Declined", reason },
              `Order ${orderRef(o)} declined and stock released.`
            );
            setDeclineOpen(false);
          }}
        />
      )}
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
          <span className="fw-status-chip accepted">Dated stock</span>
          <h1>Stock for upcoming market days</h1>
          <p className="fw-header-sub">
            <StockDays ownProducts={ownProducts} /> Adjust quantities and prices; stock can never go below what customers have reserved.
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

      <PriceBenchmark ownProducts={ownProducts} />

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
          {p.available ? "Available" : p.stock - p.reserved > 0 ? "Not accepting orders" : "Sold Out"}
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
            Save your usual weekly quantities and apply them to your next market day in one step.
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
                  label="Apply to next market day"
                  title={`Apply "${t.name}" template?`}
                  onConfirm={() => act({ type: "apply-template", id: t.id }, `Template ${t.name} applied to your next market day.`)}
                >
                  This sets published quantities for your next market day. Existing customer reservations are kept.
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
            <input name="name" placeholder="e.g. Peak season weekend" required />
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
  const nextDay = s.markets.find((m) => m.id === f.marketId)?.day ?? "";

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Stall Operations</span>
          <h1>Pickup Windows & Capacity</h1>
          <p className="fw-header-sub">
            Manage staggered customer pickup arrival windows to avoid stall congestion.
          </p>
        </div>
      </div>

      <div className="two-col">
        <div>
          <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Scheduled Pickup Windows</h2>
          {!ownSlots.length && <div className="paper-panel"><h3>No pickup windows published yet</h3><p>Customers cannot reserve from your stall until you add a pickup window. Choose the same market date as your dated stock, and a future reservation cutoff.</p><Link to="/farmer/stock">Check your stock dates</Link></div>}
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
                id: `new-slot-${crypto.randomUUID().slice(0, 8)}`,
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
            <input type="date" name="day" defaultValue={nextDay} required />
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
            <input type="datetime-local" name="cutoff" defaultValue={nextDay ? `${nextDay}T06:00` : ""} required />
          </Field>
          <button className="button">Add Pickup Window</button>
        </Form>
      </div>
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
  const [image, setImage] = useState(p?.image ?? PHOTO_LIBRARY["Market stall"]);

  if (productId && !p) return <NotFound />;

  return (
    <div className="farmer-workbench container narrow">
      <Link className="back-link" to="/farmer/products">
        ← Back to Catalogue
      </Link>
      <div className="fw-header" style={{ marginTop: "16px" }}>
        <div>
          <h1>{p ? `Edit ${p.name}` : "Add New Produce Listing"}</h1>
          <p className="fw-header-sub">Describe the produce, set its price and the stock for your next market day.</p>
        </div>
      </div>

      <Form
        onSubmit={(d) => {
          const product: Product = {
            id: p?.id ?? `new-product-${crypto.randomUUID().slice(0, 8)}`,
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
            <input
              name="unit"
              required
              defaultValue={p?.unit ?? "kg"}
              placeholder="e.g. kg, bunch, box"
              list="selling-units-options"
            />
            <datalist id="selling-units-options">
              <option value="kg">kg (Kilogram)</option>
              <option value="g">g (Gram)</option>
              <option value="bunch">bunch</option>
              <option value="box">box</option>
              <option value="dozen">dozen</option>
              <option value="litre">litre</option>
              <option value="item">item (Single piece)</option>
              <option value="piece">piece</option>
              <option value="jar">jar</option>
              <option value="pack">pack</option>
              <option value="bag">bag</option>
              <option value="basket">basket</option>
              <option value="loaf">loaf</option>
            </datalist>
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
          <Field label="Stock for next market day">
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
        <Field label="Listing photograph">
          <select value={image} onChange={(e) => setImage(e.target.value)}>
            {Object.entries(PHOTO_LIBRARY).map(([name, url]) => (
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
  const [declineOpen, setDeclineOpen] = useState(false);
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
          <h1>Order {orderRef(o)}</h1>
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
                onClick={() => setDeclineOpen(true)}
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
              style={{ background: "var(--fw-success)", color: "#ffffff" }}
              onClick={() => act({ type: "stage", id: o.id, stage: "Completed" })}
            >
              Complete Stall Handover
            </button>
          )}
        </div>
        {declineOpen && (
          <DeclineOrderModal
            order={o}
            onClose={() => setDeclineOpen(false)}
            onConfirm={(reason) => {
              act(
                { type: "stage", id: o.id, stage: "Declined", reason },
                `Order ${orderRef(o)} declined and stock released.`
              );
              setDeclineOpen(false);
            }}
          />
        )}
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

/* =========================================================================
   10. GUIDED MULTI-STEP ONBOARDING WIZARD
   ========================================================================= */
/* =========================================================================
   11. FARMER REVIEWS & REPUTATION HUB
   ========================================================================= */
function FarmerReviewsHub({ f }: { f: any }) {
  const s = useMarket();
  const act = useAction();
  const [replies, setReplies] = useState<Record<string, string>>({});
  const ownReviews = s.reviews.filter((r) => r.target === f.id);
  const avgRating =
    ownReviews.length > 0
      ? (ownReviews.reduce((sum, r) => sum + r.rating, 0) / ownReviews.length).toFixed(1)
      : "—";

  const draftReply = (reviewId: string, rating: number) => {
    const polite =
      rating >= 4
        ? "Thank you so much for visiting our stall! We harvest fresh from our fields at dawn so you enjoy the best flavour and crispness. We look forward to packing your next market bag!"
        : "Thank you for sharing your feedback. We care deeply about the quality of our harvest and would love to make this right on your next market visit. Please speak to us directly at our stall!";
    setReplies((prev) => ({ ...prev, [reviewId]: polite }));
  };

  const handleSendReply = (reviewId: string) => {
    const text = replies[reviewId]?.trim();
    if (!text) return;
    act({ type: "reply", id: reviewId, text }, "Your response has been published to the market community.");
    setReplies((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      return next;
    });
  };

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">
            <Star size={13} fill="currentColor" /> Community Reputation
          </span>
          <h1>Customer Reviews & Ratings</h1>
          <p className="fw-header-sub">
            Verified buyer feedback from completed market pre-orders. Reply directly to build customer relationships.
          </p>
        </div>
      </div>

      <div className="fw-kpi-grid">
        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Average Stall Rating</span>
            <div className="fw-kpi-icon"><Star size={18} fill="currentColor" color="var(--fw-harvest)" /></div>
          </div>
          <p className="fw-kpi-val">{avgRating} / 5.0</p>
          <div className="fw-kpi-meta"><span>Based on verified market pickups</span></div>
        </div>

        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Total Verified Reviews</span>
            <div className="fw-kpi-icon"><CheckCircle2 size={18} /></div>
          </div>
          <p className="fw-kpi-val">{ownReviews.length}</p>
          <div className="fw-kpi-meta"><span>Customers with completed orders</span></div>
        </div>

        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Response Rate</span>
            <div className="fw-kpi-icon"><Sprout size={18} /></div>
          </div>
          <p className="fw-kpi-val">
            {ownReviews.length > 0
              ? `${Math.round((ownReviews.filter((r) => r.reply).length / ownReviews.length) * 100)}%`
              : "100%"}
          </p>
          <div className="fw-kpi-meta"><span>Grower engagement with buyers</span></div>
        </div>
      </div>

      <section style={{ marginTop: "32px" }}>
        <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Customer Feedback Feed</h2>
        {ownReviews.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {ownReviews.map((r) => (
              <div
                key={r.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--fw-border-subtle)",
                  borderRadius: "6px",
                  padding: "24px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--fw-harvest)" }}>
                      {[...Array(r.rating || 5)].map((_, i) => (
                        <Star key={i} size={15} fill="currentColor" />
                      ))}
                      <strong style={{ fontSize: "14px", color: "var(--fw-ink)", marginLeft: "4px" }}>
                        Verified Pickup · Order {r.orderId}
                      </strong>
                    </div>
                  </div>
                  <span className={`fw-status-chip ${r.visible ? "accepted" : "declined"}`}>
                    {r.visible ? "Published" : "Under Moderation"}
                  </span>
                </div>

                <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--fw-ink)", margin: "0 0 16px" }}>
                  “{r.text}”
                </p>

                {r.reply ? (
                  <div
                    style={{
                      background: "var(--fw-sage)",
                      borderLeft: "3px solid var(--fw-forest)",
                      padding: "14px 16px",
                      borderRadius: "0 4px 4px 0",
                      marginTop: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", color: "var(--fw-forest)", fontSize: "13px", fontWeight: "600" }}>
                      <Sprout size={14} /> Your Published Reply
                    </div>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--fw-forest)" }}>{r.reply}</p>
                  </div>
                ) : (
                  <div style={{ borderTop: "1px solid var(--fw-border-subtle)", paddingTop: "16px", marginTop: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--fw-ink)" }}>
                        Reply as {f.name}:
                      </label>
                      <button
                        type="button"
                        className="text-button"
                        style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                        onClick={() => draftReply(r.id, r.rating)}
                      >
                        Draft with Farm Copilot
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        style={{ flexGrow: 1, padding: "8px 12px", border: "1px solid var(--fw-border-subtle)", borderRadius: "4px", fontSize: "14px" }}
                        placeholder="Write a cordial reply to this customer..."
                        value={replies[r.id] || ""}
                        onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })}
                      />
                      <button
                        type="button"
                        className="button compact"
                        disabled={!replies[r.id]?.trim()}
                        onClick={() => handleSendReply(r.id)}
                      >
                        Post Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No customer reviews yet.">
            Reviews will appear here as customers collect their completed market reservations and submit feedback.
          </Empty>
        )}
      </section>
    </div>
  );
}

/** "Sat 26 Sep at The Orchard Market, Sun 27 Sep at …" from the grower's live offers. */
function StockDays({ ownProducts }: { ownProducts: Product[] }) {
  const s = useMarket();
  const days = new Map<string, string>();
  for (const p of ownProducts)
    for (const o of p.offers ?? []) {
      const name = s.markets.find((m) => m.id === o.marketId)?.name;
      if (name) days.set(`${o.date}|${o.marketId}`, `${date(o.date)} at ${name}`);
    }
  const list = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 3).map(([, v]) => v);
  return <>{list.length ? `${list.join(" · ")}.` : "No upcoming offers yet."}</>;
}

/** Compares each product's price with other growers' same-category, same-unit listings. */
function PriceBenchmark({ ownProducts }: { ownProducts: Product[] }) {
  const s = useMarket();
  const rows = ownProducts
    .filter((p) => p.visible && !p.archived)
    .map((p) => {
      const peers = s.products.filter(
        (q) => q.farmerId !== p.farmerId && q.visible && q.category === p.category && q.unit === p.unit,
      );
      if (!peers.length) return null;
      const avg = Math.round(peers.reduce((n, q) => n + q.price, 0) / peers.length);
      return { p, avg, peers: peers.length, diff: Math.round(((p.price - avg) / avg) * 100) };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 4);
  if (!rows.length) return null;
  return (
    <section className="fw-briefing" aria-labelledby="price-benchmark">
      <div className="fw-briefing-head">
        <span className="fw-briefing-badge">Prices</span>
        <strong id="price-benchmark">How your prices compare</strong>
        <span className="small muted">Other growers’ listings in the same category and unit</span>
      </div>
      <div className="fw-briefing-grid">
        {rows.map(({ p, avg, peers, diff }) => (
          <div key={p.id}>
            <strong>{p.name}</strong>
            <span>
              {money(p.price)} / {p.unit} · others average {money(avg)} ({peers} listing{peers === 1 ? "" : "s"}).{" "}
              {diff === 0 ? "Right on the market average." : diff > 0 ? `${diff}% above average.` : `${Math.abs(diff)}% below average.`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
