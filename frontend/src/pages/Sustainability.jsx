/**
 * Sustainability — Water conservation analytics.
 * Data: GET /api/water (30-second refresh)
 */
import { useWater } from '../hooks/useWater';
import Badge, { priorityVariant } from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import { formatRelativeTime, formatTimestamp, formatLiters, formatFlowRate } from '../lib/utils';
import '../styles/pages.css';

export default function Sustainability() {
  const { data, loading, error, refetch } = useWater();

  const metrics      = data?.sustainability_metrics ?? null;
  const zoneFlows    = data?.zone_current_flow ?? [];
  const activeLeaks  = data?.active_leaks ?? [];
  const leakHistory  = data?.recent_leak_history ?? [];

  const wastePct = metrics && metrics.current_facility_flow_lpm > 0
    ? Math.min((metrics.active_leak_flow_rate_lpm / metrics.current_facility_flow_lpm) * 100, 100).toFixed(1)
    : 0;

  return (
    <div className="page-root">
      <div className="page-head">
        <div>
          <p className="page-pre-label">AIRPORT OPERATIONS</p>
          <h1 className="page-title">Sustainability &amp; Conservation</h1>
        </div>
        <div className="page-head-meta">
          <button className="btn-ghost-sm" onClick={refetch} aria-label="Refresh sustainability data">
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={`Failed to load water data: ${error}`} />}

      {loading && !data ? (
        <div className="page-spinner-wrap"><Spinner /></div>
      ) : (
        <>
          {/* Key Metrics */}
          {metrics && (
            <div className="summary-row">
              <div className="summary-chip">
                <span className="summary-chip-val">{formatFlowRate(metrics.current_facility_flow_lpm)}</span>
                <span className="summary-chip-lbl">Current Flow</span>
              </div>
              <div className="summary-chip summary-chip--danger">
                <span className="summary-chip-val">{formatLiters(metrics.total_wasted_liters)}</span>
                <span className="summary-chip-lbl">Total Wasted</span>
              </div>
              <div className="summary-chip summary-chip--warn">
                <span className="summary-chip-val">{metrics.active_leaks_count}</span>
                <span className="summary-chip-lbl">Active Leaks</span>
              </div>
              <div className="summary-chip">
                <span className="summary-chip-val">{metrics.resolved_leaks_count}</span>
                <span className="summary-chip-lbl">Resolved Leaks</span>
              </div>
            </div>
          )}

          {/* Loss Progress Bar */}
          {metrics && (
            <div className="sustain-section">
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
              <p className="sustain-note">Target: &lt;5% loss. Values above threshold require immediate intervention.</p>
            </div>
          )}

          {/* Active Leaks */}
          <div className="page-section">
            <h2 className="page-section-title">Active Leak Events ({activeLeaks.length})</h2>
            {activeLeaks.length === 0 ? (
              <EmptyState message="No active leak events — all clear." />
            ) : (
              <div className="table-wrap">
                <table className="data-table" aria-label="Active leaks">
                  <thead>
                    <tr>
                      <th scope="col">Incident</th>
                      <th scope="col">Zone</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Flow Rate</th>
                      <th scope="col">Est. Liters Lost</th>
                      <th scope="col">Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLeaks.map((l) => (
                      <tr key={l.incident_id} className="row--critical">
                        <td className="td-mono">{l.incident_id?.slice(0, 8).toUpperCase()}</td>
                        <td>
                          <span className="td-zone-code">{l.zone?.code ?? '—'}</span>
                          <span className="td-zone-name">{l.zone?.name ?? ''}</span>
                        </td>
                        <td><Badge variant={priorityVariant(l.priority)}>{l.priority}</Badge></td>
                        <td className="td-num">{formatFlowRate(l.avg_flow_lpm)}</td>
                        <td className="td-num">{formatLiters(l.estimated_liters_lost)}</td>
                        <td className="td-time" title={formatTimestamp(l.detected_time)}>
                          {formatRelativeTime(l.detected_time)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Zone Current Flow */}
          <div className="page-section">
            <h2 className="page-section-title">Current Zone Flow Rates</h2>
            {zoneFlows.length === 0 ? (
              <EmptyState message="No telemetry data available." />
            ) : (
              <div className="table-wrap">
                <table className="data-table" aria-label="Zone current flow">
                  <thead>
                    <tr>
                      <th scope="col">Zone</th>
                      <th scope="col">Current Flow</th>
                      <th scope="col">Last Reading</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zoneFlows.map((z) => (
                      <tr key={z.zone_id}>
                        <td>
                          <span className="td-zone-code">{z.zone_code}</span>
                          <span className="td-zone-name">{z.zone_name}</span>
                        </td>
                        <td className="td-num">{formatFlowRate(z.current_flow_lpm)}</td>
                        <td className="td-time" title={formatTimestamp(z.recorded_at)}>
                          {formatRelativeTime(z.recorded_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Leak History */}
          <div className="page-section">
            <h2 className="page-section-title">Recent Resolved Leaks</h2>
            {leakHistory.length === 0 ? (
              <EmptyState message="No resolved leak history." />
            ) : (
              <div className="table-wrap">
                <table className="data-table" aria-label="Resolved leaks">
                  <thead>
                    <tr>
                      <th scope="col">Incident</th>
                      <th scope="col">Zone</th>
                      <th scope="col">Flow Rate</th>
                      <th scope="col">Total Lost</th>
                      <th scope="col">Detected</th>
                      <th scope="col">Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leakHistory.map((l) => (
                      <tr key={l.incident_id}>
                        <td className="td-mono">{l.incident_id?.slice(0, 8).toUpperCase()}</td>
                        <td>
                          <span className="td-zone-code">{l.zone?.code ?? '—'}</span>
                          <span className="td-zone-name">{l.zone?.name ?? ''}</span>
                        </td>
                        <td className="td-num">{formatFlowRate(l.avg_flow_lpm)}</td>
                        <td className="td-num">{formatLiters(l.total_liters_lost)}</td>
                        <td className="td-time" title={formatTimestamp(l.detected_time)}>
                          {formatRelativeTime(l.detected_time)}
                        </td>
                        <td className="td-time" title={formatTimestamp(l.resolved_time)}>
                          {formatRelativeTime(l.resolved_time)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}