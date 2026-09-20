/**
 * Maintenance — Active work orders and technician dispatch queue.
 * Data: GET /api/tickets (30-second refresh)
 */
import { useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import Badge, { priorityVariant } from '../components/ui/Badge';
import SectionHeader from '../components/ui/SectionHeader';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import { formatRelativeTime, formatTimestamp } from '../lib/utils';
import '../styles/pages.css';

const PRIORITY_OPTIONS  = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS    = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'];
const TEAM_OPTIONS      = ['ALL', 'facilities-plumbing', 'cleaning', 'maintenance'];

function statusVariant(s) {
  if (s === 'OPEN')        return 'neutral';
  if (s === 'IN_PROGRESS') return 'warn';
  if (s === 'RESOLVED')    return 'ok';
  return 'neutral';
}

export default function Maintenance() {
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter,   setStatusFilter]   = useState('ALL');
  const [teamFilter,     setTeamFilter]     = useState('ALL');
  const [expanded,       setExpanded]       = useState(null);

  const params = {};
  if (priorityFilter !== 'ALL') params.priority      = priorityFilter;
  if (statusFilter   !== 'ALL') params.status        = statusFilter;
  if (teamFilter     !== 'ALL') params.assigned_team = teamFilter;

  const { data, loading, error, refetch } = useTickets(params);

  const tickets = data?.data ?? [];
  const count   = data?.count ?? 0;

  return (
    <div className="page-root">
      <div className="page-head">
        <div>
          <p className="page-pre-label">AIRPORT OPERATIONS</p>
          <h1 className="page-title">Maintenance &amp; Dispatch</h1>
        </div>
        <div className="page-head-meta">
          {!loading && <span className="page-count">{count} ticket{count !== 1 ? 's' : ''}</span>}
          <button className="btn-ghost-sm" onClick={refetch} aria-label="Refresh tickets">
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={`Failed to load tickets: ${error}`} />}

      {/* Filters */}
      <div className="filter-bar" role="toolbar" aria-label="Ticket filters">
        <div className="filter-group">
          <label className="filter-label" htmlFor="tkt-priority-filter">Priority</label>
          <select id="tkt-priority-filter" className="filter-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            {PRIORITY_OPTIONS.map(o => <option key={o} value={o}>{o === 'ALL' ? 'All Priorities' : o}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="tkt-status-filter">Status</label>
          <select id="tkt-status-filter" className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o === 'ALL' ? 'All Statuses' : o.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="tkt-team-filter">Team</label>
          <select id="tkt-team-filter" className="filter-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
            {TEAM_OPTIONS.map(o => <option key={o} value={o}>{o === 'ALL' ? 'All Teams' : o}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading && tickets.length === 0 ? (
        <div className="page-spinner-wrap"><Spinner /></div>
      ) : tickets.length === 0 ? (
        <EmptyState message="No tickets match the current filters." />
      ) : (
        <div className="ticket-list">
          {tickets.map((t) => (
            <div key={t.ticket_id} className={`ticket-card ${t.priority === 'CRITICAL' ? 'ticket-card--critical' : ''}`}>
              <div className="ticket-card-top">
                <div className="ticket-card-ids">
                  <span className="td-mono">{t.ticket_id?.slice(0, 8).toUpperCase()}</span>
                  <span className="ticket-sep">·</span>
                  <span className="ticket-zone">{t.zone?.code ?? '—'}</span>
                </div>
                <div className="ticket-card-badges">
                  <Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge>
                  <Badge variant={statusVariant(t.status)}>{t.status?.replace('_', ' ')}</Badge>
                </div>
              </div>

              <div className="ticket-card-body">
                <div className="ticket-meta-row">
                  <span className="ticket-meta-key">Zone</span>
                  <span className="ticket-meta-val">{t.zone?.name ?? '—'}</span>
                </div>
                <div className="ticket-meta-row">
                  <span className="ticket-meta-key">Team</span>
                  <span className="ticket-meta-val">{t.assigned_team ?? '—'}</span>
                </div>
                <div className="ticket-meta-row">
                  <span className="ticket-meta-key">Incident</span>
                  <span className="ticket-meta-val">{t.incident?.type?.replace('_', ' ') ?? '—'}</span>
                </div>
                <div className="ticket-meta-row">
                  <span className="ticket-meta-key">Created</span>
                  <span className="ticket-meta-val" title={formatTimestamp(t.created_time)}>
                    {formatRelativeTime(t.created_time)}
                  </span>
                </div>
              </div>

              {/* GenAI Recommendation */}
              {t.recommended_action && (
                <div className="ticket-genai">
                  <button
                    className="ticket-genai-toggle"
                    onClick={() => setExpanded(expanded === t.ticket_id ? null : t.ticket_id)}
                    aria-expanded={expanded === t.ticket_id}
                  >
                    Recommended Action
                    <span className="ticket-genai-chevron">{expanded === t.ticket_id ? '▲' : '▼'}</span>
                  </button>
                  {expanded === t.ticket_id && (
                    <div className="ticket-genai-body">
                      <p className="ticket-genai-action">{t.recommended_action}</p>
                      {t.explanation && <p className="ticket-genai-explain">{t.explanation}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}