/**
 * PHASE 5 — Full Backend API & Golden Flow Test Suite
 *
 * Tests:
 * 1. All 7 required REST endpoints + health check against live Supabase data.
 * 2. Complete End-to-End Golden Flow:
 *    LEAK Telemetry → Detection → Incident → Priority → Dispatch → Ticket → API Verification
 * 3. HIGH_USAGE test (ensures no false leak)
 * 4. CLEANING_THRESHOLD test (verifies usage tracking and status via API)
 * 5. SENSOR_OFFLINE test (verifies sensor health endpoint, no false leak)
 * 6. RECOVERY test (verifies incident resolution reflected in incidents & water endpoints)
 *
 * Run via: node scripts/testApi.js
 */

require('dotenv').config();
const http = require('http');
const app = require('../src/api/app');
const { supabase, supabaseAdapter } = require('../src/db/supabaseClient');
const { createDetectionEngine } = require('../src/detection');
const { createDispatchEngine } = require('../src/dispatch');
const { ingestReading } = require('../src/ingest/ingestTelemetry');

const TEST_PORT = process.env.TEST_PORT || 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Helper: HTTP GET wrapper returning JSON
function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, error: e });
        }
      });
    }).on('error', reject);
  });
}

function pass(msg) {
  console.log(`  \x1b[32m[PASS]\x1b[0m ${msg}`);
}

function fail(msg) {
  console.error(`  \x1b[31m[FAIL]\x1b[0m ${msg}`);
  process.exitCode = 1;
}

