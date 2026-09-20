/**
 * MOCK  Maintenance tickets.
 * Shape mirrors GET /api/tickets response.data array items.
 * Replace with real API call in Phase 4.
 */
export const ticketsMock = {
  count: 1,
  data: [
    {
      ticket_id: 'tkt-001',
      incident: {
        id: 'inc-001',
        type: 'LEAK',
        status: 'OPEN',
        priority: 'CRITICAL',
        detected_time: new Date(Date.now() - 7200000).toISOString(),
        details: { estimated_liters: 842.5, avg_flow_lpm: 3.8 },
      },
      zone: { id: 'z1', code: 'T2-R03', name: 'Terminal 2 Restroom 3', traffic_tier: 'HIGH' },
      priority: 'CRITICAL',
      assigned_team: 'facilities-plumbing',
      recommended_action: 'Isolate supply valve and inspect pipe joint at fixture WF-T2-R03.',
      explanation: 'Continuous above-threshold flow detected for >2 hours. Estimated 842L lost.',
      status: 'IN_PROGRESS',
      created_time: new Date(Date.now() - 6800000).toISOString(),
      resolved_time: null,
    },
  ],
};
