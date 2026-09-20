/**
 * MOCK  Sensor health.
 * Shape mirrors GET /api/sensors response.
 * Replace with real API call in Phase 4.
 */
export const sensorsMock = {
  summary: { total: 36, online: 34, offline: 2 },
  data: [
    {
      sensor: { id: 's1', code: 'WF-T2-R03', type: 'water_flow' },
      zone: { id: 'z1', code: 'T2-R03', name: 'Terminal 2 Restroom 3', traffic_tier: 'HIGH' },
      status: 'ONLINE',
      last_seen_at: new Date().toISOString(),
    },
    {
      sensor: { id: 's9', code: 'WF-T3-R01', type: 'water_flow' },
      zone: { id: 'z9', code: 'T3-R01', name: 'Terminal 3 Restroom 1', traffic_tier: 'LOW' },
      status: 'OFFLINE',
      last_seen_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
};
