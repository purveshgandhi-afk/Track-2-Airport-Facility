/**
 * PHASE 4A — Cleaning Threshold Detector
 *
 * Checks whether a zone's usage_count_since_clean has crossed its
 * cleaning_threshold_uses limit. When it has, creates a
 * CLEANING_THRESHOLD incident in the incidents table.
 *
 * This is stateless — it relies entirely on the values already stored
 * in the zone record by src/ingest/ingestTelemetry.js's updateZoneUsage()
 * call. No hygiene sensor, no separate accumulator here.
 *
 * Deduplication: we query the DB for an existing OPEN incident of this
 * type for the zone before inserting. That way a threshold breach that
 * spans many ticks only produces one incident.
 *
 * Does NOT use scenario_tag.
 */

class CleaningDetector {
  /**
   * Evaluate cleaning threshold for a zone.
   *
   * @param {Object} zone     - zone record returned by adapter after usage update
   *                            (needs .id, .code, .usage_count_since_clean,
   *                             .cleaning_threshold_uses)
   * @param {Object} adapter  - DB adapter
   * @returns {Promise<{action:'opened'|'none', incident:Object|null}>}
   */
  async evaluate(zone, adapter) {
    const { id: zoneId, usage_count_since_clean, cleaning_threshold_uses } = zone;

    // Not yet at the threshold — nothing to do.
    if (usage_count_since_clean < cleaning_threshold_uses) {
      return { action: 'none', incident: null };
    }

    // Threshold crossed — check for an existing OPEN incident to avoid
    // flooding the table with duplicates on every subsequent tick.
    const existing = await adapter.getOpenIncidentByZoneAndType(zoneId, 'CLEANING_THRESHOLD');
    if (existing) {
      return { action: 'none', incident: null };
    }

    const incidentRow = {
      zone_id: zoneId,
      sensor_id: null,
      type: 'CLEANING_THRESHOLD',
      status: 'OPEN',
      priority: 'MEDIUM',
      detected_at: new Date().toISOString(),
      details: {
        usage_count: usage_count_since_clean,
        threshold: cleaning_threshold_uses,
      },
    };

    const incident = await adapter.insertIncident(incidentRow);
    return { action: 'opened', incident };
  }
}

module.exports = { CleaningDetector };