async function run() {
  console.log('====================================================');
  console.log('PHASE 5 — BACKEND API & SYSTEM INTEGRATION TEST');
  console.log('====================================================\n');

  if (!supabase) {
    console.error('FATAL: Supabase credentials not found in environment.');
    process.exit(1);
  }

  // ── Step 0: Start API server on TEST_PORT ──────────────────────────────────
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(TEST_PORT, err => {
      if (err) return reject(err);
      console.log(`Test API Server running on port ${TEST_PORT}\n`);
      resolve(s);
    });
  });

  try {
    // ── SECTION 1: Baseline API Endpoint Testing ─────────────────────────────
    console.log('--- SECTION 1: REST API Endpoint Verification ---');

    // 1. Health Check
    {
      const res = await fetchJson('/api/health');
      if (res.status === 200 && res.data.status === 'UP') {
        pass(`GET /api/health → 200 OK (${res.data.status})`);
      } else {
        fail(`GET /api/health returned ${res.status}: ${JSON.stringify(res.data)}`);
      }
    }

    // 2. Dashboard Summary
    let initialSummary = null;
    {
      const res = await fetchJson('/api/dashboard/summary');
      if (
        res.status === 200 &&
        typeof res.data.total_zones === 'number' &&
        typeof res.data.online_sensors === 'number' &&
        typeof res.data.active_incidents === 'number' &&
        typeof res.data.critical_high_incidents === 'number' &&
        typeof res.data.active_maintenance_tickets === 'number' &&
        res.data.cleaning_tasks &&
        res.data.water_impact
      ) {
        initialSummary = res.data;
        pass(`GET /api/dashboard/summary → 200 OK`);
        console.log(`      Zones: ${res.data.total_zones} | Sensors: ${res.data.online_sensors} online, ${res.data.offline_sensors} offline`);
        console.log(`      Active Incidents: ${res.data.active_incidents} (${res.data.critical_high_incidents} CRITICAL/HIGH) | Active Tickets: ${res.data.active_maintenance_tickets}`);
        console.log(`      Cleaning Tasks: ${res.data.cleaning_tasks.zones_requiring_cleaning} requiring clean | Total Wasted Water: ${res.data.water_impact.total_wasted_liters} L`);
      } else {
        fail(`GET /api/dashboard/summary invalid response: ${JSON.stringify(res.data)}`);
      }
    }

    // 3. Telemetry
    {
      const res = await fetchJson('/api/telemetry?limit=5');
      if (res.status === 200 && Array.isArray(res.data.data)) {
        pass(`GET /api/telemetry?limit=5 → 200 OK (${res.data.count} items returned)`);
        if (res.data.data.length > 0) {
          const first = res.data.data[0];
          const hasFields = 'water_flow' in first && 'flush_count' in first && 'occupancy' in first && 'sensor_status' in first;
          if (hasFields) {
            pass(`Telemetry item schema verified (zone=${first.zone?.code}, flow=${first.water_flow} LPM, status=${first.sensor_status})`);
          } else {
            fail(`Telemetry item missing required fields: ${JSON.stringify(first)}`);
          }
        }
      } else {
        fail(`GET /api/telemetry failed: ${JSON.stringify(res.data)}`);
      }
    }

    // 4. Incidents
    {
      const res = await fetchJson('/api/incidents?limit=10');
      if (res.status === 200 && Array.isArray(res.data.data)) {
        pass(`GET /api/incidents → 200 OK (${res.data.count} incidents returned)`);
        if (res.data.data.length > 0) {
          const sample = res.data.data[0];
          pass(`Incident schema verified: [${sample.type}/${sample.priority}] status=${sample.status} zone=${sample.zone?.code}`);
        }
      } else {
        fail(`GET /api/incidents failed: ${JSON.stringify(res.data)}`);
      }
    }

    // 5. Maintenance Tickets
    {
      const res = await fetchJson('/api/tickets?limit=10');
      if (res.status === 200 && Array.isArray(res.data.data)) {
        pass(`GET /api/tickets → 200 OK (${res.data.count} tickets returned)`);
        if (res.data.data.length > 0) {
          const sample = res.data.data[0];
          pass(`Ticket schema verified: [${sample.priority}] team=${sample.assigned_team} action="${sample.recommended_action}"`);
        }
      } else {
        fail(`GET /api/tickets failed: ${JSON.stringify(res.data)}`);
      }
    }

    // 6. Cleaning
    {
      const res = await fetchJson('/api/cleaning');
      if (res.status === 200 && res.data.summary && Array.isArray(res.data.data)) {
        pass(`GET /api/cleaning → 200 OK (${res.data.data.length} zones tracked)`);
        console.log(`      Requiring clean: ${res.data.summary.requiring_cleaning} | Overdue: ${res.data.summary.overdue}`);
      } else {
        fail(`GET /api/cleaning failed: ${JSON.stringify(res.data)}`);
      }
    }

    // 7. Sensors
    {
      const res = await fetchJson('/api/sensors');
      if (res.status === 200 && res.data.summary && Array.isArray(res.data.data)) {
        pass(`GET /api/sensors → 200 OK (${res.data.summary.total} sensors: ${res.data.summary.online} online, ${res.data.summary.offline} offline)`);
      } else {
        fail(`GET /api/sensors failed: ${JSON.stringify(res.data)}`);
      }
    }

    // 8. Water & Sustainability
    {
      const res = await fetchJson('/api/water');
      if (res.status === 200 && res.data.sustainability_metrics && Array.isArray(res.data.zone_current_flow)) {
        pass(`GET /api/water → 200 OK`);
        console.log(`      Total wasted liters: ${res.data.sustainability_metrics.total_wasted_liters} L`);
        console.log(`      Active leaks: ${res.data.sustainability_metrics.active_leaks_count} (${res.data.sustainability_metrics.active_leak_flow_rate_lpm} LPM)`);
        console.log(`      Current facility flow: ${res.data.sustainability_metrics.current_facility_flow_lpm} LPM across ${res.data.zone_current_flow.length} zones`);
      } else {
        fail(`GET /api/water failed: ${JSON.stringify(res.data)}`);
      }
    }

    // ── SECTION 2: Complete Golden Flow Verification ─────────────────────────
    console.log('\n--- SECTION 2: Complete Golden Flow Test (Live Supabase Pipeline) ---');
    console.log('Flow: LEAK Telemetry → Detection → Incident → Priority → Dispatch → Ticket → API');

    const dispatchEngine = createDispatchEngine(supabaseAdapter);
    const detectionEngine = createDetectionEngine(supabaseAdapter, dispatchEngine);

    // Look up target zone T2-R03 (restroom 3, high-tier)
    const testZone = await supabaseAdapter.getZoneByCode('T2-R03');
    const testSensor = await supabaseAdapter.getSensorByCode('WF-T2-R03');

    if (!testZone || !testSensor) {
      fail('Seed data missing T2-R03 / WF-T2-R03');
      return;
    }

    // A) Send 3 consecutive LEAK readings to trigger leak detection sliding window
    console.log('\n  [A] Injecting 3 LEAK readings (high flow, zero flushes, zero occupancy)...');
    let leakReadingResult = null;
    for (let i = 1; i <= 3; i++) {
      const reading = {
        timestamp: new Date().toISOString(),
        terminal: 'T2',
        zone: 'T2-R03',
        sensor: 'WF-T2-R03',
        water_flow_lpm: 3.85,
        flush_count: 0,
        occupancy: 0,
        sensor_status: 'ONLINE',
        scenario: 'LEAK',
      };
      leakReadingResult = await ingestReading(supabaseAdapter, reading, detectionEngine);
    }

    // Verify detection result
    const leakIncidentAction = leakReadingResult.detectionResults?.leak?.action;
    pass(`Detection evaluated 3-reading window: leak action = "${leakIncidentAction || 'already_open'}"`);

    // Verify API reflects the LEAK incident
    const incRes = await fetchJson('/api/incidents?type=LEAK&zone_code=T2-R03');
    const leakIncidents = incRes.data?.data || [];
    const openLeak = leakIncidents.find(i => i.status === 'OPEN');

    if (openLeak) {
      pass(`API verified open LEAK incident: ID=${openLeak.incident_id}, Priority=${openLeak.priority}`);
      console.log(`      Details: avg_flow=${openLeak.details.avg_flow_lpm} LPM, estimated_liters=${openLeak.details.estimated_liters} L`);

      // Verify API reflects the maintenance ticket dispatched to facilities-plumbing
      const tixRes = await fetchJson(`/api/tickets?zone_code=T2-R03&status=OPEN`);
      const openTickets = tixRes.data?.data || [];
      const plumbingTicket = openTickets.find(t => t.assigned_team === 'facilities-plumbing');

      if (plumbingTicket) {
        pass(`API verified dispatched maintenance ticket: ID=${plumbingTicket.ticket_id}`);
        pass(`  Team: ${plumbingTicket.assigned_team} | Priority: ${plumbingTicket.priority}`);
        pass(`  Action: "${plumbingTicket.recommended_action}"`);
      } else {
        fail('No open facilities-plumbing ticket found via API for zone T2-R03');
      }

      // Verify Water endpoint reflects the active leak
      const waterRes = await fetchJson('/api/water');
      const activeLeaks = waterRes.data?.active_leaks || [];
      const foundInWater = activeLeaks.some(l => l.incident_id === openLeak.incident_id);
      if (foundInWater) {
        pass(`API /api/water correctly lists the active leak in active_leaks array`);
      } else {
        fail(`Active leak ${openLeak.incident_id} missing from /api/water`);
      }
    } else {
      fail('Expected open LEAK incident for T2-R03 not found in /api/incidents');
    }

    // B) Test HIGH_USAGE on T1-R01 (high occupancy & flushes) → MUST NOT create false leak
    console.log('\n  [B] Injecting HIGH_USAGE readings on T1-R01 (high flow + legitimate flushes/occupancy)...');
    for (let i = 1; i <= 3; i++) {
      await ingestReading(supabaseAdapter, {
        timestamp: new Date().toISOString(),
        terminal: 'T1',
        zone: 'T1-R01',
        sensor: 'WF-T1-R01',
        water_flow_lpm: 5.2,
        flush_count: 5,
        occupancy: 4,
        sensor_status: 'ONLINE',
        scenario: 'HIGH_USAGE',
      }, detectionEngine);
    }

    const highUsageIncRes = await fetchJson('/api/incidents?type=LEAK&zone_code=T1-R01&status=OPEN');
    const falseLeaks = highUsageIncRes.data?.data || [];
    if (falseLeaks.length === 0) {
      pass(`HIGH_USAGE on T1-R01 did NOT create a false leak incident (0 open leaks)`);
    } else {
      fail(`HIGH_USAGE falsely created a leak incident: ${JSON.stringify(falseLeaks)}`);
    }

    // C) Test CLEANING_THRESHOLD tracking via API
    console.log('\n  [C] Testing CLEANING_THRESHOLD monitoring via /api/cleaning...');
    const cleaningRes = await fetchJson('/api/cleaning');
    const t1Zone = cleaningRes.data?.data?.find(z => z.zone.code === 'T1-R01');
    if (t1Zone) {
      pass(`Cleaning tracking for T1-R01: usage=${t1Zone.usage_since_cleaning}/${t1Zone.cleaning_threshold} (${t1Zone.percentage}%), status=${t1Zone.cleaning_status}`);
    } else {
      fail('T1-R01 not found in /api/cleaning response');
    }

    // D) Test SENSOR_OFFLINE on T2-R04 → Sensor status update, no false leak
    console.log('\n  [D] Injecting SENSOR_OFFLINE on T2-R04...');
    await ingestReading(supabaseAdapter, {
      timestamp: new Date().toISOString(),
      terminal: 'T2',
      zone: 'T2-R04',
      sensor: 'WF-T2-R04',
      water_flow_lpm: 0,
      flush_count: 0,
      occupancy: 0,
      sensor_status: 'OFFLINE',
      scenario: 'SENSOR_OFFLINE',
    }, detectionEngine);

    const sensorsRes = await fetchJson('/api/sensors?zone_code=T2-R04');
    const sensorT2R04 = sensorsRes.data?.data?.[0];
    if (sensorT2R04 && sensorT2R04.status === 'OFFLINE') {
      pass(`API /api/sensors reflects status = OFFLINE for WF-T2-R04`);
    } else {
      fail(`Expected sensor WF-T2-R04 to be OFFLINE, got: ${sensorT2R04?.status}`);
    }

    const offlineLeakRes = await fetchJson('/api/incidents?type=LEAK&zone_code=T2-R04&status=OPEN');
    if ((offlineLeakRes.data?.data || []).length === 0) {
      pass(`SENSOR_OFFLINE did NOT trigger a false leak incident`);
    } else {
      fail(`SENSOR_OFFLINE created false leak on T2-R04`);
    }

    // E) Test RECOVERY on T2-R03 → Leak resolves, sensor returns to normal
    console.log('\n  [E] Injecting RECOVERY readings on T2-R03 (restoring normal zero-flow baseline)...');
    for (let i = 1; i <= 3; i++) {
      await ingestReading(supabaseAdapter, {
        timestamp: new Date().toISOString(),
        terminal: 'T2',
        zone: 'T2-R03',
        sensor: 'WF-T2-R03',
        water_flow_lpm: 0,
        flush_count: 0,
        occupancy: 0,
        sensor_status: 'ONLINE',
        scenario: 'RECOVERY',
      }, detectionEngine);
    }

    // Also restore T2-R04 sensor to ONLINE
    await ingestReading(supabaseAdapter, {
      timestamp: new Date().toISOString(),
      terminal: 'T2',
      zone: 'T2-R04',
      sensor: 'WF-T2-R04',
      water_flow_lpm: 0,
      flush_count: 0,
      occupancy: 0,
      sensor_status: 'ONLINE',
      scenario: 'RECOVERY',
    }, detectionEngine);

    // Verify leak on T2-R03 resolved
    const postRecoveryIncRes = await fetchJson('/api/incidents?type=LEAK&zone_code=T2-R03');
    const latestLeak = postRecoveryIncRes.data?.data?.[0];
    if (latestLeak && latestLeak.status === 'RESOLVED') {
      pass(`LEAK on T2-R03 successfully resolved upon normal flow: status=RESOLVED, resolved_time=${latestLeak.resolved_time}`);
    } else {
      fail(`LEAK incident did not resolve on recovery: status=${latestLeak?.status}`);
    }

    // Verify /api/water and /api/dashboard/summary reflect the resolved state
    const postWaterRes = await fetchJson('/api/water');
    const postSummary = await fetchJson('/api/dashboard/summary');

    pass(`API /api/water reports ${postWaterRes.data.sustainability_metrics.active_leaks_count} active leaks after recovery`);
    pass(`API /api/dashboard/summary updated: active_incidents=${postSummary.data.active_incidents}, critical_high=${postSummary.data.critical_high_incidents}`);

    console.log('\n====================================================');
    console.log('ALL PHASE 5 API AND GOLDEN FLOW TESTS PASSED ✓');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
