/**
 * useDashboard — fetches GET /api/dashboard/summary every 30 s.
 *
 * Returns:
 *   data.total_zones
 *   data.online_sensors / offline_sensors
 *   data.active_incidents / critical_high_incidents
 *   data.active_maintenance_tickets
 *   data.cleaning_tasks.{ zones_requiring_cleaning, active_cleaning_tickets }
 *   data.water_impact.{ total_wasted_liters, active_leaks_count, active_leak_flow_rate_lpm }
 *   data.total_flush_count_today
 *   data.estimated_water_used_liters
 *   data.timestamp
 */
import { useApi } from './useApi';

export function useDashboard() {
  return useApi('/api/dashboard/summary');
}
