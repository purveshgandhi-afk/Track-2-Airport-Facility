-- ============================================================
-- PHASE 3 — SEED DATA
-- Minimal demo dataset: 1 airport, 2 terminals, 4 zones, sensors.
-- Run AFTER schema.sql.
-- Note: this is synthetic demo data, not real airport data.
-- ============================================================

-- 1 facility
insert into facilities (id, name, city, timezone)
values ('11111111-1111-1111-1111-111111111111', 'Demo International Airport', 'Demo City', 'UTC')
on conflict (id) do nothing;

-- 2 terminals
insert into terminals (id, facility_id, code, name) values
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'T1', 'Terminal 1 - Domestic'),
  ('22222222-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'T2', 'Terminal 2 - International')
on conflict (id) do nothing;

-- 4 zones (restrooms) across the two terminals
insert into zones (id, terminal_id, code, name, zone_type, traffic_tier, qr_code_id, cleaning_threshold_uses, usage_count_since_clean, last_cleaned_at) values
  ('31111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 'T1-R01', 'Terminal 1 Restroom 1 (near Gate A)', 'restroom', 'high',   'qr-t1-r01', 120, 0, now()),
  ('32222222-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 'T1-R02', 'Terminal 1 Restroom 2 (Food Court)',   'restroom', 'medium', 'qr-t1-r02', 100, 0, now()),
  ('33333333-1111-1111-1111-111111111111', '22222222-1111-1111-1111-111111111111', 'T2-R03', 'Terminal 2 Restroom 3 (near Gate C22)', 'restroom', 'high',   'qr-t2-r03', 120, 0, now()),
  ('34444444-1111-1111-1111-111111111111', '22222222-1111-1111-1111-111111111111', 'T2-R04', 'Terminal 2 Restroom 4 (Arrivals)',       'restroom', 'medium', 'qr-t2-r04', 100, 0, now())
on conflict (id) do nothing;

-- Sensors: one combo sensor per zone (keeps prototype simple —
-- one sensor reports flow + occupancy + flush + status together)
insert into sensors (id, zone_id, code, sensor_type, status, last_seen_at) values
  ('41111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'WF-T1-R01', 'combo', 'ONLINE', now()),
  ('42222222-1111-1111-1111-111111111111', '32222222-1111-1111-1111-111111111111', 'WF-T1-R02', 'combo', 'ONLINE', now()),
  ('43333333-1111-1111-1111-111111111111', '33333333-1111-1111-1111-111111111111', 'WF-T2-R03', 'combo', 'ONLINE', now()),
  ('44444444-1111-1111-1111-111111111111', '34444444-1111-1111-1111-111111111111', 'WF-T2-R04', 'combo', 'ONLINE', now())
on conflict (id) do nothing;

-- No telemetry rows seeded here — telemetry is generated live by the simulator
-- (see src/telemetry/simulator.js) so timestamps are always fresh for the demo.
