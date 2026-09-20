/**
 * PHASE 3 — Telemetry Simulator
 *
 * Generates simulated high-frequency telemetry for a set of zones.
 * Each zone has an independent scenario that can be switched at any
 * time (used to trigger demo moments like a leak or a cleaning
 * threshold breach on cue).
 *
 * This module has NO knowledge of Supabase — it just produces
 * readings and hands them to whatever `onReading` callback is given.
 * Ingestion (src/ingest/ingestTelemetry.js) is wired in separately,
 * per the Phase 2 architecture (simulator -> rule engine -> DB is a
 * simple in-process pipeline, no message broker).
 */

const { generate, SCENARIO_NAMES } = require('./scenarios');
const { makeReading, validateReading } = require('./telemetryModel');

class TelemetrySimulator {
  /**
   * @param {Array} zones - [{ terminal, zone, sensor }] e.g.
   *   { terminal: 'T2', zone: 'T2-R03', sensor: 'WF-T2-R03' }
   * @param {Object} [options]
   * @param {number} [options.intervalMs=2000] - tick interval
   */
  constructor(zones, options = {}) {
    if (!Array.isArray(zones) || zones.length === 0) {
      throw new Error('TelemetrySimulator requires a non-empty list of zones');
    }
    this.intervalMs = options.intervalMs || 2000;
    this._timer = null;

    // Per-zone runtime state: current scenario + usage accumulator
    // (usage accumulator feeds the future cleaning-threshold rule in Phase 4;
    // here we just track it as part of the realistic data model).
    this.zones = zones.map((z) => ({
      ...z,
      scenario: 'NORMAL',
      usageSinceClean: 0,
      cleaningThreshold: z.cleaningThreshold || 100,
    }));
  }

  /**
   * Change the active scenario for one zone (by zone code).
   */
  setScenario(zoneCode, scenario) {
    if (!SCENARIO_NAMES.includes(scenario)) {
      throw new Error(`Unknown scenario "${scenario}". Valid: ${SCENARIO_NAMES.join(', ')}`);
    }
    const z = this.zones.find((zz) => zz.zone === zoneCode);
    if (!z) throw new Error(`Unknown zone "${zoneCode}"`);
    z.scenario = scenario;
    return z;
  }

  getState() {
    return this.zones.map((z) => ({
      zone: z.zone,
      terminal: z.terminal,
      sensor: z.sensor,
      scenario: z.scenario,
      usageSinceClean: z.usageSinceClean,
      cleaningThreshold: z.cleaningThreshold,
    }));
  }

  /**
   * Produce exactly one reading per zone. Returns the array of readings.
   * `onReading` (if provided) is called once per reading, synchronously
   * in order — this is what src/ingest hooks into.
   */
  tick(onReading) {
    const now = new Date();
    const readings = [];

    for (const z of this.zones) {
      const values = generate(z.scenario, z);

      // Track cumulative usage since last clean (occupancy + flushes
      // are what "usage traffic" means per the Phase 1 design decision
      // — there is no dedicated hygiene sensor).
      z.usageSinceClean += values.occupancy + values.flush_count * 3;

      const reading = makeReading({
        timestamp: now,
        terminal: z.terminal,
        zone: z.zone,
        sensor: z.sensor,
        water_flow_lpm: values.water_flow_lpm,
        flush_count: values.flush_count,
        occupancy: values.occupancy,
        sensor_status: values.sensor_status,
        scenario: z.scenario,
      });

      validateReading(reading);
      readings.push(reading);

      if (typeof onReading === 'function') {
        onReading(reading, z);
      }
    }

    return readings;
  }

  /**
   * Start continuous generation on an interval. Returns a stop function.
   */
  start(onReading) {
    if (this._timer) return; // already running
    this._timer = setInterval(() => {
      try {
        this.tick(onReading);
      } catch (err) {
        // The simulator must never crash the process on a bad tick.
        console.error('[simulator] tick error:', err.message);
      }
    }, this.intervalMs);
    return () => this.stop();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

module.exports = { TelemetrySimulator };
