/**
 * GET /api/cleaning
 *
 * Returns zone cleaning status and usage threshold tracking.
 * Provides hygiene management metrics:
 * - zone
 * - usage since cleaning
 * - cleaning threshold
 * - cleaning status ('CLEANING_REQUIRED', 'OVERDUE', 'APPROACHING_THRESHOLD', 'NORMAL')
 * - percentage of threshold reached
 * - active cleaning incident reference if any
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../db/supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase client not configured' });
    }

    const [zonesRes, incidentsRes] = await Promise.all([
      supabase
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
        .order('code', { ascending: true }),
      supabase
        .from('incidents')
        .select('id, zone_id, priority, detected_at, details')
        .eq('type', 'CLEANING_THRESHOLD')
        .eq('status', 'OPEN'),
    ]);

    if (zonesRes.error) throw zonesRes.error;
    if (incidentsRes.error) throw incidentsRes.error;

    const zones = zonesRes.data || [];
    const openIncidents = incidentsRes.data || [];

    const formatted = zones.map(zone => {
      const usage = zone.usage_count_since_clean || 0;
      const threshold = zone.cleaning_threshold_uses || 100;
      const pct = Math.round((usage / threshold) * 100);

      let cleaningStatus = 'NORMAL';
      if (usage >= threshold * 2) {
        cleaningStatus = 'OVERDUE';
      } else if (usage >= threshold) {
        cleaningStatus = 'CLEANING_REQUIRED';
      } else if (usage >= threshold * 0.8) {
        cleaningStatus = 'APPROACHING_THRESHOLD';
      }

      const activeIncident = openIncidents.find(inc => inc.zone_id === zone.id);

      return {
        zone: {
          id: zone.id,
          code: zone.code,
          name: zone.name,
          terminal: zone.terminal ? zone.terminal.code : null,
          traffic_tier: zone.traffic_tier,
        },
        usage_since_cleaning: usage,
        cleaning_threshold: threshold,
        percentage: pct,
        cleaning_status: cleaningStatus,
        needs_cleaning: usage >= threshold,
        last_cleaned_at: zone.last_cleaned_at,
        active_incident: activeIncident ? {
          incident_id: activeIncident.id,
          priority: activeIncident.priority,
          detected_at: activeIncident.detected_at,
        } : null,
      };
    });

    const summary = {
      total_zones: zones.length,
      requiring_cleaning: formatted.filter(z => z.needs_cleaning).length,
      overdue: formatted.filter(z => z.cleaning_status === 'OVERDUE').length,
    };

    res.json({
      summary,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
