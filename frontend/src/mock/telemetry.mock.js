/**
 * MOCK  Telemetry readings.
 * Shape mirrors GET /api/telemetry response.data array items.
 * Replace with real API call in Phase 4.
 */
export const telemetryMock = {
  count: 3,
  data: [
    {
      id: 'tel-001',
      zone: { id: 'z1', code: 'T2-R03', name: 'Terminal 2 Restroom 3' },
      sensor: { id: 's1', code: 'WF-T2-R03', type: 'water_flow' },
      timestamp: new Date().toISOString(),
      water_flow: 3.8,
      flush_count: 12,
      occupancy: 6,
      sensor_status: 'ONLINE',
      scenario_tag: 'leak_continuous',
    },
  ],
};
