import { useState, useMemo } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Users,
  Flag,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Search,
  Megaphone,
  Store,
  MapPin,
  Clock,
} from "lucide-react";
import {
  useMarket,
  useAction,
  Field,
  Form,
  value,
  Confirm,
} from "../components/ui";
import { Notifications } from "./Customer";
import { NotFound } from "./Public";
import { money, date, time, total, activeOrder } from "../data/market";
import {
  AdminCommandOperationalStats,
  AdminAnalyticsWorkspace,
} from "./AdminAnalytics";

export function AdminPage() {
  const { pathname } = useLocation();
  const page = pathname.split("/")[2] ?? "";
  const id = pathname.split("/")[3];

  if (page === "notifications") return <Notifications />;
  if (page === "reports" || page === "analytics") return <AdminAnalyticsWorkspace />;
  if (page === "markets" && (id || pathname.includes("/new"))) return <MarketEditor />;
  if (page === "farmers" && id) return <AdminFarmerDetail id={id} />;
  if (page === "farmers") return <AdminFarmersHub />;
  if (page === "customers") return <AdminCustomersHub />;
  if (page === "markets") return <AdminMarketsHub />;
  if (page === "moderation") return <AdminModerationHub />;
  if (page === "categories") return <AdminCategoriesHub />;
  if (page === "announcements") return <AdminAnnouncementsHub />;

  // Default: Admin Command Cockpit
  return <AdminOverviewCockpit />;
}

/* =========================================================================
   1. ADMIN OVERVIEW COCKPIT
   ========================================================================= */
