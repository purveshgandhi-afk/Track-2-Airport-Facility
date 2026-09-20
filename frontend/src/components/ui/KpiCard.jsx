/**
 * KpiCard - single operational metric display.
 *
 * Design rules enforced here:
 * - Value is the largest element; everything else is subordinate.
 * - Flat, bordered panel with high information density.
 * - valueColor only when the value itself signals status.
 */
export default function KpiCard({ label, value, unit, sub, valueColor, icon, loading = false, className = '' }) {
  const colorVar =
    valueColor === 'ok'     ? 'var(--color-ok)' :
    valueColor === 'warn'   ? 'var(--color-warn)' :
    valueColor === 'danger' ? 'var(--color-danger)' :
    'var(--color-ink)';

  return (
    <div className={`kpi-card ${className}`} role="region" aria-label={label}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {icon && <span className="kpi-icon" aria-hidden="true">{icon}</span>}
      </div>

      <div className="kpi-body">
        {loading ? (
          <span className="kpi-skeleton" aria-busy="true" aria-label="Loading" />
        ) : (
          <span className="kpi-value" style={{ color: colorVar }}>
            {value ?? '—'}
            {unit && <span className="kpi-unit">{unit}</span>}
          </span>
        )}
      </div>

      {sub && !loading && (
        <p className="kpi-sub">{sub}</p>
      )}
    </div>
  );
}
