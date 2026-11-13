-- Phase 06: private clinic appointments. PostgreSQL is the concurrency authority.
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- Composite keys enforce same-clinic references even if IDs are guessed.
CREATE UNIQUE INDEX IF NOT EXISTS clinic_memberships_tenant_id_uq ON clinic_memberships(clinic_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS clinic_patients_tenant_id_uq ON clinic_patients(clinic_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS clinic_services_tenant_id_uq ON clinic_services(clinic_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS clinic_resources_tenant_id_uq ON clinic_resources(clinic_id,id);
CREATE TABLE clinic_appointments (
 id text PRIMARY KEY, clinic_id text NOT NULL REFERENCES clinics(id),
 patient_id text NOT NULL REFERENCES clinic_patients(id),
 service_id text NOT NULL REFERENCES clinic_services(id),
 service_version integer NOT NULL, service_name text NOT NULL,
 price_snapshot_afn integer NOT NULL CHECK(price_snapshot_afn>=0),
 duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 5 AND 240),
 buffer_minutes integer NOT NULL CHECK(buffer_minutes BETWEEN 0 AND 120),
 provider_membership_id text NOT NULL REFERENCES clinic_memberships(id),
 resource_id text REFERENCES clinic_resources(id),
 start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'confirmed'
 CHECK(status IN ('confirmed','arrived','in_treatment','completed','cancelled','no_show')),
 source text NOT NULL CHECK(source IN ('staff','walk_in','phone')),
 admin_note text CHECK(length(admin_note)<=1000),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 checked_in_at timestamptz, treatment_started_at timestamptz, completed_at timestamptz,
 cancelled_at timestamptz, cancellation_reason text, no_show_at timestamptz,
 created_by text NOT NULL REFERENCES auth_users(id),
 updated_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT appointment_valid_interval CHECK (end_at>start_at),
 CONSTRAINT appointment_provider_scope FOREIGN KEY(clinic_id,provider_membership_id)
  REFERENCES clinic_memberships(clinic_id,id),
 CONSTRAINT appointment_patient_scope FOREIGN KEY(clinic_id,patient_id)
  REFERENCES clinic_patients(clinic_id,id),
 CONSTRAINT appointment_service_scope FOREIGN KEY(clinic_id,service_id)
  REFERENCES clinic_services(clinic_id,id),
 CONSTRAINT appointment_chair_scope FOREIGN KEY(clinic_id,resource_id)
  REFERENCES clinic_resources(clinic_id,id),
 CONSTRAINT appointments_provider_no_overlap EXCLUDE USING gist (
 clinic_id WITH =, provider_membership_id WITH =,
 tstzrange(start_at,end_at,'[)') WITH &&
 ) WHERE (status IN ('confirmed','arrived','in_treatment')),
 CONSTRAINT appointments_chair_no_overlap EXCLUDE USING gist (
 clinic_id WITH =,resource_id WITH =,
 tstzrange(start_at,end_at,'[)') WITH &&
 ) WHERE (resource_id IS NOT NULL AND status IN ('confirmed','arrived','in_treatment'))
);
CREATE INDEX appointment_clinic_time_idx ON clinic_appointments(clinic_id,start_at,status);
CREATE INDEX appointment_patient_idx ON clinic_appointments(clinic_id,patient_id,start_at);
CREATE INDEX appointment_provider_idx ON clinic_appointments(clinic_id,provider_membership_id,start_at);
CREATE TABLE clinic_appointment_events (
 id text PRIMARY KEY, appointment_id text NOT NULL REFERENCES clinic_appointments(id),
 clinic_id text NOT NULL REFERENCES clinics(id),actor_id text NOT NULL REFERENCES auth_users(id),
 action text NOT NULL, from_status text,to_status text,reason text,
 previous_start_at timestamptz,previous_end_at timestamptz,
 next_start_at timestamptz,next_end_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointment_event_idx ON clinic_appointment_events(clinic_id,appointment_id,created_at);
CREATE TABLE clinic_appointment_idempotency (
 clinic_id text NOT NULL REFERENCES clinics(id),actor_id text NOT NULL REFERENCES auth_users(id),
 request_key text NOT NULL, request_digest text NOT NULL,
 appointment_id text NOT NULL REFERENCES clinic_appointments(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(clinic_id,actor_id,request_key)
);
CREATE INDEX appointment_idempotency_lookup ON clinic_appointment_idempotency(clinic_id,appointment_id);
