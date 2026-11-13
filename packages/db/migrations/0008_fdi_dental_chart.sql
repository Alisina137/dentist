-- PH08: FDI dental chart; clinical findings are observation-only, never inferred diagnosis/billing.
-- A patient may have primary and permanent history simultaneously.
ALTER TABLE clinic_encounters ADD CONSTRAINT clinic_encounter_scope_identity UNIQUE (id,clinic_id,patient_id);

CREATE TABLE clinic_tooth_observations (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 patient_id text NOT NULL REFERENCES clinic_patients(id),
 encounter_id text NOT NULL,
 provider_membership_id text NOT NULL REFERENCES clinic_memberships(id),
 tooth_code text NOT NULL CHECK (tooth_code ~ '^([1-4][1-8]|[5-8][1-5])$'),
 dentition text NOT NULL CHECK (dentition IN ('permanent','primary')),
 condition text NOT NULL CHECK (condition IN (
  'sound','caries_suspected','restored','missing','extraction_planned',
  'root_canal_treated','crown','implant','other')),
 surfaces jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(surfaces)='array'),
 notes text CHECK (notes IS NULL OR length(notes)<=1000),
 observation_date date NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated')),
 recorded_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 validated_by text REFERENCES auth_users(id),
 validated_at timestamptz,
 action_key text NOT NULL CHECK(length(action_key) BETWEEN 8 AND 100),
 request_digest text NOT NULL CHECK(length(request_digest)=64),
 CONSTRAINT tooth_observation_encounter_scope
   FOREIGN KEY (encounter_id,clinic_id,patient_id)
   REFERENCES clinic_encounters(id,clinic_id,patient_id),
 CONSTRAINT tooth_quadrant_matches_dentition CHECK (
   (dentition='permanent' AND tooth_code ~ '^[1-4][1-8]$') OR
   (dentition='primary' AND tooth_code ~ '^[5-8][1-5]$')),
 CONSTRAINT tooth_observation_signoff CHECK (
   (status='draft' AND validated_by IS NULL AND validated_at IS NULL) OR
   (status='validated' AND validated_by IS NOT NULL AND validated_at IS NOT NULL)),
 CONSTRAINT tooth_observation_unique_action UNIQUE (clinic_id, recorded_by, action_key)
);
CREATE INDEX tooth_observation_current_idx ON clinic_tooth_observations
 (clinic_id,patient_id,dentition,tooth_code,observation_date DESC,validated_at DESC)
 WHERE status='validated';
CREATE INDEX tooth_observation_visit_idx ON clinic_tooth_observations
 (clinic_id,patient_id,encounter_id,created_at DESC);
CREATE INDEX tooth_observation_history_idx ON clinic_tooth_observations
 (clinic_id,patient_id,tooth_code,observation_date DESC,created_at DESC,id);

-- Immutable evidence: validation only stamps draft with qualified review metadata.
-- Validated content and drafts are never changed in place, even by a privileged API.
CREATE OR REPLACE FUNCTION guard_tooth_observation_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status <> 'draft' OR NEW.status <> 'validated'
    OR NEW.validated_by IS NULL OR NEW.validated_at IS NULL
    OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id
    OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
    OR NEW.encounter_id IS DISTINCT FROM OLD.encounter_id
    OR NEW.provider_membership_id IS DISTINCT FROM OLD.provider_membership_id
    OR NEW.tooth_code IS DISTINCT FROM OLD.tooth_code
    OR NEW.dentition IS DISTINCT FROM OLD.dentition
    OR NEW.condition IS DISTINCT FROM OLD.condition
    OR NEW.surfaces IS DISTINCT FROM OLD.surfaces
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.observation_date IS DISTINCT FROM OLD.observation_date
    OR NEW.recorded_by IS DISTINCT FROM OLD.recorded_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.action_key IS DISTINCT FROM OLD.action_key
    OR NEW.request_digest IS DISTINCT FROM OLD.request_digest
 THEN
  RAISE EXCEPTION 'Tooth observations are append-only; only draft validation is allowed';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER tooth_observation_guard BEFORE UPDATE ON clinic_tooth_observations
 FOR EACH ROW EXECUTE FUNCTION guard_tooth_observation_update();

CREATE OR REPLACE FUNCTION guard_tooth_observation_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Dental chart history is append-only';
END;
$$;
CREATE TRIGGER tooth_observation_no_delete BEFORE DELETE ON clinic_tooth_observations
 FOR EACH ROW EXECUTE FUNCTION guard_tooth_observation_delete();
