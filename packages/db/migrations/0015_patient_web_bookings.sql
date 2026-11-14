-- PH15 (delivery slice 1): real patient self-service bookings with clinic-owned appointment truth.
-- All writes are transactional. No access to existing clinic records is inferred from names.
ALTER TABLE clinic_appointments DROP CONSTRAINT IF EXISTS clinic_appointments_source_check;
ALTER TABLE clinic_appointments ADD CONSTRAINT clinic_appointments_source_check
  CHECK(source IN ('staff','phone','walk_in','online'));
ALTER TABLE clinic_patients DROP CONSTRAINT IF EXISTS clinic_patients_intake_source_check;
ALTER TABLE clinic_patients ADD CONSTRAINT clinic_patients_intake_source_check
  CHECK(intake_source IN ('frontdesk','import','online'));

CREATE TABLE patient_booking_subjects (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 owner_user_id text NOT NULL REFERENCES patient_profiles(user_id),
 dependent_id text REFERENCES patient_dependents(id),
 subject_user_id text REFERENCES patient_profiles(user_id),
 clinic_patient_id text NOT NULL REFERENCES clinic_patients(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT booking_subject_target CHECK((dependent_id IS NULL AND subject_user_id=owner_user_id)
   OR (dependent_id IS NOT NULL)),
 UNIQUE(clinic_id,owner_user_id,dependent_id),
 UNIQUE(clinic_id,clinic_patient_id)
);
CREATE UNIQUE INDEX booking_subject_self_unique ON patient_booking_subjects(clinic_id,owner_user_id)
 WHERE dependent_id IS NULL;

CREATE TABLE patient_online_bookings (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 owner_user_id text NOT NULL REFERENCES patient_profiles(user_id),
 dependent_id text REFERENCES patient_dependents(id),
 appointment_id text UNIQUE REFERENCES clinic_appointments(id),
 service_id text NOT NULL REFERENCES clinic_services(id),
 provider_id text NOT NULL REFERENCES clinic_memberships(id),
 start_at timestamptz NOT NULL,
 end_at timestamptz NOT NULL,
 service_name text NOT NULL,
 price_afn integer NOT NULL CHECK(price_afn>=0),
 status text NOT NULL CHECK(status IN ('pending','confirmed','rejected','cancelled')),
 idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 8 AND 100),
 request_digest text NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 decision_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_user_id,idempotency_key),
 CONSTRAINT booking_request_range CHECK(end_at>start_at)
);
CREATE INDEX patient_online_bookings_user_idx ON patient_online_bookings(owner_user_id,created_at DESC);
CREATE INDEX patient_online_bookings_clinic_idx ON patient_online_bookings(clinic_id,status,start_at);
CREATE INDEX patient_online_bookings_appointment_idx ON patient_online_bookings(appointment_id);

CREATE TABLE patient_booking_events (
 id text PRIMARY KEY,
 booking_id text NOT NULL REFERENCES patient_online_bookings(id),
 actor_id text NOT NULL REFERENCES auth_users(id),
 action text NOT NULL CHECK(action IN ('requested','confirmed','rejected','rescheduled','cancelled')),
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_booking_events_booking_idx ON patient_booking_events(booking_id,created_at);

CREATE TABLE patient_booking_outbox (
 id text PRIMARY KEY,
 booking_id text NOT NULL REFERENCES patient_online_bookings(id),
 recipient_user_id text NOT NULL REFERENCES patient_profiles(user_id),
 event_type text NOT NULL CHECK(event_type IN ('requested','confirmed','rejected','rescheduled','cancelled')),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','skipped')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 last_error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 UNIQUE(booking_id,event_type,created_at)
);
CREATE INDEX patient_booking_outbox_pending_idx ON patient_booking_outbox(status,next_attempt_at);
-- Booking event and outbox records are append-only except for delivery state.
CREATE OR REPLACE FUNCTION patient_booking_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN RAISE EXCEPTION 'Patient booking events are append only'; END; $$;
CREATE TRIGGER patient_booking_event_immutable_tr
 BEFORE UPDATE OR DELETE ON patient_booking_events FOR EACH ROW
 EXECUTE FUNCTION patient_booking_event_immutable();
