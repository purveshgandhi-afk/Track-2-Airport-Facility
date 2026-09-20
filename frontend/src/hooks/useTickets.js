/**
 * useTickets — fetches GET /api/tickets every 30 s.
 *
 * @param {object} params - Optional filters: { status, priority, assigned_team, zone_code, limit }
 *
 * Returns data.{ count, data: Ticket[] }
 * Each Ticket: { ticket_id, incident, zone, priority, assigned_team,
 *                recommended_action, explanation, status, created_time, resolved_time }
 */
import { useApi } from './useApi';

export function useTickets(params = {}) {
  return useApi('/api/tickets', { limit: 100, ...params });
}
