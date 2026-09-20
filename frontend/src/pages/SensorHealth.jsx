/**
 * SensorHealth — Sensor network status and health grid.
 * Data: GET /api/sensors (30-second refresh)
 */
import { useState } from 'react';
import { useSensors } from '../hooks/useSensors';
import Badge from '../components/ui/Badge';
import StatusDot from '../components/ui/StatusDot';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import { formatRelativeTime, formatTimestamp } from '../lib/utils';
import '../styles/pages.css';

const STATUS_FILTER_OPTIONS = ['ALL', 'ONLINE', 'OFFLINE', 'FAULT'];

function sensorStatusDot(status) {
  if (status === 'ONLINE')  return 'ok';
  if (status === 'OFFLINE') return 'danger';
  if (status === 'FAULT')   return 'warn';
  return 'neutral';
}

function sensorStatusVariant(status) {
  if (status === 'ONLINE')  return 'ok';
  if (status === 'OFFLINE') return 'danger';
  if (status === 'FAULT')   return 'warn';
  return 'neutral';
}

export default function SensorHealth() {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
  const { data, loading, error, refetch } = useSensors(params);

  const summary = data?.summary ?? {};
  const sensors = data?.data ?? [];

  return (
    <div className="page-root">
      <div className="page-head">
        <div>
          <p className="page-pre-label">AIRPORT OPERATIONS</p>
          <h1 className="page-title">Sensor Health</h1>
        </div>
        <div className="page-head-meta">
          <button className="btn-ghost-sm" onClick={refetch} aria-label="Refresh sensor data">
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={`Failed to load sensor data: ${error}`} />}

      {/* Summary */}
      {!loading && data && (
        <div className="summary-row">
          <div className="summary-chip">
            <span className="summary-chip-val">{summary.total ?? 0}</span>
            <span className="summary-chip-lbl">Total Sensors</span>
          </div>
          <div className="summary-chip summary-chip--ok">
            <span className="summary-chip-val">{summary.online ?? 0}</span>
            <span className="summary-chip-lbl">Online</span>
          </div>
          <div className="summary-chip summary-chip--danger">
            <span className="summary-chip-val">{summary.offline ?? 0}</span>
            <span className="summary-chip-lbl">Offline / Fault</span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="filter-bar" role="toolbar" aria-label="Sensor filters">
        <div className="filter-group">
          <label className="filter-label" htmlFor="sensor-status-filter">Status</label>
          <select
            id="sensor-status-filter"
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map(o => (
              <option key={o} value={o}>{o === 'ALL' ? 'All Statuses' : o}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading && sensors.length === 0 ? (
        <div className="page-spinner-wrap"><Spinner /></div>
      ) : sensors.length === 0 ? (
        <EmptyState message="No sensors match the current filter." />
      ) : (
        <div className="table-wrap">
          <table className="data-table" aria-label="Sensor health list">
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Sensor Code</th>
                <th scope="col">Type</th>
                <th scope="col">Zone</th>
                <th scope="col">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((s) => (
                <tr key={s.sensor.id} className={s.status !== 'ONLINE' ? 'row--warn' : ''}>
                  <td>
                    <StatusDot status={sensorStatusDot(s.status)} label={s.status} />
                  </td>
                  <td className="td-mono">{s.sensor.code}</td>
                  <td>
                    <Badge variant="neutral">{s.sensor.type}</Badge>
                  </td>
                  <td>
                    <span className="td-zone-code">{s.zone?.code ?? '—'}</span>
                    <span className="td-zone-name">{s.zone?.name ?? ''}</span>
                  </td>
                  <td className="td-time" title={formatTimestamp(s.last_seen_at)}>
                    {s.last_seen_at ? formatRelativeTime(s.last_seen_at) : <span className="td-null">Never</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}