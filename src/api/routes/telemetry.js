/**
 * GET /api/telemetry
 *
 * Returns recent high-frequency IoT telemetry readings.
 * Supports query parameters:
 * - limit: number of rows (default 50, max 200)
 * - zone_code: filter by zone code (e.g. "T2-R03")
 * - zone_id: filter by zone UUID
 * - sensor_code: filter by sensor code (e.g. "WF-T2-R03")
 * - sensor_id: filter by sensor UUID
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../db/supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase client not configured' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const { zone_code, zone_id, sensor_code, sensor_id } = req.query;

    let targetZoneId = zone_id;
    if (!targetZoneId && zone_code) {
      const { data: zone } = await supabase
        .from('zones')
        .select('id')
        .eq('code', zone_code)
        .single();
      if (zone) targetZoneId = zone.id;
    }

    let targetSensorId = sensor_id;
    if (!targetSensorId && sensor_code) {
      const { data: sensor } = await supabase
        .from('sensors')
        .select('id')
        .eq('code', sensor_code)
        .single();
      if (sensor) targetSensorId = sensor.id;
    }

    let query = supabase
      .from('telemetry')
      .select(`
        id,
        recorded_at,
        water_flow_lpm,
        flush_count,
        occupancy,
        sensor_status,
        scenario_tag,
        zone:zones(id, code, name),
        sensor:sensors(id, code, sensor_type)
      `)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (targetZoneId) query = query.eq('zone_id', targetZoneId);
    if (targetSensorId) query = query.eq('sensor_id', targetSensorId);

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map(row => ({
      id: row.id,
      zone: row.zone ? { id: row.zone.id, code: row.zone.code, name: row.zone.name } : null,
      sensor: row.sensor ? { id: row.sensor.id, code: row.sensor.code, type: row.sensor.sensor_type } : null,
      timestamp: row.recorded_at,
      water_flow: Number(row.water_flow_lpm) || 0,
      flush_count: row.flush_count || 0,
      occupancy: row.occupancy || 0,
      sensor_status: row.sensor_status,
      scenario_tag: row.scenario_tag || null,
    }));

    res.json({
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
