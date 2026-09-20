/**
 * PHASE 4B — Priority Engine
 *
 * Deterministic, explainable priority scoring. No ML, no LLM.
 *
 * Inputs:  incident record, telemetry reading, zone record
 * Output:  { priority: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL', factors: string[] }
 *
 * Priority levels (ascending): LOW → MEDIUM → HIGH → CRITICAL
 *
 * Rules:
 *   LEAK
 *     base = HIGH
 *     avg_flow_lpm >= 4.0  → bump to CRITICAL
 *     zone.traffic_tier === 'high' → bump one level up
 *
 *   CLEANING_THRESHOLD
 *     base = MEDIUM
 *     usage >= 2× threshold   → bump to HIGH  (overdue)
 *     zone.traffic_tier === 'high' → bump one level up
 *
 *   SENSOR_FAULT
 *     base = MEDIUM (always — offline sensor halts data flow)
 */

const LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function bump(current, steps = 1) {
  const idx = LEVELS.indexOf(current);
  return LEVELS[Math.min(idx + steps, LEVELS.length - 1)];
}

/**
 * @param {Object} incident  - incident record (type, details, priority)
 * @param {Object} reading   - telemetry reading at the moment of detection
 * @param {Object} zone      - zone record (traffic_tier, cleaning_threshold_uses, etc.)
 * @returns {{ priority: string, factors: string[] }}
 */
function computePriority(incident, reading, zone) {
  const factors = [];
  let priority;

  if (incident.type === 'LEAK') {
    const avgFlow = (incident.details && incident.details.avg_flow_lpm) || reading.water_flow_lpm || 0;

    priority = 'HIGH';
    factors.push('base=HIGH (sustained leak: elevated flow, no legitimate usage)');

    if (avgFlow >= 4.0) {
      priority = bump(priority);
      factors.push(`avg_flow=${avgFlow} lpm ≥ 4.0 → escalate to ${priority}`);
    }

    if (zone.traffic_tier === 'high') {
      priority = bump(priority);
      factors.push(`traffic_tier=high (high-footfall zone) → escalate to ${priority}`);
    }

  } else if (incident.type === 'CLEANING_THRESHOLD') {
    const usage = (incident.details && incident.details.usage_count) || 0;
    const threshold = (incident.details && incident.details.threshold) || 1;
    const ratio = usage / threshold;

    priority = 'MEDIUM';
    factors.push(`base=MEDIUM (usage threshold breached: ${usage}/${threshold})`);

    if (ratio >= 2.0) {
      priority = bump(priority);
      factors.push(`usage ratio=${ratio.toFixed(1)}× ≥ 2.0× threshold → escalate to ${priority}`);
    }

    if (zone.traffic_tier === 'high') {
      priority = bump(priority);
      factors.push(`traffic_tier=high → escalate to ${priority}`);
    }

  } else if (incident.type === 'SENSOR_FAULT') {
    priority = 'MEDIUM';
    factors.push('base=MEDIUM (sensor fault halts zone data flow)');
  } else {
    priority = 'LOW';
    factors.push(`base=LOW (unclassified incident type: ${incident.type})`);
  }

  return { priority, factors };
}

module.exports = { computePriority };
