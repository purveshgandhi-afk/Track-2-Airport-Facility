/**
 * useIncidentAnalytics — fetches GET /api/incidents/analytics every 60 s.
 *
 * Returns data.{
 *   summary: { total, open, resolved, acknowledged, critical, high, medium, low },
 *   by_type: [{type, count}],
 *   by_zone: [{zone_code, zone_name, terminal, count, open, critical_high}],
 *   by_priority: [{priority, count}],
 *   recent_timeline: [{hour, label, count}],
 *   resolution_rate: { resolved, total, rate_pct }
 * }
 */
import { useApi } from './useApi';

export function useIncidentAnalytics() {
  return useApi('/api/incidents/analytics', {}, 60_000);
}
