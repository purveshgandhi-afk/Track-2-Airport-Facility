/**
 * useZones — fetches GET /api/zones (composite zone status) every 30 s.
 *
 * Returns an array (data.data) of zone objects, each with:
 *   zone.{ id, code, name, zone_type, traffic_tier, terminal }
 *   zone_status: 'NORMAL' | 'CRITICAL_LEAK' | 'SENSOR_OFFLINE' | 'OVERDUE'
 *               | 'CLEANING_REQUIRED' | 'APPROACHING_THRESHOLD'
 *   sensor.{ id, code, type, status, last_seen_at }
 *   water_flow_lpm, occupancy, flush_count, latest_reading_at
 *   cleaning.{ status, usage_since_cleaning, cleaning_threshold, percentage, last_cleaned_at }
 *   active_leak.{ incident_id, priority, avg_flow_lpm, estimated_liters }
 */
import { useApi } from './useApi';

export function useZones() {
  return useApi('/api/zones');
}
