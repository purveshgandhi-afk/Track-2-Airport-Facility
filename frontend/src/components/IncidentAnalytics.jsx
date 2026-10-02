/**
 * IncidentAnalytics — Compact incident analytics section with demo data.
 *
 * Renders inside the Command Center body grid (left column).
 * Uses realistic fake data modeled after the Maintenance & Cleaning pages.
 * Charts animate in when 30% visible via IntersectionObserver.
 *
 * Shows:
 * - Total / Open / Resolved KPIs
 * - Priority distribution bar (CRITICAL/HIGH/MEDIUM/LOW)
 * - Incident timeline bar chart (hourly)
 * - Zone breakdown (incidents per zone)
 * - Resolution rate badge
 */
import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import SectionHeader from '../components/ui/SectionHeader';
import { useInView } from '../hooks/useInView';
import '../styles/AnalyticsSections.css';

// ── Fake Data — modeled after real Maintenance/Cleaning pages ──────────────
const FAKE_SUMMARY = {
  total: 47,
  open: 8,
  resolved: 36,
  acknowledged: 3,
  critical: 5,
  high: 12,
  medium: 18,
  low: 12,
};

const FAKE_BY_PRIORITY = [
  { priority: 'CRITICAL', count: 5 },
  { priority: 'HIGH', count: 12 },
  { priority: 'MEDIUM', count: 18 },
  { priority: 'LOW', count: 12 },
];

const FAKE_TIMELINE = [
  { hour: '00:00', label: '00:00', count: 1 },
  { hour: '02:00', label: '02:00', count: 0 },
  { hour: '04:00', label: '04:00', count: 2 },
  { hour: '06:00', label: '06:00', count: 3 },
  { hour: '08:00', label: '08:00', count: 5 },
  { hour: '09:00', label: '09:00', count: 7 },
  { hour: '10:00', label: '10:00', count: 4 },
  { hour: '11:00', label: '11:00', count: 6 },
  { hour: '12:00', label: '12:00', count: 3 },
  { hour: '14:00', label: '14:00', count: 5 },
  { hour: '16:00', label: '16:00', count: 4 },
  { hour: '18:00', label: '18:00', count: 3 },
  { hour: '20:00', label: '20:00', count: 2 },
  { hour: '22:00', label: '22:00', count: 2 },
];

const FAKE_BY_ZONE = [
  { zone_code: 'T1-R01', zone_name: 'Restroom 1 - Domestic', terminal: 'T1', count: 12, open: 2, critical_high: 4 },
  { zone_code: 'T2-R03', zone_name: 'Restroom 3 - Gate C22', terminal: 'T2', count: 10, open: 3, critical_high: 5 },
  { zone_code: 'T1-R02', zone_name: 'Restroom 2 - Gate B12', terminal: 'T1', count: 8,  open: 1, critical_high: 2 },
  { zone_code: 'T2-R04', zone_name: 'Restroom 4 - Arrivals', terminal: 'T2', count: 7,  open: 1, critical_high: 3 },
  { zone_code: 'T1-R03', zone_name: 'Restroom 3 - VIP Lounge', terminal: 'T1', count: 6, open: 1, critical_high: 1 },
  { zone_code: 'T2-R01', zone_name: 'Restroom 1 - Intl Dep', terminal: 'T2', count: 4, open: 0, critical_high: 2 },
];

const FAKE_RESOLUTION = { resolved: 36, total: 47, rate_pct: 76.6 };

// ── Priority Colors ────────────────────────────────────────────────────────
const PRIORITY_COLORS = {
  CRITICAL: '#EF4444',
  HIGH: '#F59E0B',
  MEDIUM: '#C8A96E',
  LOW: '#5A5A56',
};

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function TimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ax-tooltip">
      <span className="ax-tooltip-hour">{label}</span>
      <div className="ax-tooltip-row">
        <span className="ax-tooltip-lbl">Incidents</span>
        <span className="ax-tooltip-val">{payload[0].value}</span>
      </div>
    </div>
  );
}

