/**
 * PHASE 4B — Local pipeline test (SANDBOX ONLY, no Supabase/network needed)
 *
 * Tests the complete Phase 3 + 4A + 4B pipeline end-to-end using the local
 * mock adapter: telemetry → ingestion → detection → priority → dispatch →
 * maintenance ticket.
 *
 * Usage: node scripts/testLocal.js
 */

const { TelemetrySimulator }    = require('../src/telemetry/simulator');
const { ingestBatch }           = require('../src/ingest/ingestTelemetry');
const { localMockAdapter, resetLocalMockDb, DB_FILE } = require('../src/db/localMockAdapter');
const { createDetectionEngine } = require('../src/detection/index');
const { createDispatchEngine }  = require('../src/dispatch/index');

const ZONES = [
  { terminal: 'T1', zone: 'T1-R01', sensor: 'WF-T1-R01', cleaningThreshold: 120 },
  { terminal: 'T1', zone: 'T1-R02', sensor: 'WF-T1-R02', cleaningThreshold: 100 },
  { terminal: 'T2', zone: 'T2-R03', sensor: 'WF-T2-R03', cleaningThreshold: 120 },
  { terminal: 'T2', zone: 'T2-R04', sensor: 'WF-T2-R04', cleaningThreshold: 100 },
];

