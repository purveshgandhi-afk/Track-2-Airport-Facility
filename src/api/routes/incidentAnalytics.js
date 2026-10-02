/**
 * GET /api/incidents/analytics
 *
 * Computes incident analytics from the latest DB records.
 * Returns:
 *  - summary: { total, open, resolved, acknowledged,
 *               critical, high, medium, low }
 *  - by_type: [{type, count}]
 *  - by_zone: [{zone_code, zone_name, terminal, count, open, critical_high}]
 *  - by_priority: [{priority, count}]
 *  - recent_timeline: [{hour, label, count}]  — incidents grouped by hour
 *  - resolution_rate: { resolved, total, rate_pct }
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../db/supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase client not configured' });
    }

    // Fetch ALL incidents (no limit — typically dozens, not millions)
    const { data: incidents, error: incErr } = await supabase
      .from('incidents')
      .select(`
        id,
        type,
        status,
        priority,
        detected_at,
        resolved_at,
        details,
        zone:zones(id, code, name, traffic_tier, terminal:terminals(code, name))
      `)
      .order('detected_at', { ascending: false });

    if (incErr) throw incErr;

    const all = incidents || [];

    if (all.length === 0) {
      return res.json({
        summary: {
          total: 0, open: 0, resolved: 0, acknowledged: 0,
          critical: 0, high: 0, medium: 0, low: 0,
        },
        by_type: [],
        by_zone: [],
        by_priority: [],
        recent_timeline: [],
        resolution_rate: { resolved: 0, total: 0, rate_pct: 0 },
      });
    }

    // ── Summary counts ──────────────────────────────────────────
    const open = all.filter(i => i.status === 'OPEN').length;
    const resolved = all.filter(i => i.status === 'RESOLVED').length;
    const acknowledged = all.filter(i => i.status === 'ACKNOWLEDGED').length;
    const critical = all.filter(i => i.priority === 'CRITICAL').length;
    const high = all.filter(i => i.priority === 'HIGH').length;
    const medium = all.filter(i => i.priority === 'MEDIUM').length;
    const low = all.filter(i => i.priority === 'LOW').length;

    // ── By type ─────────────────────────────────────────────────
    const typeMap = {};
    all.forEach(i => {
      typeMap[i.type] = (typeMap[i.type] || 0) + 1;
    });
    const byType = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

    // ── By zone ─────────────────────────────────────────────────
    const zoneMap = {};
    all.forEach(i => {
      const zCode = i.zone?.code || 'UNKNOWN';
      if (!zoneMap[zCode]) {
        zoneMap[zCode] = {
          zone_code: zCode,
          zone_name: i.zone?.name || 'Unknown',
          terminal: i.zone?.terminal?.code || '—',
          count: 0,
          open: 0,
          critical_high: 0,
        };
      }
      zoneMap[zCode].count++;
      if (i.status === 'OPEN') zoneMap[zCode].open++;
      if (i.priority === 'CRITICAL' || i.priority === 'HIGH') zoneMap[zCode].critical_high++;
    });
    const byZone = Object.values(zoneMap).sort((a, b) => b.count - a.count);

    // ── By priority ─────────────────────────────────────────────
    const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const byPriority = priorityOrder.map(p => ({
      priority: p,
      count: all.filter(i => i.priority === p).length,
    }));

    // ── Timeline (hourly buckets) ───────────────────────────────
    const hourlyMap = new Map();
    all.forEach(i => {
      const dt = new Date(i.detected_at);
      const hourKey = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')} ${String(dt.getUTCHours()).padStart(2, '0')}`;

      if (!hourlyMap.has(hourKey)) {
        hourlyMap.set(hourKey, {
          hour: hourKey,
          label: `${String(dt.getUTCHours()).padStart(2, '0')}:00`,
          count: 0,
        });
      }
      hourlyMap.get(hourKey).count++;
    });
    const recentTimeline = Array.from(hourlyMap.values());

    // ── Resolution rate ─────────────────────────────────────────
    const resolutionRate = {
      resolved,
      total: all.length,
      rate_pct: all.length > 0 ? Math.round((resolved / all.length) * 1000) / 10 : 0,
    };

    res.json({
      summary: {
        total: all.length,
        open,
        resolved,
        acknowledged,
        critical,
        high,
        medium,
        low,
      },
      by_type: byType,
      by_zone: byZone,
      by_priority: byPriority,
      recent_timeline: recentTimeline,
      resolution_rate: resolutionRate,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
