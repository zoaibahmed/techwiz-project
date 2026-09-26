import { useState } from "react";
import { Wallet, ClipboardList, PackageCheck, CheckCircle2, Download } from "lucide-react";
import {
  MetricBlock,
  SecondaryStatsBar,
  TrendLineChart,
  OrderStatusDistribution,
  StockHealthVisual,
  RankedTable,
  ReviewsSummaryHub,
  AnalyticsEmptyState,
} from "../components/analytics/AnalyticsComponents";
import {
  useMetrics,
  compare,
  percent,
  rating,
  trendPoints,
  statusDistribution,
  PeriodBar,
  MetricsSkeleton,
  ORDER_SERIES,
  VALUE_SERIES,
  downloadCsv,
} from "../components/analytics/metrics-ui";
import { date, money } from "../data/market";
import type { Metrics } from "../data/market";

/** Platform KPIs for the command centre, from the same server metrics as the reports. */
export function AdminCommandOperationalStats() {
  const { m, loading } = useMetrics();
  if (loading || !m) return <MetricsSkeleton />;
  const p = m.platform;
  return (
    <section aria-label="Platform performance">
      <div className="an-kpi-primary-grid">
        <MetricBlock
          hero
          label="Booked value"
          value={money(m.totals.bookedValueMinor)}
          comparison={compare(m.change.bookedValue)}
          subtitle={m.period.label}
          icon={<Wallet size={16} />}
        />
        <MetricBlock
          label="Orders"
          value={m.totals.orders}
          comparison={compare(m.change.orders)}
          subtitle={`${m.totals.uniqueCustomers} customers ordered`}
          icon={<ClipboardList size={16} />}
        />
        <MetricBlock
          label={m.open.nextMarketDate ? `Open for ${date(m.open.nextMarketDate)}` : "Open reservations"}
          value={m.open.total}
          subtitle={`${m.open.placed} awaiting growers · ${money(m.open.valueMinor)}`}
          icon={<PackageCheck size={16} />}
        />
        <MetricBlock
          label="Fulfilment rate"
          value={percent(m.totals.fulfilmentRate)}
          subtitle={`${m.totals.completed} collected in ${m.period.label.toLowerCase()}`}
          icon={<CheckCircle2 size={16} />}
        />
      </div>
      {p && (
        <SecondaryStatsBar
          stats={[
            { label: "Approved growers", value: p.farmers.approved },
            { label: "Awaiting approval", value: p.farmers.pending },
            { label: "Customers", value: `${p.customers.active} active` },
            { label: "Markets", value: p.markets.active },
            { label: "Listed products", value: p.products.listed },
            { label: "Average rating", value: rating(m.reviews.average) },
            { label: "Flagged reviews", value: m.reviews.flagged },
            { label: "Open inquiries", value: p.inquiries.open },
          ]}
        />
      )}
    </section>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "markets", label: "Markets" },
  { id: "growers", label: "Growers" },
  { id: "products", label: "Products" },
  { id: "reviews", label: "Reviews" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function AdminAnalyticsWorkspace() {
  const { m, loading } = useMetrics();
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div className="fw-header-info">
          <h1>Reports</h1>
          <p className="fw-header-sub">
            Orders, booked value and growth across every market. Figures match the command centre and each grower’s insights.
          </p>
        </div>
        {m && (
          <div className="fw-header-actions">
            <button className="button secondary" onClick={() => exportPlatformReport(m)}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        )}
      </div>

      <PeriodBar m={m} />

      <div className="fw-tabs" role="tablist" aria-label="Report sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`fw-tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading || !m ? (
        <MetricsSkeleton />
      ) : tab === "overview" ? (
        <OverviewTab m={m} />
      ) : tab === "markets" ? (
        <RankedTable
          title="Markets by booked value"
          columns={[
            { key: "name", label: "Market" },
            { key: "orders", label: "Orders", align: "right" },
            { key: "value", label: "Booked value", align: "right" },
            { key: "share", label: "Share", align: "right" },
          ]}
          rows={m.byMarket.map((x) => ({
            name: x.name,
            orders: x.orders,
            value: money(x.valueMinor),
            share: share(x.valueMinor, m.totals.bookedValueMinor),
          }))}
          emptyMessage="No market activity in this period."
        />
      ) : tab === "growers" ? (
        <RankedTable
          title="Most active growers"
          columns={[
            { key: "name", label: "Grower" },
            { key: "orders", label: "Orders", align: "right" },
            { key: "value", label: "Booked value", align: "right" },
            { key: "share", label: "Share", align: "right" },
          ]}
          rows={m.byFarmer.map((x) => ({
            name: x.name,
            orders: x.orders,
            value: money(x.valueMinor),
            share: share(x.valueMinor, m.totals.bookedValueMinor),
          }))}
          emptyMessage="No grower activity in this period."
        />
      ) : tab === "products" ? (
        <RankedTable
          title="Best-selling products"
          columns={[
            { key: "name", label: "Product" },
            { key: "orders", label: "Orders", align: "right" },
            { key: "units", label: "Units", align: "right" },
            { key: "value", label: "Booked value", align: "right" },
          ]}
          rows={m.topProducts.map((x) => ({ name: x.name, orders: x.orders, units: `${x.units} ${x.unit}`, value: money(x.valueMinor) }))}
          emptyMessage="No product sales in this period."
        />
      ) : (
        <ReviewsSummaryHub
          averageRating={m.reviews.average ?? 0}
          totalReviews={m.reviews.count}
          distribution={m.reviews.distribution}
        />
      )}
    </div>
  );
}

