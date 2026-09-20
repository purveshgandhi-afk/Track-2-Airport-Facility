/**
 * Design tokens  single source of truth.
 * These are re-exports of the CSS custom properties defined in index.css.
 * Use in JS/JSX when you need programmatic access (e.g., Recharts stroke colors).
 */

export const colors = {
  bg:          '#0A0A0A',
  surface:     '#111111',
  surfaceHi:   '#1A1A1A',
  border:      '#2A2A2A',
  borderHi:    '#3A3A3A',
  ink:         '#F5F5F0',
  muted:       '#A0A09A',
  faint:       '#5A5A56',
  ok:          '#22C55E',
  warn:        '#F59E0B',
  danger:      '#EF4444',
  accent:      '#C8A96E',
  accentSub:   '#1E1A14',
};

/** Chart stroke palette  use sequentially, never for decoration */
export const chartColors = ['#C8A96E', '#A88040', '#7A5C2E', '#4E3A1C', '#FFFFFF'];

/** Status ? color mapping */
export const statusColors = {
  ONLINE:   colors.ok,
  OFFLINE:  colors.danger,
  FAULT:    colors.warn,
  OPEN:     colors.danger,
  RESOLVED: colors.ok,
  ACKNOWLEDGED: colors.warn,
  IN_PROGRESS:  colors.warn,
  CRITICAL: colors.danger,
  HIGH:     colors.warn,
  MEDIUM:   colors.muted,
  LOW:      colors.faint,
};
