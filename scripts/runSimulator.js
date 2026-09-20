/**
 * PHASE 4B — Live simulator against Supabase
 *
 * Runs the telemetry simulator → ingestion → detection → dispatch pipeline
 * against your real Supabase project.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in .env (see .env.example).
 *
 * DEMO CAP: stops automatically after TELEMETRY_CAP total records have been
 * successfully ingested (default 500, configurable via the env var).
 * This prevents unlimited writes during a demo run. Production would use a
 * long-running daemon without this cap.
 */

const { TelemetrySimulator }  = require('../src/telemetry/simulator');
const { ingestBatch }         = require('../src/ingest/ingestTelemetry');
const { supabaseAdapter }     = require('../src/db/supabaseClient');
const { createDetectionEngine } = require('../src/detection/index');
const { createDispatchEngine }  = require('../src/dispatch/index');

// ── Demo cap ──────────────────────────────────────────────────────────────────
// Stops the simulator once this many telemetry rows have been ingested.
// Override by setting TELEMETRY_CAP=<n> in the environment or .env file.
const TELEMETRY_CAP = parseInt(process.env.TELEMETRY_CAP || '500', 10);
let totalIngested = 0;

// ── Zones ─────────────────────────────────────────────────────────────────────
const ZONES = [
  { terminal: 'T1', zone: 'T1-R01', sensor: 'WF-T1-R01', cleaningThreshold: 120 },
  { terminal: 'T1', zone: 'T1-R02', sensor: 'WF-T1-R02', cleaningThreshold: 100 },
  { terminal: 'T2', zone: 'T2-R03', sensor: 'WF-T2-R03', cleaningThreshold: 120 },
  { terminal: 'T2', zone: 'T2-R04', sensor: 'WF-T2-R04', cleaningThreshold: 100 },
];

const sim = new TelemetrySimulator(ZONES, { intervalMs: 2000 });

// Phase 4B: dispatch engine wraps priority + dispatch rules + ticket creation
const dispatchEngine = createDispatchEngine(supabaseAdapter);
const engine         = createDetectionEngine(supabaseAdapter, dispatchEngine);

async function tickAndIngest() {
  // Hard stop: do nothing if cap already reached (belt-and-suspenders guard)
  if (totalIngested >= TELEMETRY_CAP) return;

  const readings = sim.tick();
  const { results, errors } = await ingestBatch(supabaseAdapter, readings, engine);

  totalIngested += results.length;

  console.log(
    `[${new Date().toISOString()}] ingested ${results.length} readings ` +
    `(total ${totalIngested}/${TELEMETRY_CAP}), errors: ${errors.length}`
  );
  if (errors.length) console.error(errors);

  // ── Demo cap reached ───────────────────────────────────────────────────────
  if (totalIngested >= TELEMETRY_CAP) {
    console.log(
      `\n[simulator] ✓ Demo cap reached: ${totalIngested} telemetry records ingested.` +
      `\n[simulator] Stopping simulator. Run again to start a fresh session.`
    );
    process.exit(0);
  }
}

console.log('Starting telemetry simulator against Supabase...');
console.log('Zones:', ZONES.map((z) => z.zone).join(', '));
console.log(`Phase 4A detection engine : ACTIVE`);
console.log(`Phase 4B dispatch engine  : ACTIVE`);
console.log(`Demo cap                  : ${TELEMETRY_CAP} records (set TELEMETRY_CAP=<n> to change)\n`);

setInterval(tickAndIngest, 2000);

// ---- Scripted demo timeline (deterministic, fixed offsets) ----
// All zones start on NORMAL. Timeline walks through all 6 scenarios.
setTimeout(() => sim.setScenario('T1-R01', 'HIGH_USAGE'),         10_000);
setTimeout(() => sim.setScenario('T2-R03', 'LEAK'),               15_000);
setTimeout(() => sim.setScenario('T1-R02', 'CLEANING_THRESHOLD'), 20_000);
setTimeout(() => sim.setScenario('T2-R04', 'SENSOR_OFFLINE'),     30_000);
setTimeout(() => sim.setScenario('T2-R03', 'RECOVERY'),           45_000);
setTimeout(() => sim.setScenario('T2-R04', 'RECOVERY'),           50_000);
setTimeout(() => sim.setScenario('T1-R01', 'RECOVERY'),           55_000);
setTimeout(() => sim.setScenario('T1-R02', 'RECOVERY'),           60_000);

process.on('SIGINT', () => {
  console.log(`\nStopping simulator. Total ingested: ${totalIngested}`);
  process.exit(0);
});