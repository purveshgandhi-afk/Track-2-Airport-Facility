-- ============================================================
-- PHASE 3 — DATA LAYER SCHEMA
-- Airport Smart Facility & Sustainability Command Center
-- Target: Supabase / PostgreSQL
-- ============================================================
-- Run this in the Supabase SQL Editor (or via `supabase db push`
-- / psql against your project's connection string).
-- ============================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ------------------------------------------------------------
-- 1. facilities  (top-level: one row = one airport)
-- ------------------------------------------------------------
create table if not exists facilities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                 -- e.g. "Demo International Airport"
  city        text,
  timezone    text default 'UTC',
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. terminals
-- ------------------------------------------------------------
create table if not exists terminals (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references facilities(id) on delete cascade,
  code          text not null,                -- e.g. "T1", "T2"
  name          text,                         -- e.g. "Terminal 2 - International"
  created_at    timestamptz not null default now(),
  unique (facility_id, code)
);

-- ------------------------------------------------------------
-- 3. zones  (restrooms / facility zones)
-- ------------------------------------------------------------
create table if not exists zones (
  id                        uuid primary key default gen_random_uuid(),
  terminal_id               uuid not null references terminals(id) on delete cascade,
  code                      text not null,          -- e.g. "T2-R03"
  name                      text,                   -- e.g. "Restroom 3 - Gate C"
  zone_type                 text not null default 'restroom',
  traffic_tier              text not null default 'medium'  -- low | medium | high
                              check (traffic_tier in ('low','medium','high')),
  qr_code_id                text unique,            -- token embedded in the zone's QR code
  cleaning_threshold_uses   int not null default 100, -- usage count that triggers a cleaning task
  usage_count_since_clean   int not null default 0,
  last_cleaned_at           timestamptz default now(),
  created_at                timestamptz not null default now(),
  unique (terminal_id, code)
);

-- ------------------------------------------------------------
-- 4. sensors
-- one zone has multiple sensors (flow, occupancy, flush, combo)
-- ------------------------------------------------------------
create table if not exists sensors (
  id            uuid primary key default gen_random_uuid(),
  zone_id       uuid not null references zones(id) on delete cascade,
  code          text not null unique,          -- e.g. "WF-T2-R03"
  sensor_type   text not null default 'combo'  -- flow | occupancy | flush | combo
                  check (sensor_type in ('flow','occupancy','flush','combo')),
  status        text not null default 'ONLINE'
                  check (status in ('ONLINE','OFFLINE','FAULT')),
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. telemetry  (raw high-frequency readings)
-- ------------------------------------------------------------
create table if not exists telemetry (
  id                bigserial primary key,
  sensor_id         uuid not null references sensors(id) on delete cascade,
  zone_id           uuid not null references zones(id) on delete cascade,
  recorded_at       timestamptz not null default now(),
  water_flow_lpm    numeric(6,2) default 0,     -- liters per minute
  flush_count       int default 0,              -- flush events in this reading window
  occupancy         int default 0,              -- number of people detected
  sensor_status     text not null default 'ONLINE'
                      check (sensor_status in ('ONLINE','OFFLINE','FAULT')),
  scenario_tag      text                         -- NORMAL/HIGH_USAGE/LEAK/etc, for demo traceability
);

create index if not exists idx_telemetry_zone_time on telemetry (zone_id, recorded_at desc);
create index if not exists idx_telemetry_sensor_time on telemetry (sensor_id, recorded_at desc);

-- ------------------------------------------------------------
-- 6. incidents  (detected leak / cleaning-threshold / sensor-fault events)
-- Populated starting Phase 4 (detection engine). Table created now
-- so the data layer is complete.
-- ------------------------------------------------------------
create table if not exists incidents (
  id            uuid primary key default gen_random_uuid(),
  zone_id       uuid not null references zones(id) on delete cascade,
  sensor_id     uuid references sensors(id) on delete set null,
  type          text not null
                  check (type in ('LEAK','CLEANING_THRESHOLD','SENSOR_FAULT')),
  status        text not null default 'OPEN'
                  check (status in ('OPEN','ACKNOWLEDGED','RESOLVED')),
  priority      text default 'LOW'
                  check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  detected_at   timestamptz not null default now(),
  resolved_at   timestamptz,
  details       jsonb default '{}'::jsonb   -- e.g. { "wasted_liters": 18.4, "duration_min": 6 }
);

create index if not exists idx_incidents_zone on incidents (zone_id);

-- ------------------------------------------------------------
-- 7. maintenance_tickets  (Maintenance-team queue: leaks, sensor faults)
-- ------------------------------------------------------------
create table if not exists maintenance_tickets (
  id                  uuid primary key default gen_random_uuid(),
  incident_id         uuid not null references incidents(id) on delete cascade,
  zone_id             uuid not null references zones(id) on delete cascade,
  priority            text not null default 'LOW'
                        check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status              text not null default 'OPEN'
                        check (status in ('OPEN','IN_PROGRESS','RESOLVED')),
  assigned_team       text default 'maintenance',
  genai_explanation   text,
  genai_recommendation text,
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);

-- ------------------------------------------------------------
-- 8. cleaning_tasks  (Cleaning-team queue: usage-threshold breaches)
-- ------------------------------------------------------------
create table if not exists cleaning_tasks (
  id            uuid primary key default gen_random_uuid(),
  zone_id       uuid not null references zones(id) on delete cascade,
  incident_id   uuid references incidents(id) on delete set null,
  status        text not null default 'PENDING'
                  check (status in ('PENDING','IN_PROGRESS','COMPLETED')),
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

-- ------------------------------------------------------------
-- 9. cleaning_verifications  (QR-scan checklist completion record)
-- ------------------------------------------------------------
create table if not exists cleaning_verifications (
  id                  uuid primary key default gen_random_uuid(),
  cleaning_task_id    uuid not null references cleaning_tasks(id) on delete cascade,
  staff_name          text,
  checklist           jsonb default '{}'::jsonb, -- e.g. {"floors":true,"fixtures":true,"trash":true}
  notes               text,
  completed_at        timestamptz not null default now()
);

-- ============================================================
-- End of schema. 9 tables total — matches Phase 3 minimum list:
-- facilities, terminals, zones, sensors, telemetry, incidents,
-- maintenance_tickets, cleaning_tasks, cleaning_verifications.
-- ============================================================
