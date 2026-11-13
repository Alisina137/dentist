-- PH06: private in-clinic appointment scheduling, queue, idempotent actions and immutable history.
-- PostgreSQL is the final authority for overlapping clinician and operatory reservations.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE clinic_appointments (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 patient_id text NOT NULL REFERENCES clinic_patients(id),
 service_id text NOT NULL REFERENCES clinic_services(id),
 provider_membership_id text NOT NULL REFERENCES clinic_memberships(id),
 resource_id text REFERENCES clinic_resources(id),
 service_version integer NOT NULL CHECK(service_version>0),
 service_name text NOT NULL,
 service_category text NOT NULL,
 service_price_afn integer NOT NULL CHECK(service_price_afn>=0),
 service_duration_minutes integer NOT NULL CHECK(service_duration_minutes BETWEEN 5 AND 240),
 preparation_minutes integer NOT NULL CHECK(preparation_minutes BETWEEN 0 AND 120),
 start_at timestamptz NOT NULL,
 end_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'confirmed'
   CHECK(status IN ('confirmed','arrived','in_treatment','completed','cancelled','no_show')),
 source text NOT NULL CHECK(source IN ('staff','phone','walk_in')),
 administrative_note text CHECK(administrative_note IS NULL OR length(administrative_note)<=500),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 arrived_at timestamptz,
 started_at timestamptz,
 completed_at timestamptz,
 cancelled_at timestamptz,
 no_show_at timestamptz,
 created_by text NOT NULL REFERENCES auth_users(id),
 updated_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT appointment_valid_range CHECK (end_at>start_at AND end_at<=start_at+interval '6 hours'),
 CONSTRAINT appointment_provider_no_overlap EXCLUDE USING gist (
   clinic_id WITH =,
   provider_membership_id WITH =,
   tstzrange(start_at,end_at,'[)') WITH &&
 ) WHERE (status IN ('confirmed','arrived','in_treatment','completed')),
 CONSTRAINT appointment_resource_no_overlap EXCLUDE USING gist (
   clinic_id WITH =,
   resource_id WITH =,
   tstzrange(start_at,end_at,'[)') WITH &&
 ) WHERE (resource_id IS NOT NULL AND status IN ('confirmed','arrived','in_treatment','completed'))
);
CREATE INDEX appointment_clinic_date_idx ON clinic_appointments(clinic_id,start_at);
CREATE INDEX appointment_clinic_status_date_idx ON clinic_appointments(clinic_id,status,start_at);
CREATE INDEX appointment_clinic_patient_idx ON clinic_appointments(clinic_id,patient_id,start_at);
CREATE INDEX appointment_provider_date_idx ON clinic_appointments(clinic_id,provider_membership_id,start_at);
CREATE INDEX appointment_resource_date_idx ON clinic_appointments(clinic_id,resource_id,start_at);

CREATE TABLE clinic_appointment_events (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 appointment_id text NOT NULL REFERENCES clinic_appointments(id),
 action text NOT NULL CHECK (action IN ('created','rescheduled','arrived','in_treatment','completed','cancelled','no_show')),
 before_status text,
 after_status text NOT NULL,
 before_start_at timestamptz,
 before_end_at timestamptz,
 after_start_at timestamptz NOT NULL,
 after_end_at timestamptz NOT NULL,
 reason text,
 actor_id text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointment_event_timeline_idx ON clinic_appointment_events(clinic_id,appointment_id,created_at,id);

CREATE TABLE clinic_appointment_actions (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 actor_id text NOT NULL REFERENCES auth_users(id),
 action_key text NOT NULL CHECK(length(action_key) BETWEEN 8 AND 100),
 operation text NOT NULL CHECK(operation IN ('create','reschedule','transition')),
 request_digest text NOT NULL,
 appointment_id text NOT NULL REFERENCES clinic_appointments(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(clinic_id,actor_id,action_key)
);
CREATE INDEX appointment_action_date_idx ON clinic_appointment_actions(clinic_id,created_at);
