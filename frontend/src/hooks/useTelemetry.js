/**
 * useTelemetry — fetches GET /api/telemetry every 30 s.
 *
 * @param {object} params - Optional filters: { limit, zone_code, sensor_code }
 *
 * Returns data.{
 *   count,
 *   data: TelemetryRow[]
 * }
 * Each row: { id, zone, sensor, timestamp, water_flow, flush_count,
 *             occupancy, sensor_status, scenario_tag }
 */
import { useApi } from './useApi';

export function useTelemetry(params = {}) {
  return useApi('/api/telemetry', { limit: 50, ...params });
}
