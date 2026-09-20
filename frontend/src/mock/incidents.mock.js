/**
 * MOCK  Incidents list.
 * Shape mirrors GET /api/incidents response.data array items.
 * Replace with real API call in Phase 4.
 */
export const incidentsMock = {
  count: 2,
  data: [
    {
      incident_id: 'inc-001',
      type: 'LEAK',
      zone: { id: 'z1', code: 'T2-R03', name: 'Terminal 2 Restroom 3', traffic_tier: 'HIGH' },
      sensor: { id: 's1', code: 'WF-T2-R03', type: 'water_flow' },
      priority: 'CRITICAL',
      status: 'OPEN',
      detected_time: new Date(Date.now() - 7200000).toISOString(),
      resolved_time: null,
      details: {
        estimated_liters: 842.5,
        avg_flow_lpm: 3.8,
        window_readings: 5,
      },
    },
    {
      incident_id: 'inc-002',
      type: 'CLEANING_THRESHOLD',
      zone: { id: 'z2', code: 'T1-R01', name: 'Terminal 1 Restroom 1', traffic_tier: 'MEDIUM' },
      sensor: null,
      priority: 'MEDIUM',
      status: 'OPEN',
      detected_time: new Date(Date.now() - 3600000).toISOString(),
      resolved_time: null,
      details: {},
    },
  ],
};
