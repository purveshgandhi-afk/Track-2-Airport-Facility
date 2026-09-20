/**
 * LiveTelemetry — Real-time fixture and sensor telemetry stream.
 * Data: GET /api/telemetry (30-second refresh, limit 50)
 */
import { useState } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import Badge from '../components/ui/Badge';
import StatusDot from '../components/ui/StatusDot';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import { formatRelativeTime, formatTimestamp, formatFlowRate } from '../lib/utils';
import '../styles/pages.css';

function sensorStatusDot(status) {
  if (status === 'ONLINE')  return 'ok';
  if (status === 'OFFLINE') return 'danger';
  if (status === 'FAULT')   return 'warn';
  return 'neutral';
}

function scenarioBadgeVariant(tag) {
  if (!tag) return 'neutral';
  const t = tag.toLowerCase();
  if (t.includes('leak'))    return 'danger';
  if (t.includes('offline')) return 'neutral';
  if (t.includes('high'))    return 'warn';
  return 'ok';
}

export default function LiveTelemetry() {
  const [zoneFilter, setZoneFilter] = useState('');

  const params = { limit: 50 };
  if (zoneFilter.trim()) params.zone_code = zoneFilter.trim().toUpperCase();

  const { data, loading, error, refetch } = useTelemetry(params);

  const rows  = data?.data ?? [];
  const count = data?.count ?? 0;

  return (
    <div className="page-root">
      <div className="page-head">
        <div>
          <p className="page-pre-label">AIRPORT OPERATIONS</p>
          <h1 className="page-title">Live Telemetry</h1>
        </div>
        <div className="page-head-meta">
          {!loading && <span className="page-count">{count} readings</span>}
          <button className="btn-ghost-sm" onClick={refetch} aria-label="Refresh telemetry">
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={`Failed to load telemetry: ${error}`} />}

      {/* Zone Filter */}
      <div className="filter-bar" role="toolbar" aria-label="Telemetry filters">
        <div className="filter-group">
          <label className="filter-label" htmlFor="tel-zone-filter">Zone Code</label>
          <input
            id="tel-zone-filter"
            className="filter-input"
            type="text"
            placeholder="e.g. T2-R03"
            value={zoneFilter}
            onChange={e => setZoneFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {loading && rows.length === 0 ? (
        <div className="page-spinner-wrap"><Spinner /></div>
      ) : rows.length === 0 ? (
        <EmptyState message="No telemetry data available." />
      ) : (
        <div className="table-wrap">
          <table className="data-table" aria-label="Telemetry readings">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Zone</th>
                <th scope="col">Sensor</th>
                <th scope="col">Flow</th>
                <th scope="col">Occupancy</th>
                <th scope="col">Flushes</th>
                <th scope="col">Status</th>
                <th scope="col">Scenario</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isLeak = r.scenario_tag?.toLowerCase().includes('leak');
                return (
                  <tr key={r.id} className={isLeak ? 'row--critical' : ''}>
                    <td className="td-time" title={formatTimestamp(r.timestamp)}>
                      {formatRelativeTime(r.timestamp)}
                    </td>
                    <td>
                      <span className="td-zone-code">{r.zone?.code ?? '—'}</span>
                      <span className="td-zone-name">{r.zone?.name ?? ''}</span>
                    </td>
                    <td className="td-mono">{r.sensor?.code ?? '—'}</td>
                    <td className={`td-num ${isLeak ? 'td-danger' : ''}`}>
                      {formatFlowRate(r.water_flow)}
                    </td>
                    <td className="td-num">{r.occupancy ?? '—'}</td>
                    <td className="td-num">{r.flush_count ?? '—'}</td>
                    <td>
                      <StatusDot status={sensorStatusDot(r.sensor_status)} label={r.sensor_status} />
                    </td>
                    <td>
                      {r.scenario_tag ? (
                        <Badge variant={scenarioBadgeVariant(r.scenario_tag)}>
                          {r.scenario_tag.toUpperCase()}
                        </Badge>
                      ) : <span className="td-null">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}