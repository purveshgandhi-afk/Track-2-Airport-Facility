/**
 * GET /api/water/analytics
 *
 * Computes water usage analytics from the LATEST telemetry records in the DB.
 * Returns:
 *  - hourly_trend: [{hour, label, total_flow_lpm, reading_count}]
 *  - summary: {total_usage_liters, avg_usage_lpm, peak_usage_lpm, peak_hour,
 *              estimated_wastage_liters, total_readings, window_start, window_end}
 *  - comparison: {first_half_liters, second_half_liters, trend_direction, change_pct}
 *
 * The window is derived from the latest 200 telemetry records (up to ~24h),
 * NOT hardcoded to "today" — so it works regardless of when data was generated.
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../db/supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase client not configured' });
    }

    // Fetch the latest 200 telemetry readings (covers ample 24h window)
    const { data: readings, error: telErr } = await supabase
      .from('telemetry')
      .select('recorded_at, water_flow_lpm, flush_count, zone_id, sensor_status')
      .order('recorded_at', { ascending: false })
      .limit(200);

    if (telErr) throw telErr;

    if (!readings || readings.length === 0) {
      return res.json({
        hourly_trend: [],
        summary: {
          total_usage_liters: 0,
          avg_usage_lpm: 0,
          peak_usage_lpm: 0,
          peak_hour: null,
          estimated_wastage_liters: 0,
          total_readings: 0,
          window_start: null,
          window_end: null,
        },
        comparison: null,
      });
    }

    // Sort ascending by time for processing
    const sorted = [...readings].sort(
      (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
    );

    const windowStart = new Date(sorted[0].recorded_at);
    const windowEnd = new Date(sorted[sorted.length - 1].recorded_at);

    // ── Hourly Bucketing ───────────────────────────────────────
    // Bucket readings into hourly slots based on the actual time range
    const hourlyMap = new Map();

    sorted.forEach((r) => {
      const dt = new Date(r.recorded_at);
      // Bucket key: YYYY-MM-DD HH
      const hourKey = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')} ${String(dt.getUTCHours()).padStart(2, '0')}`;

      if (!hourlyMap.has(hourKey)) {
        hourlyMap.set(hourKey, {
          hour: hourKey,
          label: `${String(dt.getUTCHours()).padStart(2, '0')}:00`,
          total_flow_lpm: 0,
          reading_count: 0,
          max_flow_lpm: 0,
        });
      }

      const bucket = hourlyMap.get(hourKey);
      const flow = Number(r.water_flow_lpm) || 0;
      bucket.total_flow_lpm += flow;
      bucket.reading_count += 1;
      if (flow > bucket.max_flow_lpm) bucket.max_flow_lpm = flow;
    });

    const hourlyTrend = Array.from(hourlyMap.values()).map((b) => ({
      hour: b.hour,
      label: b.label,
      total_flow_lpm: Math.round(b.total_flow_lpm * 100) / 100,
      avg_flow_lpm: Math.round((b.total_flow_lpm / b.reading_count) * 100) / 100,
      max_flow_lpm: b.max_flow_lpm,
      reading_count: b.reading_count,
    }));

    // ── Summary Metrics ────────────────────────────────────────
    // Each reading ≈ 1 minute interval, so sum of water_flow_lpm ≈ total liters
    const totalFlowSum = sorted.reduce(
      (sum, r) => sum + (Number(r.water_flow_lpm) || 0),
      0
    );
    const totalUsageLiters = Math.round(totalFlowSum * 100) / 100;

    const onlineReadings = sorted.filter(
      (r) => (Number(r.water_flow_lpm) || 0) > 0
    );
    const avgUsageLpm =
      onlineReadings.length > 0
        ? Math.round(
            (onlineReadings.reduce(
              (s, r) => s + (Number(r.water_flow_lpm) || 0),
              0
            ) /
              onlineReadings.length) *
              100
          ) / 100
        : 0;

    // Peak: highest single reading
    let peakFlow = 0;
    let peakHour = null;
    sorted.forEach((r) => {
      const flow = Number(r.water_flow_lpm) || 0;
      if (flow > peakFlow) {
        peakFlow = flow;
        const dt = new Date(r.recorded_at);
        peakHour = `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`;
      }
    });

    // Estimated wastage: flow readings with zero flushes AND zero occupancy
    // (phantom flow = likely leak or wastage)
    const wastageReadings = sorted.filter(
      (r) =>
        (Number(r.water_flow_lpm) || 0) > 0 &&
        (r.flush_count || 0) === 0
    );
    const estimatedWastageLiters =
      Math.round(
        wastageReadings.reduce(
          (s, r) => s + (Number(r.water_flow_lpm) || 0),
          0
        ) * 100
      ) / 100;

    // ── Period Comparison ──────────────────────────────────────
    const midIdx = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midIdx);
    const secondHalf = sorted.slice(midIdx);

    const firstHalfLiters = Math.round(
      firstHalf.reduce((s, r) => s + (Number(r.water_flow_lpm) || 0), 0) * 100
    ) / 100;
    const secondHalfLiters = Math.round(
      secondHalf.reduce((s, r) => s + (Number(r.water_flow_lpm) || 0), 0) * 100
    ) / 100;

    let trendDirection = 'stable';
    let changePct = 0;
    if (firstHalfLiters > 0) {
      changePct = Math.round(
        ((secondHalfLiters - firstHalfLiters) / firstHalfLiters) * 100 * 10
      ) / 10;
      if (changePct > 5) trendDirection = 'increasing';
      else if (changePct < -5) trendDirection = 'decreasing';
    }

    res.json({
      hourly_trend: hourlyTrend,
      summary: {
        total_usage_liters: totalUsageLiters,
        avg_usage_lpm: avgUsageLpm,
        peak_usage_lpm: peakFlow,
        peak_hour: peakHour,
        estimated_wastage_liters: estimatedWastageLiters,
        total_readings: sorted.length,
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
      },
      comparison: {
        first_half_liters: firstHalfLiters,
        second_half_liters: secondHalfLiters,
        trend_direction: trendDirection,
        change_pct: changePct,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
