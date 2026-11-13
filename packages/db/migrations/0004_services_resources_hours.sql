-- PH04 schedules/catalog. Intentionally versioned and independently deployable before PH05.
-- This migration is numbered 0004 and safe to apply when 0005 is already present.
CREATE TABLE clinic_services (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  category text NOT NULL CHECK (length(trim(category)) BETWEEN 2 AND 60),
  description text,
  duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 5 AND 240 AND duration_minutes % 5 = 0),
  preparation_minutes integer NOT NULL DEFAULT 0 CHECK(preparation_minutes BETWEEN 0 AND 120 AND preparation_minutes % 5 = 0),
  base_price_afn integer NOT NULL CHECK(base_price_afn BETWEEN 0 AND 10000000),
  requires_chair boolean NOT NULL DEFAULT true,
  public_booking boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  created_by text NOT NULL REFERENCES auth_users(id),
  updated_by text NOT NULL REFERENCES auth_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, name)
);
CREATE INDEX clinic_services_active_idx ON clinic_services(clinic_id, active, category, name);

CREATE TABLE clinic_service_versions (
  service_id text NOT NULL REFERENCES clinic_services(id),
  clinic_id text NOT NULL REFERENCES clinics(id),
  version integer NOT NULL CHECK(version > 0),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  duration_minutes integer NOT NULL,
  preparation_minutes integer NOT NULL,
  base_price_afn integer NOT NULL,
  requires_chair boolean NOT NULL,
  public_booking boolean NOT NULL,
  active boolean NOT NULL,
  changed_by text NOT NULL REFERENCES auth_users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, version)
);
CREATE INDEX clinic_service_versions_scope_idx ON clinic_service_versions(clinic_id, service_id);

CREATE TABLE clinic_resources (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id),
  code text NOT NULL CHECK(length(trim(code)) BETWEEN 2 AND 24),
  label text NOT NULL CHECK(length(trim(label)) BETWEEN 1 AND 50),
  kind text NOT NULL DEFAULT 'chair' CHECK(kind IN ('chair','room')),
  equipment text,
  active boolean NOT NULL DEFAULT true,
  revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
  created_by text NOT NULL REFERENCES auth_users(id),
  updated_by text NOT NULL REFERENCES auth_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, code)
);
CREATE INDEX clinic_resources_active_idx ON clinic_resources(clinic_id,active);

-- Saturday=0, Sunday=1, ... Friday=6. All minutes are wall-clock Asia/Kabul.
-- Breaks are validated on API writes and are never published as slot availability.
CREATE TABLE clinic_weekly_hours (
  clinic_id text NOT NULL REFERENCES clinics(id),
  weekday integer NOT NULL CHECK(weekday BETWEEN 0 AND 6),
  is_open boolean NOT NULL DEFAULT false,
  start_minute integer NOT NULL DEFAULT 540 CHECK(start_minute BETWEEN 0 AND 1439),
  end_minute integer NOT NULL DEFAULT 1020 CHECK(end_minute BETWEEN 1 AND 1440),
  breaks jsonb NOT NULL DEFAULT '[]'::jsonb,
  revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
  updated_by text REFERENCES auth_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, weekday),
  CHECK (end_minute > start_minute)
);

CREATE TABLE clinic_provider_hours (
  clinic_id text NOT NULL REFERENCES clinics(id),
  membership_id text NOT NULL REFERENCES clinic_memberships(id),
  weekday integer NOT NULL CHECK(weekday BETWEEN 0 AND 6),
  is_open boolean NOT NULL DEFAULT false,
  start_minute integer NOT NULL DEFAULT 540 CHECK(start_minute BETWEEN 0 AND 1439),
  end_minute integer NOT NULL DEFAULT 1020 CHECK(end_minute BETWEEN 1 AND 1440),
  breaks jsonb NOT NULL DEFAULT '[]'::jsonb,
  revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
  updated_by text REFERENCES auth_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id,membership_id,weekday),
  CHECK (end_minute > start_minute)
);
CREATE INDEX clinic_provider_hours_clinic_idx ON clinic_provider_hours(clinic_id,weekday);

CREATE TABLE clinic_resource_hours (
  clinic_id text NOT NULL REFERENCES clinics(id),
  resource_id text NOT NULL REFERENCES clinic_resources(id),
  weekday integer NOT NULL CHECK(weekday BETWEEN 0 AND 6),
  is_open boolean NOT NULL DEFAULT false,
  start_minute integer NOT NULL DEFAULT 540 CHECK(start_minute BETWEEN 0 AND 1439),
  end_minute integer NOT NULL DEFAULT 1020 CHECK(end_minute BETWEEN 1 AND 1440),
  breaks jsonb NOT NULL DEFAULT '[]'::jsonb,
  revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
  updated_by text REFERENCES auth_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id,resource_id,weekday),
  CHECK (end_minute > start_minute)
);

CREATE TABLE clinic_schedule_exceptions (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  kind text NOT NULL CHECK(kind IN ('closed','special_hours')),
  start_minute integer CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute integer CHECK (end_minute BETWEEN 1 AND 1440),
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 5 AND 200),
  revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
  created_by text NOT NULL REFERENCES auth_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_exception_valid_interval CHECK(end_date >= start_date),
  CONSTRAINT clinic_exception_special_rule CHECK(
     (kind='closed' AND start_minute IS NULL AND end_minute IS NULL)
     OR (kind='special_hours' AND start_minute IS NOT NULL AND end_minute > start_minute)
  )
);
CREATE INDEX clinic_exception_date_idx ON clinic_schedule_exceptions(clinic_id,start_date,end_date);
