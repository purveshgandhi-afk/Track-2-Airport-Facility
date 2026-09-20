import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Activity, Wrench, AlertTriangle, Droplet, Clock, ShieldAlert } from 'lucide-react';
import Badge, { priorityVariant } from './Badge';
import StatusDot from './StatusDot';
import { formatRelativeTime, formatTimestamp, formatDuration } from '../../lib/utils';
import '../../styles/modal.css';

function fmtDuration(intervalMin) {
  if (intervalMin == null) return null;
  const totalSec = Math.round(intervalMin * 60);
  if (totalSec < 60) return `${totalSec} seconds`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m} minutes`;
}

export default function IncidentDetailModal({ incident, ticket, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!incident) return null;

  const d = incident.details || {};
  const isLeak = incident.type === 'LEAK';
  const durationStr = fmtDuration(d.interval_min || d.duration_min);

  function handleGoToMaintenance() {
    onClose();
    navigate('/maintenance');
  }

  function handleGoToTelemetry() {
    onClose();
    navigate(`/telemetry`);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-incident-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-badge-row">
              <span className="modal-ref-mono">
                {incident.incident_id?.slice(0, 8).toUpperCase() ?? 'INCIDENT'}
              </span>
              <Badge variant={incident.type === 'LEAK' ? 'danger' : 'warn'}>
                {incident.type?.replace(/_/g, ' ')}
              </Badge>
              <Badge variant={priorityVariant(incident.priority)}>
                {incident.priority}
              </Badge>
              <Badge variant={incident.status === 'OPEN' ? 'warn' : 'ok'}>
                {incident.status}
              </Badge>
            </div>
            <h2 id="modal-incident-title" className="modal-title">
              {isLeak ? 'Active Plumbing Leak Anomaly' : 'Restroom Operational Alert'}
            </h2>
          </div>
          <button
            id="modal-close-btn"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body">
          {/* Section 1: Location / Facility */}
          <div className="modal-section">
            <div className="modal-section-head">
              <AlertTriangle size={15} className="modal-section-icon" />
              <span>Location &amp; Facility Context</span>
            </div>
            <div className="modal-grid-2">
              <div className="modal-field">
                <span className="modal-field-label">Zone Code &amp; Name</span>
                <span className="modal-field-value">
                  <strong>{incident.zone?.code ?? '—'}</strong> · {incident.zone?.name ?? 'Unknown Zone'}
                </span>
              </div>
              <div className="modal-field">
                <span className="modal-field-label">Terminal</span>
                <span className="modal-field-value">
                  {incident.zone?.terminal?.name || incident.zone?.terminal?.code || 'Terminal 2'}
                </span>
              </div>
              <div className="modal-field">
                <span className="modal-field-label">Traffic Tier</span>
                <span className="modal-field-value modal-tag-tier">
                  {(incident.zone?.traffic_tier ?? 'high').toUpperCase()} TRAFFIC
                </span>
              </div>
              <div className="modal-field">
                <span className="modal-field-label">Detected Timestamp</span>
                <span
                  className="modal-field-value"
                  title={formatTimestamp(incident.detected_time)}
                >
                  {formatRelativeTime(incident.detected_time)} ({formatTimestamp(incident.detected_time)})
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Water Impact & Telemetry Diagnostics */}
          <div className="modal-section">
            <div className="modal-section-head">
              <Droplet size={15} className="modal-section-icon" />
              <span>Telemetry &amp; Conservation Impact</span>
            </div>
            <div className="modal-stat-row">
              {d.avg_flow_lpm != null && (
                <div className="modal-stat-box modal-stat-box--alert">
                  <span className="modal-stat-num">{d.avg_flow_lpm}</span>
                  <span className="modal-stat-unit">L / min</span>
                  <span className="modal-stat-label">Measured Continuous Flow</span>
                </div>
              )}
              {d.estimated_liters != null && (
                <div className="modal-stat-box modal-stat-box--danger">
                  <span className="modal-stat-num">{d.estimated_liters}</span>
                  <span className="modal-stat-unit">Liters</span>
                  <span className="modal-stat-label">Estimated Water Lost</span>
                </div>
              )}
              <div className="modal-stat-box">
                <span className="modal-stat-num">{durationStr || 'Sustained'}</span>
                <span className="modal-stat-unit">Window</span>
                <span className="modal-stat-label">Anomaly Duration</span>
              </div>
            </div>
          </div>

          {/* Section 3: Maintenance Ticket & Automated Dispatch */}
          <div className="modal-section">
            <div className="modal-section-head">
              <Wrench size={15} className="modal-section-icon" />
              <span>Technician Work Order &amp; Automated Dispatch</span>
            </div>
            {ticket ? (
              <div className="modal-ticket-card">
                <div className="modal-ticket-top">
                  <div>
                    <span className="modal-field-label">Dispatch Work Order</span>
                    <span className="modal-ticket-id">
                      #{ticket.ticket_id?.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="modal-badge-row">
                    <Badge variant={priorityVariant(ticket.priority)}>{ticket.priority}</Badge>
                    <Badge variant={ticket.status === 'OPEN' ? 'warn' : 'ok'}>{ticket.status}</Badge>
                  </div>
                </div>

                <div className="modal-grid-2" style={{ marginTop: '10px' }}>
                  <div className="modal-field">
                    <span className="modal-field-label">Assigned Operations Team</span>
                    <span className="modal-field-value modal-field-team">
                      {ticket.assigned_team || 'facilities-plumbing'}
                    </span>
                  </div>
                  <div className="modal-field">
                    <span className="modal-field-label">Dispatch Status</span>
                    <span className="modal-field-value">
                      <StatusDot status="warn" label="Dispatched to floor" /> Technician Dispatched
                    </span>
                  </div>
                </div>

                {ticket.recommended_action && (
                  <div className="modal-action-box">
                    <span className="modal-field-label">Recommended Technician Action</span>
                    <p className="modal-action-text">{ticket.recommended_action}</p>
                    {ticket.explanation && (
                      <p className="modal-action-explain">{ticket.explanation}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="modal-ticket-fallback">
                <p>Automated maintenance dispatch rule: Assigned to <strong>facilities-plumbing</strong> team with High Urgency priority.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer">
          <button
            id="modal-btn-telemetry"
            className="btn-ghost-sm"
            onClick={handleGoToTelemetry}
          >
            <Activity size={13} strokeWidth={2} />
            Inspect Live Telemetry
          </button>
          <button
            id="modal-btn-maintenance"
            className="btn-primary-danger"
            onClick={handleGoToMaintenance}
          >
            <Wrench size={13} strokeWidth={2} />
            Open Work Order Queue
            <ExternalLink size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
