/**
 * useWater — fetches GET /api/water every 30 s.
 *
 * Returns data.{
 *   sustainability_metrics: { total_wasted_liters, active_leaks_count,
 *                             active_leak_flow_rate_lpm, resolved_leaks_count,
 *                             current_facility_flow_lpm },
 *   zone_current_flow: ZoneFlow[],
 *   active_leaks: Leak[],
 *   recent_leak_history: Leak[]
 * }
 */
import { useApi } from './useApi';

export function useWater() {
  return useApi('/api/water');
}
