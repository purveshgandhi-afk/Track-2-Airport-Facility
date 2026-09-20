/**
 * StatusDot - compact operational status indicator dot.
 * P2-1: Only danger status has an active alert pulse; ok and warn remain steady.
 */
export default function StatusDot({ status = 'neutral', label, className = '' }) {
  return (
    <span
      className={`status-dot status-dot--${status} ${className}`}
      aria-label={label}
      role="img"
      title={label}
    />
  );
}
