/**
 * useIncidents — fetches GET /api/incidents every 30 s.
 *
 * @param {object} params - Optional filters: { status, type, priority, zone_code, limit }
 *
 * Returns data.{ count, data: Incident[] }
 * Each Incident: { incident_id, type, zone, sensor, priority, status, detected_time, resolved_time, details }
 */
import { useApi } from './useApi';

export function useIncidents(params = {}) {
  return useApi('/api/incidents', { limit: 100, ...params });
}
