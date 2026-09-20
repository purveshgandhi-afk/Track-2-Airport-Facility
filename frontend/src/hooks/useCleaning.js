/**
 * useCleaning — fetches GET /api/cleaning every 30 s.
 *
 * Returns data.{
 *   summary: { total_zones, requiring_cleaning, overdue },
 *   data: CleaningZone[]
 * }
 * Each CleaningZone: { zone, usage_since_cleaning, cleaning_threshold,
 *                      percentage, cleaning_status, needs_cleaning,
 *                      last_cleaned_at, active_incident }
 */
import { useApi } from './useApi';

export function useCleaning() {
  return useApi('/api/cleaning');
}
