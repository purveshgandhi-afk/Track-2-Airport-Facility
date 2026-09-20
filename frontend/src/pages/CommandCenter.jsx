/**
 * Airport Command Center — Primary Operational Overview.
 * Indira Gandhi International Airport (DEL / VIDP)
 *
 * Data is fetched live from the backend API (30-second refresh).
 * Hooks: useDashboard, useZones, useIncidents, useTickets, useWater
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, RefreshCw } from 'lucide-react';
import Badge, { priorityVariant } from '../components/ui/Badge';
import StatusDot from '../components/ui/StatusDot';
import SectionHeader from '../components/ui/SectionHeader';
import ProgressBar from '../components/ui/ProgressBar';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import IncidentDetailModal from '../components/ui/IncidentDetailModal';
import { useDashboard } from '../hooks/useDashboard';
import { useZones } from '../hooks/useZones';
import { useIncidents } from '../hooks/useIncidents';
import { useTickets } from '../hooks/useTickets';
import { useWater } from '../hooks/useWater';
import '../styles/CommandCenter.css';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDuration(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} min` : `${h}h ${m}min`;
}

function zoneStatusInfo(status) {
  switch (status) {
    case 'NORMAL':                return { label: 'Normal',                  dot: 'ok',      cls: 'zs-normal'  };
    case 'APPROACHING_THRESHOLD': return { label: 'Approaching threshold',   dot: 'warn',    cls: 'zs-warn'    };
    case 'CLEANING_REQUIRED':     return { label: 'Cleaning required',       dot: 'warn',    cls: 'zs-warn'    };
    case 'OVERDUE':               return { label: 'Cleaning overdue',        dot: 'danger',  cls: 'zs-danger'  };
    case 'CRITICAL_LEAK':         return { label: 'Critical Leak',           dot: 'danger',  cls: 'zs-danger'  };
    case 'SENSOR_OFFLINE':        return { label: 'Sensor offline',          dot: 'neutral', cls: 'zs-muted'   };
    default:                      return { label: status,                    dot: 'neutral', cls: 'zs-muted'   };
  }
}

function ticketStatusVariant(s) {
  if (s === 'IN_PROGRESS') return 'warn';
  if (s === 'OPEN')        return 'neutral';
  if (s === 'RESOLVED')    return 'ok';
  return 'neutral';
}

// ─── OPERATIONS KPI CONSOLE ───────────────────────────────────────────────────
function KpiConsole({ dashboard, water }) {
  const waterUsedLiters   = dashboard?.estimated_water_used_liters ?? 0;
  const waterWastedLiters = dashboard?.water_impact?.total_wasted_liters ?? 0;
  const activeIncidents   = dashboard?.active_incidents ?? 0;
  const criticalIncidents = dashboard?.critical_high_incidents ?? 0;
  const flushCountToday   = dashboard?.total_flush_count_today ?? 0;
  const sensorsOnline     = dashboard?.online_sensors ?? 0;
  const sensorsOffline    = dashboard?.offline_sensors ?? 0;
  const sensorsTotal      = sensorsOnline + sensorsOffline;
  const activeDispatches  = dashboard?.active_maintenance_tickets ?? 0;

  const wastePct = waterUsedLiters > 0
    ? ((waterWastedLiters / waterUsedLiters) * 100).toFixed(1)
    : 0;
  const usedKl = (waterUsedLiters / 1000).toFixed(2);

  return (
    <div className="cc-kpi-console" role="region" aria-label="Operational telemetry summary">
      {/* Primary Alert Group: Urgent operational anomalies */}
      <div className="cc-kpi-primary-group">
        <div className="cc-kpi-primary-cell cc-kpi-primary-cell--alert">
          <div className="cc-metric-header">
            <span className="cc-metric-label">Critical Incidents</span>
            <Badge variant="danger">ACTIVE</Badge>
          </div>
          <div className="cc-metric-body">
            <span className="cc-metric-value cc-metric-value--primary cc-metric-value--danger">
              {criticalIncidents}
            </span>
            <span className="cc-metric-unit">of {activeIncidents} total</span>
          </div>
          <div className="cc-metric-sub cc-metric-sub--alert">
            Immediate technician dispatch required
          </div>
        </div>

        <div className="cc-kpi-primary-cell cc-kpi-primary-cell--alert">
          <div className="cc-metric-header">
            <span className="cc-metric-label">Estimated Wastage</span>
            <Badge variant="warn">{wastePct}% LOSS</Badge>
          </div>
          <div className="cc-metric-body">
            <span className="cc-metric-value cc-metric-value--primary cc-metric-value--danger">
              {waterWastedLiters.toLocaleString()}
            </span>
            <span className="cc-metric-unit">L</span>
          </div>
          <div className="cc-metric-sub">
            Exceeds daily conservation threshold (&lt;5%)
          </div>
        </div>
      </div>

      {/* Secondary Telemetry Group: Facility-wide volume and status */}
      <div className="cc-kpi-secondary-group">
        <div className="cc-kpi-secondary-cell">
          <span className="cc-metric-label">Water Usage</span>
          <div className="cc-metric-body">
            <span className="cc-metric-value">{usedKl}</span>
            <span className="cc-metric-unit">kL</span>
          </div>
          <span className="cc-metric-sub">Daily consumption</span>
        </div>

        <div className="cc-kpi-secondary-cell">
          <span className="cc-metric-label">Restroom Usage</span>
          <div className="cc-metric-body">
            <span className="cc-metric-value">{flushCountToday.toLocaleString()}</span>
          </div>
          <span className="cc-metric-sub">Flushes recorded</span>
        </div>

        <div className="cc-kpi-secondary-cell">
          <span className="cc-metric-label">Sensor Health</span>
          <div className="cc-metric-body">
            <span className={`cc-metric-value ${sensorsOffline > 0 ? 'cc-metric-value--warn' : ''}`}>
              {sensorsOnline}
            </span>
            <span className="cc-metric-unit">/ {sensorsTotal}</span>
          </div>
          <span className="cc-metric-sub">
            {sensorsOffline > 0 ? `${sensorsOffline} offline` : 'All nominal'}
          </span>
        </div>

        <div className="cc-kpi-secondary-cell">
          <span className="cc-metric-label">Active Dispatches</span>
          <div className="cc-metric-body">
            <span className="cc-metric-value">{activeDispatches}</span>
          </div>
          <span className="cc-metric-sub">Plumbing &amp; sanitation</span>
        </div>
      </div>
    </div>
  );
}

