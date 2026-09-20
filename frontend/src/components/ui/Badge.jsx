/**
 * Badge - compact status/priority label.
 *
 * Semantic variants:
 * - danger (critical / error / offline / overdue)
 * - warn (in progress / warning / threshold)
 * - ok (normal / online / resolved)
 * - neutral (informational)
 * - accent (brand highlighted)
 */
export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`badge badge--${variant} ${className}`} aria-label={typeof children === 'string' ? children : undefined}>
      {children}
    </span>
  );
}

/**
 * Helper: map priority strings to badge variants.
 */
export function priorityVariant(p) {
  switch (p?.toUpperCase()) {
    case 'CRITICAL': return 'danger';
    case 'HIGH':     return 'warn';
    case 'MEDIUM':   return 'neutral';
    case 'LOW':      return 'neutral';
    default:         return 'neutral';
  }
}

/**
 * Helper: map operational status strings to badge variants.
 */
export function statusVariant(s) {
  switch (s?.toUpperCase()) {
    case 'OPEN':                  return 'danger';
    case 'CRITICAL':              return 'danger';
    case 'CRITICAL_LEAK':         return 'danger';
    case 'OFFLINE':               return 'danger';
    case 'FAULT':                 return 'warn';
    case 'HIGH':                  return 'warn';
    case 'ACKNOWLEDGED':          return 'warn';
    case 'IN_PROGRESS':           return 'warn';
    case 'APPROACHING_THRESHOLD': return 'warn';
    case 'CLEANING_REQUIRED':     return 'warn';
    case 'OVERDUE':               return 'danger';
    case 'RESOLVED':              return 'ok';
    case 'ONLINE':                return 'ok';
    case 'NORMAL':                return 'ok';
    default:                      return 'neutral';
  }
}