async function main() {
  console.log('=== PHASE 4B LOCAL TEST ===\n');
  resetLocalMockDb();
  console.log(`Mock DB reset. File: ${DB_FILE}\n`);

  const sim            = new TelemetrySimulator(ZONES, { intervalMs: 0 });
  const dispatchEngine = createDispatchEngine(localMockAdapter);
  const engine         = createDetectionEngine(localMockAdapter, dispatchEngine);

  let totalIngested = 0;
  let totalErrors   = 0;

  async function runTicks(label, count) {
    console.log(`--- ${label} (${count} ticks) ---`);
    for (let i = 0; i < count; i++) {
      const readings = sim.tick();
      const { results, errors } = await ingestBatch(localMockAdapter, readings, engine);
      totalIngested += results.length;
      totalErrors   += errors.length;
      if (errors.length) console.error('  ERRORS:', errors);
      await new Promise((r) => setTimeout(r, 20));
    }
    const db = localMockAdapter._debugDump();
    console.log('  sim state:', JSON.stringify(sim.getState().map((z) => ({
      zone: z.zone, scenario: z.scenario, usageSinceClean: z.usageSinceClean,
    }))));
    const openIncidents = db.incidents.filter((i) => i.status === 'OPEN');
    if (openIncidents.length) {
      console.log('  open incidents:', openIncidents.map((i) =>
        `[${i.type}/${i.priority}] ${db.zones.find((z) => z.id === i.zone_id)?.code}`
      ).join(', '));
    }
    const openTickets = db.maintenance_tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
    if (openTickets.length) {
      console.log('  open tickets:', openTickets.map((t) =>
        `[${t.priority}] team=${t.assigned_team}`
      ).join(', '));
    }
    console.log();
  }

  // ── Scenario sequence ──────────────────────────────────────────────────────

  await runTicks('NORMAL (baseline, all zones)', 5);

  sim.setScenario('T1-R01', 'HIGH_USAGE');
  await runTicks('HIGH_USAGE on T1-R01', 5);

  sim.setScenario('T2-R03', 'LEAK');
  await runTicks('LEAK on T2-R03', 6);

  sim.setScenario('T1-R02', 'CLEANING_THRESHOLD');
  await runTicks('CLEANING_THRESHOLD accumulation on T1-R02', 30);

  sim.setScenario('T2-R04', 'SENSOR_OFFLINE');
  await runTicks('SENSOR_OFFLINE on T2-R04', 4);

  sim.setScenario('T2-R03', 'RECOVERY');
  sim.setScenario('T2-R04', 'RECOVERY');
  await runTicks('RECOVERY on T2-R03 and T2-R04', 5);

  // ── Verification ──────────────────────────────────────────────────────────
  console.log('=== VERIFICATION ===');
  const db = localMockAdapter._debugDump();

  const checks = [];

  // ── Phase 3 checks ─────────────────────────────────────────────────────────
  checks.push(['Phase3 | Data generated', db.telemetry.length > 0,
    `${db.telemetry.length} rows`]);
  const scenarioTags = new Set(db.telemetry.map((t) => t.scenario_tag));
  checks.push(['Phase3 | All 6 scenarios represented',
    ['NORMAL','HIGH_USAGE','LEAK','CLEANING_THRESHOLD','SENSOR_OFFLINE','RECOVERY'].every(
      (s) => scenarioTags.has(s)
    ), [...scenarioTags].join(', ')]);
  checks.push(['Phase3 | No ingestion errors', totalErrors === 0,
    `${totalErrors} errors / ${totalIngested} ingested`]);

  // ── Phase 4A checks ────────────────────────────────────────────────────────
  const t2r03Zone = db.zones.find((z) => z.code === 'T2-R03');
  const leakIncidents = db.incidents.filter(
    (i) => i.zone_id === t2r03Zone.id && i.type === 'LEAK'
  );
  checks.push(['Phase4A | LEAK incident created on T2-R03',
    leakIncidents.length >= 1, `${leakIncidents.length} LEAK incident(s)`]);

  const resolvedLeaks = leakIncidents.filter((i) => i.status === 'RESOLVED');
  checks.push(['Phase4A | LEAK incident resolved on RECOVERY',
    resolvedLeaks.length >= 1, `${resolvedLeaks.length} resolved`]);

  const cleaningIncidents = db.incidents.filter((i) => i.type === 'CLEANING_THRESHOLD');
  checks.push(['Phase4A | CLEANING_THRESHOLD incident created',
    cleaningIncidents.length >= 1, `${cleaningIncidents.length} incident(s)`]);

  const t1r01Zone = db.zones.find((z) => z.code === 'T1-R01');
  const t1r01LeakInc = db.incidents.filter(
    (i) => i.zone_id === t1r01Zone.id && i.type === 'LEAK'
  );
  checks.push(['Phase4A | HIGH_USAGE → no LEAK incident on T1-R01',
    t1r01LeakInc.length === 0, `${t1r01LeakInc.length} LEAK incident(s)`]);

  const t2r04Zone = db.zones.find((z) => z.code === 'T2-R04');
  const t2r04LeakInc = db.incidents.filter(
    (i) => i.zone_id === t2r04Zone.id && i.type === 'LEAK'
  );
  checks.push(['Phase4A | SENSOR_OFFLINE → no LEAK incident on T2-R04',
    t2r04LeakInc.length === 0, `${t2r04LeakInc.length} LEAK incident(s)`]);

  // ── Phase 4B checks ────────────────────────────────────────────────────────
  const allTickets = db.maintenance_tickets;

  // LEAK → ticket with plumbing team
  const leakTickets = allTickets.filter((t) => {
    const inc = db.incidents.find((i) => i.id === t.incident_id);
    return inc && inc.type === 'LEAK';
  });
  checks.push(['Phase4B | LEAK → maintenance ticket created',
    leakTickets.length >= 1, `${leakTickets.length} ticket(s)`]);

  checks.push(['Phase4B | LEAK ticket → facilities-plumbing team',
    leakTickets.length > 0 && leakTickets[0].assigned_team === 'facilities-plumbing',
    `team=${leakTickets[0]?.assigned_team}`]);

  checks.push(['Phase4B | LEAK ticket → HIGH or CRITICAL priority',
    leakTickets.length > 0 && ['HIGH', 'CRITICAL'].includes(leakTickets[0].priority),
    `priority=${leakTickets[0]?.priority}`]);

  // CLEANING_THRESHOLD → ticket with cleaning team
  const cleanTickets = allTickets.filter((t) => {
    const inc = db.incidents.find((i) => i.id === t.incident_id);
    return inc && inc.type === 'CLEANING_THRESHOLD';
  });
  checks.push(['Phase4B | CLEANING_THRESHOLD → maintenance ticket created',
    cleanTickets.length >= 1, `${cleanTickets.length} ticket(s)`]);

  checks.push(['Phase4B | Cleaning ticket → cleaning team',
    cleanTickets.length > 0 && cleanTickets[0].assigned_team === 'cleaning',
    `team=${cleanTickets[0]?.assigned_team}`]);

  // Deduplication: at most 1 ticket per incident
  const incidentTicketCounts = {};
  for (const t of allTickets) {
    incidentTicketCounts[t.incident_id] = (incidentTicketCounts[t.incident_id] || 0) + 1;
  }
  const maxPerIncident = Math.max(0, ...Object.values(incidentTicketCounts));
  checks.push(['Phase4B | Ticket deduplication (≤1 per incident)',
    maxPerIncident <= 1, `max tickets per incident: ${maxPerIncident}`]);

  // HIGH_USAGE → no LEAK ticket on T1-R01
  const t1r01LeakTickets = allTickets.filter((t) => {
    const inc = db.incidents.find((i) => i.id === t.incident_id);
    return inc && inc.type === 'LEAK' && inc.zone_id === t1r01Zone.id;
  });
  checks.push(['Phase4B | HIGH_USAGE → no LEAK ticket on T1-R01',
    t1r01LeakTickets.length === 0, `${t1r01LeakTickets.length} LEAK ticket(s) on T1-R01`]);

  // SENSOR_OFFLINE → no LEAK ticket on T2-R04
  const t2r04LeakTickets = allTickets.filter((t) => {
    const inc = db.incidents.find((i) => i.id === t.incident_id);
    return inc && inc.type === 'LEAK' && inc.zone_id === t2r04Zone.id;
  });
  checks.push(['Phase4B | SENSOR_OFFLINE → no LEAK ticket on T2-R04',
    t2r04LeakTickets.length === 0, `${t2r04LeakTickets.length} LEAK ticket(s) on T2-R04`]);

  // Explanation text is present (deterministic, no LLM)
  const hasExplanation = allTickets.every(
    (t) => t.genai_explanation && t.genai_explanation.length > 10
  );
  checks.push(['Phase4B | All tickets have deterministic explanation',
    allTickets.length === 0 || hasExplanation,
    `${allTickets.filter((t) => t.genai_explanation).length}/${allTickets.length} have explanation`]);

  // ── Print results ──────────────────────────────────────────────────────────
  const phase3    = checks.filter(([n]) => n.startsWith('Phase3'));
  const phase4a   = checks.filter(([n]) => n.startsWith('Phase4A'));
  const phase4b   = checks.filter(([n]) => n.startsWith('Phase4B'));

  let allPass = true;
  const printSection = (label, items) => {
    console.log(`\n${label}:`);
    for (const [name, pass, detail] of items) {
      const shortName = name.split(' | ')[1];
      console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${shortName} — ${detail}`);
      if (!pass) allPass = false;
    }
  };

  printSection('Phase 3', phase3);
  printSection('Phase 4A', phase4a);
  printSection('Phase 4B', phase4b);

  // ── Sample records ─────────────────────────────────────────────────────────
  if (leakTickets.length > 0) {
    console.log('\nSample LEAK maintenance ticket:');
    const t = leakTickets[0];
    const inc = db.incidents.find((i) => i.id === t.incident_id);
    console.log(JSON.stringify({
      ticket_id:     t.id,
      incident_type: inc?.type,
      zone:          db.zones.find((z) => z.id === t.zone_id)?.code,
      priority:      t.priority,
      status:        t.status,
      assigned_team: t.assigned_team,
      action:        t.genai_recommendation,
      explanation:   t.genai_explanation,
    }, null, 2));
  }

  if (cleanTickets.length > 0) {
    console.log('\nSample CLEANING_THRESHOLD maintenance ticket:');
    const t = cleanTickets[0];
    const inc = db.incidents.find((i) => i.id === t.incident_id);
    console.log(JSON.stringify({
      ticket_id:     t.id,
      incident_type: inc?.type,
      zone:          db.zones.find((z) => z.id === t.zone_id)?.code,
      priority:      t.priority,
      status:        t.status,
      assigned_team: t.assigned_team,
      action:        t.genai_recommendation,
    }, null, 2));
  }

  console.log(`\nOverall: ${allPass ? 'ALL CHECKS PASSED ✓' : 'SOME CHECKS FAILED ✗'}`);
  console.log(`Total readings ingested: ${totalIngested}, errors: ${totalErrors}`);
  console.log(`Incidents: ${db.incidents.length}  Tickets: ${allTickets.length}`);
  console.log(`Mock DB snapshot written to: ${DB_FILE}`);
}

main().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
