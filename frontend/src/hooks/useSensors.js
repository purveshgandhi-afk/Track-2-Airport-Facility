/**
 * useSensors — fetches GET /api/sensors every 30 s.
 *
 * @param {object} params - Optional filters: { status, zone_code }
 *
 * Returns data.{
 *   summary: { total, online, offline },
 *   data: Sensor[]
 * }
 * Each Sensor: { sensor: { id, code, type }, zone, status, last_seen_at }
 */
import { useApi } from './useApi';

export function useSensors(params = {}) {
  return useApi('/api/sensors', params);
}
