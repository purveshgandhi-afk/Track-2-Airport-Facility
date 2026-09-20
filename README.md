# Phase 3 — Data Layer & Simulated IoT Telemetry

Airport Smart Facility & Sustainability Command Center — Phase 3 deliverable.

This phase builds **only**: Supabase schema, telemetry model, telemetry
simulator, and ingestion. No dashboard, no AI, no dispatch logic yet
(those are Phases 4–6).

## 1. Tables Created (9)

| Table | Purpose |
|---|---|
| `facilities` | The airport itself |
| `terminals` | Terminals within the airport |
| `zones` | Restrooms/zones — carries cleaning threshold + usage accumulator |
| `sensors` | One combo sensor per zone (flow+occupancy+flush+status) |
| `telemetry` | Raw high-frequency readings (the core data stream) |
| `incidents` | Detected leak/threshold/fault events — populated starting Phase 4 |
| `maintenance_tickets` | Maintenance-team queue — populated starting Phase 4/5 |
| `cleaning_tasks` | Cleaning-team queue — populated starting Phase 4/5 |
| `cleaning_verifications` | QR checklist completion record — used starting Phase 5 |

Full definitions: `sql/schema.sql`. Demo seed data: `sql/seed.sql`.

## 2. Important Fields

- `zones.usage_count_since_clean` / `zones.cleaning_threshold_uses` — drives the
  usage-traffic-based cleaning threshold (no dedicated hygiene sensor, per design).
- `sensors.status` / `sensors.last_seen_at` — basic sensor health (ONLINE/OFFLINE/FAULT).
- `telemetry.scenario_tag` — records which simulated scenario produced each row,
  purely for demo traceability (not a real-world field).

## 3. Files Created

```
sql/schema.sql                    Supabase/PostgreSQL table definitions
sql/seed.sql                      Demo seed data (1 airport, 2 terminals, 4 zones, 4 sensors)
src/telemetry/telemetryModel.js   Reading shape + validation
src/telemetry/scenarios.js        NORMAL/HIGH_USAGE/LEAK/CLEANING_THRESHOLD/SENSOR_OFFLINE/RECOVERY generators
src/telemetry/simulator.js        TelemetrySimulator engine (per-zone scenario state, tick/start/stop)
src/db/supabaseClient.js          Real Supabase adapter (production path)
src/db/localMockAdapter.js        Local JSON-file mock adapter (sandbox-testing only, see note below)
src/ingest/ingestTelemetry.js     Adapter-agnostic ingestion logic
scripts/runSimulator.js           Run simulator against real Supabase
scripts/testLocal.js              Run simulator against the local mock adapter
.env.example                      Supabase credential template
package.json                      Dependencies (@supabase/supabase-js, dotenv)
```

## 4. How to Configure Supabase

1. Create a Supabase project at supabase.com.
2. In the Supabase SQL Editor, run `sql/schema.sql`, then `sql/seed.sql`.
3. Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and
   `SUPABASE_SERVICE_KEY` (Settings → API in your Supabase project).
4. `npm install` (requires network access — not available in this
   build sandbox, so this step happens on your machine).

## 5. How to Run the Telemetry Simulator

**Against real Supabase** (on your machine, after steps above):
```
npm run simulate
```
This starts a 2-second tick loop across all 4 seeded zones, ingesting
into your Supabase `telemetry` table continuously.

**Locally, with no Supabase/network** (what was used to verify this
phase in the build sandbox — see Section 8):
```
npm run test:local
```
This runs the same simulator + ingestion code against a local JSON-file
mock adapter (`src/db/localMockAdapter.js`) and prints a full
verification report.

## 6. How to Trigger Each Scenario

Scenarios are set per zone at runtime:
```js
sim.setScenario('T2-R03', 'LEAK');
sim.setScenario('T1-R01', 'HIGH_USAGE');
sim.setScenario('T1-R02', 'CLEANING_THRESHOLD');
sim.setScenario('T2-R04', 'SENSOR_OFFLINE');
sim.setScenario('T2-R03', 'RECOVERY');
```
Valid zone codes (from seed data): `T1-R01`, `T1-R02`, `T2-R03`, `T2-R04`.
Valid scenarios: `NORMAL`, `HIGH_USAGE`, `LEAK`, `CLEANING_THRESHOLD`,
`SENSOR_OFFLINE`, `RECOVERY`.

`scripts/runSimulator.js` has a commented-out scripted timeline
(`setTimeout` calls) you can uncomment to auto-trigger scenarios at
fixed offsets for a hands-free demo run — this is where you'd wire in
the golden demo sequence from Phase 1.

## 7. Example Telemetry Record

```json
{
  "id": 43,
  "sensor_id": "87686082-de56-4986-836f-373f5c307604",
  "zone_id": "1c44b975-9031-493f-8067-c6e7d30b60a5",
  "recorded_at": "2026-09-17T10:15:32.880Z",
  "water_flow_lpm": 2.99,
  "flush_count": 0,
  "occupancy": 0,
  "sensor_status": "ONLINE",
  "scenario_tag": "LEAK"
}
```
Note the leak signature: elevated flow with zero occupancy/flush — no
legitimate usage explains the water flowing.

## 8. Test Results

Run in the build sandbox via `node scripts/testLocal.js` (local mock
adapter — see note in Section 9 on why). 160 readings generated across
4 zones and all 6 scenarios, then ingested and verified:

```
[PASS] Data generated — 160 rows
[PASS] Multiple terminals present — T1, T2
[PASS] Multiple zones present — 4 zones
[PASS] Multiple sensors present — 4 sensors
[PASS] All 6 scenarios represented — NORMAL, HIGH_USAGE, LEAK, CLEANING_THRESHOLD, SENSOR_OFFLINE, RECOVERY
[PASS] Leak scenario shows sustained flow with low occupancy — 25 leak rows, sample flow=2.99, occ=0
[PASS] Cleaning threshold accumulator increased — usage_count_since_clean=238 (threshold=100)
[PASS] Sensor offline correctly recorded — 4 OFFLINE rows
[PASS] Sensor status field updated to ONLINE after recovery — current status=ONLINE
[PASS] Timestamps valid and non-decreasing overall — 160 timestamps checked
[PASS] No ingestion errors — 0 errors / 160 ingested

Overall: ALL CHECKS PASSED
```

This confirms: telemetry generation works, ingestion logic works,
scenario switching works per-zone, timestamps are valid, multiple
zones/terminals work simultaneously, offline sensors are represented
correctly, and recovery restores normal readings and ONLINE status.

## 9. Problems Encountered / Important Note

**This build sandbox has no network access**, so two things could not
be done here and are left for you to do on your own machine:
- `npm install` (to fetch `@supabase/supabase-js` and `dotenv`)
- An actual connection test against a real Supabase project

To make Phase 3 fully verifiable anyway, a **local mock adapter**
(`src/db/localMockAdapter.js`) was built that implements the exact
same interface as the real Supabase adapter (`getZoneByCode`,
`getSensorByCode`, `insertTelemetry`, `updateSensorStatus`,
`updateZoneUsage`). The simulator and ingestion logic are
**adapter-agnostic** — `scripts/testLocal.js` proves the logic works
end-to-end, and `scripts/runSimulator.js` runs the identical logic
against real Supabase once you supply credentials and run `npm
install` on your machine. No application logic differs between the two
paths — only which adapter is injected.

No other issues encountered. Logic-level testing found zero errors
across 160 ingested readings spanning all required scenarios.

---

**PHASE 3 COMPLETE — TELEMETRY FOUNDATION WORKING.**
