import { useMarket } from "../ui";
import { gateway } from "../../data/gateway";
import { date, money } from "../../data/market";
import type { Metrics } from "../../data/market";
import { PeriodSelector } from "./AnalyticsComponents";
import type { ComparisonData, TrendDataPoint } from "./AnalyticsComponents";

/** Order-status colours, drawn from the brand palette (forest, sage, harvest). */
export const STATUS_COLORS: Record<string, string> = {
  placed: "#c98646",
  accepted: "#65806e",
  ready_for_pickup: "#a8baa3",
  completed: "#183b2b",
  cancelled: "#a14a3b",
  declined: "#5a665c",
};
export const STATUS_LABELS: Record<string, string> = {
  placed: "Awaiting acceptance",
  accepted: "Accepted",
  ready_for_pickup: "Ready for pickup",
  completed: "Collected",
  cancelled: "Cancelled",
  declined: "Declined",
};

export const ORDER_SERIES = [
  { key: "completed", label: "Collected", color: STATUS_COLORS.completed },
  { key: "open", label: "Open", color: STATUS_COLORS.placed },
  { key: "voided", label: "Cancelled or declined", color: STATUS_COLORS.cancelled },
];
export const VALUE_SERIES = [{ key: "value", label: "Booked value", color: STATUS_COLORS.completed }];

export function useMetrics() {
  const s = useMarket();
  return { s, m: s.metrics, loading: s.status === "loading" || (!!s.role && !s.metrics) };
}

export const compare = (diffPct: number | null | undefined): ComparisonData | undefined =>
  diffPct === null || diffPct === undefined ? undefined : { diffPct, isMeaningful: true };

export const percent = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n}%`);
export const rating = (n: number | null | undefined) => (n ? `${n.toFixed(1)} ★` : "—");

/** One point per market day in the period, from server metrics. */
export function trendPoints(m: Metrics): TrendDataPoint[] {
  return m.series.map((p) => ({
    date: p.date,
    label: date(p.date).replace(/^\w+\s/, ""),
    completed: p.completed,
    open: p.placed + p.accepted + p.ready_for_pickup,
    voided: p.cancelled + p.declined,
    orders: p.orders,
    value: Math.round(p.bookedValueMinor / 100),
  }));
}

export function statusDistribution(m: Metrics) {
  return Object.entries(m.statusMix)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ status, count, color: STATUS_COLORS[status], label: STATUS_LABELS[status] ?? status }));
}

export const PERIODS = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
];

export function PeriodBar({ m }: { m: Metrics | null }) {
  const s = useMarket();
  return (
    <PeriodSelector
      period={s.period}
      onPeriodChange={(p) => void gateway.setPeriod(p)}
      dateRangeLabel={m ? `${date(m.period.from)} – ${date(m.period.to)}` : undefined}
    />
  );
}

export function MetricsSkeleton() {
  return (
    <div className="workspace-loading" role="status" aria-live="polite" style={{ padding: "8px 0" }}>
      <div className="skeleton-grid">
        <span className="skeleton-card" />
        <span className="skeleton-card" />
        <span className="skeleton-card" />
        <span className="skeleton-card" />
      </div>
      <span className="visually-hidden">Loading figures…</span>
    </div>
  );
}

/** Downloads rows as a CSV file (report export). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const rupees = (minor: number) => money(minor);
