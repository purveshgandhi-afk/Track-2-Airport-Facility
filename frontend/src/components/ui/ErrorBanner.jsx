import { X } from 'lucide-react';

/**
 * ErrorBanner - API/data operational error display.
 * Inline, not a modal. Dismissible.
 */
export default function ErrorBanner({ message, onDismiss, className = '' }) {
  if (!message) return null;
  return (
    <div className={`error-banner ${className}`} role="alert" aria-live="assertive">
      <span className="error-text">{message}</span>
      {onDismiss && (
        <button className="error-dismiss" onClick={onDismiss} aria-label="Dismiss alert">
          <X size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