function OverviewTab({ m }: { m: Metrics }) {
  const points = trendPoints(m);
  return (
    <>
      <AdminCommandOperationalStats />
      {points.length ? (
        <div className="an-chart-grid">
          <TrendLineChart title="Orders by market day" subtitle={m.period.label} data={points} series={ORDER_SERIES} />
          <TrendLineChart title="Booked value by market day" subtitle="PKR · payment taken at the stall" data={points} series={VALUE_SERIES} valuePrefix="Rs " />
        </div>
      ) : (
        <AnalyticsEmptyState description="No market days with orders fall in this period." />
      )}
      <div className="an-chart-grid">
        <OrderStatusDistribution title="Order outcomes" distribution={statusDistribution(m)} totalCount={m.totals.orders} />
        <StockHealthVisual
          title="Upcoming stock across markets"
          totalPublishedStock={m.stock.totalUnits}
          totalReservedStock={m.stock.reservedUnits}
          totalAvailableStock={m.stock.availableUnits}
          lowStockCount={m.stock.lowStock.length}
          soldOutCount={m.stock.soldOut.length}
        />
      </div>
    </>
  );
}

const share = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

function exportPlatformReport(m: Metrics) {
  downloadCsv(`gather-grow-report-${m.period.from}-${m.period.to}.csv`, [
    ["Gather & Grow platform report", `${m.period.from} to ${m.period.to}`],
    ["Orders", m.totals.orders],
    ["Booked value (PKR)", Math.round(m.totals.bookedValueMinor / 100)],
    ["Collected value (PKR)", Math.round(m.totals.collectedValueMinor / 100)],
    ["Fulfilment rate (%)", m.totals.fulfilmentRate ?? ""],
    [],
    ["Market day", "Orders", "Collected", "Open", "Cancelled or declined", "Booked value (PKR)"],
    ...m.series.map((p) => [
      p.date,
      p.orders,
      p.completed,
      p.placed + p.accepted + p.ready_for_pickup,
      p.cancelled + p.declined,
      Math.round(p.bookedValueMinor / 100),
    ]),
    [],
    ["Market", "Orders", "Booked value (PKR)"],
    ...m.byMarket.map((x) => [x.name, x.orders, Math.round(x.valueMinor / 100)]),
    [],
    ["Grower", "Orders", "Booked value (PKR)"],
    ...m.byFarmer.map((x) => [x.name, x.orders, Math.round(x.valueMinor / 100)]),
  ]);
}
