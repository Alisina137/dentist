-- PH09 clinician-only versioned treatment proposals, stage evidence, recorded consent.
-- PH10 financial ledger/invoices remain deliberately absent; estimates are not charges.
CREATE TABLE clinic_treatment_plans (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id),
  patient_id text NOT NULL REFERENCES clinic_patients(id),
  clinician_membership_id text NOT NULL REFERENCES clinic_memberships(id),
  title text NOT NULL CHECK(length(trim(title)) BETWEEN 3 AND 120),
  indication text NOT NULL CHECK(length(trim(indication)) BETWEEN 10 AND 5000),
  expected_sessions integer NOT NULL CHECK(expected_sessions BETWEEN 1 AND 60),
  duration_minutes integer CHECK(duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 100000),
  notes text,
  status text NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','proposed','accepted','in_progress','completed','discontinued')),
  revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
  version integer NOT NULL DEFAULT 1 CHECK(version>=1),
  accepted_version integer CHECK(accepted_version IS NULL OR accepted_version>=1),
  consent_state text NOT NULL DEFAULT 'none' CHECK(consent_state IN ('none','recorded','withdrawn')),
  estimate_total_afn integer NOT NULL DEFAULT 0 CHECK(estimate_total_afn BETWEEN 0 AND 2000000000),
  patient_released boolean NOT NULL DEFAULT false,
  created_by text NOT NULL REFERENCES auth_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,clinic_id,patient_id),
  UNIQUE(id,version)
);
CREATE INDEX clinic_treatment_plans_patient_idx ON clinic_treatment_plans
 (clinic_id,patient_id,status,updated_at DESC);
CREATE INDEX clinic_treatment_plans_provider_idx ON clinic_treatment_plans
 (clinic_id,clinician_membership_id,status,updated_at DESC);

CREATE TABLE clinic_treatment_versions (
  plan_id text NOT NULL REFERENCES clinic_treatment_plans(id),
  clinic_id text NOT NULL REFERENCES clinics(id),
  patient_id text NOT NULL REFERENCES clinic_patients(id),
  version integer NOT NULL CHECK(version>0),
  title text NOT NULL,
  indication text NOT NULL,
  expected_sessions integer NOT NULL,
  duration_minutes integer,
  notes text,
  items jsonb NOT NULL CHECK(jsonb_typeof(items)='array'),
  estimate_total_afn integer NOT NULL CHECK(estimate_total_afn BETWEEN 0 AND 2000000000),
  revision_reason text,
  author_id text NOT NULL REFERENCES auth_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id,version),
  FOREIGN KEY (plan_id,clinic_id,patient_id) REFERENCES clinic_treatment_plans(id,clinic_id,patient_id)
);
CREATE INDEX clinic_treatment_versions_hist_idx ON clinic_treatment_versions(clinic_id,patient_id,plan_id,version DESC);

CREATE TABLE clinic_treatment_stages (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id),
  patient_id text NOT NULL REFERENCES clinic_patients(id),
  plan_id text NOT NULL REFERENCES clinic_treatment_plans(id),
  version integer NOT NULL CHECK(version>0),
  position integer NOT NULL CHECK(position BETWEEN 1 AND 30),
  description text NOT NULL CHECK(length(trim(description)) BETWEEN 3 AND 500),
  tooth_codes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(tooth_codes)='array'),
  expected_visits integer NOT NULL DEFAULT 1 CHECK(expected_visits BETWEEN 1 AND 20),
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','skipped')),
  started_at timestamptz,
  started_by text REFERENCES auth_users(id),
  completed_at timestamptz,
  completed_by text REFERENCES auth_users(id),
  linked_encounter_id text,
  completion_note text,
  UNIQUE(plan_id,version,position),
  UNIQUE(id,plan_id,version),
  FOREIGN KEY(plan_id,version) REFERENCES clinic_treatment_versions(plan_id,version),
  FOREIGN KEY(linked_encounter_id,clinic_id,patient_id)
   REFERENCES clinic_encounters(id,clinic_id,patient_id),
  CONSTRAINT treatment_stage_state_valid CHECK (
    (status='pending' AND started_at IS NULL AND completed_at IS NULL AND linked_encounter_id IS NULL)
    OR (status='in_progress' AND started_at IS NOT NULL AND completed_at IS NULL AND linked_encounter_id IS NULL)
    OR (status='completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL AND linked_encounter_id IS NOT NULL AND completed_by IS NOT NULL)
    OR (status='skipped' AND completed_at IS NOT NULL AND completed_by IS NOT NULL AND completion_note IS NOT NULL)
  )
);
CREATE INDEX clinic_treatment_stages_current_idx ON clinic_treatment_stages (clinic_id,patient_id,plan_id,version,position);

