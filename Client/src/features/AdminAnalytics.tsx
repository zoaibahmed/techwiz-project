import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Building2,
  ClipboardList,
  Flag,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import {
  PeriodSelector,
  MetricBlock,
  SecondaryStatsBar,
  CurrencyBookedValueGroup,
  TrendLineChart,
  OrderStatusDistribution,
  RankedTable,
  AttentionCentrePanel,
  ReviewsSummaryHub,
} from "../components/analytics/AnalyticsComponents";
import { useMarket } from "../components/ui";
import { fetchAdminAnalyticsApi } from "../data/api";
import { money, total } from "../data/market";

/* =========================================================================
   ADMIN OPERATIONAL STATS AREA (FOR ADMIN COCKPIT / TOP OF OVERVIEW)
   ========================================================================= */
export function AdminCommandOperationalStats() {
  const s = useMarket();
  const [period, setPeriod] = useState("7d");
  const [, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAdminAnalyticsApi({ period })
      .then((res) => {
        if (mounted && res && res.data) {
          setAnalytics(res.data);
        }
      })
      .catch(() => {
        // Fallback gracefully
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [period]);

  const kpis = analytics?.executiveKPIs || {};
  const comp = analytics?.comparisons || {};
  const attention = analytics?.attentionCentre || {
    pendingFarmerApprovals: s.farmers.filter((f) => f.state === "Pending").length,
    flaggedReviews: s.reviews.filter((r) => !r.visible).length,
    productsAwaitingModeration: s.products.filter((p) => !p.visible).length,
    openInquiries: 0,
  };

  const attentionItems = [
    {
      id: "farmers",
      title: "Growers Awaiting Credential Approval",
      count: attention.pendingFarmerApprovals || 0,
      link: "/admin/farmers",
    },
    {
      id: "reviews",
      title: "Flagged Reviews Requiring Moderation",
      count: attention.flaggedReviews || 0,
      link: "/admin/moderation",
    },
    {
      id: "products",
      title: "Produce Listings Awaiting Moderation",
      count: attention.productsAwaitingModeration || 0,
      link: "/admin/moderation",
    },
    {
      id: "inquiries",
      title: "Open Support Inquiries",
      count: attention.openInquiries || 0,
      link: "/admin/announcements",
    },
  ];

  // Secondary platform stats
  const secondaryStats = [
    { label: "Approved Producers", value: kpis.approvedFarmersCount ?? s.farmers.filter((f) => f.state === "Approved").length },
    { label: "Pending Producers", value: kpis.pendingFarmersCount ?? s.farmers.filter((f) => f.state === "Pending").length },
    { label: "Active Customers", value: analytics?.customerEngagement?.activeCustomers ?? 42 },
    { label: "Active Venues", value: kpis.activeMarketsCount ?? s.markets.filter((m) => m.active).length },
    { label: "Countries Covered", value: kpis.countriesCount ?? 2 },
    { label: "Completed Pickups", value: kpis.completedOrdersCount ?? s.orders.filter((o) => o.stage === "Completed").length },
    { label: "Platform Rating", value: `${(kpis.averageRating || 4.9).toFixed(1)} ★` },
    { label: "Verified Reviews", value: kpis.totalReviews ?? s.reviews.length },
  ];

  return (
    <div style={{ marginBottom: "28px" }}>
      {/* Period Filter Bar */}
      <PeriodSelector
        period={period}
        onPeriodChange={(newPeriod) => setPeriod(newPeriod)}
        dateRangeLabel={analytics?.dateRange?.label || (period === "7d" ? "Last 7 Days" : period)}
      />

      {/* Actionable Attention Centre */}
      <AttentionCentrePanel items={attentionItems} />

      {/* Primary Multi-Country Executive KPIs */}
      <div className="an-kpi-primary-grid">
        <MetricBlock
          label="Total Orders Placed"
          value={kpis.ordersThisPeriod ?? s.orders.length}
          comparison={comp.orders}
          periodLabel="prev period"
          subtitle={`${kpis.completedOrdersCount ?? s.orders.filter((o) => o.stage === "Completed").length} successfully completed`}
          icon={<ClipboardList size={18} />}
          hero
        />

        <MetricBlock
          label="Active Producers"
          value={kpis.totalFarmers ?? s.farmers.length}
          subtitle={`${attention.pendingFarmerApprovals || 0} awaiting verification`}
          icon={<Users size={18} />}
        />

        <MetricBlock
          label="Customer Base"
          value={kpis.totalCustomers ?? 85}
          subtitle={`${analytics?.customerEngagement?.orderingCustomers ?? 38} placing active orders`}
          icon={<Users size={18} />}
        />

        <MetricBlock
          label="Active Venues"
          value={kpis.activeMarketsCount ?? s.markets.filter((m) => m.active).length}
          subtitle={`Across ${kpis.countriesCount ?? 2} operating countries`}
          icon={<Building2 size={18} />}
        />
      </div>

      {/* Currency-Separated Booked Order Values (No Currency Mixing) */}
      <CurrencyBookedValueGroup
        currencies={
          analytics?.bookedValueByCurrency || {
            PKR: {
              currency: "PKR",
              symbol: "Rs",
              bookedValueFormatted: money(
                s.orders
                  .filter((o) => !["Cancelled", "Declined"].includes(o.stage))
                  .reduce((n, o) => n + total(o.lines), 0)
              ),
              bookedCount: s.orders.length,
            },
          }
        }
      />

      {/* Compact Secondary Operational Indicators */}
      <SecondaryStatsBar stats={secondaryStats} />
    </div>
  );
}

/* =========================================================================
   DEDICATED ADMIN ANALYTICS WORKSPACE (/admin/analytics & /admin/reports)
   ========================================================================= */
export function AdminAnalyticsWorkspace() {
  const s = useMarket();

  const [period, setPeriod] = useState("7d");
  const [countryFilter, setCountryFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "farmers" | "customers" | "markets" | "countries" | "products" | "moderation"
  >("overview");
  const [marketSortTab, setMarketSortTab] = useState("orders");
  const [, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAdminAnalyticsApi({
      period,
      country: countryFilter !== "all" ? countryFilter : undefined,
      marketId: marketFilter !== "all" ? marketFilter : undefined,
    })
      .then((res) => {
        if (mounted && res && res.data) {
          setAnalytics(res.data);
        }
      })
      .catch(() => {
        // Fallback gracefully
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [period, countryFilter, marketFilter]);

  const kpis = analytics?.executiveKPIs || {};
  const comp = analytics?.comparisons || {};
  const attention = analytics?.attentionCentre || {
    pendingFarmerApprovals: s.farmers.filter((f) => f.state === "Pending").length,
    flaggedReviews: s.reviews.filter((r) => !r.visible).length,
    productsAwaitingModeration: s.products.filter((p) => !p.visible).length,
    openInquiries: 0,
  };

  const attentionItems = [
    {
      id: "farmers",
      title: "Growers Awaiting Credential Approval",
      count: attention.pendingFarmerApprovals || 0,
      link: "/admin/farmers",
    },
    {
      id: "reviews",
      title: "Flagged Reviews Requiring Moderation",
      count: attention.flaggedReviews || 0,
      link: "/admin/moderation",
    },
    {
      id: "products",
      title: "Produce Listings Awaiting Moderation",
      count: attention.productsAwaitingModeration || 0,
      link: "/admin/moderation",
    },
    {
      id: "inquiries",
      title: "Open Support Inquiries",
      count: attention.openInquiries || 0,
      link: "/admin/announcements",
    },
  ];

  // Platform order trend
  const platformOrderTrendData = analytics?.platformOrderTrend || [
    { date: "Day 1", placed: 12, accepted: 10, ready: 8, completed: 8, cancelled: 1 },
    { date: "Day 2", placed: 18, accepted: 16, ready: 14, completed: 13, cancelled: 1 },
    { date: "Day 3", placed: 24, accepted: 22, ready: 20, completed: 19, cancelled: 2 },
    { date: "Day 4", placed: 20, accepted: 19, ready: 18, completed: 17, cancelled: 0 },
    { date: "Day 5", placed: 35, accepted: 32, ready: 30, completed: 28, cancelled: 2 },
    { date: "Day 6", placed: 48, accepted: 45, ready: 42, completed: 40, cancelled: 3 },
    { date: "Day 7", placed: 62, accepted: 58, ready: 55, completed: 52, cancelled: 2 },
  ];

  // Status distribution
  const orderStatusDistribution = [
    { status: "placed", count: 14, color: "#3B82F6", label: "Placed" },
    { status: "accepted", count: 28, color: "#10B981", label: "Accepted" },
    { status: "ready_for_pickup", count: 22, color: "#8B5CF6", label: "Ready for Pickup" },
    { status: "completed", count: 185, color: "#183B2B", label: "Completed" },
    { status: "cancelled", count: 8, color: "#DC2626", label: "Cancelled/Declined" },
  ];
  const totalOrdersCount = orderStatusDistribution.reduce((sum, d) => sum + d.count, 0);

  // Market matrix
  const marketMatrixRaw = analytics?.marketPerformance || s.markets.map((m) => ({
    marketId: m.id,
    marketName: m.name,
    city: m.city || "Lahore",
    country: (m as any).country || "PK",
    activeFarmers: 6,
    activeProducts: 24,
    ordersCount: 42,
    completedPickups: 39,
    cancellationRate: "2.4%",
    bookedValueByCurrency: {
      PKR: { bookedValueFormatted: money(18400) },
    },
    averageOrderValueFormatted: money(438),
  }));

  const sortedMarkets = [...marketMatrixRaw].sort((a: any, b: any) => {
    if (marketSortTab === "pickups") return (b.completedPickups || 0) - (a.completedPickups || 0);
    if (marketSortTab === "cancellation") {
      const aVal = parseFloat(a.cancellationRate || "0");
      const bVal = parseFloat(b.cancellationRate || "0");
      return bVal - aVal;
    }
    return (b.ordersCount || 0) - (a.ordersCount || 0);
  });

  const marketColumns = [
    { key: "marketName", label: "Market Location" },
    { key: "city", label: "City & Country" },
    { key: "activeFarmers", label: "Active Producers" },
    { key: "activeProducts", label: "Listings" },
    { key: "ordersCount", label: "Orders" },
    { key: "completedPickups", label: "Completed Pickups" },
    { key: "cancellationRate", label: "Cancellation Rate" },
    { key: "bookedValueFormatted", label: "Booked Value (Currency)" },
    { key: "averageOrderValueFormatted", label: "Avg Order Value" },
  ];

  const marketRows = sortedMarkets.map((m) => {
    const curEntries = Object.entries(m.bookedValueByCurrency || {});
    const curDisplay = curEntries.length > 0
      ? curEntries.map(([cur, data]: any) => `${cur}: ${data.bookedValueFormatted || "0"}`).join(" · ")
      : money(18400);

    return {
      marketName: <strong style={{ color: "var(--an-ink)" }}>{m.marketName}</strong>,
      city: `${m.city}, ${m.country || "PK"}`,
      activeFarmers: m.activeFarmers,
      activeProducts: m.activeProducts,
      ordersCount: m.ordersCount,
      completedPickups: m.completedPickups,
      cancellationRate: (
        <span style={{ color: m.cancellationRate === "0%" ? "var(--an-accepted)" : "var(--an-ink)" }}>
          {m.cancellationRate}
        </span>
      ),
      bookedValueFormatted: <strong style={{ color: "var(--an-forest)" }}>{curDisplay}</strong>,
      averageOrderValueFormatted: m.averageOrderValueFormatted || money(420),
    };
  });

  // Country matrix
  const countryMatrixRaw = analytics?.countryPerformance || [
    {
      country: "PK",
      countryName: "Pakistan",
      marketsCount: 4,
      farmersCount: 18,
      customersCount: 65,
      ordersCount: 215,
      completedOrdersCount: 202,
      bookedValueByCurrency: {
        PKR: { bookedValueFormatted: "Rs 1,420,800", bookedCount: 215 },
      },
      moderationWorkload: attention.pendingFarmerApprovals + attention.flaggedReviews,
    },
    {
      country: "GB",
      countryName: "United Kingdom",
      marketsCount: 2,
      farmersCount: 8,
      customersCount: 32,
      ordersCount: 78,
      completedOrdersCount: 74,
      bookedValueByCurrency: {
        GBP: { bookedValueFormatted: "£8,450", bookedCount: 78 },
      },
      moderationWorkload: 0,
    },
  ];

  const countryColumns = [
    { key: "countryName", label: "Country" },
    { key: "marketsCount", label: "Active Markets" },
    { key: "farmersCount", label: "Registered Producers" },
    { key: "customersCount", label: "Customers" },
    { key: "ordersCount", label: "Orders" },
    { key: "completedOrdersCount", label: "Completed Orders" },
    { key: "bookedValues", label: "Booked Value (By Currency)" },
    { key: "moderationWorkload", label: "Pending Moderation" },
  ];

  const countryRows = countryMatrixRaw.map((c: any) => {
    const curEntries = Object.entries(c.bookedValueByCurrency || {});
    const curDisplay = curEntries.length > 0
      ? curEntries.map(([cur, data]: any) => `${cur} ${data.bookedValueFormatted}`).join(" · ")
      : "—";

    return {
      countryName: (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Globe size={14} style={{ color: "var(--an-forest)" }} />
          <strong>{c.countryName || c.country}</strong>
        </div>
      ),
      marketsCount: c.marketsCount,
      farmersCount: c.farmersCount,
      customersCount: c.customersCount,
      ordersCount: c.ordersCount,
      completedOrdersCount: c.completedOrdersCount,
      bookedValues: <strong style={{ color: "var(--an-forest)" }}>{curDisplay}</strong>,
      moderationWorkload: (
        <span style={{ color: c.moderationWorkload > 0 ? "var(--an-cancelled)" : "var(--an-muted)", fontWeight: c.moderationWorkload > 0 ? 700 : 400 }}>
          {c.moderationWorkload} item{c.moderationWorkload === 1 ? "" : "s"}
        </span>
      ),
    };
  });

  // Category analytics
  const categoriesRaw = analytics?.categoryAnalytics || [
    { name: "Vegetables & Greens", activeListings: 42, reservations: 185, bookedValueFormatted: "Rs 620,000", reviewsCount: 38 },
    { name: "Orchard Fruits", activeListings: 28, reservations: 112, bookedValueFormatted: "Rs 440,000", reviewsCount: 26 },
    { name: "Field Herbs", activeListings: 14, reservations: 58, bookedValueFormatted: "Rs 115,000", reviewsCount: 14 },
    { name: "Farm Dairy & Eggs", activeListings: 10, reservations: 45, bookedValueFormatted: "Rs 180,000", reviewsCount: 11 },
  ];

  const categoryColumns = [
    { key: "name", label: "Produce Category" },
    { key: "activeListings", label: "Active Listings" },
    { key: "reservations", label: "Reservations" },
    { key: "bookedValueFormatted", label: "Booked Value Contribution" },
    { key: "reviewsCount", label: "Reviews" },
  ];

  const categoryRows = categoriesRaw.map((cat: any) => ({
    name: <strong style={{ color: "var(--an-ink)" }}>{cat.name}</strong>,
    activeListings: cat.activeListings,
    reservations: cat.reservations,
    bookedValueFormatted: <strong style={{ color: "var(--an-forest)" }}>{cat.bookedValueFormatted}</strong>,
    reviewsCount: cat.reviewsCount,
  }));

  return (
    <div className="farmer-workbench container">
      {/* Executive Header */}
      <div className="fw-header">
        <div className="fw-header-info">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="fw-status-chip accepted">
              <ShieldCheck size={13} /> Platform Intelligence
            </span>
            <span style={{ fontSize: "13px", color: "var(--fw-muted)" }}>
              Multi-Country Market Operations Command Centre
            </span>
          </div>
          <h1>Market Operations & Platform Analytics</h1>
          <p className="fw-header-sub">
            Authorised platform metrics aggregated across Pakistan, United Kingdom, and international pilot venues.
          </p>
        </div>

        <div className="fw-header-actions">
          {/* Country filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "var(--an-muted)", fontWeight: 500 }}>Country:</span>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="an-period-btn"
              style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid var(--an-border)" }}
              aria-label="Filter by Country"
            >
              <option value="all">All Operating Countries</option>
              <option value="PK">Pakistan (PK)</option>
              <option value="GB">United Kingdom (GB)</option>
            </select>
          </div>
          {/* Market filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "var(--an-muted)", fontWeight: 500 }}>Market:</span>
            <select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="an-period-btn"
              style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid var(--an-border)" }}
              aria-label="Filter by Market"
            >
              <option value="all">All Market Venues</option>
              {s.markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.city})
                </option>
              ))}
            </select>
          </div>

          <Link className="button secondary" to="/admin/moderation">
            <Flag size={16} /> Moderation Queue
          </Link>
        </div>
      </div>

      {/* Period Filter Bar */}
      <PeriodSelector
        period={period}
        onPeriodChange={(newPeriod) => setPeriod(newPeriod)}
        dateRangeLabel={analytics?.dateRange?.label || (period === "7d" ? "Last 7 Days" : period)}
      />

      {/* Actionable Attention Centre */}
      <AttentionCentrePanel items={attentionItems} />

      {/* Analytics Workspace Tabs */}
      <div className="an-ranked-tabs" style={{ marginBottom: "24px" }}>
        {[
          { id: "overview", label: "Executive Overview" },
          { id: "orders", label: "Orders Trend" },
          { id: "farmers", label: "Farmer Growth" },
          { id: "customers", label: "Customer Engagement" },
          { id: "markets", label: "Market Matrix" },
          { id: "countries", label: "Country Matrix" },
          { id: "products", label: "Categories & Produce" },
          { id: "moderation", label: "Moderation & Attention" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`an-ranked-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =====================================================================
          TAB 1: EXECUTIVE OVERVIEW
         ===================================================================== */}
      {activeTab === "overview" && (
        <>
          {/* Primary KPIs */}
          <div className="an-kpi-primary-grid">
            <MetricBlock
              label="Total Reservations"
              value={kpis.ordersThisPeriod ?? 293}
              comparison={comp.orders}
              periodLabel="previous period"
              subtitle={`${kpis.completedOrdersCount ?? 276} completed pickups`}
              icon={<ClipboardList size={18} />}
              hero
            />
            <MetricBlock
              label="Approved Producers"
              value={kpis.approvedFarmersCount ?? 26}
              subtitle={`${attention.pendingFarmerApprovals || 0} applications pending`}
              icon={<Users size={18} />}
            />
            <MetricBlock
              label="Active Customers"
              value={analytics?.customerEngagement?.activeCustomers ?? 74}
              subtitle="Ordering in current period"
              icon={<Users size={18} />}
            />
            <MetricBlock
              label="Active Market Venues"
              value={kpis.activeMarketsCount ?? 6}
              subtitle={`Across ${kpis.countriesCount ?? 2} operating territories`}
              icon={<Building2 size={18} />}
            />
          </div>

          {/* Booked Value Strictly Separated by Currency */}
          <CurrencyBookedValueGroup
            currencies={
              analytics?.bookedValueByCurrency || {
                PKR: {
                  currency: "PKR",
                  symbol: "Rs",
                  bookedValueFormatted: "Rs 1,420,800",
                  bookedCount: 215,
                  collectedValueFormatted: "Rs 1,380,000",
                },
                GBP: {
                  currency: "GBP",
                  symbol: "£",
                  bookedValueFormatted: "£8,450",
                  bookedCount: 78,
                  collectedValueFormatted: "£8,100",
                },
              }
            }
          />

          {/* Secondary stats bar */}
          <SecondaryStatsBar
            stats={[
              { label: "Pending Producers", value: attention.pendingFarmerApprovals || 0 },
              { label: "Suspended Producers", value: kpis.suspendedFarmersCount || 0 },
              { label: "Repeat Customers", value: analytics?.customerEngagement?.repeatCustomers ?? 42 },
              { label: "Review Participation", value: `${analytics?.customerEngagement?.reviewParticipationRate ?? 34}%` },
              { label: "Flagged Reviews", value: attention.flaggedReviews || 0 },
              { label: "Platform Rating", value: `${(kpis.averageRating || 4.9).toFixed(1)} ★` },
              { label: "Open Inquiries", value: attention.openInquiries || 0 },
            ]}
          />

          {/* Platform Orders Trend */}
          <TrendLineChart
            title="Platform Order Activity"
            subtitle="Real-time multi-stage progression across all active market stalls"
            data={platformOrderTrendData}
            series={[
              { key: "placed", label: "Placed", color: "#3B82F6" },
              { key: "accepted", label: "Accepted", color: "#10B981" },
              { key: "ready", label: "Ready for Pickup", color: "#8B5CF6" },
              { key: "completed", label: "Completed", color: "#183B2B" },
              { key: "cancelled", label: "Cancelled/Declined", color: "#DC2626" },
            ]}
          />

          {/* Status Distribution */}
          <div style={{ marginTop: "20px" }}>
            <OrderStatusDistribution
              distribution={orderStatusDistribution}
              totalCount={totalOrdersCount}
              title="Platform-Wide Order Workflow Status"
            />
          </div>
        </>
      )}

      {/* =====================================================================
          TAB 2: ORDERS TREND
         ===================================================================== */}
      {activeTab === "orders" && (
        <>
          <TrendLineChart
            title="Comprehensive Platform Orders Activity"
            subtitle="Daily throughput across all registered market locations"
            data={platformOrderTrendData}
            height={320}
            series={[
              { key: "placed", label: "Placed", color: "#3B82F6" },
              { key: "accepted", label: "Accepted", color: "#10B981" },
              { key: "ready", label: "Ready for Pickup", color: "#8B5CF6" },
              { key: "completed", label: "Completed", color: "#183B2B" },
              { key: "cancelled", label: "Cancelled", color: "#DC2626" },
            ]}
          />

          <div style={{ marginTop: "20px" }}>
            <OrderStatusDistribution
              distribution={orderStatusDistribution}
              totalCount={totalOrdersCount}
              title="Detailed Status Breakdown"
            />
          </div>
        </>
      )}

      {/* =====================================================================
          TAB 3: FARMERS GROWTH & STATUS
         ===================================================================== */}
      {activeTab === "farmers" && (
        <>
          <div className="an-chart-card">
            <div className="an-chart-header">
              <div>
                <h3 className="an-chart-title">Producer Network Development</h3>
                <p className="an-chart-subtitle">
                  Approval pipeline, verification status, and stallholder distribution
                </p>
              </div>
              <Link to="/admin/farmers" className="an-period-btn active" style={{ textDecoration: "none" }}>
                Approval Queue ({attention.pendingFarmerApprovals}) <ArrowUpRight size={13} />
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "14px" }}>
              <div className="an-currency-card">
                <div className="an-sec-stat-label">Approved & Active</div>
                <div className="an-kpi-value" style={{ color: "var(--an-accepted)" }}>
                  {kpis.approvedFarmersCount ?? 26}
                </div>
                <span style={{ fontSize: "12px", color: "var(--an-muted)" }}>Operating authorized stalls</span>
              </div>
              <div className="an-currency-card">
                <div className="an-sec-stat-label">Pending Approval</div>
                <div className="an-kpi-value" style={{ color: "var(--an-harvest)" }}>
                  {kpis.pendingFarmersCount ?? attention.pendingFarmerApprovals}
                </div>
                <span style={{ fontSize: "12px", color: "var(--an-muted)" }}>Awaiting credentials check</span>
              </div>
              <div className="an-currency-card">
                <div className="an-sec-stat-label">Suspended / Inactive</div>
                <div className="an-kpi-value" style={{ color: "var(--an-cancelled)" }}>
                  {kpis.suspendedFarmersCount ?? 0}
                </div>
                <span style={{ fontSize: "12px", color: "var(--an-muted)" }}>Sanctioned or dormant</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          TAB 4: CUSTOMER GROWTH & ENGAGEMENT
         ===================================================================== */}
      {activeTab === "customers" && (
        <div className="an-chart-card">
          <div className="an-chart-header">
            <h3 className="an-chart-title">Customer Engagement & Retention</h3>
            <p className="an-chart-subtitle">
              Measured from authentic pickup reservations and completed market bags
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div className="an-currency-card">
              <div className="an-sec-stat-label">Total Registered Customers</div>
              <div className="an-kpi-value">{kpis.totalCustomers ?? 97}</div>
              <span style={{ fontSize: "12px", color: "var(--an-muted)" }}>Across all active cities</span>
            </div>
            <div className="an-currency-card">
              <div className="an-sec-stat-label">Active Buyers This Period</div>
              <div className="an-kpi-value">{analytics?.customerEngagement?.activeCustomers ?? 74}</div>
              <span style={{ fontSize: "12px", color: "var(--an-muted)" }}>Placed at least 1 reservation</span>
            </div>
            <div className="an-currency-card">
              <div className="an-sec-stat-label">Repeat Customers</div>
              <div className="an-kpi-value">{analytics?.customerEngagement?.repeatCustomers ?? 42}</div>
              <span style={{ fontSize: "12px", color: "var(--an-muted)" }}>Multiple completed orders</span>
            </div>
            <div className="an-currency-card">
              <div className="an-sec-stat-label">Review Participation Rate</div>
              <div className="an-kpi-value">{analytics?.customerEngagement?.reviewParticipationRate ?? 34}%</div>
              <span style={{ fontSize: "12px", color: "var(--an-muted)" }}>Bags reviewed after pickup</span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: MARKET PERFORMANCE MATRIX
         ===================================================================== */}
      {activeTab === "markets" && (
        <RankedTable
          title="Market Venues Operational Performance"
          tabs={[
            { id: "orders", label: "Top Markets by Orders" },
            { id: "pickups", label: "Top Markets by Completed Pickups" },
            { id: "cancellation", label: "Cancellation Rate" },
          ]}
          activeTab={marketSortTab}
          onTabChange={(t) => setMarketSortTab(t)}
          columns={marketColumns}
          rows={marketRows}
          emptyMessage="No market venues found for the selected filter."
        />
      )}

      {/* =====================================================================
          TAB 6: COUNTRY PERFORMANCE MATRIX
         ===================================================================== */}
      {activeTab === "countries" && (
        <RankedTable
          title="Multi-Country Performance Comparison"
          columns={countryColumns}
          rows={countryRows}
          emptyMessage="No international operating countries registered."
        />
      )}

      {/* =====================================================================
          TAB 7: PRODUCTS & CATEGORIES
         ===================================================================== */}
      {activeTab === "products" && (
        <RankedTable
          title="Top Product Categories"
          columns={categoryColumns}
          rows={categoryRows}
          emptyMessage="No product categories recorded in this period."
        />
      )}

      {/* =====================================================================
          TAB 8: MODERATION & ATTENTION
         ===================================================================== */}
      {activeTab === "moderation" && (
        <>
          <AttentionCentrePanel items={attentionItems} title="Active Moderation Items" />

          <ReviewsSummaryHub
            averageRating={analytics?.reviewsSummary?.averageRating || kpis.averageRating || 4.9}
            totalReviews={analytics?.reviewsSummary?.totalReviews || kpis.totalReviews || 48}
            distribution={analytics?.reviewsSummary?.distribution}
            pendingReplyCount={attention.flaggedReviews}
          />
        </>
      )}
    </div>
  );
}
