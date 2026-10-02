/**
 * useWaterAnalytics — fetches GET /api/water/analytics every 60 s.
 *
 * Returns data.{
 *   hourly_trend: [{hour, label, total_flow_lpm, avg_flow_lpm, max_flow_lpm, reading_count}],
 *   summary: { total_usage_liters, avg_usage_lpm, peak_usage_lpm, peak_hour,
 *              estimated_wastage_liters, total_readings, window_start, window_end },
 *   comparison: { first_half_liters, second_half_liters, trend_direction, change_pct }
 * }
 */
import { useApi } from './useApi';

export function useWaterAnalytics() {
  return useApi('/api/water/analytics', {}, 60_000);
}
