/**
 * Incidents — Operational incidents table with type/priority/status filters.
 * Data: GET /api/incidents (30-second refresh)
 *
 * Details column is type-aware:
 *  - LEAK              → avg_flow_lpm, estimated_liters, duration (from interval_min)
 *  - CLEANING_THRESHOLD → usage_count, threshold
 * NOTE: occupancy is live headcount — NOT cumulative usage. Never rendered here.
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIncidents } from '../hooks/useIncidents';
import { useTickets } from '../hooks/useTickets';
import Badge, { priorityVariant } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import IncidentDetailModal from '../components/ui/IncidentDetailModal';
import { formatRelativeTime, formatTimestamp } from '../lib/utils';
import '../styles/pages.css';

const TYPE_OPTIONS     = ['ALL', 'LEAK', 'CLEANING_THRESHOLD', 'SENSOR_FAULT'];
const PRIORITY_OPTIONS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS   = ['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

function typeVariant(type) {
  if (type === 'LEAK')               return 'danger';
  if (type === 'CLEANING_THRESHOLD') return 'warn';
  if (type === 'SENSOR_FAULT')       return 'neutral';
  return 'neutral';
}

function statusVariant(status) {
  if (status === 'OPEN')         return 'danger';
  if (status === 'ACKNOWLEDGED') return 'warn';
  if (status === 'RESOLVED')     return 'ok';
  return 'neutral';
}

/** Convert decimal minutes (e.g. 0.033) to a human-readable duration string */
function fmtDuration(intervalMin) {
  if (intervalMin == null) return null;
  const totalSec = Math.round(intervalMin * 60);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/** Type-aware detail chips — renders different fields per incident type */
function IncidentDetails({ inc }) {
  const d = inc.details || {};

  if (inc.type === 'LEAK') {
    return (
      <>
        {d.avg_flow_lpm != null && (
          <span className="detail-chip">{d.avg_flow_lpm} L/min</span>
        )}
        {d.estimated_liters != null && (
          <span className="detail-chip detail-chip--danger">{d.estimated_liters} L lost</span>
        )}
        {fmtDuration(d.interval_min) && (
          <span className="detail-chip">{fmtDuration(d.interval_min)}</span>
        )}
      </>
    );
  }

  if (inc.type === 'CLEANING_THRESHOLD') {
    return (
      <>
        {d.usage_count != null && (
          <span className="detail-chip">{d.usage_count.toLocaleString()} uses</span>
        )}
        {d.threshold != null && (
          <span className="detail-chip">limit {d.threshold}</span>
        )}
      </>
    );
  }

  return <span className="td-null">—</span>;
}

export default function Incidents() {
  const [searchParams] = useSearchParams();
  const [typeFilter,     setTypeFilter]     = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter,   setStatusFilter]   = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState(null);

  const params = {};
  if (typeFilter     !== 'ALL') params.type     = typeFilter;
  if (priorityFilter !== 'ALL') params.priority = priorityFilter;
  if (statusFilter   !== 'ALL') params.status   = statusFilter;

  const { data, loading, error, refetch } = useIncidents(params);
  const { data: ticketsData } = useTickets();

  const incidents = data?.data ?? [];
  const count     = data?.count ?? 0;
  const tickets   = ticketsData?.data ?? [];

  // Auto-open if query param ?id= matches
  useEffect(() => {
    const targetId = searchParams.get('id');
    if (targetId && incidents.length > 0) {
      const match = incidents.find(i => i.incident_id?.startsWith(targetId) || i.incident_id === targetId);
      if (match) setSelectedIncident(match);
    }
  }, [searchParams, incidents]);

  const modalTicket = tickets.find(
    t => t.incident?.id === selectedIncident?.incident_id || t.zone?.id === selectedIncident?.zone?.id
  ) || null;

  return (
    <div className="page-root">
      <div className="page-head">
        <div>
          <p className="page-pre-label">AIRPORT OPERATIONS</p>
          <h1 className="page-title">Operational Incidents</h1>
        </div>
        <div className="page-head-meta">
          {!loading && <span className="page-count">{count} incident{count !== 1 ? 's' : ''}</span>}
          <button className="btn-ghost-sm" onClick={refetch} aria-label="Refresh incidents">
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={`Failed to load incidents: ${error}`} />}

      {/* Filters */}
      <div className="filter-bar" role="toolbar" aria-label="Incident filters">
        <div className="filter-group">
          <label className="filter-label" htmlFor="inc-type-filter">Type</label>
          <select
            id="inc-type-filter"
            className="filter-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            {TYPE_OPTIONS.map(o => (
              <option key={o} value={o}>{o === 'ALL' ? 'All Types' : o.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="inc-priority-filter">Priority</label>
          <select
            id="inc-priority-filter"
            className="filter-select"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            {PRIORITY_OPTIONS.map(o => (
              <option key={o} value={o}>{o === 'ALL' ? 'All Priorities' : o}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="inc-status-filter">Status</label>
          <select
            id="inc-status-filter"
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o} value={o}>{o === 'ALL' ? 'All Statuses' : o}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading && incidents.length === 0 ? (
        <div className="page-spinner-wrap">
          <Spinner />
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState message="No incidents match the current filters." />
      ) : (
        <div className="table-wrap">
          <table className="data-table" aria-label="Incidents list">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Type</th>
                <th scope="col">Zone</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">Detected</th>
                <th scope="col">Resolved</th>
                <th scope="col">Impact / Details</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => {
                const isCriticalOpen = inc.status === 'OPEN' && inc.priority === 'CRITICAL';
                const isLeak         = inc.type === 'LEAK';
                const rowClass       = isCriticalOpen ? 'row--critical' : isLeak ? 'row--warn' : '';
                return (
                  <tr
                    key={inc.incident_id}
                    className={rowClass}
                    onClick={() => setSelectedIncident(inc)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view full incident & dispatch details"
                  >
                    <td className="td-mono">{inc.incident_id?.slice(0, 8).toUpperCase()}</td>
                    <td>
                      <Badge variant={typeVariant(inc.type)}>
                        {inc.type?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td>
                      <span className="td-zone-code">{inc.zone?.code ?? '—'}</span>
                      <span className="td-zone-name">{inc.zone?.name ?? ''}</span>
                    </td>
                    <td>
                      <Badge variant={priorityVariant(inc.priority)}>{inc.priority}</Badge>
                    </td>
                    <td>
                      <Badge variant={statusVariant(inc.status)}>{inc.status}</Badge>
                    </td>
                    <td className="td-time">
                      <span title={formatTimestamp(inc.detected_time)}>
                        {formatRelativeTime(inc.detected_time)}
                      </span>
                    </td>
                    <td className="td-time">
                      {inc.resolved_time
                        ? <span title={formatTimestamp(inc.resolved_time)}>{formatRelativeTime(inc.resolved_time)}</span>
                        : <span className="td-null">—</span>}
                    </td>
                    <td className="td-details">
                      <IncidentDetails inc={inc} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Incident & Dispatch Details Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          ticket={modalTicket}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}