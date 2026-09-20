/**
 * MOCK  Dashboard summary.
 * Shape mirrors GET /api/dashboard/summary.
 * Replace with real API call in Phase 4.
 *
 * @type {import('../lib/api').DashboardSummary}
 */
export const dashboardMock = {
  total_zones: 12,
  online_sensors: 34,
  offline_sensors: 2,
  active_incidents: 4,
  critical_high_incidents: 2,
  active_maintenance_tickets: 3,
  cleaning_tasks: {
    zones_requiring_cleaning: 3,
    active_cleaning_tickets: 2,
  },
  water_impact: {
    total_wasted_liters: 842.5,
    active_leaks_count: 1,
    active_leak_flow_rate_lpm: 3.8,
  },
  timestamp: new Date().toISOString(),
};
