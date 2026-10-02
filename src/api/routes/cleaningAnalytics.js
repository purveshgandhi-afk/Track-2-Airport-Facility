/**
 * GET /api/cleaning/analytics
 *
 * Computes cleaning & usage analytics from existing zone and telemetry data.
 * Returns:
 *  - summary: { total_zones, requiring_cleaning, overdue, approaching,
 *               normal, avg_usage_pct, total_usage_count }
 *  - zone_usage: [{zone_code, zone_name, terminal, traffic_tier,
 *                  usage, threshold, percentage, status, last_cleaned_at}]
 *                 — sorted by usage% descending (problem zones first)
 *  - usage_distribution: [{label, count}] — bucketed by status
 *  - problem_zones: top 5 highest-usage zones
 *  - occupancy_by_zone: [{zone_code, total_occupancy, total_flushes, reading_count}]
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../db/supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase client not configured' });
    }

    // 1. Fetch zones with cleaning data
    const { data: zones, error: zonesErr } = await supabase
      .from('zones')
      .select(`
        id,
        code,
        name,
        traffic_tier,
        usage_count_since_clean,
        cleaning_threshold_uses,
        last_cleaned_at,
        terminal:terminals(code, name)
      `)
      .order('code', { ascending: true });

    if (zonesErr) throw zonesErr;

    // 2. Fetch latest telemetry for occupancy/flush aggregation
    const { data: telemetry, error: telErr } = await supabase
      .from('telemetry')
      .select('zone_id, flush_count, occupancy, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(200);

    if (telErr) throw telErr;

    const allZones = zones || [];
    const allTel = telemetry || [];

    if (allZones.length === 0) {
      return res.json({
        summary: {
          total_zones: 0, requiring_cleaning: 0, overdue: 0,
          approaching: 0, normal: 0, avg_usage_pct: 0, total_usage_count: 0,
        },
        zone_usage: [],
        usage_distribution: [],
        problem_zones: [],
        occupancy_by_zone: [],
      });
    }

    // ── Zone usage classification ──────────────────────────────
    const zoneUsage = allZones.map(z => {
      const usage = z.usage_count_since_clean || 0;
      const threshold = z.cleaning_threshold_uses || 100;
      const pct = Math.round((usage / threshold) * 100);

      let status = 'NORMAL';
      if (usage >= threshold * 2) status = 'OVERDUE';
      else if (usage >= threshold) status = 'CLEANING_REQUIRED';
      else if (usage >= threshold * 0.8) status = 'APPROACHING';

      return {
        zone_id: z.id,
        zone_code: z.code,
        zone_name: z.name,
        terminal: z.terminal?.code || '—',
        traffic_tier: z.traffic_tier,
        usage: usage,
        threshold: threshold,
        percentage: pct,
        status: status,
        last_cleaned_at: z.last_cleaned_at,
      };
    }).sort((a, b) => b.percentage - a.percentage);

    // ── Summary ────────────────────────────────────────────────
    const requiring = zoneUsage.filter(z => z.status === 'CLEANING_REQUIRED' || z.status === 'OVERDUE').length;
    const overdue = zoneUsage.filter(z => z.status === 'OVERDUE').length;
    const approaching = zoneUsage.filter(z => z.status === 'APPROACHING').length;
    const normal = zoneUsage.filter(z => z.status === 'NORMAL').length;
    const totalUsageCount = zoneUsage.reduce((s, z) => s + z.usage, 0);
    const avgUsagePct = zoneUsage.length > 0
      ? Math.round(zoneUsage.reduce((s, z) => s + z.percentage, 0) / zoneUsage.length)
      : 0;

    // ── Usage distribution ─────────────────────────────────────
    const usageDistribution = [
      { label: 'Normal', count: normal, status: 'NORMAL' },
      { label: 'Approaching', count: approaching, status: 'APPROACHING' },
      { label: 'Required', count: requiring - overdue, status: 'CLEANING_REQUIRED' },
      { label: 'Overdue', count: overdue, status: 'OVERDUE' },
    ];

    // ── Problem zones (top 5 highest usage %) ──────────────────
    const problemZones = zoneUsage.slice(0, 5);

    // ── Occupancy by zone (from latest telemetry) ──────────────
    const occMap = {};
    allTel.forEach(r => {
      if (!r.zone_id) return;
      if (!occMap[r.zone_id]) {
        occMap[r.zone_id] = {
          zone_id: r.zone_id,
          total_occupancy: 0,
          total_flushes: 0,
          reading_count: 0,
        };
      }
      occMap[r.zone_id].total_occupancy += (r.occupancy || 0);
      occMap[r.zone_id].total_flushes += (r.flush_count || 0);
      occMap[r.zone_id].reading_count += 1;
    });

    // Enrich with zone codes
    const zoneCodeMap = {};
    allZones.forEach(z => { zoneCodeMap[z.id] = z.code; });

    const occupancyByZone = Object.values(occMap)
      .map(o => ({
        zone_code: zoneCodeMap[o.zone_id] || 'UNKNOWN',
        total_occupancy: o.total_occupancy,
        total_flushes: o.total_flushes,
        reading_count: o.reading_count,
        avg_occupancy: o.reading_count > 0
          ? Math.round((o.total_occupancy / o.reading_count) * 10) / 10
          : 0,
      }))
      .sort((a, b) => b.total_flushes - a.total_flushes);

    res.json({
      summary: {
        total_zones: allZones.length,
        requiring_cleaning: requiring,
        overdue,
        approaching,
        normal,
        avg_usage_pct: avgUsagePct,
        total_usage_count: totalUsageCount,
      },
      zone_usage: zoneUsage,
      usage_distribution: usageDistribution,
      problem_zones: problemZones,
      occupancy_by_zone: occupancyByZone,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
