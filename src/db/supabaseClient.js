/**
 * PHASE 3 — Supabase client
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from environment variables
 * (see .env.example). This is the adapter you use when running against
 * a real Supabase project.
 *
 * NOTE: requires the `@supabase/supabase-js` package to be installed
 * (`npm install`) and network access to your Supabase project.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    '[supabaseClient] SUPABASE_URL / SUPABASE_SERVICE_KEY not set. ' +
      'Set them in a .env file (see .env.example) before running against real Supabase.'
  );
}

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

/**
 * Adapter interface used by src/ingest/ingestTelemetry.js.
 * Implementing this same shape with a different backend (see
 * localMockAdapter.js) lets the ingestion logic be tested without
 * a live database.
 */
const supabaseAdapter = {
  name: 'supabase',

  async getZoneByCode(zoneCode) {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('code', zoneCode)
      .single();
    if (error) throw error;
    return data;
  },

  async getSensorByCode(sensorCode) {
    const { data, error } = await supabase
      .from('sensors')
      .select('*')
      .eq('code', sensorCode)
      .single();
    if (error) throw error;
    return data;
  },

  async insertTelemetry(row) {
    const { data, error } = await supabase.from('telemetry').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async updateSensorStatus(sensorId, status, lastSeenAt) {
    const { error } = await supabase
      .from('sensors')
      .update({ status, last_seen_at: lastSeenAt })
      .eq('id', sensorId);
    if (error) throw error;
  },

  async updateZoneUsage(zoneId, usageDelta) {
    // Simple increment via RPC-less read-then-write (fine for prototype volume).
    const { data: zone, error: readErr } = await supabase
      .from('zones')
      .select('usage_count_since_clean')
      .eq('id', zoneId)
      .single();
    if (readErr) throw readErr;

    const { error: writeErr } = await supabase
      .from('zones')
      .update({ usage_count_since_clean: zone.usage_count_since_clean + usageDelta })
      .eq('id', zoneId);
    if (writeErr) throw writeErr;
  },

  // ── Phase 4A: Incident methods ─────────────────────────────────────────────

  async insertIncident(row) {
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        zone_id: row.zone_id,
        sensor_id: row.sensor_id || null,
        type: row.type,
        status: row.status || 'OPEN',
        priority: row.priority || 'LOW',
        detected_at: row.detected_at || new Date().toISOString(),
        details: row.details || {},
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getOpenIncidentByZoneAndType(zoneId, type) {
    // Use limit(1) + array access instead of maybeSingle() so we never get a
    // PostgREST error when multiple open incidents already exist for this zone.
    // Returns the most-recently detected open incident, or null if none.
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('type', type)
      .eq('status', 'OPEN')
      .order('detected_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data.length > 0 ? data[0] : null;
  },

  async resolveIncident(incidentId) {
    const { error } = await supabase
      .from('incidents')
      .update({ status: 'RESOLVED', resolved_at: new Date().toISOString() })
      .eq('id', incidentId);
    if (error) throw error;
  },

  // ── Phase 4B: Dispatch / ticket methods ───────────────────────────────────

  async updateIncidentPriority(incidentId, priority) {
    const { error } = await supabase
      .from('incidents')
      .update({ priority })
      .eq('id', incidentId);
    if (error) throw error;
  },

  async insertMaintenanceTicket(row) {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .insert({
        incident_id:          row.incident_id,
        zone_id:              row.zone_id,
        priority:             row.priority || 'LOW',
        status:               row.status || 'OPEN',
        assigned_team:        row.assigned_team || 'maintenance',
        genai_explanation:    row.genai_explanation || null,
        genai_recommendation: row.genai_recommendation || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getOpenTicketByIncidentId(incidentId) {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .select('*')
      .eq('incident_id', incidentId)
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data.length > 0 ? data[0] : null;
  },
};

module.exports = { supabase, supabaseAdapter };
