/**
 * Spinner - minimal operational loading indicator.
 * P2-2: Clean 'Loading' label without trailing punctuation for screen reader clarity.
 */
export default function Spinner({ size = 20, label = 'Loading', className = '' }) {
  return (
    <span
      className={`spinner ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    />
  );
}
