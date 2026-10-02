/**
 * CleaningAnalytics — Compact hygiene & usage analytics section with demo data.
 *
 * Renders inside the Command Center body grid (right column).
 * Uses realistic fake data modeled after the Cleaning page's zone cards
 * and Maintenance page's ticket patterns.
 * Charts animate in when 30% visible via IntersectionObserver.
 *
 * Shows:
 * - Total zones, cleaning status KPIs
 * - Usage distribution bar (Normal/Approaching/Required/Overdue)
 * - Problem zones with progress bars
 * - Flush activity bar chart by zone
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
import ProgressBar from '../components/ui/ProgressBar';
import { useInView } from '../hooks/useInView';
import '../styles/AnalyticsSections.css';

// ── Fake Data — modeled after Cleaning page zone cards ────────────────────
const FAKE_SUMMARY = {
  total_zones: 8,
  requiring_cleaning: 2,
  overdue: 1,
  approaching: 2,
  normal: 3,
  avg_usage_pct: 68,
  total_usage_count: 542,
};

const FAKE_DISTRIBUTION = [
  { label: 'Normal',      count: 3, status: 'NORMAL' },
  { label: 'Approaching', count: 2, status: 'APPROACHING' },
  { label: 'Required',    count: 2, status: 'CLEANING_REQUIRED' },
  { label: 'Overdue',     count: 1, status: 'OVERDUE' },
];

const FAKE_PROBLEM_ZONES = [
  { zone_code: 'T2-R04', zone_name: 'Restroom 4 - Arrivals',   terminal: 'T2', traffic_tier: 'high',   usage: 218, threshold: 100, percentage: 218, status: 'OVERDUE' },
  { zone_code: 'T1-R01', zone_name: 'Restroom 1 - Domestic',   terminal: 'T1', traffic_tier: 'high',   usage: 112, threshold: 100, percentage: 112, status: 'CLEANING_REQUIRED' },
  { zone_code: 'T2-R03', zone_name: 'Restroom 3 - Gate C22',   terminal: 'T2', traffic_tier: 'high',   usage: 104, threshold: 100, percentage: 104, status: 'CLEANING_REQUIRED' },
  { zone_code: 'T1-R02', zone_name: 'Restroom 2 - Gate B12',   terminal: 'T1', traffic_tier: 'medium', usage: 84,  threshold: 100, percentage: 84,  status: 'APPROACHING' },
  { zone_code: 'T2-R01', zone_name: 'Restroom 1 - Intl Dep',   terminal: 'T2', traffic_tier: 'medium', usage: 81,  threshold: 100, percentage: 81,  status: 'APPROACHING' },
];

const FAKE_OCCUPANCY = [
  { zone_code: 'T1-R01', total_flushes: 28, total_occupancy: 45, avg_occupancy: 3.8, reading_count: 12 },
  { zone_code: 'T2-R03', total_flushes: 22, total_occupancy: 38, avg_occupancy: 3.2, reading_count: 12 },
  { zone_code: 'T2-R04', total_flushes: 19, total_occupancy: 32, avg_occupancy: 2.7, reading_count: 12 },
  { zone_code: 'T1-R02', total_flushes: 15, total_occupancy: 24, avg_occupancy: 2.0, reading_count: 12 },
  { zone_code: 'T2-R01', total_flushes: 12, total_occupancy: 20, avg_occupancy: 1.7, reading_count: 12 },
  { zone_code: 'T1-R03', total_flushes: 8,  total_occupancy: 14, avg_occupancy: 1.2, reading_count: 12 },
  { zone_code: 'T2-R02', total_flushes: 6,  total_occupancy: 10, avg_occupancy: 0.8, reading_count: 12 },
  { zone_code: 'T1-R04', total_flushes: 4,  total_occupancy: 8,  avg_occupancy: 0.7, reading_count: 12 },
];

// ── Status Colors ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
  NORMAL: '#22C55E',
  APPROACHING: '#C8A96E',
  CLEANING_REQUIRED: '#F59E0B',
  OVERDUE: '#EF4444',
};

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function OccupancyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="ax-tooltip">
      <span className="ax-tooltip-hour">{label}</span>
      <div className="ax-tooltip-row">
        <span className="ax-tooltip-lbl">Flushes</span>
        <span className="ax-tooltip-val">{d.total_flushes}</span>
      </div>
      <div className="ax-tooltip-row">
        <span className="ax-tooltip-lbl">Avg Occupancy</span>
        <span className="ax-tooltip-val">{d.avg_occupancy}</span>
      </div>
      <div className="ax-tooltip-row">
        <span className="ax-tooltip-lbl">Readings</span>
        <span className="ax-tooltip-val">{d.reading_count}</span>
      </div>
    </div>
  );
}

// ── Usage Distribution Mini-Bar ────────────────────────────────────────────
function UsageDistBar({ distribution, totalZones }) {
  if (!distribution?.length || totalZones === 0) return null;

  return (
    <div className="ax-dist-bar-wrap" aria-label="Hygiene status distribution">
      <div className="ax-dist-bar">
        {distribution.map(d => {
          const pct = (d.count / totalZones) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={d.status}
              className="ax-dist-segment"
              style={{
                width: `${pct}%`,
                backgroundColor: STATUS_COLORS[d.status] || '#5A5A56',
              }}
              title={`${d.label}: ${d.count} zones (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <div className="ax-dist-legend">
        {distribution.map(d => (
          d.count > 0 && (
            <span key={d.status} className="ax-dist-legend-item">
              <span
                className="ax-dist-dot"
                style={{ backgroundColor: STATUS_COLORS[d.status] }}
              />
              {d.label} ({d.count})
            </span>
          )
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function CleaningAnalytics() {
  const [sectionRef, inView] = useInView(0.3);

  const summary = FAKE_SUMMARY;
  const distribution = FAKE_DISTRIBUTION;
  const problemZones = FAKE_PROBLEM_ZONES;

  const occupancyChartData = useMemo(() => {
    return FAKE_OCCUPANCY.map(z => ({
      ...z,
      total_flushes: Number(z.total_flushes) || 0,
    }));
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`ax-section ax-animate ${inView ? 'ax-animate--visible' : ''}`}
      aria-labelledby="ca-heading"
      role="region"
    >
      <SectionHeader
        title="Hygiene & Usage Analytics"
        action={
          <span className="ax-avg-badge" title="Average usage threshold %">
            Avg {summary.avg_usage_pct}%
          </span>
        }
      />

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <div className="ax-kpi-strip">
        <div className="ax-kpi">
          <span className="ax-kpi-val">{summary.total_zones}</span>
          <span className="ax-kpi-lbl">Zones</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val ax-kpi-val--ok">{summary.normal}</span>
          <span className="ax-kpi-lbl">Normal</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val ax-kpi-val--warn">{summary.requiring_cleaning}</span>
          <span className="ax-kpi-lbl">Needs Clean</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val ax-kpi-val--danger">{summary.overdue}</span>
          <span className="ax-kpi-lbl">Overdue</span>
        </div>
        <div className="ax-kpi-divider" aria-hidden="true" />
        <div className="ax-kpi">
          <span className="ax-kpi-val" style={{ color: 'var(--color-accent)' }}>{summary.approaching}</span>
          <span className="ax-kpi-lbl">Approaching</span>
        </div>
      </div>

      {/* ── Usage Distribution Bar ────────────────────────────── */}
      <UsageDistBar distribution={distribution} totalZones={summary.total_zones} />

      {/* ── Problem Zones ─────────────────────────────────────── */}
      <div className="ax-zone-table-wrap">
        <div className="ax-chart-header">
          <span className="ax-chart-title">Highest Usage Zones</span>
        </div>
        <div className="ax-problem-zones">
          {problemZones.map(z => {
            const barColor = z.status === 'OVERDUE' ? 'var(--color-danger)'
              : z.status === 'CLEANING_REQUIRED' ? 'var(--color-warn)'
              : z.status === 'APPROACHING' ? 'var(--color-accent)'
              : 'var(--color-ok)';
            return (
              <div key={z.zone_code} className="ax-pz-row">
                <div className="ax-pz-info">
                  <span className="ax-zone-code">{z.zone_code}</span>
                  <span className="ax-zone-terminal">{z.terminal} · {z.traffic_tier}</span>
                </div>
                <div className="ax-pz-bar-wrap">
                  <ProgressBar
                    value={Math.min(z.percentage, 200)}
                    max={200}
                    showLabel={false}
                    label={`${z.usage}/${z.threshold} uses (${z.percentage}%)`}
                  />
                </div>
                <span className="ax-pz-pct" style={{ color: barColor }}>{z.percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Flush Activity Chart ──────────────────────────────── */}
      <div className="ax-chart-wrap">
        <div className="ax-chart-header">
          <span className="ax-chart-title">Flush Activity by Zone</span>
          <span className="ax-chart-meta">Latest telemetry readings</span>
        </div>
        <div className="ax-chart-container">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={occupancyChartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(42, 42, 42, 0.6)"
                vertical={false}
              />
              <XAxis
                dataKey="zone_code"
                tick={{ fontSize: 9, fill: '#5A5A56' }}
                tickLine={false}
                axisLine={{ stroke: '#2A2A2A' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#5A5A56' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<OccupancyTooltip />} />
              <Bar dataKey="total_flushes" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {occupancyChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.total_flushes > 15 ? '#C8A96E' : entry.total_flushes > 8 ? '#22C55E' : '#5A5A56'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
