/**
 * GET /api/sensors
 *
 * Returns diagnostic sensor health and operational statuses.
 * Provides:
 * - sensor (id, code, type)
 * - zone (id, code, name)
 * - status ('ONLINE', 'OFFLINE', 'FAULT')
 * - last_seen_at
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../db/supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase client not configured' });
    }

    const { status, zone_code } = req.query;

    let query = supabase
      .from('sensors')
      .select(`
        id,
        code,
        sensor_type,
        status,
        last_seen_at,
        created_at,
        zone:zones(id, code, name, traffic_tier)
      `)
      .order('code', { ascending: true });

    if (status) query = query.eq('status', status.toUpperCase());

    const { data, error } = await query;
    if (error) throw error;

    let filtered = data || [];
    if (zone_code) {
      filtered = filtered.filter(s => s.zone && s.zone.code === zone_code);
    }

    const formatted = filtered.map(s => ({
      sensor: {
        id: s.id,
        code: s.code,
        type: s.sensor_type,
      },
      zone: s.zone ? {
        id: s.zone.id,
        code: s.zone.code,
        name: s.zone.name,
        traffic_tier: s.zone.traffic_tier,
      } : null,
      status: s.status,
      last_seen_at: s.last_seen_at,
    }));

    const onlineCount = formatted.filter(s => s.status === 'ONLINE').length;
    const offlineCount = formatted.filter(s => s.status !== 'ONLINE').length;

    res.json({
      summary: {
        total: formatted.length,
        online: onlineCount,
        offline: offlineCount,
      },
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
