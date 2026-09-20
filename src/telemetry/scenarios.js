/**
 * PHASE 3 — Scenario generators
 *
 * Each function takes the current per-zone state and returns the
 * next telemetry values (before timestamp/ids are attached).
 * Values are randomized within realistic-looking bands — this is
 * SYNTHETIC data, not real airport data.
 *
 * Scenarios required: NORMAL, HIGH_USAGE, LEAK, CLEANING_THRESHOLD,
 * SENSOR_OFFLINE, RECOVERY.
 */

function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

/**
 * Derive a believable flush_count FROM occupancy, instead of a single
 * flat coin-flip capped at 0/1. Each present person independently has
 * `perPersonProbability` chance of producing a flush event during this
 * telemetry interval, so higher occupancy naturally tends to produce
 * more (but not guaranteed, not capped, not linearly forced) flushes.
 * This is NOT a hard rule like occupancy <= flush_count — with low
 * probability, a high-occupancy tick can still show 0 or 1 flush,
 * which is realistic (people can be present without flushing yet).
 */
function flushesFromOccupancy(occupancy, perPersonProbability) {
  let flushes = 0;
  for (let i = 0; i < occupancy; i++) {
    if (Math.random() < perPersonProbability) flushes++;
  }
  return flushes;
}

const SCENARIOS = {
  /**
   * Everyday baseline traffic: low/moderate occupancy, occasional
   * flushes, water flow only present when someone is using a fixture.
   */
  NORMAL(state) {
    const occupancy = randInt(0, 2);
    const flush_count = flushesFromOccupancy(occupancy, 0.12);
    const water_flow_lpm = occupancy > 0 ? rand(1.0, 3.0) : 0;
    return { occupancy, flush_count, water_flow_lpm, sensor_status: 'ONLINE' };
  },

  /**
   * A footfall surge (e.g. multiple flights landing at once):
   * higher occupancy, and a higher per-person probability of flushing,
   * so flush_count naturally trends up with occupancy rather than
   * being capped at 1. This is what eventually drives a
   * CLEANING_THRESHOLD breach.
   */
  HIGH_USAGE(state) {
    const occupancy = randInt(4, 12);
    const flush_count = flushesFromOccupancy(occupancy, 0.35);
    const water_flow_lpm = rand(2.0, 5.0);
    return { occupancy, flush_count, water_flow_lpm, sensor_status: 'ONLINE' };
  },

  /**
   * Continuous leak: flow stays elevated and DOES NOT correlate with
   * occupancy or flush activity — flow keeps running even when the
   * zone reads unoccupied. flush_count stays at 0 (no legitimate usage
   * explains the flow); this is the signature the leak-detection rule
   * (Phase 4) looks for.
   */
  LEAK(state) {
    const occupancy = randInt(0, 1); // mostly unoccupied
    const flush_count = 0; // no flush activity explains the flow
    const water_flow_lpm = rand(2.5, 4.5); // stays elevated regardless
    return { occupancy, flush_count, water_flow_lpm, sensor_status: 'ONLINE' };
  },

  /**
   * Usage accumulates toward the zone's cleaning threshold: sustained
   * high occupancy with an even higher per-person flush probability
   * than HIGH_USAGE, so both occupancy and flush activity push the
   * usage accumulator (in simulator.js) up naturally over time.
   */
  CLEANING_THRESHOLD(state) {
    const occupancy = randInt(5, 10);
    const flush_count = flushesFromOccupancy(occupancy, 0.45);
    const water_flow_lpm = rand(2.0, 4.0);
    return { occupancy, flush_count, water_flow_lpm, sensor_status: 'ONLINE' };
  },

  /**
   * Sensor stops reporting reliable data: status flips to OFFLINE and
   * values read as zero/null-like since the sensor isn't functioning.
   */
  SENSOR_OFFLINE(state) {
    return { occupancy: 0, flush_count: 0, water_flow_lpm: 0, sensor_status: 'OFFLINE' };
  },

  /**
   * Sensor/zone returns to normal after a leak or offline period.
   */
  RECOVERY(state) {
    const occupancy = randInt(0, 2);
    const flush_count = flushesFromOccupancy(occupancy, 0.12);
    const water_flow_lpm = occupancy > 0 ? rand(1.0, 2.0) : 0;
    return { occupancy, flush_count, water_flow_lpm, sensor_status: 'ONLINE' };
  },
};

function generate(scenario, state) {
  const fn = SCENARIOS[scenario];
  if (!fn) {
    throw new Error(`Unknown scenario "${scenario}". Valid: ${Object.keys(SCENARIOS).join(', ')}`);
  }
  return fn(state);
}

module.exports = { generate, SCENARIO_NAMES: Object.keys(SCENARIOS) };