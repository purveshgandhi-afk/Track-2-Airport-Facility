/**
 * EmptyState - zero-data placeholder.
 * Text only. No illustrations. No decorative SVGs.
 */
export default function EmptyState({ message = 'No data available.', action, className = '' }) {
  return (
    <div className={`empty-state ${className}`} role="status">
      <p className="empty-message">{message}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
