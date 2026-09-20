/**
 * PHASE 4B — Dispatch Rules
 *
 * Rule-based team and action assignment for each incident type.
 * Also generates a deterministic explanation that is stored in the
 * maintenance ticket's genai_explanation / genai_recommendation fields
 * — no LLM call required.
 *
 * If a GenAI layer is added in a future phase, it can replace or augment
 * the explanation string without changing the ticket schema.
 */

/**
 * @param {Object} incident  - incident record
 * @param {string} priority  - refined priority from priorityEngine
 * @param {Object} zone      - zone record (code, traffic_tier, name, etc.)
 * @returns {{ team: string, action: string, explanation: string }}
 */
function getDispatch(incident, priority, zone) {
  const zoneLabel = zone.code || 'unknown';
  const details = incident.details || {};

  switch (incident.type) {
    case 'LEAK': {
      const flow = details.avg_flow_lpm || 0;
      const liters = details.estimated_liters || 0;
      return {
        team: 'facilities-plumbing',
        action: 'Inspect plumbing fixtures and stop water source',
        explanation:
          `[${priority}] Continuous water leak detected in zone ${zoneLabel}. ` +
          `Average flow: ${flow} LPM with no flush activity. ` +
          `Estimated water loss at detection: ${liters.toFixed(2)} L. ` +
          `Zone traffic tier: ${zone.traffic_tier || 'unknown'}. ` +
          `Plumbing/facilities team should inspect and stop the water source immediately.`,
      };
    }

    case 'CLEANING_THRESHOLD': {
      const usage = details.usage_count || 0;
      const threshold = details.threshold || 0;
      return {
        team: 'cleaning',
        action: 'Clean and sanitize restroom, reset usage counter',
        explanation:
          `[${priority}] Zone ${zoneLabel} has reached ${usage} uses ` +
          `against a cleaning threshold of ${threshold}. ` +
          `Zone traffic tier: ${zone.traffic_tier || 'unknown'}. ` +
          `Cleaning team should sanitize the restroom and reset the usage counter.`,
      };
    }

    case 'SENSOR_FAULT': {
      return {
        team: 'maintenance',
        action: 'Inspect sensor hardware and restore connectivity',
        explanation:
          `[${priority}] Sensor fault detected in zone ${zoneLabel}. ` +
          `Zone telemetry is unreliable until the sensor is restored. ` +
          `Maintenance team should inspect and repair or replace the sensor.`,
      };
    }

    default:
      return {
        team: 'maintenance',
        action: `Investigate ${incident.type} incident`,
        explanation:
          `[${priority}] Incident of type ${incident.type} in zone ${zoneLabel} requires investigation.`,
      };
  }
}

module.exports = { getDispatch };
