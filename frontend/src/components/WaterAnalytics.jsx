/**
 * WaterAnalytics — Compact 24-hour water usage analytics section.
 *
 * Renders inside the Command Center body grid (left column).
 * Uses the latest DB records via /api/water/analytics.
 *
 * Shows:
 * - 24-hour water usage trend (area chart via Recharts)
 * - Total, Average, Peak usage + Estimated wastage KPIs
 * - Period comparison trend indicator
 */
import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import SectionHeader from '../components/ui/SectionHeader';
import Spinner from '../components/ui/Spinner';
import { useInView } from '../hooks/useInView';
import '../styles/WaterAnalytics.css';
import '../styles/AnalyticsSections.css';

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function AnalyticsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="wa-tooltip">
      <span className="wa-tooltip-hour">{label}</span>
      <div className="wa-tooltip-row">
        <span className="wa-tooltip-lbl">Total Flow</span>
        <span className="wa-tooltip-val">{d.total_flow_lpm} L</span>
      </div>
      <div className="wa-tooltip-row">
        <span className="wa-tooltip-lbl">Avg Flow</span>
        <span className="wa-tooltip-val">{d.avg_flow_lpm} L/min</span>
      </div>
      <div className="wa-tooltip-row">
        <span className="wa-tooltip-lbl">Peak</span>
        <span className="wa-tooltip-val">{d.max_flow_lpm} L/min</span>
      </div>
      <div className="wa-tooltip-row">
        <span className="wa-tooltip-lbl">Readings</span>
        <span className="wa-tooltip-val">{d.reading_count}</span>
      </div>
    </div>
  );
}

// ── Trend Arrow ────────────────────────────────────────────────────────────
function TrendIndicator({ direction, changePct }) {
  const isUp = direction === 'increasing';
  const isDown = direction === 'decreasing';
  const arrow = isUp ? '↑' : isDown ? '↓' : '→';
  const cls = isUp ? 'wa-trend--up' : isDown ? 'wa-trend--down' : 'wa-trend--stable';
  const label = isUp ? 'Increasing' : isDown ? 'Decreasing' : 'Stable';

  return (
    <span className={`wa-trend-indicator ${cls}`} title={`${label}: ${Math.abs(changePct)}% change`}>
      <span className="wa-trend-arrow">{arrow}</span>
      <span className="wa-trend-pct">{Math.abs(changePct)}%</span>
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function WaterAnalytics({ data, loading }) {
  const [ref, inView] = useInView(0.3);
  const summary = data?.summary;
  const comparison = data?.comparison;
  const trend = data?.hourly_trend ?? [];

  // Memoize chart data to avoid re-render jitter
  const chartData = useMemo(() => {
    if (!trend.length) return [];
    return trend.map((b) => ({
      ...b,
      // Ensure numeric for Recharts
      total_flow_lpm: Number(b.total_flow_lpm) || 0,
      avg_flow_lpm: Number(b.avg_flow_lpm) || 0,
    }));
  }, [trend]);

  if (loading && !data) {
    return (
      <section className="wa-section wa-section--primary" aria-label="Water Analytics loading">
        <SectionHeader title="Water Analytics" />
        <div className="wa-spinner-wrap"><Spinner /></div>
      </section>
    );
  }

  if (!summary || summary.total_readings === 0) {
    return (
      <section className="wa-section wa-section--primary" aria-label="Water Analytics">
        <SectionHeader title="Water Analytics" />
        <p className="wa-empty">No telemetry data available for analytics.</p>
      </section>
    );
  }

  const wastePct = summary.total_usage_liters > 0
    ? ((summary.estimated_wastage_liters / summary.total_usage_liters) * 100).toFixed(1)
    : '0.0';

  return (
    <section
      ref={ref}
      className={`wa-section wa-section--primary ${inView ? 'ax-animate ax-animate--visible' : 'ax-animate'}`}
      aria-labelledby="wa-heading"
      role="region"
    >
      <SectionHeader
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>Water Analytics</span>
            <span className="wa-core-badge">KOHLER CORE</span>
          </span>
        }
        action={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span className="wa-priority-pill">Conservation Priority</span>
            {comparison ? (
              <TrendIndicator
                direction={comparison.trend_direction}
                changePct={comparison.change_pct}
              />
            ) : null}
          </span>
        }
      />

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <div className="wa-kpi-strip">
        <div className="wa-kpi">
          <span className="wa-kpi-val">{summary.total_usage_liters.toLocaleString()}</span>
          <span className="wa-kpi-unit">L</span>
          <span className="wa-kpi-lbl">Total Usage</span>
        </div>
        <div className="wa-kpi-divider" aria-hidden="true" />
        <div className="wa-kpi">
          <span className="wa-kpi-val">{summary.avg_usage_lpm}</span>
          <span className="wa-kpi-unit">L/min</span>
          <span className="wa-kpi-lbl">Avg Flow</span>
        </div>
        <div className="wa-kpi-divider" aria-hidden="true" />
        <div className="wa-kpi">
          <span className="wa-kpi-val wa-kpi-val--accent">{summary.peak_usage_lpm}</span>
          <span className="wa-kpi-unit">L/min</span>
          <span className="wa-kpi-lbl">Peak {summary.peak_hour ? `@ ${summary.peak_hour}` : ''}</span>
        </div>
        <div className="wa-kpi-divider" aria-hidden="true" />
        <div className="wa-kpi">
          <span className="wa-kpi-val wa-kpi-val--warn">{summary.estimated_wastage_liters.toLocaleString()}</span>
          <span className="wa-kpi-unit">L</span>
          <span className="wa-kpi-lbl">Est. Wastage ({wastePct}%)</span>
        </div>
      </div>

      {/* ── Area Chart ────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="wa-chart-wrap" aria-label="Hourly water usage trend">
          <div className="wa-chart-header">
            <span className="wa-chart-title">Hourly Usage Trend</span>
            <span className="wa-chart-meta">
              {summary.total_readings} readings · {chartData.length} hours
            </span>
          </div>
          <div className="wa-chart-container">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="waGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8A96E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C8A96E" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(42, 42, 42, 0.6)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#5A5A56' }}
                  tickLine={false}
                  axisLine={{ stroke: '#2A2A2A' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#5A5A56' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<AnalyticsTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total_flow_lpm"
                  stroke="#C8A96E"
                  strokeWidth={2}
                  fill="url(#waGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#C8A96E', stroke: '#111111', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Comparison Footer ─────────────────────────────────── */}
      {comparison && (
        <div className="wa-comparison">
          <div className="wa-comparison-half">
            <span className="wa-comparison-lbl">First half</span>
            <span className="wa-comparison-val">{comparison.first_half_liters} L</span>
          </div>
          <div className="wa-comparison-vs" aria-hidden="true">vs</div>
          <div className="wa-comparison-half">
            <span className="wa-comparison-lbl">Second half</span>
            <span className="wa-comparison-val">{comparison.second_half_liters} L</span>
          </div>
        </div>
      )}
    </section>
  );
}