// ─── CRITICAL INCIDENT ALERT ──────────────────────────────────────────────────
function CriticalAlert({ incident, onView }) {
  if (!incident) return null;

  const details = incident.details || {};
  const durationMin = details.duration_min || null;

  return (
    <div className="crit-alert" role="alert" aria-label="Critical incident: continuous water leak">
      <div className="crit-topbar">
        <div className="crit-topbar-left">
          <StatusDot status="danger" label="Active critical incident" />
          <span className="crit-ref-label">CRITICAL ALARM · {incident.incident_id?.slice(0, 8).toUpperCase() ?? 'UNKNOWN'}</span>
        </div>
        <button
          id="cmd-view-incident-btn"
          className="btn-primary-danger"
          onClick={onView}
          aria-label="View incident details"
        >
          View Incident
          <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="crit-body">
        <div className="crit-header-block">
          <div>
            <div className="crit-type">{incident.type?.toUpperCase() ?? 'LEAK'}</div>
            <div className="crit-loc">
              {incident.zone?.name ?? 'Unknown Zone'} · Sensor: {incident.zone?.code ?? '—'}
            </div>
          </div>
          <div className="crit-priority-badge">
            <Badge variant="danger">PRIORITY 1</Badge>
          </div>
        </div>

        <div className="crit-metrics">
          <div className="crit-metric">
            <span className="crit-metric-lbl">Flow Rate</span>
            <span className="crit-metric-val">{details.avg_flow_lpm ?? '—'} L/min</span>
          </div>
          <div className="crit-metric-divider" aria-hidden="true" />
          <div className="crit-metric">
            <span className="crit-metric-lbl">Duration</span>
            <span className="crit-metric-val">{fmtDuration(durationMin)}</span>
          </div>
          <div className="crit-metric-divider" aria-hidden="true" />
          <div className="crit-metric">
            <span className="crit-metric-lbl">Est. Water Loss</span>
            <span className="crit-metric-val crit-metric-val--danger">
              {details.estimated_liters ?? details.wasted_liters ?? '—'} L
            </span>
          </div>
          <div className="crit-metric-divider" aria-hidden="true" />
          <div className="crit-metric">
            <span className="crit-metric-lbl">Status</span>
            <Badge variant="warn">OPEN</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FACILITY ZONE TABLE ──────────────────────────────────────────────────────
function TerminalZoneTable({ terminal, zones, onSelectZone }) {
  const terminalZones = zones.filter(z => z.zone?.terminal?.code === terminal.code);

  return (
    <div className="terminal-section">
      <div className="terminal-heading">
        <span className="terminal-code-tag">{terminal.code}</span>
        <span className="terminal-full-name">{terminal.name}</span>
      </div>
      <div className="zone-table-wrap">
        <table className="zone-table" aria-label={`${terminal.name} zone operational status`}>
          <thead>
            <tr>
              <th scope="col">Zone</th>
              <th scope="col">Operational Status</th>
              <th scope="col">Flow</th>
              <th scope="col">Occupancy</th>
              <th scope="col">Sensor</th>
            </tr>
          </thead>
          <tbody>
            {terminalZones.length === 0 ? (
              <tr><td colSpan={5} className="td-null" style={{ textAlign: 'center', padding: '1rem' }}>No zones</td></tr>
            ) : terminalZones.map((z) => {
              const info = zoneStatusInfo(z.zone_status);
              const isCritical = z.zone_status === 'CRITICAL_LEAK';
              const sensorStatus = z.sensor?.status ?? 'UNKNOWN';
              return (
                <tr
                  key={z.zone.id}
                  className={isCritical ? 'zone-row zone-row--crit' : 'zone-row'}
                  onClick={() => onSelectZone && onSelectZone(z)}
                  style={isCritical || z.active_leak ? { cursor: 'pointer' } : undefined}
                  title={isCritical ? 'Click to inspect critical leak incident & dispatch' : undefined}
                >
                  <td>
                    <span className="zone-code-mono">{z.zone.code}</span>
                    <span className="zone-subname">{z.zone.name}</span>
                  </td>
                  <td>
                    <span className="zone-status-wrap">
                      <StatusDot status={info.dot} label={info.label} />
                      <span className={`zone-status-lbl ${info.cls}`}>{info.label}</span>
                    </span>
                  </td>
                  <td className="td-num">
                    {z.water_flow_lpm != null
                      ? <span className={isCritical ? 'flow-val--crit' : 'flow-val'}>{z.water_flow_lpm} L/min</span>
                      : <span className="td-null">—</span>}
                  </td>
                  <td className="td-num">
                    {z.occupancy != null ? z.occupancy : <span className="td-null">—</span>}
                  </td>
                  <td>
                    <Badge variant={sensorStatus === 'ONLINE' ? 'ok' : 'danger'}>
                      {sensorStatus}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FacilityStatus({ zones, onSelectZone }) {
  const terminalsMap = {};
  (zones || []).forEach(z => {
    const t = z.zone?.terminal;
    if (t && !terminalsMap[t.code]) terminalsMap[t.code] = t;
  });
  const terminals = Object.values(terminalsMap).sort((a, b) => a.code.localeCompare(b.code));

  if (terminals.length === 0) {
    return (
      <section aria-labelledby="facility-status-heading">
        <SectionHeader title="Terminal & Zone Status" />
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.875rem' }}>
          No zone data available.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="facility-status-heading">
      <SectionHeader title="Terminal & Zone Status" />
      <div className="facility-terminals" style={{ marginTop: '14px' }}>
        {terminals.map((t) => (
          <TerminalZoneTable key={t.code} terminal={t} zones={zones || []} onSelectZone={onSelectZone} />
        ))}
      </div>
    </section>
  );
}

// ─── MAINTENANCE PREVIEW ──────────────────────────────────────────────────────
function MaintenancePreview({ tickets, onViewAll }) {
  const items = (tickets || []).slice(0, 5);
  return (
    <section className="cc-panel" aria-labelledby="maint-heading">
      <SectionHeader
        title="Maintenance & Dispatch"
        action={
          <button
            id="cmd-view-all-tickets-btn"
            className="btn-ghost-sm"
            onClick={onViewAll}
            aria-label="View all maintenance tickets"
          >
            All tickets <ChevronRight size={11} strokeWidth={2} aria-hidden="true" />
          </button>
        }
      />
      <div className="maint-ticket-list" role="list" aria-label="Active maintenance tickets">
        {items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
            No active tickets.
          </p>
        ) : items.map((t) => (
          <div key={t.ticket_id} className="maint-ticket-item" role="listitem">
            <div className="maint-ticket-top">
              <div className="maint-ticket-meta">
                <span className="mono-sm">{t.ticket_id?.slice(0, 8).toUpperCase()}</span>
                <span className="maint-ticket-sep" aria-hidden="true">·</span>
                <span className="mono-sm maint-ticket-zone">{t.zone?.code ?? '—'}</span>
              </div>
              <div className="maint-ticket-badges">
                <Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge>
                <Badge variant={ticketStatusVariant(t.status)}>{t.status?.replace('_', ' ')}</Badge>
              </div>
            </div>
            <div className="maint-ticket-issue" title={t.incident?.type}>
              {t.incident?.type?.replace('_', ' ') ?? 'Maintenance task'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── SUSTAINABILITY SUMMARY ───────────────────────────────────────────────────
function SustainabilitySummary({ water }) {
  const m = water?.sustainability_metrics;
  if (!m) return null;

  const wastedL = m.total_wasted_liters ?? 0;
  const activeLeaks = m.active_leaks_count ?? 0;
  const resolvedLeaks = m.resolved_leaks_count ?? 0;
  const totalLeaks = activeLeaks + resolvedLeaks;
  const wastePct = m.current_facility_flow_lpm > 0
    ? Math.min(((m.active_leak_flow_rate_lpm / m.current_facility_flow_lpm) * 100), 100).toFixed(1)
    : 0;

  return (
    <section className="cc-panel" aria-labelledby="sustain-heading">
      <SectionHeader title="Sustainability & Conservation" />
      <div className="sustain-list">
        <div className="sustain-row">
          <span className="sustain-lbl">Current Facility Flow</span>
          <span className="sustain-val">{m.current_facility_flow_lpm?.toFixed(2) ?? '—'} L/min</span>
        </div>
        <div className="sustain-row">
          <span className="sustain-lbl">Estimated Wastage</span>
          <span className="sustain-val sustain-val--warn">{wastedL.toLocaleString()} L</span>
        </div>
        <div className="sustain-row">
          <span className="sustain-lbl">Active Leak Events</span>
          <span className="sustain-val sustain-val--danger">{activeLeaks}</span>
        </div>
        <div className="sustain-row">
          <span className="sustain-lbl">Leak Events Total</span>
          <span className="sustain-val">{totalLeaks}</span>
        </div>
      </div>
      <div className="sustain-bar-block">
        <div className="sustain-bar-meta">
          <span className="sustain-bar-lbl">Active Leak Flow as % of Facility Flow</span>
          <span className="sustain-bar-pct">{wastePct}%</span>
        </div>
        <ProgressBar
          value={Number(wastePct)}
          max={100}
          showLabel={false}
          label={`Water loss: ${wastePct}% of current flow`}
        />
        <p className="sustain-note">
          Conservation target: &lt;5% loss. Inspect zones with active leak incidents immediately.
        </p>
      </div>
    </section>
  );
}

// ─── PAGE ROOT ────────────────────────────────────────────────────────────────
export default function CommandCenter() {
  const navigate = useNavigate();
  const [selectedIncident, setSelectedIncident] = useState(null);

  const { data: dashboard, loading: dashLoading, error: dashError, refetch: refetchDash } = useDashboard();
  const { data: zonesData, loading: zonesLoading } = useZones();
  const { data: incidentsData } = useIncidents({ status: 'OPEN', priority: 'CRITICAL', limit: 1 });
  const { data: ticketsData } = useTickets({ status: 'OPEN', limit: 5 });
  const { data: water } = useWater();

  const isInitialLoading = dashLoading && !dashboard;
  const zones = zonesData?.data ?? [];
  const criticalIncident = incidentsData?.data?.[0] ?? null;
  const tickets = ticketsData?.data ?? [];

  const modalTicket = tickets.find(
    t => t.incident?.id === selectedIncident?.incident_id || t.zone?.id === selectedIncident?.zone?.id
  ) || tickets[0];

  function handleSelectZone(z) {
    if (z.active_leak && criticalIncident) {
      setSelectedIncident(criticalIncident);
    } else if (criticalIncident && (z.zone?.code === criticalIncident.zone?.code || z.zone_status === 'CRITICAL_LEAK')) {
      setSelectedIncident(criticalIncident);
    }
  }

  return (
    <div className="cc-page">
      {/* Facility Header */}
      <div className="cc-page-head">
        <div className="cc-page-head-left">
          <p className="cc-pre-label">AIRPORT OPERATIONS CONSOLE</p>
          <h1 className="cc-heading">Indira Gandhi International Airport</h1>
        </div>
        <div className="cc-page-head-right">
          <div className="cc-facility-tag">
            <span>ICAO: DEL / VIDP</span>
            <span>·</span>
            <span>{dashboard?.total_zones ?? '—'} Active Zones</span>
          </div>
          <div className="cc-system-status">
            <StatusDot status={dashError ? 'danger' : 'ok'} label="API connection status" />
            <span>{dashError ? 'API UNREACHABLE' : 'SYSTEM OPERATIONAL'}</span>
            {dashError && (
              <button
                className="btn-ghost-sm"
                onClick={refetchDash}
                aria-label="Retry connection"
                style={{ marginLeft: '0.5rem' }}
              >
                <RefreshCw size={12} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {dashError && (
        <ErrorBanner message={`Could not reach the API: ${dashError}. Data shown may be stale.`} />
      )}

      {/* Loading State — first load only */}
      {isInitialLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Spinner />
        </div>
      ) : (
        <>
          {/* Operations KPI Console */}
          <KpiConsole dashboard={dashboard} water={water} />

          {/* Critical Incident Alert */}
          <CriticalAlert
            incident={criticalIncident}
            onView={() => setSelectedIncident(criticalIncident)}
          />

          {/* Main Operations Body */}
          <div className="cc-body-grid">
            <div className="cc-col-left">
              {zonesLoading && zones.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <Spinner />
                </div>
              ) : (
                <FacilityStatus zones={zones} onSelectZone={handleSelectZone} />
              )}
            </div>
            <div className="cc-col-right">
              <MaintenancePreview
                tickets={tickets}
                onViewAll={() => navigate('/maintenance')}
              />
              <SustainabilitySummary water={water} />
            </div>
          </div>
        </>
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