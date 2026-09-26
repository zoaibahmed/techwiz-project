import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, PackageCheck, Wallet, CheckCircle2, Download } from "lucide-react";
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
import type { Metrics, MarketState } from "../data/market";

/** Headline KPIs for the farmer overview. Every figure comes from server metrics. */
export function FarmerOperationalStatsArea(_: { f?: unknown; ownProducts?: unknown[]; ownOrders?: unknown[] }) {
  const { s, m, loading } = useMetrics();
  if (loading || !m) return <MetricsSkeleton />;
  return (
    <section aria-label="Stall performance">
      <div className="an-kpi-primary-grid">
        <MetricBlock
          hero
          label="Open reservations"
          value={m.open.total}
          subtitle={`${m.open.placed} awaiting your response · ${money(m.open.valueMinor)}`}
          icon={<ClipboardList size={16} />}
        />
        <MetricBlock
          label={m.open.nextMarketDate ? `To pack for ${date(m.open.nextMarketDate)}` : "Next market day"}
          value={`${m.open.nextMarketDayUnits} units`}
          subtitle={`${m.open.nextMarketDayOrders} orders · ${m.open.readyForPickup} already packed`}
          icon={<PackageCheck size={16} />}
        />
        <MetricBlock
          label="Booked value"
          value={money(m.totals.bookedValueMinor)}
          comparison={compare(m.change.bookedValue)}
          periodLabel="previous period"
          subtitle={m.period.label}
          icon={<Wallet size={16} />}
        />
        <MetricBlock
          label="Fulfilment rate"
          value={percent(m.totals.fulfilmentRate)}
          subtitle={`${m.totals.completed} collected · ${m.totals.cancelled + m.totals.declined} cancelled or declined`}
          icon={<CheckCircle2 size={16} />}
        />
      </div>
      <SecondaryStatsBar
        stats={[
          { label: "Listed products", value: s.products.filter((p) => p.farmerId === s.farmerId && !p.archived).length },
          { label: "Upcoming offers", value: m.stock.offers },
          { label: "Reserved units", value: m.stock.reservedUnits },
          { label: "Available units", value: m.stock.availableUnits },
          { label: "Low stock", value: m.stock.lowStock.length },
          { label: "Sold out", value: m.stock.soldOut.length },
          { label: "Stall rating", value: rating(m.reviews.average) },
          { label: "Reviews", value: m.reviews.count },
        ]}
      />
    </section>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "products", label: "Products" },
  { id: "stock", label: "Stock" },
  { id: "markets", label: "Markets" },
  { id: "reviews", label: "Reviews" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function FarmerInsightsWorkspace() {
  const { s, m, loading } = useMetrics();
  const [tab, setTab] = useState<Tab>("overview");
  const [rankBy, setRankBy] = useState<"value" | "units">("value");

  return (
    <div className="farmer-workbench container">
      <div className="fw-header">
        <div className="fw-header-info">
          <h1>Insights</h1>
          <p className="fw-header-sub">
            Orders, revenue and stock for your stall. Revenue is booked order value; payment is collected at the stall.
          </p>
        </div>
        {m && (
          <div className="fw-header-actions">
            <button className="button secondary" onClick={() => exportFarmerReport(m, s)}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        )}
      </div>

      <PeriodBar m={m} />

      <div className="fw-tabs" role="tablist" aria-label="Insight sections">
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
        <FarmerOverviewTab m={m} />
      ) : tab === "products" ? (
        <RankedTable
          title="Products by performance"
          tabs={[
            { id: "value", label: "By value" },
            { id: "units", label: "By units" },
          ]}
          activeTab={rankBy}
          onTabChange={(t) => setRankBy(t as "value" | "units")}
          columns={[
            { key: "name", label: "Product" },
            { key: "orders", label: "Orders", align: "right" },
            { key: "units", label: "Units", align: "right" },
            { key: "value", label: "Booked value", align: "right" },
          ]}
          rows={[...m.topProducts]
            .sort((a, b) => (rankBy === "value" ? b.valueMinor - a.valueMinor : b.units - a.units))
            .map((p) => ({ name: p.name, orders: p.orders, units: `${p.units} ${p.unit}`, value: money(p.valueMinor) }))}
          emptyMessage="No product sales in this period."
        />
      ) : tab === "stock" ? (
        <FarmerStockTab m={m} s={s} />
      ) : tab === "markets" ? (
        <RankedTable
          title="Markets"
          columns={[
            { key: "name", label: "Market" },
            { key: "orders", label: "Orders", align: "right" },
            { key: "value", label: "Booked value", align: "right" },
          ]}
          rows={m.byMarket.map((x) => ({ name: x.name, orders: x.orders, value: money(x.valueMinor) }))}
          emptyMessage="No market activity in this period."
        />
      ) : (
        <div className="an-reviews-tab">
          <ReviewsSummaryHub
            averageRating={m.reviews.average ?? 0}
            totalReviews={m.reviews.count}
            distribution={m.reviews.distribution}
            pendingReplyCount={m.reviews.awaitingReply}
          />
          {m.reviews.awaitingReply > 0 && (
            <Link className="button secondary" to="/farmer/reviews">
              Reply to {m.reviews.awaitingReply} review{m.reviews.awaitingReply === 1 ? "" : "s"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FarmerOverviewTab({ m }: { m: Metrics }) {
  const points = trendPoints(m);
  if (!points.length)
    return <AnalyticsEmptyState description="No orders were placed for your market days in this period." />;
  return (
    <>
      <FarmerOperationalStatsArea />
      <div className="an-chart-grid">
        <TrendLineChart title="Orders by market day" subtitle={m.period.label} data={points} series={ORDER_SERIES} />
        <TrendLineChart title="Booked value by market day" subtitle="PKR · payment taken at the stall" data={points} series={VALUE_SERIES} valuePrefix="Rs " />
      </div>
      <div className="an-chart-grid">
        <OrderStatusDistribution title="Order outcomes" distribution={statusDistribution(m)} totalCount={m.totals.orders} />
        <StockHealthVisual
          title="Upcoming stock"
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

function FarmerStockTab({ m, s }: { m: Metrics; s: MarketState }) {
  const productName = (id: string) => s.products.find((p) => p.id === id)?.name ?? "Product";
  const marketName = (id: string) => s.markets.find((x) => x.id === id)?.name ?? "Market";
  const rows = [
    ...m.stock.soldOut.map((x) => ({ product: productName(x.productId), market: marketName(x.marketId), day: date(x.date), left: "Sold out" })),
    ...m.stock.lowStock.map((x) => ({ product: productName(x.productId), market: marketName(x.marketId), day: date(x.date), left: `${x.available} of ${x.total}` })),
  ];
  return (
    <>
      <StockHealthVisual
        title="Upcoming stock"
        totalPublishedStock={m.stock.totalUnits}
        totalReservedStock={m.stock.reservedUnits}
        totalAvailableStock={m.stock.availableUnits}
        lowStockCount={m.stock.lowStock.length}
        soldOutCount={m.stock.soldOut.length}
      />
      <RankedTable
        title="Needs attention"
        columns={[
          { key: "product", label: "Product" },
          { key: "market", label: "Market" },
          { key: "day", label: "Market day" },
          { key: "left", label: "Left", align: "right" },
        ]}
        rows={rows}
        emptyMessage="Every upcoming offer has healthy stock."
      />
      <Link className="button secondary" to="/farmer/stock">
        Adjust dated stock
      </Link>
    </>
  );
}

function exportFarmerReport(m: Metrics, s: MarketState) {
  const stall = s.farmers.find((f) => f.id === s.farmerId)?.name ?? "stall";
  downloadCsv(`${stall.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${m.period.from}-${m.period.to}.csv`, [
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
    ["Product", "Orders", "Units", "Booked value (PKR)"],
    ...m.topProducts.map((p) => [p.name, p.orders, p.units, Math.round(p.valueMinor / 100)]),
  ]);
}