function AdminOverviewCockpit() {
  const s = useMarket();
  const m = s.metrics;
  const pendingFarmers = s.farmers.filter((f) => f.state === "Pending");
  const flagged = s.reviews.filter((r) => r.status === "flagged");
  const pendingReviews = s.reviews.filter((r) => r.status === "pending");
  const hiddenProducts = s.products.filter((p) => !p.visible && !p.archived);
  const openInquiries = s.inquiries.filter((i) => i.status !== "resolved");
  const activeMarkets = s.markets.filter((x) => x.active);

  // The busiest upcoming market day, from real reservations.
  const nextDate = m?.open.nextMarketDate ?? null;
  const focus = nextDate
    ? activeMarkets
        .filter((x) => x.day === nextDate)
        .map((x) => ({
          market: x,
          orders: s.orders.filter((o) => o.marketId === x.id && o.marketDate === nextDate && activeOrder(o)),
        }))
        .sort((a, b) => b.orders.length - a.orders.length)[0]
    : undefined;
  const focusCutoff = focus
    ? s.orders.find((o) => o.marketId === focus.market.id && o.marketDate === nextDate && o.cutoff)?.cutoff
    : undefined;

  const queue = [
    {
      to: "/admin/farmers",
      icon: <Users size={20} />,
      title: "Grower applications",
      body: pendingFarmers.length
        ? `${pendingFarmers.map((f) => f.name).join(", ")} waiting for a decision.`
        : "No applications waiting.",
      count: pendingFarmers.length,
    },
    {
      to: "/admin/moderation",
      icon: <Flag size={20} />,
      title: "Moderation queue",
      body: flagged.length || hiddenProducts.length
        ? `${flagged.length} flagged review${flagged.length === 1 ? "" : "s"} · ${hiddenProducts.length} hidden listing${hiddenProducts.length === 1 ? "" : "s"}`
        : "Nothing flagged.",
      count: flagged.length,
    },
    {
      to: "/admin/markets",
      icon: <Store size={20} />,
      title: "Markets",
      body: `${activeMarkets.length} active · ${m?.open.total ?? 0} open reservations across all markets`,
      count: 0,
    },
  ];

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div className="fw-header-info">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span className="fw-status-chip accepted">
              <ShieldCheck size={13} /> Administrator
            </span>
            <span style={{ fontSize: "13px", color: "var(--fw-muted)" }}>
              {activeMarkets.length} markets · {m?.platform?.farmers.approved ?? 0} growers · {m?.platform?.customers.active ?? 0} customers
            </span>
          </div>
          <h1>Command centre</h1>
          <p className="fw-header-sub">
            {nextDate
              ? `Next market day ${date(nextDate)}: ${m?.open.nextMarketDayOrders ?? 0} reservations, ${m?.open.nextMarketDayUnits ?? 0} units to be collected.`
              : "No upcoming market days have reservations yet."}
          </p>
        </div>
        <div className="fw-header-actions">
          <Link className="button secondary" to="/admin/announcements">
            <Megaphone size={16} /> New announcement
          </Link>
          <Link className="button" to="/admin/markets/new">
            <Plus size={16} /> Add market
          </Link>
        </div>
      </div>

      <div className="fw-briefing">
        <div className="fw-briefing-head">
          <span className="fw-briefing-badge">Today</span>
          <strong>What needs a decision</strong>
        </div>
        <div className="fw-briefing-grid">
          <div>
            <strong>Growers</strong>
            <span>
              {pendingFarmers.length
                ? `${pendingFarmers.length} application${pendingFarmers.length === 1 ? "" : "s"} to review.`
                : "Every registered grower has a decision."}
            </span>
          </div>
          <div>
            <strong>Community</strong>
            <span>
              {pendingReviews.length
                ? `${pendingReviews.length} review${pendingReviews.length === 1 ? "" : "s"} waiting for approval.`
                : flagged.length
                ? `${flagged.length} review${flagged.length === 1 ? "" : "s"} flagged for abuse or spam.`
                : `No flagged reviews. Average rating ${m?.reviews.average?.toFixed(1) ?? "—"} from ${m?.reviews.count ?? 0} reviews.`}
            </span>
          </div>
          <div>
            <strong>Inbox</strong>
            <span>
              {openInquiries.length
                ? `${openInquiries.length} contact message${openInquiries.length === 1 ? "" : "s"} open.`
                : "No open contact messages."}
            </span>
          </div>
        </div>
      </div>

      <AdminCommandOperationalStats />

      <div className="adm-overview-grid">
        <div>
          <h2 style={{ fontSize: "20px", margin: "0 0 16px" }}>Action queues</h2>
          {queue.map((q) => (
            <Link key={q.to} className="adm-action-card" to={q.to}>
              <div className="adm-action-left">
                <div className="adm-action-icon">{q.icon}</div>
                <div>
                  <h3 style={{ margin: "0 0 2px", fontSize: "16px" }}>{q.title}</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>{q.body}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {q.count > 0 && <span className="fw-status-chip placed">{q.count} to review</span>}
                <ArrowUpRight size={17} color="var(--fw-muted)" />
              </div>
            </Link>
          ))}
        </div>

        <aside className="adm-sidebar-card">
          {focus ? (
            <>
              <span className="fw-nm-badge" style={{ color: "#dfe6d8" }}>Busiest market · {date(nextDate!)}</span>
              <h2 style={{ fontSize: "24px", color: "var(--fw-paper)", margin: "6px 0 4px" }}>{focus.market.name}</h2>
              <p style={{ fontSize: "13px", color: "#c3ccb8", margin: "0 0 16px" }}>
                {focus.market.area} · {focus.market.hours}
              </p>
              <div className="adm-focus-rows">
                <div>
                  <span>Attending growers</span>
                  <strong>{focus.market.attendingFarmerCount ?? 0}</strong>
                </div>
                <div>
                  <span>Reservations</span>
                  <strong>{focus.orders.length}</strong>
                </div>
                <div>
                  <span>Reserved value</span>
                  <strong>{money(focus.orders.reduce((n, o) => n + (o.total ?? total(o.lines)), 0))}</strong>
                </div>
                {focusCutoff && (
                  <div>
                    <span>Changes close</span>
                    <strong>{date(focusCutoff)} {time(focusCutoff)}</strong>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="fw-nm-badge" style={{ color: "#dfe6d8" }}>Markets</span>
              <h2 style={{ fontSize: "24px", color: "var(--fw-paper)", margin: "6px 0 16px" }}>No reservations yet</h2>
            </>
          )}
          <div style={{ marginTop: "20px" }}>
            <Link
              className="button"
              to="/admin/markets"
              style={{ background: "var(--fw-paper)", color: "var(--fw-forest)", border: "none", width: "100%", justifyContent: "center" }}
            >
              Manage markets <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
      </div>

      <section className="fw-prep-card">
        <div className="fw-prep-header">
          <div>
            <h2 style={{ fontSize: "20px", margin: "0 0 4px" }}>Announcements</h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>
              Shown to every customer and grower while published.
            </p>
          </div>
          <Link className="button secondary compact" to="/admin/announcements">
            Manage <ArrowUpRight size={15} />
          </Link>
        </div>
        {s.announcements.length ? (
          s.announcements.map((a) => (
            <div key={a.id} className="record-row" style={{ padding: "14px 18px", marginBottom: "8px" }}>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                  <span className={`fw-status-chip ${a.published ? "accepted" : "declined"}`} style={{ fontSize: "11px" }}>
                    {a.published ? "Published" : "Archived"}
                  </span>
                  <strong style={{ fontSize: "15px" }}>{a.title}</strong>
                  {a.at && <span className="small muted">{date(a.at)}</span>}
                </div>
                <p style={{ margin: 0, fontSize: "13.5px", color: "var(--fw-muted)" }}>{a.body}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">No announcements yet.</p>
        )}
      </section>
    </div>
  );
}

/* =========================================================================
   2. PRODUCER DIRECTORY & ONBOARDING HUB
   ========================================================================= */
function AdminFarmersHub() {
  const s = useMarket();
  const act = useAction();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const pendingList = s.farmers.filter((f) => f.state === "Pending");

  const filtered = useMemo(() => {
    return s.farmers.filter((f) => {
      const matchSearch =
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.person.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "All" || f.state === filter;
      return matchSearch && matchFilter;
    });
  }, [s.farmers, search, filter]);

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Producer Registry</span>
          <h1>Farmer Stalls & Credentials</h1>
          <p className="fw-header-sub">
            Verify farming practices, review public profiles, and manage stall approvals.
          </p>
        </div>
        <div className="fw-header-actions">
          {pendingList.length > 0 && (
            <button
              className="button"
              onClick={() => {
                pendingList.forEach((f) => {
                  act({ type: "farmer", value: { ...f, state: "Approved" } });
                });
              }}
            >
              <CheckCircle2 size={16} /> Batch Approve All Pending ({pendingList.length})
            </button>
          )}
        </div>
      </div>

      <div className="fw-action-bar">
        <div className="fw-filter-pills">
          {["All", "Pending", "Approved", "Suspended"].map((state) => {
            const count = state === "All" ? s.farmers.length : s.farmers.filter((f) => f.state === state).length;
            return (
              <button
                key={state}
                className={`fw-pill ${filter === state ? "active" : ""}`}
                onClick={() => setFilter(state)}
              >
                {state} ({count})
              </button>
            );
          })}
        </div>
        <div className="fw-search-box">
          <Search size={15} />
          <input
            placeholder="Search farm name or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="record-list" style={{ marginTop: "16px" }}>
        {filtered.map((f: any) => {
          const m = s.markets.find((m) => m.id === f.marketId);
          const prods = s.products.filter((p) => p.farmerId === f.id);
          return (
            <article key={f.id} className="record-row" style={{ padding: "18px 20px" }}>
              <span className="avatar" style={{ background: "var(--fw-sage)", color: "var(--fw-forest)", fontWeight: "600" }}>
                {f.name[0]}
              </span>
              <div className="grow">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <h3 style={{ margin: 0, fontSize: "17px" }}>{f.name}</h3>
                  <span className={`fw-status-chip ${f.state.toLowerCase()}`}>{f.state}</span>
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>
                  Lead: {f.person} · Assigned Venue: {m ? m.name : "Unassigned"} · {prods.length} Produce Lines
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {f.state === "Pending" && (
                  <button
                    className="button compact"
                    onClick={() => act({ type: "farmer", value: { ...f, state: "Approved" } }, `${f.name} approved.`)}
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                )}
                {f.state === "Approved" && (
                  <button
                    className="button secondary compact"
                    style={{ color: "var(--fw-danger)", borderColor: "#f6e8e4" }}
                    onClick={() => act({ type: "farmer", value: { ...f, state: "Suspended" } }, `${f.name} suspended.`)}
                  >
                    Suspend
                  </button>
                )}
                {f.state === "Suspended" && (
                  <button
                    className="button compact"
                    onClick={() => act({ type: "farmer", value: { ...f, state: "Approved" } }, `${f.name} restored.`)}
                  >
                    Restore
                  </button>
                )}
                <Link className="button quiet compact" to={`/admin/farmers/${f.id}`}>
                  Inspect Details →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function AdminFarmerDetail({ id }: { id: string }) {
  const s = useMarket();
  const act = useAction();
  const f = s.farmers.find((f) => f.id === id);

  if (!f) return <NotFound />;
  const m = s.markets.find((m) => m.id === f.marketId);
  const ownProducts = s.products.filter((p) => p.farmerId === f.id);

  return (
    <div className="farmer-workbench container narrow">
      <Link className="back-link" to="/admin/farmers">
        ← Back to Producer Directory
      </Link>
      <div className="fw-header" style={{ marginTop: "16px" }}>
        <div>
          <span className={`fw-status-chip ${f.state.toLowerCase()}`}>{f.state}</span>
          <h1>{f.name}</h1>
          <p className="fw-header-sub">Contact: {f.person} · Lahore, Pakistan</p>
        </div>
      </div>

      <div className="paper-panel">
        <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Stall Application Details</h2>
        <dl className="definition-list">
          <dt>Contact Person</dt>
          <dd>{f.person}</dd>
          <dt>Allocated Market</dt>
          <dd>{m ? `${m.name} (${m.area})` : "None"}</dd>
          <dt>Public Farm Story</dt>
          <dd style={{ lineHeight: "1.6" }}>{f.story}</dd>
          <dt>Catalogue Items</dt>
          <dd>{ownProducts.length} active items listed</dd>
        </dl>

        <div className="actions" style={{ marginTop: "24px" }}>
          {f.state !== "Approved" && (
            <Confirm
              label="Approve Producer"
              title={`Approve ${f.name}?`}
              onConfirm={() => act({ type: "farmer", value: { ...f, state: "Approved" } }, `${f.name} approved.`)}
            >
              Approval allows this producer to publish Saturday stock and accept customer pre-orders.
            </Confirm>
          )}
          {f.state !== "Suspended" && (
            <Confirm
              label="Suspend Producer"
              title={`Suspend ${f.name}?`}
              danger
              onConfirm={() => act({ type: "farmer", value: { ...f, state: "Suspended" } }, `${f.name} suspended.`)}
            >
              Suspension disables customer discovery and prevents new bookings while preserving historical records.
            </Confirm>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. MULTI-MARKET COORDINATION HUB
   ========================================================================= */
function AdminMarketsHub() {
  const s = useMarket();
  const act = useAction();
  const [search, setSearch] = useState("");

  const filtered = s.markets.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Venue Network</span>
          <h1>Multi-Market Coordination</h1>
          <p className="fw-header-sub">
            Configure market locations, operating hours, attendance rosters, and customer cutoff schedules.
          </p>
        </div>
        <div className="fw-header-actions">
          <Link className="button" to="/admin/markets/new">
            <Plus size={16} /> Add Market Venue
          </Link>
        </div>
      </div>

      <div className="fw-action-bar">
        <div className="fw-search-box" style={{ width: "100%", maxWidth: "360px" }}>
          <Search size={15} />
          <input
            placeholder="Search market venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="adm-market-grid">
        {filtered.map((m) => {
          const attendingFarmers = s.farmers.filter((f) => f.marketId === m.id && f.state === "Approved");
          return (
            <article key={m.id} className={`adm-market-card ${!m.active ? "closed" : ""}`}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                  <span className={`fw-status-chip ${m.active ? "accepted" : "declined"}`}>
                    {m.active ? "Operating" : "Temporarily Closed"}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--fw-muted)" }}>{m.area}</span>
                </div>
                <h2 style={{ fontSize: "22px", margin: "6px 0" }}>{m.name}</h2>
                <p style={{ fontSize: "13px", color: "var(--fw-muted)", margin: "0 0 12px" }}>
                  <MapPin size={13} /> {m.address}
                </p>
                <div style={{ fontSize: "13px", margin: "0 0 16px", color: "var(--fw-ink)" }}>
                  <Clock size={13} /> <strong>{m.day}</strong> · {m.hours}
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--fw-border-subtle)", paddingTop: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "12px" }}>
                  <span>Approved Stalls</span>
                  <strong>{attendingFarmers.length} producers</strong>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Link className="button secondary compact" to={`/admin/markets/${m.id}/edit`} style={{ flexGrow: 1, textAlign: "center" }}>
                    Edit Schedule
                  </Link>
                  <Confirm
                    label={m.active ? "Close" : "Reopen"}
                    title={m.active ? `Close ${m.name}?` : `Reopen ${m.name}?`}
                    danger={m.active}
                    onConfirm={() => act({ type: "market", value: { ...m, active: !m.active } })}
                  >
                    Closing venue hides public discovery while preserving historical reservations.
                  </Confirm>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MarketEditor() {
  const s = useMarket();
  const act = useAction();
  const { marketId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const m = s.markets.find((m) => m.id === marketId);

  return (
    <div className="farmer-workbench container narrow">
      <Link className="back-link" to="/admin/markets">
        ← Back to Market Venues
      </Link>
      <div className="fw-header" style={{ marginTop: "16px" }}>
        <div>
          <h1>{m ? `Edit ${m.name}` : "Create New Market Location"}</h1>
          <p className="fw-header-sub">Set operating day, time hours, Lahore area, and map location.</p>
        </div>
      </div>

      <Form
        onSubmit={(d) => {
          if (value(d, "end") <= value(d, "start")) {
            setError("Closing time must be after opening time.");
            return;
          }
          if (
            act({
              type: "market",
              value: {
                id: m?.id ?? `new-market-${crypto.randomUUID().slice(0, 8)}`,
                name: value(d, "name"),
                area: value(d, "area"),
                address: value(d, "address"),
                day: value(d, "day"),
                hours: `${value(d, "start")}–${value(d, "end")}`,
                active: m?.active ?? true,
              },
            })
          ) {
            navigate("/admin/markets");
          }
        }}
      >
        <Field label="Market Venue Name">
          <input name="name" required defaultValue={m?.name} placeholder="e.g. The Orchard Market" />
        </Field>
        <Field label="Neighbourhood / District">
          <input name="area" required defaultValue={m?.area} placeholder="e.g. Model Town / Gulberg" />
        </Field>
        <Field label="Address / Venue Instructions">
          <textarea
            name="address"
            required
            defaultValue={m?.address}
            rows={2}
            placeholder="e.g. Model Town Park Entrance 3, Circular Rd, Lahore"
          />
        </Field>
        <Field label="Market Operating Day">
          <input name="day" required defaultValue={m?.day ?? "Every Saturday"} />
        </Field>
        <div className="two-col">
          <Field label="Opens (PKT)">
            <input name="start" type="time" defaultValue={m?.hours.split("–")[0] ?? "08:00"} required />
          </Field>
          <Field label="Closes (PKT)">
            <input name="end" type="time" defaultValue={m?.hours.split("–")[1] ?? "13:00"} required />
          </Field>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions" style={{ marginTop: "24px" }}>
          <button className="button">Save Market Venue</button>
          <Link to="/admin/markets" className="button quiet">
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}

/* =========================================================================
   4. CONTENT STEWARDSHIP & MODERATION HUB
   ========================================================================= */
function AdminModerationHub() {
  const s = useMarket();
  const act = useAction();
  const [tab, setTab] = useState<"all" | "products" | "reviews">("all");
  const reviewGroups = {
    pending: s.reviews.filter((r) => r.status === "pending"),
    approved: s.reviews.filter((r) => r.visible),
    hidden: s.reviews.filter((r) => !r.visible && r.status !== "pending"),
  };
  // Open on the queue when something is waiting.
  const [reviewTab, setReviewTab] = useState<"pending" | "approved" | "hidden">(
    reviewGroups.pending.length ? "pending" : "approved",
  );

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Content Moderation</span>
          <h1>Market Quality & Safety Review</h1>
          <p className="fw-header-sub">
            Review produce listings, organic claims, and customer reviews to uphold community standards.
          </p>
        </div>
      </div>

      <div className="fw-action-bar">
        <div className="fw-filter-pills">
          <button className={`fw-pill ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
            All Items ({s.products.length + s.reviews.length})
          </button>
          <button className={`fw-pill ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>
            Produce Listings ({s.products.length})
          </button>
          <button className={`fw-pill ${tab === "reviews" ? "active" : ""}`} onClick={() => setTab("reviews")}>
            Customer Reviews ({s.reviews.length})
          </button>
        </div>
      </div>

      {(tab === "all" || tab === "products") && (
        <section style={{ marginTop: "24px" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "14px" }}>Produce Listings Moderation</h2>
          <div className="record-list">
            {s.products.map((p) => (
              <div key={p.id} className="record-row" style={{ padding: "14px 18px" }}>
                <img src={p.image} alt={p.name} style={{ width: "48px", height: "48px", borderRadius: "4px", objectFit: "cover" }} />
                <div className="grow">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong style={{ fontSize: "15px" }}>{p.name}</strong>
                    <span className={`fw-status-chip ${p.visible ? "accepted" : "declined"}`}>
                      {p.visible ? "Public" : "Hidden"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>
                    {p.category} · {p.description}
                  </p>
                </div>
                <Confirm
                  label={p.visible ? "Hide Listing" : "Make Visible"}
                  title={`Change visibility for ${p.name}?`}
                  danger={p.visible}
                  onConfirm={() => act({ type: "moderate", kind: "product", id: p.id })}
                >
                  Hiding will remove this product from public catalogue discovery immediately.
                </Confirm>
              </div>
            ))}
          </div>
        </section>
      )}

      {(tab === "all" || tab === "reviews") && (
        <section style={{ marginTop: "32px" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "6px" }}>Customer reviews</h2>
          <p style={{ margin: "0 0 14px", fontSize: "13.5px", color: "var(--fw-muted)" }}>
            New reviews stay hidden until you approve them. Approved reviews appear on the grower’s stall and count
            towards their stars.
          </p>
          <div className="fw-filter-pills" style={{ marginBottom: "14px" }}>
            {(["pending", "approved", "hidden"] as const).map((k) => (
              <button key={k} className={`fw-pill ${reviewTab === k ? "active" : ""}`} onClick={() => setReviewTab(k)}>
                {k === "pending" ? "Waiting for approval" : k === "approved" ? "Published" : "Rejected / hidden"} (
                {reviewGroups[k].length})
              </button>
            ))}
          </div>
          <div className="record-list">
            {reviewGroups[reviewTab].slice(0, 60).map((r) => {
              const subject =
                r.targetType === "product"
                  ? s.products.find((p) => p.id === r.target)?.name
                  : s.farmers.find((f) => f.id === r.target)?.name;
              return (
                <div key={r.id} className="record-row" style={{ padding: "14px 18px", alignItems: "flex-start" }}>
                  <div className="grow">
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        className={`fw-status-chip ${r.status === "pending" ? "placed" : r.visible ? "accepted" : "declined"}`}
                      >
                        {r.status === "pending" ? "Waiting" : r.visible ? "Published" : r.status === "rejected" ? "Rejected" : "Hidden"}
                      </span>
                      <strong>
                        {"★".repeat(r.rating)}
                        <span style={{ color: "var(--fw-muted)" }}>{"★".repeat(5 - r.rating)}</span> · {subject ?? "Unknown"}
                      </strong>
                      {r.verified && <span className="fw-status-chip accepted">Verified pickup</span>}
                    </div>
                    <p style={{ margin: "0 0 4px", fontSize: "14px" }}>“{r.text}”</p>
                    <p style={{ margin: 0, fontSize: "12.5px", color: "var(--fw-muted)" }}>
                      {r.author ?? "Customer"}
                      {r.at ? ` · ${date(r.at.slice(0, 10))}` : ""}
                      {r.reason ? ` · Reason: ${r.reason}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {!r.visible && (
                      <button
                        className="button compact"
                        onClick={() =>
                          act({ type: "review-status", id: r.id, status: "approved" }, "Review approved and published.")
                        }
                      >
                        Approve
                      </button>
                    )}
                    {r.status === "pending" && (
                      <Confirm
                        label="Reject"
                        title="Reject this review?"
                        danger
                        onConfirm={() =>
                          act({ type: "review-status", id: r.id, status: "rejected" }, "Review rejected. The customer has been told.")
                        }
                      >
                        It will not be published and will not count towards the grower’s stars.
                      </Confirm>
                    )}
                    {r.visible && (
                      <Confirm
                        label="Hide"
                        title="Hide this published review?"
                        danger
                        onConfirm={() => act({ type: "review-status", id: r.id, status: "hidden" }, "Review hidden.")}
                      >
                        It will be removed from the stall and the grower’s stars will be recalculated.
                      </Confirm>
                    )}
                  </div>
                </div>
              );
            })}
            {!reviewGroups[reviewTab].length && (
              <p style={{ padding: "18px", color: "var(--fw-muted)" }}>
                {reviewTab === "pending" ? "No reviews are waiting. You are all caught up." : "Nothing here."}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* =========================================================================
   5. CATEGORIES & ANNOUNCEMENTS
   ========================================================================= */
function AdminCategoriesHub() {
  const s = useMarket();
  const act = useAction();

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Taxonomy</span>
          <h1>Produce Categories</h1>
          <p className="fw-header-sub">
            Organize produce filters for customer browsing and market reporting.
          </p>
        </div>
      </div>

      <div className="two-col">
        <div>
          <h2 style={{ fontSize: "20px", marginBottom: "14px" }}>Active Taxonomy Categories</h2>
          <div className="record-list">
            {s.categories.map((c) => {
              const count = s.products.filter((p) => p.category === c).length;
              return (
                <div key={c} className="record-row" style={{ padding: "12px 18px" }}>
                  <div className="grow">
                    <strong style={{ fontSize: "15px" }}>{c}</strong>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--fw-muted)" }}>
                      {count} active produce lines
                    </p>
                  </div>
                  <Confirm
                    label="Delete"
                    title={`Delete category "${c}"?`}
                    danger
                    onConfirm={() => act({ type: "category", name: c, remove: true })}
                  >
                    Categories currently in use cannot be removed until products are recategorized.
                  </Confirm>
                </div>
              );
            })}
          </div>
        </div>

        <Form onSubmit={(d) => act({ type: "category", name: value(d, "name") }, "New category added.")}>
          <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>Add New Category</h2>
          <Field label="Category Name">
            <input name="name" required placeholder="e.g. Organic Dairy & Eggs" />
          </Field>
          <button className="button">Save Category</button>
        </Form>
      </div>
    </div>
  );
}

function AdminAnnouncementsHub() {
  const s = useMarket();
  const act = useAction();
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Communications</span>
          <h1>Broadcast Noticeboard</h1>
          <p className="fw-header-sub">
            Publish market day alerts, weather updates, and cutoff reminders to all active participants.
          </p>
        </div>
      </div>

      <div className="two-col">
        <Form onSubmit={(d) => setDraft({ title: value(d, "title"), body: value(d, "body") })}>
          <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>Compose Announcement</h2>
          <Field label="Headline Title">
            <input name="title" required placeholder="e.g. Saturday Orchard Market Gates Open at 08:00" />
          </Field>
          <Field label="Message Body">
            <textarea name="body" required rows={6} placeholder="Detailed announcements, parking instructions, weather guidelines..." />
          </Field>
          <button className="button">Preview Notice</button>

          {draft && (
            <div className="paper-panel" style={{ marginTop: "20px" }}>
              <span className="fw-status-chip placed" style={{ marginBottom: "6px" }}>Preview Draft</span>
              <h3 style={{ fontSize: "18px", margin: "6px 0" }}>{draft.title}</h3>
              <p style={{ fontSize: "14px", lineHeight: "1.6" }}>{draft.body}</p>
              <button
                type="button"
                className="button"
                style={{ marginTop: "12px" }}
                onClick={() => {
                  act(
                    {
                      type: "announcement",
                      value: {
                        ...draft,
                        id: `new-announcement-${crypto.randomUUID().slice(0, 8)}`,
                        published: true,
                      },
                    },
                    "Announcement published to market noticeboard."
                  );
                  setDraft(null);
                }}
              >
                Publish to Noticeboard
              </button>
            </div>
          )}
        </Form>

        <div>
          <h2 style={{ fontSize: "20px", marginBottom: "14px" }}>Published Notices</h2>
          {s.announcements.map((a) => (
            <article key={a.id} className="paper-panel" style={{ marginBottom: "14px" }}>
              <span className="fw-status-chip accepted" style={{ fontSize: "11px", marginBottom: "4px" }}>
                Live Notice
              </span>
              <h3 style={{ fontSize: "17px", margin: "6px 0" }}>{a.title}</h3>
              <p style={{ margin: 0, fontSize: "13.5px", color: "var(--fw-muted)", lineHeight: "1.5" }}>
                {a.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminCustomersHub() {
  const s = useMarket();
  const act = useAction();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const q = query.trim().toLowerCase();
  const list = s.customers.filter(
    (c) =>
      (filter === "all" || (filter === "active" ? c.active : !c.active)) &&
      (!q || `${c.name} ${c.email} ${c.address}`.toLowerCase().includes(q)),
  );
  const activeCount = s.customers.filter((c) => c.active).length;

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Customer accounts</span>
          <h1>Customers</h1>
          <p className="fw-header-sub">
            {s.customers.length} registered · {activeCount} active ·{" "}
            {s.customers.filter((c) => c.openOrders > 0).length} with open pickups
          </p>
        </div>
      </div>

      <div className="fw-toolbar">
        <div className="fw-filter-group" role="group" aria-label="Filter customers">
          {(["all", "active", "paused"] as const).map((f) => (
            <button
              key={f}
              className={`fw-filter-btn ${filter === f ? "active" : ""}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? `All (${s.customers.length})` : f === "active" ? `Active (${activeCount})` : `Paused (${s.customers.length - activeCount})`}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="fw-search"
          placeholder="Search name, email or area"
          aria-label="Search customers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="data-table" role="table" aria-label="Customers">
        <div className="data-row data-head" role="row">
          <span role="columnheader">Customer</span>
          <span role="columnheader">Orders</span>
          <span role="columnheader">Booked value</span>
          <span role="columnheader">Last market day</span>
          <span role="columnheader">Status</span>
          <span role="columnheader"><span className="visually-hidden">Actions</span></span>
        </div>
        {list.map((c) => (
          <div className="data-row" role="row" key={c.id}>
            <span role="cell" className="data-primary">
              <span className="avatar small" aria-hidden="true">{c.name[0]}</span>
              <span>
                <strong>{c.name}</strong>
                <small>{c.email} · {c.address}</small>
              </span>
            </span>
            <span role="cell">
              {c.orders}
              {c.openOrders > 0 && <small> · {c.openOrders} open</small>}
            </span>
            <span role="cell">{money(c.valueMinor)}</span>
            <span role="cell">{c.lastOrderDate ? date(c.lastOrderDate) : "—"}</span>
            <span role="cell">
              <span className={`fw-status-chip ${c.active ? "accepted" : "declined"}`}>
                {c.active ? "Active" : "Paused"}
              </span>
            </span>
            <span role="cell">
              <Confirm
                label={c.active ? "Pause" : "Reactivate"}
                title={`${c.active ? "Pause" : "Reactivate"} ${c.name}?`}
                danger={c.active}
                onConfirm={() =>
                  act(
                    { type: "customer-active", id: c.id, value: !c.active },
                    c.active ? `${c.name} can no longer sign in.` : `${c.name} can sign in again.`,
                  )
                }
              >
                {c.active
                  ? "They will be signed out and cannot place new reservations. Their order history is kept."
                  : "They will be able to sign in and reserve again."}
              </Confirm>
            </span>
          </div>
        ))}
        {!list.length && <p className="data-empty">No customers match this search.</p>}
      </div>
    </div>
  );
}
