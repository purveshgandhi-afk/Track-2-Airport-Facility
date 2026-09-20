/**
 * ProgressBar - usage-to-threshold fill bar.
 * P0-4: Consistent rounding, flexible label display to avoid duplicate labels.
 */
export default function ProgressBar({ value, max = 100, label, showLabel = true, className = '' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const roundedPct = Math.round(pct);
  const variant =
    pct >= 100 ? 'danger' :
    pct >= 80  ? 'warn' :
    'ok';

  return (
    <div
      className={`pbar-root ${className}`}
      role="progressbar"
      aria-valuenow={roundedPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `${roundedPct}%`}
    >
      <div className="pbar-track">
        <div
          className={`pbar-fill pbar-fill--${variant}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="pbar-label">{roundedPct}%</span>}
    </div>
  );
}
