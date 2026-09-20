/**
 * Cleaning — Zone hygiene tracking with usage threshold visualisation.
 * Data: GET /api/cleaning (30-second refresh)
 */
import { useCleaning } from '../hooks/useCleaning';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import { formatRelativeTime, formatTimestamp, cleaningStatusLabel } from '../lib/utils';
import '../styles/pages.css';

function cleaningVariant(status) {
  if (status === 'OVERDUE')               return 'danger';
  if (status === 'CLEANING_REQUIRED')     return 'warn';
  if (status === 'APPROACHING_THRESHOLD') return 'neutral';
  return 'ok';
}

export default function Cleaning() {
  const { data, loading, error, refetch } = useCleaning();

  const summary = data?.summary ?? {};
  const zones   = data?.data ?? [];

  return (
    <div className="page-root">
      <div className="page-head">
        <div>
          <p className="page-pre-label">AIRPORT OPERATIONS</p>
          <h1 className="page-title">Cleaning Operations</h1>
        </div>
        <div className="page-head-meta">
          <button className="btn-ghost-sm" onClick={refetch} aria-label="Refresh cleaning data">
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={`Failed to load cleaning data: ${error}`} />}

      {/* Summary stats */}
      {!loading && data && (
        <div className="summary-row">
          <div className="summary-chip">
            <span className="summary-chip-val">{summary.total_zones ?? 0}</span>
            <span className="summary-chip-lbl">Total Zones</span>
          </div>
          <div className="summary-chip summary-chip--warn">
            <span className="summary-chip-val">{summary.requiring_cleaning ?? 0}</span>
            <span className="summary-chip-lbl">Requiring Clean</span>
          </div>
          <div className="summary-chip summary-chip--danger">
            <span className="summary-chip-val">{summary.overdue ?? 0}</span>
            <span className="summary-chip-lbl">Overdue</span>
          </div>
        </div>
      )}

      {/* Content */}
      {loading && zones.length === 0 ? (
        <div className="page-spinner-wrap"><Spinner /></div>
      ) : zones.length === 0 ? (
        <EmptyState message="No zone cleaning data available." />
      ) : (
        <div className="cleaning-grid">
          {zones.map((z) => {
            const pct = Math.min(z.percentage ?? 0, 200);
            return (
              <div
                key={z.zone.id}
                className={`cleaning-card ${z.cleaning_status === 'OVERDUE' ? 'cleaning-card--overdue' : z.cleaning_status === 'CLEANING_REQUIRED' ? 'cleaning-card--required' : ''}`}
              >
                <div className="cleaning-card-head">
                  <div>
                    <span className="cleaning-zone-code">{z.zone.code}</span>
                    <span className="cleaning-zone-name">{z.zone.name}</span>
                  </div>
                  <Badge variant={cleaningVariant(z.cleaning_status)}>
                    {cleaningStatusLabel(z.cleaning_status)}
                  </Badge>
                </div>

                <div className="cleaning-progress-wrap">
                  <ProgressBar
                    value={Math.min(z.usage_since_cleaning ?? 0, z.cleaning_threshold ?? 100)}
                    max={z.cleaning_threshold ?? 100}
                    showLabel={false}
                    label={`Usage: ${z.usage_since_cleaning} / ${z.cleaning_threshold}`}
                  />
                  <div className="cleaning-progress-meta">
                    <span>{z.usage_since_cleaning ?? 0} uses</span>
                    <span>{pct}% of threshold</span>
                  </div>
                </div>

                <div className="cleaning-footer">
                  <span className="cleaning-meta-key">Last cleaned</span>
                  <span
                    className="cleaning-meta-val"
                    title={formatTimestamp(z.last_cleaned_at)}
                  >
                    {z.last_cleaned_at ? formatRelativeTime(z.last_cleaned_at) : '—'}
                  </span>
                  {z.active_incident && (
                    <Badge variant="warn" style={{ marginLeft: 'auto' }}>Active Incident</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}