// ── Priority Distribution Mini-Bar ─────────────────────────────────────────
function PriorityDistBar({ byPriority, total }) {
  if (!byPriority?.length || total === 0) return null;

  return (
    <div className="ax-dist-bar-wrap" aria-label="Priority distribution">
      <div className="ax-dist-bar">
        {byPriority.map(p => {
          const pct = (p.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={p.priority}
              className="ax-dist-segment"
              style={{
                width: `${pct}%`,
                backgroundColor: PRIORITY_COLORS[p.priority] || '#5A5A56',
              }}
              title={`${p.priority}: ${p.count} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <div className="ax-dist-legend">
        {byPriority.map(p => (
          p.count > 0 && (
            <span key={p.priority} className="ax-dist-legend-item">
              <span
                className="ax-dist-dot"
                style={{ backgroundColor: PRIORITY_COLORS[p.priority] }}
              />
              {p.priority} ({p.count})
            </span>
          )
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function IncidentAnalytics() {
  const [sectionRef, inView] = useInView(0.3);

  const summary = FAKE_SUMMARY;
  const byPriority = FAKE_BY_PRIORITY;
  const byZone = FAKE_BY_ZONE;
  const resolution = FAKE_RESOLUTION;

  const chartData = useMemo(() => {
    return FAKE_TIMELINE.map(b => ({
      ...b,
      count: Number(b.count) || 0,
    }));
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`ax-section ax-animate ${inView ? 'ax-animate--visible' : ''}`}
      aria-labelledby="ia-heading"
      role="region"
    >
      <SectionHeader
        title="Incident Analytics"
        action={
          <span className="ax-resolution-badge" title="Resolution rate">
            {resolution.rate_pct}% resolved
          </span>
        }
      />

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <div className="ax-kpi-strip">
        <div className="ax-kpi">
          <span className="ax-kpi-val">{summary.total}</span>
          <span className="ax-kpi-lbl">Total</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val ax-kpi-val--danger">{summary.open}</span>
          <span className="ax-kpi-lbl">Open</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val ax-kpi-val--ok">{summary.resolved}</span>
          <span className="ax-kpi-lbl">Resolved</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val ax-kpi-val--critical">{summary.critical}</span>
          <span className="ax-kpi-lbl">Critical</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val ax-kpi-val--warn">{summary.high}</span>
          <span className="ax-kpi-lbl">High</span>
        </div>
      </div>

      {/* ── Priority Distribution Bar ─────────────────────────── */}
      <PriorityDistBar byPriority={byPriority} total={summary.total} />

      {/* ── Incident Timeline Chart ───────────────────────────── */}
      {chartData.length > 0 && (
        <div className="ax-chart-wrap">
          <div className="ax-chart-header">
            <span className="ax-chart-title">Incident Timeline</span>
            <span className="ax-chart-meta">{summary.total} total incidents</span>
          </div>
          <div className="ax-chart-container">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
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
                  allowDecimals={false}
                />
                <Tooltip content={<TimelineTooltip />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.count > 4 ? '#EF4444' : entry.count > 2 ? '#F59E0B' : '#C8A96E'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Zone Breakdown (compact) ──────────────────────────── */}
      <div className="ax-zone-table-wrap">
        <div className="ax-chart-header">
          <span className="ax-chart-title">By Zone</span>
        </div>
        <div className="ax-zone-list">
          {byZone.map(z => (
            <div key={z.zone_code} className="ax-zone-row">
              <div className="ax-zone-info">
                <span className="ax-zone-code">{z.zone_code}</span>
                <span className="ax-zone-terminal">{z.terminal}</span>
              </div>
              <div className="ax-zone-counts">
                <span className="ax-zone-total">{z.count}</span>
                {z.open > 0 && <span className="ax-zone-open">{z.open} open</span>}
                {z.critical_high > 0 && <span className="ax-zone-crit">{z.critical_high} crit/high</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
