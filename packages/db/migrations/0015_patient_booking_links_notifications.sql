-- PH15 — public patient bookings share PH06's single clinic_appointments calendar.
-- Pending requests do not block resources; acceptance/auto confirmation use the existing
-- PostgreSQL GiST exclusion constraints. Do not store clinic records in public listings.
ALTER TABLE clinic_appointments DROP CONSTRAINT IF EXISTS clinic_appointments_status_check;
ALTER TABLE clinic_appointments ADD CONSTRAINT clinic_appointments_status_check
 CHECK (status IN ('requested','confirmed','arrived','in_treatment','completed','cancelled','no_show','rejected'));
ALTER TABLE clinic_appointments DROP CONSTRAINT IF EXISTS clinic_appointments_source_check;
ALTER TABLE clinic_appointments ADD CONSTRAINT clinic_appointments_source_check
 CHECK (source IN ('staff','phone','walk_in','public'));
ALTER TABLE clinic_appointment_events DROP CONSTRAINT IF EXISTS clinic_appointment_events_action_check;
ALTER TABLE clinic_appointment_events ADD CONSTRAINT clinic_appointment_events_action_check
 CHECK (action IN ('created','accepted','rejected','rescheduled','arrived','in_treatment','completed','cancelled','no_show'));
ALTER TABLE clinic_patients DROP CONSTRAINT IF EXISTS clinic_patients_intake_source_check;
ALTER TABLE clinic_patients ADD CONSTRAINT clinic_patients_intake_source_check
 CHECK (intake_source IN ('frontdesk','import','online'));

CREATE TABLE patient_public_bookings (
 id text PRIMARY KEY,
 appointment_id text NOT NULL UNIQUE REFERENCES clinic_appointments(id),
 clinic_id text NOT NULL REFERENCES clinics(id),
 user_id text NOT NULL REFERENCES patient_profiles(user_id),
 subject_type text NOT NULL CHECK(subject_type IN ('self','minor','adult_delegate')),
 dependent_id text REFERENCES patient_dependents(id),
 subject_name text NOT NULL CHECK(length(subject_name) BETWEEN 2 AND 120),
 idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 8 AND 100),
 request_digest text NOT NULL,
 approval_mode text NOT NULL CHECK(approval_mode IN ('manual','auto')),
 cancellation_hours integer NOT NULL CHECK(cancellation_hours BETWEEN 0 AND 168),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,idempotency_key),
 CHECK ((subject_type='self' AND dependent_id IS NULL)
    OR (subject_type<>'self' AND dependent_id IS NOT NULL))
);
CREATE INDEX patient_public_bookings_owner_idx ON patient_public_bookings(user_id,created_at DESC);
CREATE INDEX patient_public_bookings_clinic_idx ON patient_public_bookings(clinic_id,created_at DESC);

CREATE TABLE patient_record_link_requests (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 user_id text NOT NULL REFERENCES patient_profiles(user_id),
 supplied_patient_number text NOT NULL CHECK(length(supplied_patient_number) BETWEEN 2 AND 40),
 patient_id text REFERENCES clinic_patients(id),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected','revoked')),
 consent_at timestamptz NOT NULL,
 verified_by text REFERENCES auth_users(id),
 verification_method text CHECK(verification_method IN ('in_person_document','in_person_care')),
 decided_at timestamptz,
 decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((state='approved' AND patient_id IS NOT NULL AND verified_by IS NOT NULL
   AND verification_method IS NOT NULL AND decided_at IS NOT NULL)
 OR (state='pending' AND patient_id IS NULL AND verified_by IS NULL AND decided_at IS NULL)
 OR (state IN ('rejected','revoked') AND decided_at IS NOT NULL))
);
CREATE UNIQUE INDEX patient_record_link_one_active ON patient_record_link_requests(user_id,clinic_id)
 WHERE state IN ('pending','approved');
CREATE INDEX patient_record_link_clinic_queue ON patient_record_link_requests(clinic_id,state,created_at DESC);
CREATE INDEX patient_record_link_owner_idx ON patient_record_link_requests(user_id,created_at DESC);

-- Individually approved release; link approval does not expose an entire chart/invoice history.
CREATE TABLE patient_record_releases (
 id text PRIMARY KEY,
 link_id text NOT NULL REFERENCES patient_record_link_requests(id),
 clinic_id text NOT NULL REFERENCES clinics(id),
 resource_kind text NOT NULL CHECK(resource_kind IN ('signed_encounter_summary','issued_receipt')),
 resource_id text NOT NULL,
 released_by text NOT NULL REFERENCES auth_users(id),
 released_at timestamptz NOT NULL DEFAULT now(),
 revoked_by text REFERENCES auth_users(id),
 revoked_at timestamptz,
 UNIQUE(link_id,resource_kind,resource_id),
 CHECK ((revoked_at IS NULL)=(revoked_by IS NULL))
);
CREATE INDEX patient_release_link_idx ON patient_record_releases(link_id,revoked_at);

-- Delivery is separate from booking transaction; provider errors never undo a booking.
CREATE TABLE patient_booking_notifications (
 id text PRIMARY KEY,
 booking_id text NOT NULL REFERENCES patient_public_bookings(id),
 user_id text NOT NULL REFERENCES patient_profiles(user_id),
 event_name text NOT NULL CHECK(event_name IN ('requested','confirmed','accepted','rejected','cancelled','rescheduled')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','skipped','failed')),
 attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count BETWEEN 0 AND 20),
 available_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 last_error_code text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_booking_notification_due_idx ON patient_booking_notifications(status,available_at);
CREATE INDEX patient_booking_notification_owner_idx ON patient_booking_notifications(user_id,created_at DESC);
