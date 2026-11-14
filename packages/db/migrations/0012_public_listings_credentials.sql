-- PH12: independently moderated dentist credentials and immutable public listing revisions.
-- This is NOT a registry check: platform reviewers manually attest evidence and affiliation.

CREATE TABLE clinic_dentist_credential_cases (
 membership_id text PRIMARY KEY REFERENCES clinic_memberships(id),
 clinic_id text NOT NULL REFERENCES clinics(id),
 status text NOT NULL DEFAULT 'unverified'
   CHECK(status IN ('unverified','pending','verified','rejected','needs_changes','revoked')),
 current_submission_id text,
 approved_draft_version integer,
 valid_until date,
 verified_snapshot jsonb,
 reviewed_by text REFERENCES auth_users(id),
 reviewed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(membership_id,clinic_id)
);
CREATE INDEX dentist_credential_cases_idx ON clinic_dentist_credential_cases(clinic_id,status);

CREATE TABLE clinic_dentist_credential_submissions (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 membership_id text NOT NULL REFERENCES clinic_memberships(id),
 draft_version integer NOT NULL CHECK(draft_version>0),
 credential_type text NOT NULL CHECK(length(trim(credential_type)) BETWEEN 3 AND 100),
 credential_number text NOT NULL CHECK(length(trim(credential_number)) BETWEEN 3 AND 120),
 valid_until date NOT NULL,
 file_name text NOT NULL CHECK(length(trim(file_name)) BETWEEN 3 AND 120),
 mime_type text NOT NULL CHECK(mime_type IN ('application/pdf','image/jpeg','image/png')),
 size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 8 AND 1572864),
 content_bytes bytea NOT NULL,
 sha256_hex text NOT NULL CHECK(length(sha256_hex)=64),
 submitted_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,clinic_id,membership_id),
 FOREIGN KEY(membership_id,clinic_id)
  REFERENCES clinic_dentist_credential_cases(membership_id,clinic_id)
);
CREATE INDEX dentist_credential_submission_idx ON clinic_dentist_credential_submissions(clinic_id,membership_id,created_at DESC);
ALTER TABLE clinic_dentist_credential_cases ADD CONSTRAINT dentist_current_submission_fk
 FOREIGN KEY(current_submission_id) REFERENCES clinic_dentist_credential_submissions(id);

CREATE TABLE clinic_dentist_credential_decisions (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 membership_id text NOT NULL REFERENCES clinic_memberships(id),
 submission_id text REFERENCES clinic_dentist_credential_submissions(id),
 decision text NOT NULL CHECK(decision IN ('submitted','approved','rejected','needs_changes','revoked')),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 10 AND 700),
 review_basis text,
 actor_id text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dentist_credential_decisions_idx ON clinic_dentist_credential_decisions(clinic_id,membership_id,created_at DESC);

CREATE TABLE clinic_listing_heads (
 clinic_id text PRIMARY KEY REFERENCES clinics(id),
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 draft_version integer,
 pending_version integer,
 approved_version integer,
 hidden boolean NOT NULL DEFAULT false,
 hidden_reason text,
 hidden_by text REFERENCES auth_users(id),
 hidden_at timestamptz,
 published_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((hidden=false AND hidden_reason IS NULL) OR
  (hidden=true AND hidden_reason IS NOT NULL AND length(trim(hidden_reason))>=10)),
 CHECK(pending_version IS NULL OR draft_version IS NULL)
);
CREATE TABLE clinic_listing_versions (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 version integer NOT NULL CHECK(version>0),
 status text NOT NULL CHECK(status IN ('draft','pending','approved','rejected')),
 profile jsonb NOT NULL CHECK(jsonb_typeof(profile)='object'),
 submitted_at timestamptz,
 reviewed_at timestamptz,
 reviewed_by text REFERENCES auth_users(id),
 decision_reason text,
 created_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(clinic_id,version),
 UNIQUE(clinic_id,id)
);
CREATE INDEX clinic_listing_versions_idx ON clinic_listing_versions(clinic_id,status,version DESC);
ALTER TABLE clinic_listing_heads ADD CONSTRAINT listing_draft_version_fk
 FOREIGN KEY(clinic_id,draft_version) REFERENCES clinic_listing_versions(clinic_id,version)
 DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE clinic_listing_heads ADD CONSTRAINT listing_pending_version_fk
 FOREIGN KEY(clinic_id,pending_version) REFERENCES clinic_listing_versions(clinic_id,version)
 DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE clinic_listing_heads ADD CONSTRAINT listing_approved_version_fk
 FOREIGN KEY(clinic_id,approved_version) REFERENCES clinic_listing_versions(clinic_id,version)
 DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE clinic_listing_photos (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 mime_type text NOT NULL CHECK(mime_type IN ('image/png','image/jpeg')),
 size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 8 AND 1048576),
 width integer,
 height integer,
 file_name text NOT NULL CHECK(length(trim(file_name)) BETWEEN 3 AND 120),
 sha256_hex text NOT NULL CHECK(length(sha256_hex)=64),
 content_bytes bytea NOT NULL,
 rights_attested boolean NOT NULL DEFAULT true CHECK(rights_attested=true),
 uploaded_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,clinic_id)
);
CREATE INDEX clinic_listing_photos_idx ON clinic_listing_photos(clinic_id,created_at DESC);

CREATE TABLE clinic_listing_events (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 version integer,
 action text NOT NULL CHECK(action IN ('saved','submitted','approved','rejected','hidden','restored')),
 reason text,
 actor_id text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_listing_events_idx ON clinic_listing_events(clinic_id,created_at DESC);

CREATE OR REPLACE FUNCTION listing_evidence_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Verified credential, photo and moderation evidence are append-only';
END;
$$;
CREATE TRIGGER credential_submissions_immutable BEFORE UPDATE OR DELETE
 ON clinic_dentist_credential_submissions FOR EACH ROW EXECUTE FUNCTION listing_evidence_immutable();
CREATE TRIGGER credential_decisions_immutable BEFORE UPDATE OR DELETE
 ON clinic_dentist_credential_decisions FOR EACH ROW EXECUTE FUNCTION listing_evidence_immutable();
CREATE TRIGGER listing_photos_immutable BEFORE UPDATE OR DELETE
 ON clinic_listing_photos FOR EACH ROW EXECUTE FUNCTION listing_evidence_immutable();
CREATE TRIGGER listing_events_immutable BEFORE UPDATE OR DELETE
 ON clinic_listing_events FOR EACH ROW EXECUTE FUNCTION listing_evidence_immutable();

CREATE OR REPLACE FUNCTION clinic_listing_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id OR
    NEW.version IS DISTINCT FROM OLD.version OR NEW.profile IS DISTINCT FROM OLD.profile OR
    NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at
 THEN RAISE EXCEPTION 'Listing snapshot content and ownership are immutable'; END IF;
 IF NOT((OLD.status='draft' AND NEW.status='pending') OR
       (OLD.status='pending' AND NEW.status IN ('approved','rejected'))) THEN
   RAISE EXCEPTION 'Invalid listing moderation transition'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER listing_versions_no_delete BEFORE DELETE ON clinic_listing_versions
 FOR EACH ROW EXECUTE FUNCTION listing_evidence_immutable();
CREATE TRIGGER listing_versions_protect_snapshot BEFORE UPDATE ON clinic_listing_versions
 FOR EACH ROW EXECUTE FUNCTION clinic_listing_version_guard();
