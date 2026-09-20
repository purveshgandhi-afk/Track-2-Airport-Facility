/**
 * PHASE 4B — Dispatch Engine
 *
 * Factory that wires together priorityEngine + dispatchRules + ticketManager
 * and exposes a single `processIncident(incident, reading, zone)` method.
 *
 * Called by detection/index.js immediately after an incident is opened.
 * Errors inside the dispatch pipeline are caught so they never crash
 * the ingestion loop.
 *
 * Usage:
 *   const dispatch = createDispatchEngine(adapter);
 *   // Pass as second arg to createDetectionEngine(adapter, dispatch).
 */

const { computePriority }      = require('./priorityEngine');
const { getDispatch }          = require('./dispatchRules');
const { createTicketIfNeeded } = require('./ticketManager');

/**
 * @param {Object} adapter - supabaseAdapter or localMockAdapter
 * @returns {{ processIncident: Function }}
 */
function createDispatchEngine(adapter) {
  return {
    /**
     * Full dispatch pipeline for a single newly-opened incident.
     *
     * @param {Object} incident - newly created incident record
     * @param {Object} reading  - telemetry reading that triggered detection
     * @param {Object} zone     - zone record (for traffic_tier, code, etc.)
     * @returns {Promise<{ priority, factors, dispatch, ticket, created } | null>}
     */
    async processIncident(incident, reading, zone) {
      try {
        // 1. Compute refined priority
        const { priority, factors } = computePriority(incident, reading, zone);

        // 2. Update the incident's priority in the DB (Phase 4A assigns a base
        //    priority; dispatch engine refines it based on flow + traffic tier)
        await adapter.updateIncidentPriority(incident.id, priority);

        // 3. Determine team, action, and explanation
        const dispatch = getDispatch(incident, priority, zone);

        // 4. Create maintenance ticket (deduplicated)
        const { created, ticket } = await createTicketIfNeeded(
          adapter, incident, priority, dispatch
        );

        if (created) {
          console.log(
            `[dispatch] TICKET CREATED  zone=${zone.code} type=${incident.type} ` +
            `priority=${priority} team=${dispatch.team} ticket=${ticket.id}`
          );
          console.log(`           priority factors: ${factors.join(' | ')}`);
        }

        return { priority, factors, dispatch, ticket, created };
      } catch (err) {
        // Never crash the ingestion/detection pipeline
        console.error('[dispatch] error processing incident:', err.message);
        return null;
      }
    },
  };
}

module.exports = { createDispatchEngine };
