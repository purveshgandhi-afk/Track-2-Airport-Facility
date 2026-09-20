/**
 * GET /api/water
 *
 * Exposes existing water flow and sustainability metrics for the dashboard:
 * - total estimated water wastage from detected leaks (Phase 4A calculations)
 * - active leaks count and current leak flow rates
 * - current real-time facility flow rate across active sensors
 * - zone-level water consumption and leak status
 * - list of active and historical leak incidents with calculated metrics
 *
 * NOTE: Does NOT reinvent water calculations; aggregates the deterministic
 * values calculated during detection and persisted in Supabase.
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../db/supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase client not configured' });
    }

    // 1. Fetch all LEAK incidents (both open and resolved)
    const { data: leakIncidents, error: incErr } = await supabase
      .from('incidents')
      .select(`
        id,
        status,
        priority,
        detected_at,
        resolved_at,
        details,
        zone:zones(id, code, name, traffic_tier)
      `)
      .eq('type', 'LEAK')
      .order('detected_at', { ascending: false });

    if (incErr) throw incErr;

    // 2. Fetch latest telemetry reading per zone (retrieve last 20 readings and group by zone)
    const { data: recentTelemetry, error: telErr } = await supabase
      .from('telemetry')
      .select(`
        zone_id,
        water_flow_lpm,
        recorded_at,
        zone:zones(id, code, name)
      `)
      .order('recorded_at', { ascending: false })
      .limit(40);

    if (telErr) throw telErr;

    // Aggregate leak metrics from Phase 4A deterministic calculations
    const allLeaks = leakIncidents || [];
    const activeLeaks = allLeaks.filter(l => l.status === 'OPEN');
    const resolvedLeaks = allLeaks.filter(l => l.status === 'RESOLVED');

    const totalWastedLiters = allLeaks.reduce((sum, inc) => {
      const liters = (inc.details && (inc.details.estimated_liters || inc.details.wasted_liters)) || 0;
      return sum + Number(liters);
    }, 0);

    const activeLeakFlowLpm = activeLeaks.reduce((sum, inc) => {
      const flow = (inc.details && inc.details.avg_flow_lpm) || 0;
      return sum + Number(flow);
    }, 0);

    // Latest flow per zone
    const latestByZone = new Map();
    (recentTelemetry || []).forEach(reading => {
      if (reading.zone_id && !latestByZone.has(reading.zone_id)) {
        latestByZone.set(reading.zone_id, {
          zone_id: reading.zone_id,
          zone_code: reading.zone?.code || 'unknown',
          zone_name: reading.zone?.name || 'unknown',
          current_flow_lpm: Number(reading.water_flow_lpm) || 0,
          recorded_at: reading.recorded_at,
        });
      }
    });

    const zoneFlows = Array.from(latestByZone.values());
    const facilityCurrentFlowLpm = zoneFlows.reduce((sum, z) => sum + z.current_flow_lpm, 0);

    res.json({
      sustainability_metrics: {
        total_wasted_liters: Math.round(totalWastedLiters * 100) / 100,
        active_leaks_count: activeLeaks.length,
        active_leak_flow_rate_lpm: Math.round(activeLeakFlowLpm * 100) / 100,
        resolved_leaks_count: resolvedLeaks.length,
        current_facility_flow_lpm: Math.round(facilityCurrentFlowLpm * 100) / 100,
      },
      zone_current_flow: zoneFlows,
      active_leaks: activeLeaks.map(l => ({
        incident_id: l.id,
        zone: l.zone ? { code: l.zone.code, name: l.zone.name, traffic_tier: l.zone.traffic_tier } : null,
        priority: l.priority,
        detected_time: l.detected_at,
        avg_flow_lpm: l.details?.avg_flow_lpm || 0,
        estimated_liters_lost: l.details?.estimated_liters || 0,
        window_readings: l.details?.window_readings || 3,
      })),
      recent_leak_history: resolvedLeaks.slice(0, 10).map(l => ({
        incident_id: l.id,
        zone: l.zone ? { code: l.zone.code, name: l.zone.name } : null,
        priority: l.priority,
        detected_time: l.detected_at,
        resolved_time: l.resolved_at,
        avg_flow_lpm: l.details?.avg_flow_lpm || 0,
        total_liters_lost: l.details?.estimated_liters || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
