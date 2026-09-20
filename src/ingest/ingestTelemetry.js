

const { validateReading } = require('../telemetry/telemetryModel');

/**
 * @param {Object} adapter - one of supabaseAdapter / localMockAdapter
 * @param {Object} reading - a telemetry reading from the simulator
 * @param {Object} [detectionEngine] - optional Phase 4A detection engine
 */
async function ingestReading(adapter, reading, detectionEngine) {
  validateReading(reading);

  const zone = await adapter.getZoneByCode(reading.zone);
  const sensor = await adapter.getSensorByCode(reading.sensor);

  const row = {
    sensor_id: sensor.id,
    zone_id: zone.id,
    recorded_at: reading.timestamp,
    water_flow_lpm: reading.water_flow_lpm,
    flush_count: reading.flush_count,
    occupancy: reading.occupancy,
    sensor_status: reading.sensor_status,
    scenario_tag: reading.scenario,
  };

  const inserted = await adapter.insertTelemetry(row);

  // Keep sensor health current (Phase 3 scope: basic online/offline/fault
  // + last-seen tracking only — no predictive maintenance).
  await adapter.updateSensorStatus(sensor.id, reading.sensor_status, reading.timestamp);

  // Track usage traffic toward the zone's cleaning threshold. Occupancy is
  // an instantaneous headcount, not a completed restroom use, so it must
  // NOT feed the accumulator. flush_count is the actual usage event, so
  // it's the sole basis here. The THRESHOLD DECISION itself is Phase 4's
  // job — here we only accumulate the raw usage-event count, per the
  // Phase 1 design (usage traffic, not a dedicated hygiene sensor, drives
  // cleaning).
  const usageDelta = reading.flush_count;
  if (usageDelta > 0) {
    await adapter.updateZoneUsage(zone.id, usageDelta);
  }

  // ── Phase 4A: run detection after all writes are complete ─────────────────
  // Re-fetch the zone so the cleaning detector sees the updated
  // usage_count_since_clean, not the stale pre-write value.
  if (detectionEngine) {
    const freshZone = await adapter.getZoneByCode(reading.zone);
    await detectionEngine.detectAndRecord(reading, freshZone, sensor);
  }

  return { zone, sensor, telemetry: inserted };
}

/**
 * Convenience wrapper: ingest an array of readings sequentially,
 * collecting any per-reading errors instead of throwing on the first one
 * (so one bad reading doesn't stop the whole simulator tick).
 * @param {Object} [detectionEngine] - optional Phase 4A detection engine
 */
async function ingestBatch(adapter, readings, detectionEngine) {
  const results = [];
  const errors = [];
  for (const reading of readings) {
    try {
      results.push(await ingestReading(adapter, reading, detectionEngine));
    } catch (err) {
      errors.push({ reading, error: err.message });
    }
  }
  return { results, errors };
}

module.exports = { ingestReading, ingestBatch };