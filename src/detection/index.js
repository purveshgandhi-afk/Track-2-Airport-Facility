/**
 * PHASE 4A/4B — Detection Engine
 *
 * Factory that wires together all detectors and exposes a single
 * `detectAndRecord(reading, zone, sensor)` method that ingestTelemetry.js
 * calls once per reading, after the DB writes are complete.
 *
 * Phase 4B: accepts an optional `dispatchEngine` so that every newly
 * opened incident is immediately routed through priority scoring,
 * team assignment, and maintenance ticket creation.
 *
 * Usage:
 *   const engine = createDetectionEngine(adapter, dispatchEngine?);
 */

const { LeakDetector }     = require('./leakDetector');
const { CleaningDetector } = require('./cleaningDetector');

/**
 * @param {Object}  adapter        - supabaseAdapter or localMockAdapter
 * @param {Object}  [dispatchEngine] - optional Phase 4B dispatch engine
 * @returns {{ detectAndRecord: Function, reset: Function }}
 */
function createDetectionEngine(adapter, dispatchEngine) {
  const leakDetector     = new LeakDetector();
  const cleaningDetector = new CleaningDetector();

  async function runDispatch(incident, reading, zone) {
    if (dispatchEngine && incident) {
      await dispatchEngine.processIncident(incident, reading, zone);
    }
  }

  return {
    /**
     * Run all detectors for one reading.
     *
     * @param {Object} reading - normalized telemetry reading
     * @param {Object} zone    - zone record (refreshed after usage update)
     * @param {Object} sensor  - sensor record
     * @returns {Promise<Array>} - detection results (for logging/testing)
     */
    async detectAndRecord(reading, zone, sensor) {
      const results = [];

      try {
        const leakResult = await leakDetector.evaluate(reading, zone, sensor, adapter);

        if (leakResult.action === 'opened') {
          console.log(
            `[detection] LEAK OPENED  zone=${zone.code} ` +
            `avg_flow=${leakResult.incident.details.avg_flow_lpm} lpm ` +
            `~${leakResult.incident.details.estimated_liters} L lost ` +
            `id=${leakResult.incident.id}`
          );
          await runDispatch(leakResult.incident, reading, zone);
          results.push({ detector: 'leak', ...leakResult });

        } else if (leakResult.action === 'resolved') {
          console.log(
            `[detection] LEAK RESOLVED zone=${zone.code} id=${leakResult.incident.id}`
          );
          results.push({ detector: 'leak', ...leakResult });
        }
      } catch (err) {
        console.error('[detection] leak detector error:', err.message);
      }

      try {
        const cleanResult = await cleaningDetector.evaluate(zone, adapter);

        if (cleanResult.action === 'opened') {
          console.log(
            `[detection] CLEANING THRESHOLD zone=${zone.code} ` +
            `usage=${cleanResult.incident.details.usage_count}/${cleanResult.incident.details.threshold} ` +
            `id=${cleanResult.incident.id}`
          );
          await runDispatch(cleanResult.incident, reading, zone);
          results.push({ detector: 'cleaning', ...cleanResult });
        }
      } catch (err) {
        console.error('[detection] cleaning detector error:', err.message);
      }

      return results;
    },

    /** Reset all detector state (used between test runs). */
    reset() {
      leakDetector.reset();
    },
  };
}

module.exports = { createDetectionEngine };
