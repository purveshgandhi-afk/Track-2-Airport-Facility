/**
 * useCleaningAnalytics — fetches GET /api/cleaning/analytics every 60 s.
 *
 * Returns data.{
 *   summary: { total_zones, requiring_cleaning, overdue, approaching,
 *              normal, avg_usage_pct, total_usage_count },
 *   zone_usage: [{zone_code, zone_name, terminal, traffic_tier,
 *                 usage, threshold, percentage, status, last_cleaned_at}],
 *   usage_distribution: [{label, count, status}],
 *   problem_zones: [...top 5],
 *   occupancy_by_zone: [{zone_code, total_occupancy, total_flushes, reading_count, avg_occupancy}]
 * }
 */
import { useApi } from './useApi';

export function useCleaningAnalytics() {
  return useApi('/api/cleaning/analytics', {}, 60_000);
}
