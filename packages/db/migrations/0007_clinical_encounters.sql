-- PH07: tenant-private, append-only signed encounter history and guarded clinical attachments.
CREATE TABLE clinic_encounters (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id),
  patient_id text NOT NULL REFERENCES clinic_patients(id),
  appointment_id text UNIQUE REFERENCES clinic_appointments(id),
  provider_membership_id text NOT NULL REFERENCES clinic_memberships(id),
  created_by text NOT NULL REFERENCES auth_users(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed')),
  revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
  reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 2000),
  history_source text,
  history_date date,
  findings text NOT NULL DEFAULT '',
  assessment text NOT NULL DEFAULT '',
  performed_procedures jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up text,
  signed_by text REFERENCES auth_users(id),
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signed_encounter_consistency CHECK (
    (status='draft' AND signed_at IS NULL AND signed_by IS NULL) OR
    (status='signed' AND signed_at IS NOT NULL AND signed_by IS NOT NULL)
  )
);
CREATE INDEX clinic_encounter_patient_idx ON clinic_encounters (clinic_id,patient_id,created_at DESC);
CREATE INDEX clinic_encounter_provider_idx ON clinic_encounters (clinic_id,provider_membership_id,status,updated_at DESC);
CREATE INDEX clinic_encounter_creator_idx ON clinic_encounters (clinic_id,created_by,status,updated_at DESC);

CREATE TABLE clinic_encounter_versions (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id),
  encounter_id text NOT NULL REFERENCES clinic_encounters(id),
  revision integer NOT NULL CHECK(revision>0),
  action text NOT NULL CHECK(action IN ('created','draft_saved','signed','amended')),
  note jsonb NOT NULL,
  correction_reason text,
  actor_id text NOT NULL REFERENCES auth_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amendment_reason_required CHECK(
    (action='amended' AND correction_reason IS NOT NULL AND length(correction_reason) BETWEEN 10 AND 500)
    OR (action<>'amended' AND correction_reason IS NULL)),
  UNIQUE(encounter_id,revision)
);
CREATE INDEX clinic_encounter_versions_history_idx ON clinic_encounter_versions(clinic_id,encounter_id,revision DESC);

-- Private-by-default objects are served ONLY through authenticated and scoped API routes.
-- No public storage keys, public CDN addresses, or object-store ACLs exist.
CREATE TABLE clinic_clinical_files (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id),
  patient_id text NOT NULL REFERENCES clinic_patients(id),
  encounter_id text REFERENCES clinic_encounters(id),
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 150),
  kind text NOT NULL CHECK(kind IN ('xray','photo','consent','other')),
  file_name text NOT NULL CHECK(length(file_name) BETWEEN 1 AND 180),
  mime text NOT NULL CHECK(mime IN ('image/jpeg','image/png','application/pdf')),
  size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 2097152),
  sha256 text NOT NULL,
  bytes bytea NOT NULL,
  notes text CHECK(notes IS NULL OR length(notes)<=500),
  -- Magic bytes are inspected. Antimalware/retention/export require PH19 sign-off.
  scan_status text NOT NULL DEFAULT 'signature_verified' CHECK(scan_status IN ('signature_verified','quarantined')),
  uploaded_by text NOT NULL REFERENCES auth_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_clinical_files_patient_idx ON clinic_clinical_files(clinic_id,patient_id,created_at DESC);
CREATE INDEX clinic_clinical_files_encounter_idx ON clinic_clinical_files(clinic_id,encounter_id,created_at DESC);

-- Defend the signed base note from accidental mutation via a future code path.
CREATE OR REPLACE FUNCTION protect_clinic_signed_encounter() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='signed' AND (
    NEW.reason IS DISTINCT FROM OLD.reason OR
    NEW.findings IS DISTINCT FROM OLD.findings OR
    NEW.assessment IS DISTINCT FROM OLD.assessment OR
    NEW.history_source IS DISTINCT FROM OLD.history_source OR
    NEW.history_date IS DISTINCT FROM OLD.history_date OR
    NEW.performed_procedures IS DISTINCT FROM OLD.performed_procedures OR
    NEW.follow_up IS DISTINCT FROM OLD.follow_up OR
    NEW.signed_at IS DISTINCT FROM OLD.signed_at OR
    NEW.signed_by IS DISTINCT FROM OLD.signed_by OR
    NEW.status IS DISTINCT FROM OLD.status OR
    NEW.patient_id IS DISTINCT FROM OLD.patient_id OR
    NEW.provider_membership_id IS DISTINCT FROM OLD.provider_membership_id
  ) THEN
    RAISE EXCEPTION 'Signed encounter base is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER clinic_signed_encounter_guard BEFORE UPDATE ON clinic_encounters
  FOR EACH ROW EXECUTE FUNCTION protect_clinic_signed_encounter();

CREATE OR REPLACE FUNCTION protect_clinic_encounter_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Clinical version history is append-only';
END;
$$;
CREATE TRIGGER clinic_encounter_version_no_update BEFORE UPDATE OR DELETE ON clinic_encounter_versions
  FOR EACH ROW EXECUTE FUNCTION protect_clinic_encounter_history();
