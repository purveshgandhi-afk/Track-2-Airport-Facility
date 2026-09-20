/**
 * Shared utility functions.
 * Keep this file free of component/UI concerns.
 */

/**
 * Merge class names  lightweight alternative to clsx.
 * Filters out falsy values and joins with a space.
 * @param {...(string|undefined|null|false)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format an ISO timestamp to a readable local date/time.
 * @param {string|null} iso
 * @param {boolean} includeDate
 * @returns {string}
 */
export function formatTimestamp(iso, includeDate = true) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  if (includeDate) {
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

/**
 * Format a relative time string (e.g., "3 min ago").
 * @param {string|null} iso
 * @returns {string}
 */
export function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

/**
 * Format a litre value with appropriate unit suffix.
 * @param {number} liters
 * @returns {string}
 */
export function formatLiters(liters) {
  if (liters == null || isNaN(liters)) return '';
  if (liters >= 1000) {
    return `${(liters / 1000).toFixed(2)} kL`;
  }
  return `${liters.toFixed(1)} L`;
}

/**
 * Format a flow rate (L/min).
 * @param {number} lpm
 * @returns {string}
 */
export function formatFlowRate(lpm) {
  if (lpm == null || isNaN(lpm)) return '';
  return `${Number(lpm).toFixed(2)} L/min`;
}

/**
 * Map a priority string to a display-safe short form.
 * @param {string} priority
 * @returns {string}
 */
export function priorityLabel(priority) {
  return priority?.toUpperCase() || '';
}

/**
 * Map a cleaning_status value to a human-readable label.
 * @param {string} status
 * @returns {string}
 */
export function cleaningStatusLabel(status) {
  const map = {
    NORMAL: 'Normal',
    APPROACHING_THRESHOLD: 'Approaching threshold',
    CLEANING_REQUIRED: 'Cleaning required',
    OVERDUE: 'Overdue',
  };
  return map[status] || status;
}

/**
 * Format duration in minutes to hours and minutes.
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} min` : `${h}h ${m}min`;
}
