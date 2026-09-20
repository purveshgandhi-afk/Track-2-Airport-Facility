/**
 * PHASE 4B — Ticket Manager
 *
 * Creates a maintenance ticket for an actionable incident.
 * Deduplication: checks for an existing OPEN or IN_PROGRESS ticket
 * for the same incident_id before inserting a new one.
 *
 * The maintenance_tickets table was defined in Phase 3 (sql/schema.sql).
 * genai_explanation and genai_recommendation hold the deterministic
 * explanation/action text; a future GenAI layer can update them without
 * touching the schema.
 */

/**
 * @param {Object} adapter   - supabaseAdapter or localMockAdapter
 * @param {Object} incident  - incident record (id, zone_id, type)
 * @param {string} priority  - refined priority from priorityEngine
 * @param {Object} dispatch  - { team, action, explanation } from dispatchRules
 * @returns {Promise<{ created: boolean, ticket: Object }>}
 */
async function createTicketIfNeeded(adapter, incident, priority, dispatch) {
  // Guard: don't create a duplicate ticket for the same incident
  const existing = await adapter.getOpenTicketByIncidentId(incident.id);
  if (existing) {
    return { created: false, ticket: existing };
  }

  const ticketRow = {
    incident_id:          incident.id,
    zone_id:              incident.zone_id,
    priority,
    status:               'OPEN',
    assigned_team:        dispatch.team,
    genai_explanation:    dispatch.explanation,   // deterministic; no LLM required
    genai_recommendation: dispatch.action,
  };

  const ticket = await adapter.insertMaintenanceTicket(ticketRow);
  return { created: true, ticket };
}

module.exports = { createTicketIfNeeded };
