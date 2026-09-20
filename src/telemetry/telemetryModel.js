/**
 * PHASE 3 — Telemetry data model
 *
 * A telemetry reading represents ONE snapshot from ONE sensor at ONE point
 * in time. This mirrors the `telemetry` table defined in sql/schema.sql.
 *
 * Example record:
 * {
 *   "timestamp": "2026-09-17T10:15:32.000Z",
 *   "terminal": "T2",
 *   "zone": "T2-R03",
 *   "sensor": "WF-T2-R03",
 *   "water_flow_lpm": 2.8,
 *   "flush_count": 1,
 *   "occupancy": 4,
 *   "sensor_status": "ONLINE",
 *   "scenario": "NORMAL"
 * }
 */

const VALID_STATUSES = ['ONLINE', 'OFFLINE', 'FAULT'];
const VALID_SCENARIOS = [
  'NORMAL',
  'HIGH_USAGE',
  'LEAK',
  'CLEANING_THRESHOLD',
  'SENSOR_OFFLINE',
  'RECOVERY',
];

/**
 * Build a normalized telemetry reading object.
 */
function makeReading({
  timestamp,
  terminal,
  zone,
  sensor,
  water_flow_lpm,
  flush_count,
  occupancy,
  sensor_status,
  scenario,
}) {
  return {
    timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp,
    terminal,
    zone,
    sensor,
    water_flow_lpm: round2(water_flow_lpm),
    flush_count: Math.max(0, Math.round(flush_count)),
    occupancy: Math.max(0, Math.round(occupancy)),
    sensor_status,
    scenario,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Basic validation — throws if the reading is malformed.
 * Kept intentionally simple (deterministic checks only, no AI).
 */
function validateReading(reading) {
  const errors = [];

  if (!reading.timestamp || isNaN(Date.parse(reading.timestamp))) {
    errors.push('timestamp is missing or invalid');
  }
  if (!reading.zone) errors.push('zone is required');
  if (!reading.sensor) errors.push('sensor is required');
  if (typeof reading.water_flow_lpm !== 'number' || reading.water_flow_lpm < 0) {
    errors.push('water_flow_lpm must be a non-negative number');
  }
  if (typeof reading.flush_count !== 'number' || reading.flush_count < 0) {
    errors.push('flush_count must be a non-negative number');
  }
  if (typeof reading.occupancy !== 'number' || reading.occupancy < 0) {
    errors.push('occupancy must be a non-negative number');
  }
  if (!VALID_STATUSES.includes(reading.sensor_status)) {
    errors.push(`sensor_status must be one of ${VALID_STATUSES.join(', ')}`);
  }
  if (reading.scenario && !VALID_SCENARIOS.includes(reading.scenario)) {
    errors.push(`scenario must be one of ${VALID_SCENARIOS.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid telemetry reading: ${errors.join('; ')}`);
  }
  return true;
}

module.exports = {
  makeReading,
  validateReading,
  VALID_STATUSES,
  VALID_SCENARIOS,
};
