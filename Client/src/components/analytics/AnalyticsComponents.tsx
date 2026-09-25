import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Info,
  CheckCircle2,
  Clock,
} from "lucide-react";

/* =========================================================================
   1. PERIOD SELECTOR
   ========================================================================= */
export interface PeriodSelectorProps {
  period: string;
  onPeriodChange: (period: string, startDate?: string, endDate?: string) => void;
  dateRangeLabel?: string;
  startDate?: string;
  endDate?: string;
}

export const PERIOD_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "custom", label: "Custom" },
];

export function PeriodSelector({
  period,
  onPeriodChange,
  dateRangeLabel,
  startDate,
  endDate,
}: PeriodSelectorProps) {
  const [customStart, setCustomStart] = useState(startDate || "");
  const [customEnd, setCustomEnd] = useState(endDate || "");

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onPeriodChange("custom", customStart, customEnd);
    }
  };

  return (
    <div className="an-period-bar">
      <div className="an-period-buttons">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`an-period-btn ${period === opt.id ? "active" : ""}`}
            onClick={() => onPeriodChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}

        {period === "custom" && (
          <div className="an-period-custom-inputs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              aria-label="Start Date"
            />
            <span style={{ fontSize: "12px", color: "var(--an-muted)" }}>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              aria-label="End Date"
            />
            <button
              type="button"
              className="an-period-btn active"
              onClick={handleCustomApply}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {dateRangeLabel && (
        <div className="an-period-active-badge">
          <Calendar size={13} />
          <span>{dateRangeLabel}</span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   2. METRIC BLOCK (PRIMARY KPI)
   ========================================================================= */
export interface ComparisonData {
  current?: number;
  previous?: number;
  diffPct?: number | null;
  isMeaningful?: boolean;
}

export interface MetricBlockProps {
  label: string;
  value: string | number;
  comparison?: ComparisonData;
  periodLabel?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  hero?: boolean;
}

export function MetricBlock({
  label,
  value,
  comparison,
  periodLabel = "previous period",
  subtitle,
  icon,
  hero = false,
}: MetricBlockProps) {
  const hasComparison =
    comparison &&
    comparison.isMeaningful &&
    comparison.diffPct !== null &&
    comparison.diffPct !== undefined;

  const isPositive = hasComparison && comparison!.diffPct! > 0;
  const isNegative = hasComparison && comparison!.diffPct! < 0;
  const isNeutral = hasComparison && comparison!.diffPct! === 0;

  return (
    <div className={`an-kpi-card ${hero ? "hero" : ""}`}>
      <div className="an-kpi-card-top">
        <span className="an-kpi-label">{label}</span>
        {icon && <div className="an-kpi-icon">{icon}</div>}
      </div>

      <div className="an-kpi-value">{value}</div>

      <div className="an-kpi-bottom">
        {hasComparison ? (
          <span
            className={`an-change-pill ${
              isPositive ? "positive" : isNegative ? "negative" : "neutral"
            }`}
          >
            {isPositive && <TrendingUp size={12} />}
            {isNegative && <TrendingDown size={12} />}
            {isNeutral && <Minus size={12} />}
            {isPositive ? `+${comparison!.diffPct}%` : `${comparison!.diffPct}%`} vs {periodLabel}
          </span>
        ) : comparison && comparison.previous !== undefined && comparison.previous !== 0 ? (
          <span className="an-change-pill neutral">
            Prev: {comparison.previous}
          </span>
        ) : null}

        {subtitle && <span>{subtitle}</span>}
      </div>
    </div>
  );
}

/* =========================================================================
   3. SECONDARY STATS BAR
   ========================================================================= */
export function SecondaryStatsBar({
  stats,
}: {
  stats: { label: string; value: string | number }[];
}) {
  if (!stats || stats.length === 0) return null;
  return (
    <div className="an-secondary-stats-bar">
      {stats.map((s, idx) => (
        <div key={idx} className="an-sec-stat">
          <span className="an-sec-stat-label">{s.label}</span>
          <span className="an-sec-stat-val">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================================
   4. CURRENCY GROUPING (BOOKED ORDER VALUE)
   ========================================================================= */
export interface CurrencyMetric {
  currency: string;
  symbol: string;
  bookedValueFormatted: string;
  bookedCount: number;
  collectedValueFormatted?: string;
  collectedCount?: number;
}

export function CurrencyBookedValueGroup({
  currencies,
  title = "Booked Order Value by Currency",
}: {
  currencies: Record<string, CurrencyMetric> | CurrencyMetric[];
  title?: string;
}) {
  const items: CurrencyMetric[] = Array.isArray(currencies)
    ? currencies
    : Object.values(currencies || {});

  if (items.length === 0) {
    return (
      <div className="an-currency-group">
        <div className="an-currency-header">
          <span className="an-currency-title">{title}</span>
          <span style={{ fontSize: "12px", color: "var(--an-muted)" }}>
            Physical payments tracked separately
          </span>
        </div>
        <div style={{ fontSize: "13px", color: "var(--an-muted)", padding: "12px 0" }}>
          No monetary reservations recorded in this period.
        </div>
      </div>
    );
  }

  return (
    <div className="an-currency-group">
      <div className="an-currency-header">
        <span className="an-currency-title">{title}</span>
        <span style={{ fontSize: "12px", color: "var(--an-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
          <Info size={13} /> Grouped by currency · No artificial currency mixing
        </span>
      </div>

      <div className="an-currency-grid">
        {items.map((c) => (
          <div key={c.currency} className="an-currency-card">
            <div className="an-currency-code">{c.currency} ({c.symbol})</div>
            <div className="an-currency-amount">{c.bookedValueFormatted}</div>
            <div className="an-currency-sub">
              {c.bookedCount} active reservation{c.bookedCount === 1 ? "" : "s"}
            </div>
            {c.collectedValueFormatted && (
              <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed var(--an-border-light)", fontSize: "11px", color: "var(--an-muted)" }}>
                Recorded Collected: <strong style={{ color: "var(--an-forest)" }}>{c.collectedValueFormatted}</strong>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   5. TIME-SERIES SVG TREND CHART (NO GRADIENTS)
   ========================================================================= */
export interface TrendDataPoint {
  date: string;
  label?: string;
  placed?: number;
  accepted?: number;
  completed?: number;
  cancelled?: number;
  value?: number;
  [key: string]: any;
}

export interface TrendLineChartProps {
  data: TrendDataPoint[];
  title: string;
  subtitle?: string;
  series: {
    key: string;
    label: string;
    color: string;
  }[];
  height?: number;
  valuePrefix?: string;
  onPointClick?: (point: TrendDataPoint) => void;
}

export function TrendLineChart({
  data,
  title,
  subtitle,
  series,
  height = 240,
  valuePrefix = "",
  onPointClick,
}: TrendLineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>(() =>
    series.reduce((acc, s) => ({ ...acc, [s.key]: true }), {})
  );

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!data || data.length === 0) {
    return (
      <div className="an-chart-card">
        <div className="an-chart-header">
          <div>
            <h3 className="an-chart-title">{title}</h3>
            {subtitle && <p className="an-chart-subtitle">{subtitle}</p>}
          </div>
        </div>
        <AnalyticsEmptyState
          title="Not enough activity yet"
          description="Orders and volume will populate this trend graph as customer reservations occur."
        />
      </div>
    );
  }

  // Calculate scales
  const visibleSeries = series.filter((s) => activeSeries[s.key]);
  let maxVal = 0;
  for (const d of data) {
    for (const s of visibleSeries) {
      const v = Number(d[s.key]) || 0;
      if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) maxVal = 10;
  // Round maxVal up to sensible round number
  const yTicksCount = 4;
  const tickStep = Math.ceil(maxVal / yTicksCount);
  const roundedMax = tickStep * yTicksCount;

  const paddingLeft = 46;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 30;
  const chartWidth = 720;
  const chartHeight = height;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (idx: number) => {
    if (data.length <= 1) return paddingLeft + usableWidth / 2;
    return paddingLeft + (idx / (data.length - 1)) * usableWidth;
  };

  const getY = (val: number) => {
    return paddingTop + usableHeight - (Math.min(val, roundedMax) / roundedMax) * usableHeight;
  };

  // Generate SVG path for a series
  const generatePath = (key: string) => {
    return data
      .map((d, i) => {
        const x = getX(i);
        const y = getY(Number(d[key]) || 0);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const hoveredData = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="an-chart-card">
      <div className="an-chart-header">
        <div>
          <h3 className="an-chart-title">{title}</h3>
          {subtitle && <p className="an-chart-subtitle">{subtitle}</p>}
        </div>

        <div className="an-chart-legend">
          {series.map((s) => (
            <div
              key={s.key}
              className="an-legend-item"
              onClick={() => toggleSeries(s.key)}
              style={{ opacity: activeSeries[s.key] ? 1 : 0.4 }}
            >
              <span
                className="an-legend-dot"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="an-svg-chart-wrap">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="an-svg-chart"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Y Axis Grid Lines & Labels */}
          {Array.from({ length: yTicksCount + 1 }).map((_, i) => {
            const tickVal = Math.round((roundedMax / yTicksCount) * i);
            const y = getY(tickVal);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  className="an-grid-line"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="an-axis-text"
                >
                  {valuePrefix}{tickVal}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            // Only show reasonable number of X labels
            const step = Math.max(1, Math.floor(data.length / 7));
            if (i % step !== 0 && i !== data.length - 1) return null;
            const x = getX(i);
            const label = d.label || d.date.slice(5);
            return (
              <text
                key={i}
                x={x}
                y={chartHeight - 8}
                textAnchor="middle"
                className="an-axis-text"
              >
                {label}
              </text>
            );
          })}

          {/* Line Paths (Solid colors only, NO GRADIENTS) */}
          {visibleSeries.map((s) => (
            <path
              key={s.key}
              d={generatePath(s.key)}
              stroke={s.color}
              className="an-line-path"
            />
          ))}

          {/* Hover guideline */}
          {hoveredIdx !== null && (
            <line
              x1={getX(hoveredIdx)}
              y1={paddingTop}
              x2={getX(hoveredIdx)}
              y2={chartHeight - paddingBottom}
              stroke="var(--an-forest)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Interactive Dots & Hover trigger rects */}
          {data.map((d, i) => {
            const x = getX(i);
            const isHovered = hoveredIdx === i;
            return (
              <g key={i} onClick={() => onPointClick && onPointClick(d)} style={{ cursor: onPointClick ? "pointer" : "default" }}>
                {visibleSeries.map((s) => {
                  const y = getY(Number(d[s.key]) || 0);
                  return (
                    <circle
                      key={s.key}
                      cx={x}
                      cy={y}
                      r={isHovered ? 5 : 3}
                      fill={s.color}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  );
                })}
                {/* Invisible hover hitbox */}
                <rect
                  x={x - (usableWidth / Math.max(1, data.length)) / 2}
                  y={paddingTop}
                  width={usableWidth / Math.max(1, data.length)}
                  height={usableHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredData && hoveredIdx !== null && (
          <div
            className="an-chart-tooltip"
            style={{
              left: `${(getX(hoveredIdx) / chartWidth) * 100}%`,
              top: `${(getY(visibleSeries[0] ? Number(hoveredData[visibleSeries[0].key]) || 0 : 0) / chartHeight) * 100}%`,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px", borderBottom: "1px solid #374151", paddingBottom: "2px" }}>
              {hoveredData.date}
            </div>
            {visibleSeries.map((s) => (
              <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ color: s.color, fontWeight: 500 }}>{s.label}:</span>
                <span>
                  {valuePrefix}{hoveredData[s.key] ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   6. ORDER STATUS DISTRIBUTION (STACKED HORIZONTAL BAR)
   ========================================================================= */
export interface StatusDistributionProps {
  distribution: {
    status: string;
    count: number;
    color: string;
    label: string;
  }[];
  totalCount: number;
  title?: string;
}

export function OrderStatusDistribution({
  distribution,
  totalCount,
  title = "Where Are Your Orders Right Now?",
}: StatusDistributionProps) {
  if (totalCount === 0) {
    return (
      <div className="an-chart-card">
        <h3 className="an-chart-title">{title}</h3>
        <p style={{ fontSize: "13px", color: "var(--an-muted)", margin: "8px 0" }}>
          No active orders recorded for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="an-chart-card">
      <div className="an-chart-header">
        <div>
          <h3 className="an-chart-title">{title}</h3>
          <p className="an-chart-subtitle">Current workflow stage breakdown across {totalCount} order{totalCount === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="an-status-dist-bar">
        {distribution.map((item) => {
          if (item.count === 0) return null;
          const pct = Math.round((item.count / totalCount) * 100);
          return (
            <div
              key={item.status}
              className="an-status-dist-segment"
              style={{
                width: `${pct}%`,
                backgroundColor: item.color,
              }}
              title={`${item.label}: ${item.count} (${pct}%)`}
            />
          );
        })}
      </div>

      <div className="an-status-dist-legend">
        {distribution.map((item) => {
          const pct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
          return (
            <div key={item.status} className="an-status-dist-item">
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    backgroundColor: item.color,
                  }}
                />
                <span style={{ color: "var(--an-ink)" }}>{item.label}</span>
              </span>
              <strong style={{ color: "var(--an-ink)" }}>
                {item.count} <span style={{ fontWeight: 400, color: "var(--an-muted)" }}>({pct}%)</span>
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   7. STOCK HEALTH VISUALIZATION
   ========================================================================= */
export interface StockHealthProps {
  totalPublishedStock: number;
  totalReservedStock: number;
  totalAvailableStock: number;
  lowStockCount: number;
  soldOutCount: number;
  title?: string;
}

export function StockHealthVisual({
  totalPublishedStock,
  totalReservedStock,
  totalAvailableStock,
  lowStockCount,
  soldOutCount,
  title = "Stock Health & Reservation Pressure",
}: StockHealthProps) {
  const published = Math.max(1, totalPublishedStock);
  const reservedPct = Math.min(100, Math.round((totalReservedStock / published) * 100));
  const availablePct = Math.max(0, 100 - reservedPct);

  return (
    <div className="an-chart-card">
      <div className="an-chart-header">
        <div>
          <h3 className="an-chart-title">{title}</h3>
          <p className="an-chart-subtitle">
            Capacity utilization and inventory alert levels
          </p>
        </div>
      </div>

      <div className="an-stock-health-bar">
        <div
          className="an-stock-segment-reserved"
          style={{ width: `${reservedPct}%` }}
          title={`Reserved: ${totalReservedStock} (${reservedPct}%)`}
        />
        <div
          className="an-stock-segment-available"
          style={{ width: `${availablePct}%` }}
          title={`Available: ${totalAvailableStock} (${availablePct}%)`}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--an-muted)", marginTop: "4px" }}>
        <span>Reserved: <strong style={{ color: "var(--an-harvest)" }}>{totalReservedStock}</strong> ({reservedPct}%)</span>
        <span>Available: <strong style={{ color: "var(--an-forest)" }}>{totalAvailableStock}</strong> ({availablePct}%)</span>
      </div>

      <div className="an-stock-callouts">
        {reservedPct >= 80 && (
          <span className="an-stock-callout-pill warning">
            <AlertTriangle size={13} />
            Reservations consuming {reservedPct}% of published stock
          </span>
        )}
        {soldOutCount > 0 && (
          <span className="an-stock-callout-pill alert">
            <AlertTriangle size={13} />
            {soldOutCount} product{soldOutCount === 1 ? "" : "s"} sold out
          </span>
        )}
        {lowStockCount > 0 && (
          <span className="an-stock-callout-pill warning">
            <AlertTriangle size={13} />
            {lowStockCount} product{lowStockCount === 1 ? "" : "s"} nearly sold out
          </span>
        )}
        {reservedPct < 50 && totalAvailableStock > 0 && (
          <span className="an-stock-callout-pill info">
            <CheckCircle2 size={13} />
            High availability — ample buffer for customer walk-ins
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   8. PICKUP WORKLOAD HISTOGRAM
   ========================================================================= */
export interface PickupWorkloadSlot {
  slot: string;
  count: number;
}

export function PickupWorkloadHistogram({
  slots,
  title = "Pickup Load by Time Window",
  workbenchUrl = "/farmer/pickups",
}: {
  slots: PickupWorkloadSlot[];
  title?: string;
  workbenchUrl?: string;
}) {
  if (!slots || slots.length === 0) {
    return (
      <div className="an-chart-card">
        <h3 className="an-chart-title">{title}</h3>
        <p style={{ fontSize: "13px", color: "var(--an-muted)", margin: "8px 0" }}>
          No upcoming pickup collections scheduled in this period.
        </p>
      </div>
    );
  }

  const maxCount = Math.max(1, ...slots.map((s) => s.count));

  return (
    <div className="an-chart-card">
      <div className="an-chart-header">
        <div>
          <h3 className="an-chart-title">{title}</h3>
          <p className="an-chart-subtitle">Upcoming customer collections across market windows</p>
        </div>
        <Link to={workbenchUrl} className="an-period-btn active" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          Pickup Station <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="an-workload-list">
        {slots.map((item) => {
          const pct = Math.round((item.count / maxCount) * 100);
          const isBusiest = item.count === maxCount && maxCount > 0;
          return (
            <div key={item.slot} className="an-workload-row">
              <span className="an-workload-time">{item.slot}</span>
              <div className="an-workload-track">
                <div
                  className={`an-workload-fill ${isBusiest ? "busiest" : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="an-workload-count">
                {item.count} {isBusiest && <span style={{ fontSize: "10px", color: "var(--an-harvest)" }}>★</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   9. RANKED TABLE WITH TABS
   ========================================================================= */
export interface TabOption {
  id: string;
  label: string;
}

export interface RankedTableProps {
  title: string;
  tabs?: TabOption[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, any>[];
  emptyMessage?: string;
}

export function RankedTable({
  title,
  tabs,
  activeTab,
  onTabChange,
  columns,
  rows,
  emptyMessage = "No records to display for this view.",
}: RankedTableProps) {
  return (
    <div className="an-chart-card">
      <div className="an-chart-header">
        <h3 className="an-chart-title">{title}</h3>
      </div>

      {tabs && tabs.length > 0 && (
        <div className="an-ranked-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`an-ranked-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => onTabChange && onTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ padding: "20px 0", fontSize: "13px", color: "var(--an-muted)" }}>
          {emptyMessage}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="an-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ textAlign: col.align || "left" }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align || "left" }}
                    >
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   10. OPERATIONAL ATTENTION CENTRE PANEL
   ========================================================================= */
export interface AttentionItem {
  id: string;
  title: string;
  count: number;
  link: string;
}

export function AttentionCentrePanel({
  items,
  title = "Needs Attention",
}: {
  items: AttentionItem[];
  title?: string;
}) {
  const activeItems = items.filter((it) => it.count > 0);
  if (activeItems.length === 0) return null;

  return (
    <div className="an-attention-panel">
      <div className="an-attention-header">
        <div className="an-attention-title">
          <AlertTriangle size={16} />
          <span>{title}</span>
        </div>
        <span style={{ fontSize: "12px", color: "#9a3412", fontWeight: 500 }}>
          {activeItems.length} operational queue{activeItems.length === 1 ? "" : "s"} require administrator action
        </span>
      </div>

      <div className="an-attention-grid">
        {activeItems.map((it) => (
          <Link key={it.id} to={it.link} className="an-attention-item">
            <span>{it.title}</span>
            <span className="an-attention-count">{it.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   11. REVIEWS & RATINGS SUMMARY
   ========================================================================= */
export function ReviewsSummaryHub({
  averageRating,
  totalReviews,
  distribution,
  pendingReplyCount,
}: {
  averageRating: number;
  totalReviews: number;
  distribution?: { 1?: number; 2?: number; 3?: number; 4?: number; 5?: number };
  pendingReplyCount?: number;
}) {
  const dist = distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const maxBar = Math.max(1, ...Object.values(dist));

  return (
    <div className="an-chart-card">
      <div className="an-chart-header">
        <div>
          <h3 className="an-chart-title">Customer Feedback & Sentiment</h3>
          <p className="an-chart-subtitle">
            Authenticated reviews from completed pickups
          </p>
        </div>
        {pendingReplyCount !== undefined && pendingReplyCount > 0 && (
          <span className="an-change-pill negative">
            {pendingReplyCount} review{pendingReplyCount === 1 ? "" : "s"} awaiting reply
          </span>
        )}
      </div>

      <div className="an-rating-hero">
        <div style={{ textAlign: "center" }}>
          <div className="an-rating-big">{averageRating.toFixed(1)}</div>
          <div style={{ fontSize: "12px", color: "var(--an-muted)", marginTop: "4px" }}>
            out of 5.0 ({totalReviews} review{totalReviews === 1 ? "" : "s"})
          </div>
        </div>

        <div className="an-rating-bars">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = dist[stars as keyof typeof dist] || 0;
            const pct = Math.round((count / maxBar) * 100);
            return (
              <div key={stars} className="an-rating-row">
                <span style={{ color: "var(--an-forest)", fontWeight: 600 }}>{stars}★</span>
                <div style={{ height: "8px", background: "var(--an-border-light)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--an-forest)" }} />
                </div>
                <span style={{ color: "var(--an-muted)", textAlign: "right" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   12. HONEST EMPTY STATE
   ========================================================================= */
export function AnalyticsEmptyState({
  title = "Not enough activity yet",
  description = "No orders or recorded transactions are available for this specific period.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="an-empty-state">
      <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", background: "var(--an-sage-subtle)", color: "var(--an-forest)", marginBottom: "12px" }}>
        <Clock size={24} />
      </div>
      <div className="an-empty-title">{title}</div>
      <p className="an-empty-desc">{description}</p>
    </div>
  );
}
