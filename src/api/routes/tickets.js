/**
 * GET /api/tickets
 *
 * Returns maintenance tickets dispatched by the predictive dispatch engine.
 * Supports query parameters:
 * - status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
 * - priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 * - assigned_team: e.g. 'facilities-plumbing', 'cleaning', 'maintenance'
 * - zone_code: e.g. "T2-R03"
 * - zone_id: zone UUID
 * - limit: default 50, max 200
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
    const { status, priority, assigned_team, zone_code, zone_id } = req.query;

    let targetZoneId = zone_id;
    if (!targetZoneId && zone_code) {
      const { data: zone } = await supabase
        .from('zones')
        .select('id')
        .eq('code', zone_code)
        .single();
      if (zone) targetZoneId = zone.id;
    }

    let query = supabase
      .from('maintenance_tickets')
      .select(`
        id,
        priority,
        status,
        assigned_team,
        genai_recommendation,
        genai_explanation,
        created_at,
        resolved_at,
        zone:zones(id, code, name, traffic_tier),
        incident:incidents(id, type, status, priority, detected_at, details)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status.toUpperCase());
    if (priority) query = query.eq('priority', priority.toUpperCase());
    if (assigned_team) query = query.eq('assigned_team', assigned_team.toLowerCase());
    if (targetZoneId) query = query.eq('zone_id', targetZoneId);

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map(t => ({
      ticket_id: t.id,
      incident: t.incident ? {
        id: t.incident.id,
        type: t.incident.type,
        status: t.incident.status,
        priority: t.incident.priority,
        detected_time: t.incident.detected_at,
        details: t.incident.details || {},
      } : null,
      zone: t.zone ? {
        id: t.zone.id,
        code: t.zone.code,
        name: t.zone.name,
        traffic_tier: t.zone.traffic_tier,
      } : null,
      priority: t.priority,
      assigned_team: t.assigned_team,
      recommended_action: t.genai_recommendation,
      explanation: t.genai_explanation,
      status: t.status,
      created_time: t.created_at,
      resolved_time: t.resolved_at || null,
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
