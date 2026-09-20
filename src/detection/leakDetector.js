/**
 * PHASE 4A — Leak Detector
 *
 * Maintains a per-zone sliding window of recent telemetry readings and
 * triggers a LEAK incident when ALL readings in the window show:
 *   - water_flow_lpm  >= FLOW_THRESHOLD_LPM    (flow is elevated)
 *   - flush_count     <= MAX_LEGITIMATE_FLUSH   (no fixture use explains it)
 *   - occupancy       <= MAX_LEGITIMATE_OCCUPANCY (virtually unoccupied)
 *
 * These three conditions together distinguish a continuous dripping/running
 * leak from legitimate high-usage flow (which always correlates with
 * occupancy > 1 and/or flush_count > 0).
 *
 * Sensor guard: readings with sensor_status !== 'ONLINE' are ignored
 * entirely — an offline sensor must never produce a false leak alarm.
 *
 * Does NOT use scenario_tag. Scenario tags are for demo traceability only.
 */

// ── Thresholds ────────────────────────────────────────────────────────────────

/** Minimum sustained flow (L/min) to be considered abnormal when there is
 *  little/no legitimate usage.
 *
 *  Set to 2.5 because:
 *  - LEAK scenario always produces 2.5–4.5 LPM → every LEAK reading clears
 *    this threshold (100% sensitivity, deterministic window fill on tick 3).
 *  - NORMAL scenario produces 1.0–3.0 LPM ONLY when occupied; when occupancy=0
 *    flow is always 0. The band 2.0–2.5 is where the two scenarios overlap,
 *    which was causing false positives. Raising to 2.5 eliminates that overlap. */
const FLOW_THRESHOLD_LPM = 2.5;

/** Maximum flush events that can still look like a leak.
 *  Even 1 flush event strongly suggests legitimate usage. */
const MAX_LEGITIMATE_FLUSH = 0;

/** Maximum occupancy that can coexist with a leak reading.
 *  ≥ 2 people legitimately explain elevated flow. At occupancy=1 with no flush
 *  and flow ≥ 2.5 LPM (above what NORMAL produces for a single person on average),
 *  this is still suspicious — combined with the sustained-window requirement it
 *  correctly distinguishes a dripping fixture from a brief single-person visit. */
const MAX_LEGITIMATE_OCCUPANCY = 1;

/** Number of consecutive suspicious readings before a leak is declared.
 *  At 2 s / tick this is ~6 s — fast enough to catch leaks, slow enough
 *  to avoid transient false positives. */
const WINDOW_SIZE = 3;

/** Interval between simulator ticks in minutes (2 000 ms default). */
const TICK_INTERVAL_MIN = 2000 / 1000 / 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSuspicious(reading) {
  return (
    reading.sensor_status === 'ONLINE' &&
    reading.water_flow_lpm >= FLOW_THRESHOLD_LPM &&
    reading.flush_count <= MAX_LEGITIMATE_FLUSH &&
    reading.occupancy <= MAX_LEGITIMATE_OCCUPANCY
  );
}

// ── LeakDetector class ────────────────────────────────────────────────────────

class LeakDetector {
  constructor() {
    /**
     * Per-zone sliding window: Map<zoneCode, reading[]>
     * Each entry holds at most WINDOW_SIZE readings.
     */
    this._windows = new Map();

    /**
     * Tracks the UUID of the currently OPEN leak incident per zone
     * so we don't create duplicates and can resolve it when flow clears.
     * Map<zoneCode, incidentId|null>
     */
    this._openIncidents = new Map();
  }

  /**
   * Evaluate a single reading for a zone.
   *
   * @param {Object} reading  - normalized telemetry reading (from telemetryModel)
   * @param {Object} zone     - zone record from adapter (needs .id, .code)
   * @param {Object} sensor   - sensor record from adapter (needs .id)
   * @param {Object} adapter  - DB adapter (localMock or supabase)
   * @returns {Promise<{action:'opened'|'resolved'|'none', incident:Object|null}>}
   */
  async evaluate(reading, zone, sensor, adapter) {
    const zoneCode = zone.code;

    // ── Skip offline / faulty sensors ─────────────────────────────────────────
    if (reading.sensor_status !== 'ONLINE') {
      // Clear the window so stale suspicious readings don't persist
      this._windows.set(zoneCode, []);
      return { action: 'none', incident: null };
    }

    // ── Maintain sliding window ────────────────────────────────────────────────
    const window = this._windows.get(zoneCode) || [];
    window.push(reading);
    if (window.length > WINDOW_SIZE) window.shift();
    this._windows.set(zoneCode, window);

    const allSuspicious = window.length === WINDOW_SIZE && window.every(isSuspicious);
    const openIncidentId = this._openIncidents.get(zoneCode) || null;

    // ── Case 1: leak condition confirmed, no open incident yet ────────────────
    if (allSuspicious && !openIncidentId) {
      const totalFlow = window.reduce((s, r) => s + r.water_flow_lpm, 0);
      const avgFlow = Math.round((totalFlow / window.length) * 100) / 100;
      const estimatedLiters = Math.round(totalFlow * TICK_INTERVAL_MIN * 100) / 100;

      const incidentRow = {
        zone_id: zone.id,
        sensor_id: sensor.id,
        type: 'LEAK',
        status: 'OPEN',
        priority: 'HIGH',
        detected_at: reading.timestamp || new Date().toISOString(),
        details: {
          avg_flow_lpm: avgFlow,
          window_readings: WINDOW_SIZE,
          estimated_liters: estimatedLiters,
          interval_min: TICK_INTERVAL_MIN,
        },
      };

      const incident = await adapter.insertIncident(incidentRow);
      this._openIncidents.set(zoneCode, incident.id);
      return { action: 'opened', incident };
    }

    // ── Case 2: leak was open but condition cleared ───────────────────────────
    if (!allSuspicious && openIncidentId) {
      await adapter.resolveIncident(openIncidentId);
      this._openIncidents.set(zoneCode, null);

      // Return the resolved incident id for logging (adapter resolveIncident
      // may not return the full row, so we just pass the id).
      return { action: 'resolved', incident: { id: openIncidentId } };
    }

    // ── Case 3: leak ongoing (already open) or no issue ──────────────────────
    return { action: 'none', incident: null };
  }

  /** Reset all state (used by tests between runs). */
  reset() {
    this._windows.clear();
    this._openIncidents.clear();
  }
}

module.exports = {
  LeakDetector,
  FLOW_THRESHOLD_LPM,
  MAX_LEGITIMATE_FLUSH,
  MAX_LEGITIMATE_OCCUPANCY,
  WINDOW_SIZE,
};
