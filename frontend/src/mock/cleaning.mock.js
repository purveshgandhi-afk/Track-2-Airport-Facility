/**
 * MOCK  Cleaning zone status.
 * Shape mirrors GET /api/cleaning response.
 * Replace with real API call in Phase 4.
 */
export const cleaningMock = {
  summary: { total_zones: 12, requiring_cleaning: 3, overdue: 1 },
  data: [
    {
      zone: { id: 'z2', code: 'T1-R01', name: 'Terminal 1 Restroom 1', terminal: 'T1', traffic_tier: 'MEDIUM' },
      usage_since_cleaning: 215,
      cleaning_threshold: 100,
      percentage: 215,
      cleaning_status: 'OVERDUE',
      needs_cleaning: true,
      last_cleaned_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      active_incident: { incident_id: 'inc-002', priority: 'MEDIUM', detected_at: new Date(Date.now() - 3600000).toISOString() },
    },
    {
      zone: { id: 'z3', code: 'T1-R02', name: 'Terminal 1 Restroom 2', terminal: 'T1', traffic_tier: 'MEDIUM' },
      usage_since_cleaning: 88,
      cleaning_threshold: 100,
      percentage: 88,
      cleaning_status: 'APPROACHING_THRESHOLD',
      needs_cleaning: false,
      last_cleaned_at: new Date(Date.now() - 43200000).toISOString(),
      active_incident: null,
    },
  ],
};
