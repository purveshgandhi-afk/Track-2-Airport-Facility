/**
 * MaintenanceAnalytics — Compact maintenance & dispatch analytics section.
 *
 * Renders inside the Facility Performance 2-column grid (Row 2, Column 2).
 * Uses realistic operational data modeled after the Maintenance & Dispatch page.
 * Charts animate in when 30% visible via IntersectionObserver.
 *
 * Shows:
 * - Work order & dispatch volume KPIs (Total, Open, In Progress, SLA Compliance)
 * - Team workload distribution bar (Facilities-Plumbing, Cleaning, General Maintenance)
 * - Hourly dispatch activity bar chart
 * - Active work orders queue by team & response status
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
import Badge, { priorityVariant } from '../components/ui/Badge';
import { useInView } from '../hooks/useInView';
import '../styles/AnalyticsSections.css';

// ── Realistic Data modeled after Maintenance page tickets ──────────────────
const FAKE_SUMMARY = {
  total_work_orders: 28,
  open_dispatches: 5,
  in_progress: 3,
  resolved_today: 20,
  sla_compliance_pct: 96.4,
  avg_mttr_minutes: 22,
};

const FAKE_TEAM_DISTRIBUTION = [
  { team: 'facilities-plumbing', label: 'Plumbing', count: 14, color: '#C8A96E' },
  { team: 'cleaning',            label: 'Hygiene',  count: 9,  color: '#3B82F6' },
  { team: 'maintenance',         label: 'General',  count: 5,  color: '#8B5CF6' },
];

const FAKE_DISPATCH_TIMELINE = [
  { hour: '00:00', label: '00:00', count: 1 },
  { hour: '02:00', label: '02:00', count: 0 },
  { hour: '04:00', label: '04:00', count: 1 },
  { hour: '06:00', label: '06:00', count: 2 },
  { hour: '08:00', label: '08:00', count: 5 },
  { hour: '09:00', label: '09:00', count: 6 },
  { hour: '10:00', label: '10:00', count: 4 },
  { hour: '11:00', label: '11:00', count: 5 },
  { hour: '12:00', label: '12:00', count: 3 },
  { hour: '14:00', label: '14:00', count: 4 },
  { hour: '16:00', label: '16:00', count: 5 },
  { hour: '18:00', label: '18:00', count: 3 },
  { hour: '20:00', label: '20:00', count: 2 },
  { hour: '22:00', label: '22:00', count: 1 },
];

const FAKE_ACTIVE_TEAMS = [
  { team: 'facilities-plumbing', name: 'Facilities Plumbing', active: 3, lead: 'V. Sharma', sla: '14 min avg' },
  { team: 'cleaning',            name: 'Hygiene & Sanitation', active: 2, lead: 'R. Kumar',  sla: '18 min avg' },
  { team: 'maintenance',         name: 'General Maintenance', active: 1, lead: 'A. Patel',  sla: '35 min avg' },
];

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function DispatchTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="ax-tooltip">
      <span className="ax-tooltip-hour">{label}</span>
      <div className="ax-tooltip-row">
        <span className="ax-tooltip-lbl">Dispatches</span>
        <span className="ax-tooltip-val">{d.count} work orders</span>
      </div>
    </div>
  );
}

// ── Team Distribution Mini-Bar ─────────────────────────────────────────────
function TeamDistBar({ distribution, total }) {
  return (
    <div className="ax-dist-bar-wrap" aria-label="Work order distribution by team">
      <div className="ax-chart-header">
        <span className="ax-dist-bar-title">Dispatches by Operational Unit</span>
        <span className="ax-chart-meta">{total} Total Tickets</span>
      </div>
      <div className="ax-dist-bar">
        {distribution.map((d) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={d.team}
              className="ax-dist-segment"
              style={{ width: `${pct}%`, backgroundColor: d.color }}
              title={`${d.label}: ${d.count} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <div className="ax-dist-legend">
        {distribution.map((d) => (
          <span key={d.team} className="ax-dist-legend-item">
            <span className="ax-dist-dot" style={{ backgroundColor: d.color }} />
            {d.label} ({d.count})
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MaintenanceAnalytics() {
  const [ref, inView] = useInView(0.3);
  const summary = FAKE_SUMMARY;

  return (
    <section
      ref={ref}
      className={`ax-section ${inView ? 'ax-animate ax-animate--visible' : 'ax-animate'}`}
      aria-labelledby="maint-analytics-heading"
      role="region"
    >
      <SectionHeader
        title="Maintenance Analytics"
        action={
          <span className="ax-header-badge" title="Dispatched Work Orders SLA">
            {summary.sla_compliance_pct}% SLA Met
          </span>
        }
      />

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <div className="ax-kpi-strip">
        <div className="ax-kpi">
          <span className="ax-kpi-val">{summary.total_work_orders}</span>
          <span className="ax-kpi-lbl">Work Orders</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val ax-kpi-val--danger">{summary.open_dispatches}</span>
          <span className="ax-kpi-lbl">Open Dispatches</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val ax-kpi-val--warn">{summary.in_progress}</span>
          <span className="ax-kpi-lbl">In Progress</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val ax-kpi-val--accent">{summary.avg_mttr_minutes}m</span>
          <span className="ax-kpi-lbl">Avg Response</span>
        </div>
      </div>

      {/* ── Team Distribution Bar ─────────────────────────────── */}
      <TeamDistBar
        distribution={FAKE_TEAM_DISTRIBUTION}
        total={summary.total_work_orders}
      />

      {/* ── Hourly Dispatch Chart ──────────────────────────────── */}
      <div className="ax-chart-wrap" aria-label="Hourly maintenance dispatch volume">
        <div className="ax-chart-header">
          <span className="ax-chart-title">Dispatch Activity (24h)</span>
          <span className="ax-chart-meta">
            Peak: 09:00 (6 dispatches)
          </span>
        </div>
        <div className="ax-chart-container">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={FAKE_DISPATCH_TIMELINE} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
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
              <Tooltip content={<DispatchTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {FAKE_DISPATCH_TIMELINE.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.count >= 5 ? '#C8A96E' : '#404040'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Operational Response Units Table ───────────────────── */}
      <div className="ax-zone-table-wrap">
        <div className="ax-zone-table-header">
          <span className="ax-zone-table-title">Operational Response Teams</span>
          <span className="ax-zone-table-meta">3 Active Crews</span>
        </div>
        <table className="ax-zone-table" aria-label="Maintenance teams dispatch status">
          <thead>
            <tr>
              <th scope="col">Unit / Crew</th>
              <th scope="col">Active Dispatches</th>
              <th scope="col">Lead Tech</th>
              <th scope="col">Avg SLA</th>
            </tr>
          </thead>
          <tbody>
            {FAKE_ACTIVE_TEAMS.map((t) => (
              <tr key={t.team}>
                <td>
                  <span className="ax-zone-code">{t.name}</span>
                </td>
                <td>
                  <span className="ax-zone-flushes">
                    <Badge variant={t.active > 2 ? 'warn' : 'ok'}>
                      {t.active} Active
                    </Badge>
                  </span>
                </td>
                <td>
                  <span className="ax-zone-occupancy">{t.lead}</span>
                </td>
                <td>
                  <span className="ax-zone-trend">{t.sla}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