-- Consent is documented as a witnessed IN-PERSON attestation, never as an e-signature.
-- A new consent must refer to the latest proposed version after material revisions.
CREATE TABLE clinic_treatment_consents (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 patient_id text NOT NULL REFERENCES clinic_patients(id),
 plan_id text NOT NULL REFERENCES clinic_treatment_plans(id),
 version integer NOT NULL CHECK(version>0),
 action text NOT NULL CHECK(action IN ('recorded','withdrawn')),
 patient_role text NOT NULL CHECK(patient_role IN ('patient','guardian')),
 person_name text NOT NULL CHECK(length(trim(person_name)) BETWEEN 2 AND 120),
 relationship text,
 witness_name text NOT NULL CHECK(length(trim(witness_name)) BETWEEN 2 AND 120),
 scope_description text NOT NULL CHECK(length(trim(scope_description)) BETWEEN 10 AND 2000),
 acknowledged_at timestamptz NOT NULL,
 reason text,
 actor_id text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(plan_id,version) REFERENCES clinic_treatment_versions(plan_id,version),
 CONSTRAINT treatment_consent_guard CHECK (
  (action='recorded' AND reason IS NULL)
  OR (action='withdrawn' AND reason IS NOT NULL AND length(trim(reason))>=10)
 )
);
CREATE INDEX clinic_treatment_consent_history_idx ON clinic_treatment_consents (clinic_id,patient_id,plan_id,created_at DESC);
CREATE UNIQUE INDEX clinic_treatment_consent_one_accept_idx ON clinic_treatment_consents(plan_id,version)
 WHERE action='recorded';

CREATE TABLE clinic_treatment_events (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 patient_id text NOT NULL REFERENCES clinic_patients(id),
 plan_id text NOT NULL REFERENCES clinic_treatment_plans(id),
 version integer NOT NULL CHECK(version>0),
 action text NOT NULL CHECK(action IN (
  'created','draft_edited','proposed','consent_recorded','consent_withdrawn','stage_started',
  'stage_completed','stage_skipped','completed','revised','discontinued')),
 stage_id text REFERENCES clinic_treatment_stages(id),
 from_status text,
 to_status text,
 reason text,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 actor_id text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(plan_id,version) REFERENCES clinic_treatment_versions(plan_id,version)
);
CREATE INDEX clinic_treatment_events_history_idx ON clinic_treatment_events(clinic_id,patient_id,plan_id,created_at DESC);

CREATE OR REPLACE FUNCTION clinic_treatment_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Treatment history cannot be overwritten or deleted';
END;
$$;
CREATE TRIGGER clinic_treatment_versions_immutable BEFORE UPDATE OR DELETE ON clinic_treatment_versions
 FOR EACH ROW EXECUTE FUNCTION clinic_treatment_append_only();
CREATE TRIGGER clinic_treatment_consents_immutable BEFORE UPDATE OR DELETE ON clinic_treatment_consents
 FOR EACH ROW EXECUTE FUNCTION clinic_treatment_append_only();
CREATE TRIGGER clinic_treatment_events_immutable BEFORE UPDATE OR DELETE ON clinic_treatment_events
 FOR EACH ROW EXECUTE FUNCTION clinic_treatment_append_only();

-- Frozen stage descriptions/treatment scope cannot be silently modified after proposal,
-- and stage state transitions retain their original timestamp and evidence.
CREATE OR REPLACE FUNCTION clinic_treatment_stage_update_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.clinic_id IS DISTINCT FROM OLD.clinic_id OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
    OR NEW.plan_id IS DISTINCT FROM OLD.plan_id OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.position IS DISTINCT FROM OLD.position OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.tooth_codes IS DISTINCT FROM OLD.tooth_codes OR NEW.expected_visits IS DISTINCT FROM OLD.expected_visits
    OR NEW.due_date IS DISTINCT FROM OLD.due_date
 THEN RAISE EXCEPTION 'Treatment stage scope and proposal data are immutable'; END IF;
 IF NOT (
  (OLD.status='pending' AND NEW.status IN ('in_progress','skipped'))
  OR (OLD.status='in_progress' AND NEW.status IN ('completed','skipped'))
 ) THEN RAISE EXCEPTION 'Invalid treatment stage transition'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER clinic_treatment_stages_guard BEFORE UPDATE ON clinic_treatment_stages
 FOR EACH ROW EXECUTE FUNCTION clinic_treatment_stage_update_guard();
CREATE TRIGGER clinic_treatment_stages_no_delete BEFORE DELETE ON clinic_treatment_stages
 FOR EACH ROW EXECUTE FUNCTION clinic_treatment_append_only();
