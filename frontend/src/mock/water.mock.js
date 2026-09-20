/**
 * MOCK  Water sustainability metrics.
 * Shape mirrors GET /api/water response.
 * Replace with real API call in Phase 4.
 */
export const waterMock = {
  sustainability_metrics: {
    total_wasted_liters: 842.5,
    active_leaks_count: 1,
    active_leak_flow_rate_lpm: 3.8,
    resolved_leaks_count: 4,
    current_facility_flow_lpm: 18.6,
  },
  zone_current_flow: [
    { zone_id: 'z1', zone_code: 'T2-R03', zone_name: 'Terminal 2 Restroom 3', current_flow_lpm: 3.8, recorded_at: new Date().toISOString() },
    { zone_id: 'z2', zone_code: 'T1-R01', zone_name: 'Terminal 1 Restroom 1', current_flow_lpm: 2.1, recorded_at: new Date().toISOString() },
  ],
  active_leaks: [
    {
      incident_id: 'inc-001',
      zone: { code: 'T2-R03', name: 'Terminal 2 Restroom 3', traffic_tier: 'HIGH' },
      priority: 'CRITICAL',
      detected_time: new Date(Date.now() - 7200000).toISOString(),
      avg_flow_lpm: 3.8,
      estimated_liters_lost: 842.5,
      window_readings: 5,
    },
  ],
  recent_leak_history: [],
};
