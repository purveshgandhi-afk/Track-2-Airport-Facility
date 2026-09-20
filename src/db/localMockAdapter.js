/**
 * PHASE 3 — Local mock adapter (TEST/DEV ONLY)
 *
 * This is NOT part of the production architecture. Phase 2 locked
 * Supabase/PostgreSQL as the database. This adapter exists solely so
 * the telemetry pipeline's LOGIC (ingestion, sensor status updates,
 * usage accumulation) can be exercised and verified in an environment
 * without network access to a real Supabase project (as is the case
 * in this sandbox).
 *
 * It implements the exact same adapter interface as
 * src/db/supabaseClient.js's `supabaseAdapter`, backed by an
 * in-memory store that is periodically dumped to a JSON file
 * (data/local-mock-db.json) so results can be inspected after a run.
 *
 * To run against real Supabase instead, swap the adapter import in
 * scripts/runSimulator.js from `localMockAdapter` to `supabaseAdapter`
 * and provide SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, '..', '..', 'data', 'local-mock-db.json');

function uuid() {
  return crypto.randomUUID();
}

function loadSeed() {
  // Mirrors sql/seed.sql so local testing has the same zones/sensors.
  const facilityId = uuid();
  const t1 = uuid();
  const t2 = uuid();

  const zones = [
    {
      id: uuid(),
      terminal_id: t1,
      terminal_code: 'T1',
      code: 'T1-R01',
      name: 'Terminal 1 Restroom 1 (near Gate A)',
      traffic_tier: 'high',
      cleaning_threshold_uses: 120,
      usage_count_since_clean: 0,
      last_cleaned_at: new Date().toISOString(),
    },
    {
      id: uuid(),
      terminal_id: t1,
      terminal_code: 'T1',
      code: 'T1-R02',
      name: 'Terminal 1 Restroom 2 (Food Court)',
      traffic_tier: 'medium',
      cleaning_threshold_uses: 100,
      usage_count_since_clean: 0,
      last_cleaned_at: new Date().toISOString(),
    },
    {
      id: uuid(),
      terminal_id: t2,
      terminal_code: 'T2',
      code: 'T2-R03',
      name: 'Terminal 2 Restroom 3 (near Gate C22)',
      traffic_tier: 'high',
      cleaning_threshold_uses: 120,
      usage_count_since_clean: 0,
      last_cleaned_at: new Date().toISOString(),
    },
    {
      id: uuid(),
      terminal_id: t2,
      terminal_code: 'T2',
      code: 'T2-R04',
      name: 'Terminal 2 Restroom 4 (Arrivals)',
      traffic_tier: 'medium',
      cleaning_threshold_uses: 100,
      usage_count_since_clean: 0,
      last_cleaned_at: new Date().toISOString(),
    },
  ];

  const sensors = zones.map((z) => ({
    id: uuid(),
    zone_id: z.id,
    code: `WF-${z.code}`,
    sensor_type: 'combo',
    status: 'ONLINE',
    last_seen_at: new Date().toISOString(),
  }));

  return {
    facilities: [{ id: facilityId, name: 'Demo International Airport', city: 'Demo City' }],
    terminals: [
      { id: t1, facility_id: facilityId, code: 'T1', name: 'Terminal 1 - Domestic' },
      { id: t2, facility_id: facilityId, code: 'T2', name: 'Terminal 2 - International' },
    ],
    zones,
    sensors,
    telemetry: [],
    incidents: [],
    maintenance_tickets: [],
  };
}

let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) : loadSeed();

function persist() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  // Keep only the most recent 500 telemetry rows in the persisted file
  // to keep it small and readable for inspection.
  const trimmed = { ...db, telemetry: db.telemetry.slice(-500) };
  fs.writeFileSync(DB_FILE, JSON.stringify(trimmed, null, 2));
}

function resetLocalMockDb() {
  db = loadSeed();
  persist();
  return db;
}

const localMockAdapter = {
  name: 'local-mock (TEST ONLY — not the real Supabase DB)',

  async getZoneByCode(zoneCode) {
    const zone = db.zones.find((z) => z.code === zoneCode);
    if (!zone) throw new Error(`Zone not found: ${zoneCode}`);
    return zone;
  },

  async getSensorByCode(sensorCode) {
    const sensor = db.sensors.find((s) => s.code === sensorCode);
    if (!sensor) throw new Error(`Sensor not found: ${sensorCode}`);
    return sensor;
  },

  async insertTelemetry(row) {
    const record = { id: db.telemetry.length + 1, ...row };
    db.telemetry.push(record);
    persist();
    return record;
  },

  async updateSensorStatus(sensorId, status, lastSeenAt) {
    const sensor = db.sensors.find((s) => s.id === sensorId);
    if (sensor) {
      sensor.status = status;
      sensor.last_seen_at = lastSeenAt;
    }
    persist();
  },

  async updateZoneUsage(zoneId, usageDelta) {
    const zone = db.zones.find((z) => z.id === zoneId);
    if (zone) {
      zone.usage_count_since_clean += usageDelta;
    }
    persist();
  },

  // ── Phase 4A: Incident methods ─────────────────────────────────────────────

  async insertIncident(row) {
    const record = {
      id: uuid(),
      zone_id: row.zone_id,
      sensor_id: row.sensor_id || null,
      type: row.type,
      status: row.status || 'OPEN',
      priority: row.priority || 'LOW',
      detected_at: row.detected_at || new Date().toISOString(),
      resolved_at: null,
      details: row.details || {},
    };
    db.incidents.push(record);
    persist();
    return record;
  },

  async getOpenIncidentByZoneAndType(zoneId, type) {
    return (
      db.incidents.find(
        (i) => i.zone_id === zoneId && i.type === type && i.status === 'OPEN'
      ) || null
    );
  },

  async resolveIncident(incidentId) {
    const incident = db.incidents.find((i) => i.id === incidentId);
    if (incident) {
      incident.status = 'RESOLVED';
      incident.resolved_at = new Date().toISOString();
    }
    persist();
  },

  // ── Phase 4B: Dispatch / ticket methods ───────────────────────────────────

  async updateIncidentPriority(incidentId, priority) {
    const incident = db.incidents.find((i) => i.id === incidentId);
    if (incident) incident.priority = priority;
    persist();
  },

  async insertMaintenanceTicket(row) {
    const record = {
      id: uuid(),
      incident_id:          row.incident_id,
      zone_id:              row.zone_id,
      priority:             row.priority || 'LOW',
      status:               row.status || 'OPEN',
      assigned_team:        row.assigned_team || 'maintenance',
      genai_explanation:    row.genai_explanation || null,
      genai_recommendation: row.genai_recommendation || null,
      created_at:           new Date().toISOString(),
      resolved_at:          null,
    };
    db.maintenance_tickets.push(record);
    persist();
    return record;
  },

  async getOpenTicketByIncidentId(incidentId) {
    return (
      db.maintenance_tickets.find(
        (t) => t.incident_id === incidentId &&
               (t.status === 'OPEN' || t.status === 'IN_PROGRESS')
      ) || null
    );
  },

  // Test-only helpers (not part of the adapter interface):
  _debugDump() {
    return db;
  },
};

module.exports = { localMockAdapter, resetLocalMockDb, DB_FILE };
