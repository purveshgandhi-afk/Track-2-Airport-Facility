/**
 * GET /api/dashboard/summary
 *
 * Provides high-level operational and sustainability metrics for the facility:
 * - total zones
 * - online / offline sensors count
 * - active incidents count
 * - critical / high priority incidents count
 * - active maintenance tickets count
 * - cleaning tasks / zones requiring clean
 * - water impact / wastage from detected leaks
 * - total_flush_count_today (aggregated from today's telemetry)
 * - estimated_water_used_liters (aggregated from today's telemetry)
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../db/supabaseClient');

async function fetchSummaryData() {
  const [zonesRes, sensorsRes, incidentsRes, ticketsRes] = await Promise.all([
    supabase.from('zones').select('id, code, usage_count_since_clean, cleaning_threshold_uses'),
    supabase.from('sensors').select('id, status'),
    supabase.from('incidents').select('id, type, status, priority, details'),
    supabase.from('maintenance_tickets').select('id, status, assigned_team'),
  ]);

  if (zonesRes.error) throw zonesRes.error;
  if (sensorsRes.error) throw sensorsRes.error;
  if (incidentsRes.error) throw incidentsRes.error;
  if (ticketsRes.error) throw ticketsRes.error;

  return {
    zones: zonesRes.data || [],
    sensors: sensorsRes.data || [],
    incidents: incidentsRes.data || [],
    tickets: ticketsRes.data || [],
  };
}

router.get('/summary', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase client not configured' });
    }

    let summaryData;
    try {
      summaryData = await fetchSummaryData();
    } catch (err) {
      if (err.code === 'PGRST303' || (err.message && err.message.includes('JWT issued at future'))) {
        await new Promise(r => setTimeout(r, 500));
        summaryData = await fetchSummaryData();
      } else {
        throw err;
      }
    }

    const { zones, sensors, incidents, tickets } = summaryData;

    // Sensor counts
    const onlineSensors = sensors.filter(s => s.status === 'ONLINE').length;
    const offlineSensors = sensors.filter(s => s.status !== 'ONLINE').length;

    // Incident counts
    const activeIncidents = incidents.filter(i => i.status === 'OPEN' || i.status === 'ACKNOWLEDGED');
    const criticalHighIncidents = activeIncidents.filter(
      i => i.priority === 'CRITICAL' || i.priority === 'HIGH'
    ).length;

    // Maintenance ticket counts
    const activeTickets = tickets.filter(
      t => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
    );

    // Cleaning tasks: zones that reached or exceeded usage threshold
    const zonesRequiringClean = zones.filter(
      z => z.usage_count_since_clean >= z.cleaning_threshold_uses
    );
    const activeCleaningTickets = activeTickets.filter(t => t.assigned_team === 'cleaning').length;

    // Water impact / wastage: sum of estimated_liters from leak incidents
    const leakIncidents = incidents.filter(i => i.type === 'LEAK');
    const totalWastedLiters = leakIncidents.reduce((sum, inc) => {
      const liters = (inc.details && (inc.details.estimated_liters || inc.details.wasted_liters)) || 0;
      return sum + Number(liters);
    }, 0);

    // Current active leak flow rate (sum of avg_flow_lpm for OPEN leaks)
    const activeLeaks = leakIncidents.filter(i => i.status === 'OPEN');
    const activeLeakFlowLpm = activeLeaks.reduce((sum, inc) => {
      const flow = (inc.details && inc.details.avg_flow_lpm) || 0;
      return sum + Number(flow);
    }, 0);

    // ── Today's telemetry aggregates ──────────────────────────────────────────
    // Each telemetry reading represents approx. 1 minute of sensor data, so:
    //   sum(flush_count)     → total flushes recorded today
    //   sum(water_flow_lpm)  → estimated liters consumed today (1 reading ≈ 1 min)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayTelemetry, error: telErr } = await supabase
      .from('telemetry')
      .select('water_flow_lpm, flush_count')
      .gte('recorded_at', todayStart.toISOString());

    if (telErr) throw telErr;

    const rows = todayTelemetry || [];
    const totalFlushCountToday = rows.reduce((sum, r) => sum + (r.flush_count || 0), 0);
    const estimatedWaterUsedLiters = rows.reduce((sum, r) => sum + (Number(r.water_flow_lpm) || 0), 0);

    res.json({
      total_zones: zones.length,
      online_sensors: onlineSensors,
      offline_sensors: offlineSensors,
      active_incidents: activeIncidents.length,
      critical_high_incidents: criticalHighIncidents,
      active_maintenance_tickets: activeTickets.length,
      cleaning_tasks: {
        zones_requiring_cleaning: zonesRequiringClean.length,
        active_cleaning_tickets: activeCleaningTickets,
      },
      water_impact: {
        total_wasted_liters: Math.round(totalWastedLiters * 100) / 100,
        active_leaks_count: activeLeaks.length,
        active_leak_flow_rate_lpm: Math.round(activeLeakFlowLpm * 100) / 100,
      },
      total_flush_count_today: totalFlushCountToday,
      estimated_water_used_liters: Math.round(estimatedWaterUsedLiters * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
