/**
 * GET /api/zones
 *
 * Returns a composite per-zone operational status view, joining:
 *  - Zone info (code, name, terminal, traffic_tier)
 *  - Latest sensor status and sensor code for the zone
 *  - Latest telemetry reading (water_flow_lpm, occupancy, flush_count)
 *  - Cleaning threshold status (cleaning_status, usage_since_cleaning)
 *  - Active LEAK incident (if any)
 *
 * Derived field `zone_status` encodes the highest-priority condition:
 *   CRITICAL_LEAK > SENSOR_OFFLINE > OVERDUE > CLEANING_REQUIRED > APPROACHING_THRESHOLD > NORMAL
 *
 * Used by the Command Center zone table to render the operational grid.
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../db/supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase client not configured' });
    }

    // 1. Fetch all zones with terminal info
    const { data: zones, error: zonesErr } = await supabase
      .from('zones')
      .select(`
        id,
        code,
        name,
        zone_type,
        traffic_tier,
        usage_count_since_clean,
        cleaning_threshold_uses,
        last_cleaned_at,
        terminal:terminals(code, name)
      `)
      .order('code', { ascending: true });

    if (zonesErr) throw zonesErr;

    // 2. Fetch all sensors (one per zone in prototype — combo type)
    const { data: sensors, error: sensorsErr } = await supabase
      .from('sensors')
      .select('id, zone_id, code, sensor_type, status, last_seen_at');

    if (sensorsErr) throw sensorsErr;

    // 3. Fetch latest telemetry per zone (last 40 rows, then group by zone_id client-side)
    const { data: telemetry, error: telErr } = await supabase
      .from('telemetry')
      .select('zone_id, water_flow_lpm, flush_count, occupancy, sensor_status, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(40);

    if (telErr) throw telErr;

    // 4. Fetch open LEAK incidents
    const { data: leakIncidents, error: incErr } = await supabase
      .from('incidents')
      .select('id, zone_id, priority, details')
      .eq('type', 'LEAK')
      .eq('status', 'OPEN');

    if (incErr) throw incErr;

    // Build lookup maps
    const sensorByZone = {};
    (sensors || []).forEach(s => {
      // Keep first sensor found per zone (prototype: one combo sensor per zone)
      if (!sensorByZone[s.zone_id]) sensorByZone[s.zone_id] = s;
    });

    const latestTelByZone = {};
    (telemetry || []).forEach(row => {
      if (row.zone_id && !latestTelByZone[row.zone_id]) {
        latestTelByZone[row.zone_id] = row;
      }
    });

    const leakByZone = {};
    (leakIncidents || []).forEach(inc => {
      leakByZone[inc.zone_id] = inc;
    });

    // Build composite zone objects
    const data = (zones || []).map(zone => {
      const sensor = sensorByZone[zone.id] || null;
      const tel = latestTelByZone[zone.id] || null;
      const leak = leakByZone[zone.id] || null;

      const usage = zone.usage_count_since_clean || 0;
      const threshold = zone.cleaning_threshold_uses || 100;
      const pct = Math.round((usage / threshold) * 100);

      let cleaningStatus = 'NORMAL';
      if (usage >= threshold * 2)      cleaningStatus = 'OVERDUE';
      else if (usage >= threshold)     cleaningStatus = 'CLEANING_REQUIRED';
      else if (usage >= threshold * 0.8) cleaningStatus = 'APPROACHING_THRESHOLD';

      const sensorStatus = sensor ? sensor.status : 'UNKNOWN';

      // Derive composite zone_status (most critical wins)
      let zoneStatus = 'NORMAL';
      if (leak)                              zoneStatus = 'CRITICAL_LEAK';
      else if (sensorStatus !== 'ONLINE')    zoneStatus = 'SENSOR_OFFLINE';
      else if (cleaningStatus === 'OVERDUE') zoneStatus = 'OVERDUE';
      else if (cleaningStatus === 'CLEANING_REQUIRED')     zoneStatus = 'CLEANING_REQUIRED';
      else if (cleaningStatus === 'APPROACHING_THRESHOLD') zoneStatus = 'APPROACHING_THRESHOLD';

      return {
        zone: {
          id: zone.id,
          code: zone.code,
          name: zone.name,
          zone_type: zone.zone_type,
          traffic_tier: zone.traffic_tier,
          terminal: zone.terminal ? { code: zone.terminal.code, name: zone.terminal.name } : null,
        },
        zone_status: zoneStatus,
        sensor: sensor ? {
          id: sensor.id,
          code: sensor.code,
          type: sensor.sensor_type,
          status: sensor.status,
          last_seen_at: sensor.last_seen_at,
        } : null,
        water_flow_lpm: tel ? (Number(tel.water_flow_lpm) || 0) : null,
        occupancy: tel ? (tel.occupancy || 0) : null,
        flush_count: tel ? (tel.flush_count || 0) : null,
        latest_reading_at: tel ? tel.recorded_at : null,
        cleaning: {
          status: cleaningStatus,
          usage_since_cleaning: usage,
          cleaning_threshold: threshold,
          percentage: pct,
          last_cleaned_at: zone.last_cleaned_at,
        },
        active_leak: leak ? {
          incident_id: leak.id,
          priority: leak.priority,
          avg_flow_lpm: leak.details?.avg_flow_lpm || 0,
          estimated_liters: leak.details?.estimated_liters || 0,
        } : null,
      };
    });

    res.json({
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
