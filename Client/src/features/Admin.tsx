import { useState, useMemo } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Users,
  Flag,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Plus,
  DollarSign,
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
import { Reports } from "./Farmer";
import { NotFound } from "./Public";
import { money, total } from "../data/market";

export function AdminPage() {
  const { pathname } = useLocation();
  const page = pathname.split("/")[2] ?? "";
  const id = pathname.split("/")[3];

  if (page === "notifications") return <Notifications />;
  if (page === "reports") return <Reports />;
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

  const pendingFarmers = s.farmers.filter((f) => f.state === "Pending");
  const hiddenProducts = s.products.filter((p) => !p.visible);
  const totalVolume = s.orders
    .filter((o) => !["Cancelled", "Declined"].includes(o.stage))
    .reduce((n, o) => n + total(o.lines), 0);

  return (
    <div className="farmer-workbench container">
      {/* Executive Header */}
      <div className="fw-header">
        <div className="fw-header-info">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="fw-status-chip accepted">
              <ShieldCheck size={13} /> Administrator Command
            </span>
            <span style={{ fontSize: "13px", color: "var(--fw-muted)" }}>
              Platform Operations · Pakistan (Lahore Pilot)
            </span>
          </div>
          <h1>Market Operations Command Centre</h1>
          <p className="fw-header-sub">
            Coordinate multi-market schedules, verify producer credentials, manage catalog taxonomy, and monitor live trading.
          </p>
        </div>
        <div className="fw-header-actions">
          <Link className="button secondary" to="/admin/announcements">
            <Megaphone size={16} /> Broadcast Notice
          </Link>
          <Link className="button" to="/admin/markets/new">
            <Plus size={16} /> Add Market Location
          </Link>
        </div>
      </div>

      {/* Market Intelligence Operational Briefing */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid var(--fw-border-subtle)",
          borderLeft: "4px solid var(--fw-forest)",
          borderRadius: "6px",
          padding: "20px 24px",
          margin: "24px 0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ background: "var(--fw-sage)", color: "var(--fw-forest)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Market Intelligence
            </span>
            <strong style={{ fontSize: "15px", color: "var(--fw-ink)" }}>Daily Platform Briefing & Moderation Tasks</strong>
          </div>
          <span style={{ fontSize: "12px", color: "var(--fw-muted)" }}>Pakistan (Lahore Pilot) · Live Operations</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", fontSize: "14px", lineHeight: "1.5" }}>
          <div style={{ background: "var(--fw-sage)", padding: "12px 16px", borderRadius: "4px" }}>
            <strong style={{ color: "var(--fw-forest)", display: "block", marginBottom: "4px" }}>
              Producer Onboarding:
            </strong>
            <span>
              {pendingFarmers.length > 0
                ? `${pendingFarmers.length} grower application(s) pending review (${pendingFarmers.map(f => f.name).join(", ")}). Direct verification required before stall catalogue publication.`
                : "All registered stallholders are approved and active for current weekend market schedules."}
            </span>
          </div>
          <div style={{ background: "var(--fw-sage)", padding: "12px 16px", borderRadius: "4px" }}>
            <strong style={{ color: "var(--fw-forest)", display: "block", marginBottom: "4px" }}>
              Community Moderation:
            </strong>
            <span>
              {s.reviews.filter(r => !r.visible).length > 0
                ? `${s.reviews.filter(r => !r.visible).length} review(s) flagged or awaiting moderation in the quality queue.`
                : `${s.reviews.length} customer review(s) published across Lahore markets with an aggregate 5.0 rating.`}
            </span>
          </div>
        </div>
      </div>

      {/* Global Platform KPIs */}
      <div className="fw-kpi-grid">
        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Registered Producers</span>
            <div className="fw-kpi-icon"><Users size={18} /></div>
          </div>
          <p className="fw-kpi-val">{s.farmers.length}</p>
          <div className="fw-kpi-meta">
            {pendingFarmers.length > 0 ? (
              <span style={{ color: "var(--fw-harvest)", fontWeight: "600" }}>
                {pendingFarmers.length} pending verification
              </span>
            ) : (
              <span style={{ color: "var(--fw-success)" }}>All producers verified</span>
            )}
          </div>
        </div>

        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Active Market Locations</span>
            <div className="fw-kpi-icon"><Building2 size={18} /></div>
          </div>
          <p className="fw-kpi-val">{s.markets.filter((m) => m.active).length}</p>
          <div className="fw-kpi-meta">
            <span>{s.markets.length} total venues configured</span>
          </div>
        </div>

        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Platform GMV Volume</span>
            <div className="fw-kpi-icon"><DollarSign size={18} /></div>
          </div>
          <p className="fw-kpi-val">{money(totalVolume)}</p>
          <div className="fw-kpi-meta">
            <span>Across {s.orders.length} registered pre-orders</span>
          </div>
        </div>

        <div className="fw-kpi-card">
          <div className="fw-kpi-top">
            <span className="fw-kpi-label">Moderation Queue</span>
            <div className="fw-kpi-icon" style={{ background: hiddenProducts.length > 0 ? "var(--fw-harvest-light)" : "var(--fw-sage)", color: hiddenProducts.length > 0 ? "var(--fw-harvest)" : "var(--fw-forest)" }}>
              <Flag size={18} />
            </div>
          </div>
          <p className="fw-kpi-val">{hiddenProducts.length}</p>
          <div className="fw-kpi-meta">
            <span>Listings hidden or under review</span>
          </div>
        </div>
      </div>

      {/* Action Queues & Snapshot Grid */}
      <div className="adm-overview-grid">
        <div>
          <h2 style={{ fontSize: "20px", margin: "0 0 16px" }}>Priority Operational Actions</h2>

          <Link className="adm-action-card" to="/admin/farmers">
            <div className="adm-action-left">
              <div className="adm-action-icon">
                <Users size={20} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 2px", fontSize: "16px" }}>Producer Verification Queue</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>
                  Review farm stories, contact details, and stall assignments.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className={`fw-status-chip ${pendingFarmers.length > 0 ? "placed" : "accepted"}`}>
                {pendingFarmers.length} Pending
              </span>
              <ArrowUpRight size={17} color="var(--fw-muted)" />
            </div>
          </Link>

          <Link className="adm-action-card" to="/admin/moderation">
            <div className="adm-action-left">
              <div className="adm-action-icon">
                <Flag size={20} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 2px", fontSize: "16px" }}>Content Stewardship & Reviews</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>
                  Review produce descriptions and customer feedback safety.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="fw-status-chip accepted">
                {s.reviews.length} Reviews
              </span>
              <ArrowUpRight size={17} color="var(--fw-muted)" />
            </div>
          </Link>

          <Link className="adm-action-card" to="/admin/markets">
            <div className="adm-action-left">
              <div className="adm-action-icon">
                <Store size={20} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 2px", fontSize: "16px" }}>Saturday Market Readiness</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>
                  Check operating hours, stall counts, and cutoff rules for Lahore.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="fw-status-chip accepted">3 Active</span>
              <ArrowUpRight size={17} color="var(--fw-muted)" />
            </div>
          </Link>
        </div>

        {/* Saturday Operator Snapshot Card */}
        <aside className="adm-sidebar-card">
          <span className="fw-nm-badge" style={{ color: "#dce3ce" }}>Saturday Market Day Focus</span>
          <h2 style={{ fontSize: "24px", color: "var(--fw-paper)", margin: "6px 0 4px" }}>
            The Orchard Market
          </h2>
          <p style={{ fontSize: "13px", color: "#c5d3c1", margin: "0 0 16px" }}>
            Model Town Park · Sat, 3 Oct · 08:00–13:00
          </p>

          <div style={{ borderTop: "1px solid #2f523f", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
              <span style={{ color: "#a8baa3" }}>Approved Attending Stalls</span>
              <strong>{s.farmers.filter((f) => f.state === "Approved").length}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
              <span style={{ color: "#a8baa3" }}>Visible Produce Listings</span>
              <strong>{s.products.filter((p) => p.visible).length} items</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
              <span style={{ color: "#a8baa3" }}>Pre-order Cutoff</span>
              <strong>Friday 20:00 PKT</strong>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <Link
              className="button"
              to="/admin/markets"
              style={{ background: "var(--fw-paper)", color: "var(--fw-forest)", border: "none", width: "100%", textAlign: "center", display: "block" }}
            >
              Manage Market Venues <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
      </div>

      {/* Live Noticeboard Section */}
      <section className="fw-prep-card">
        <div className="fw-prep-header">
          <div>
            <h2 style={{ fontSize: "20px", margin: "0 0 4px" }}>Active Platform Noticeboard</h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>
              Official broadcast announcements visible to all customers and producers.
            </p>
          </div>
          <Link className="button secondary compact" to="/admin/announcements">
            Manage Announcements <ArrowUpRight size={15} />
          </Link>
        </div>
        {s.announcements.map((a) => (
          <div key={a.id} className="record-row" style={{ padding: "14px 18px", marginBottom: "8px" }}>
            <div style={{ flexGrow: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span className="fw-status-chip accepted" style={{ fontSize: "11px" }}>Published</span>
                <strong style={{ fontSize: "15px" }}>{a.title}</strong>
              </div>
              <p style={{ margin: 0, fontSize: "13.5px", color: "var(--fw-muted)" }}>{a.body}</p>
            </div>
          </div>
        ))}
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
        {filtered.map((f) => {
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
                    style={{ color: "var(--fw-danger)", borderColor: "#f8c8c8" }}
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
                id: m?.id ?? `demo-m-${crypto.randomUUID().slice(0, 8)}`,
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
          <h2 style={{ fontSize: "20px", marginBottom: "14px" }}>Customer Reviews Moderation</h2>
          <div className="record-list">
            {s.reviews.map((r) => (
              <div key={r.id} className="record-row" style={{ padding: "14px 18px" }}>
                <div className="grow">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span className={`fw-status-chip ${r.visible ? "accepted" : "declined"}`}>
                      {r.visible ? "Published" : "Flagged/Hidden"}
                    </span>
                    <strong>{r.rating} / 5 Stars · Order: {r.orderId}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: "13.5px" }}>"{r.text}"</p>
                </div>
                <Confirm
                  label={r.visible ? "Hide Review" : "Restore Review"}
                  title="Moderate customer review visibility?"
                  danger={r.visible}
                  onConfirm={() => act({ type: "moderate", kind: "review", id: r.id })}
                />
              </div>
            ))}
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
                        id: `demo-a-${crypto.randomUUID().slice(0, 8)}`,
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

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div>
          <span className="fw-status-chip accepted">Customer Accounts</span>
          <h1>Market Community Customers</h1>
          <p className="fw-header-sub">
            Manage customer accounts and access permissions across market locations.
          </p>
        </div>
      </div>

      <div className="record-row" style={{ padding: "18px 20px" }}>
        <span className="avatar" style={{ background: "var(--fw-sage)", color: "var(--fw-forest)", fontWeight: "600" }}>
          D
        </span>
        <div className="grow">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "17px" }}>Demo Customer (Lahore Pilot)</h3>
            <span className={`fw-status-chip ${s.customerActive ? "accepted" : "declined"}`}>
              {s.customerActive ? "Active" : "Suspended"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--fw-muted)" }}>customer@marketlink.test · {s.orders.length} lifetime reservations</p>
        </div>
        <Confirm
          label={s.customerActive ? "Suspend Customer" : "Reactivate Customer"}
          title={`${s.customerActive ? "Suspend" : "Reactivate"} customer?`}
          danger={s.customerActive}
          onConfirm={() => act({ type: "customer-active", value: !s.customerActive })}
        >
          Changes access status while preserving all historical order receipts.
        </Confirm>
      </div>
    </div>
  );
}
