-- PH19: short-lived token grants, immutable access history and retention proposals.
-- Exported private records are never saved in these tables.
CREATE TABLE clinic_export_jobs (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 actor_id text NOT NULL REFERENCES auth_users(id),
 token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
 status text NOT NULL CHECK(status IN ('ready','downloaded','revoked')),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 12 AND 240),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 downloaded_at timestamptz,
 CHECK(expires_at>created_at),
 CHECK((status='downloaded')=(downloaded_at IS NOT NULL))
);
CREATE INDEX clinic_export_jobs_owner_idx ON clinic_export_jobs(clinic_id,actor_id,created_at DESC);
CREATE INDEX clinic_export_jobs_expiry_idx ON clinic_export_jobs(expires_at) WHERE status='ready';
CREATE TABLE clinic_export_events (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 job_id text NOT NULL REFERENCES clinic_export_jobs(id),
 actor_id text NOT NULL REFERENCES auth_users(id),
 action text NOT NULL CHECK(action IN ('created','downloaded','revoked')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_export_events_job_idx ON clinic_export_events(job_id,created_at);
CREATE OR REPLACE FUNCTION clinic_export_event_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Export access history is immutable'; END; $$;
CREATE TRIGGER clinic_export_events_immutable BEFORE UPDATE OR DELETE ON clinic_export_events
 FOR EACH ROW EXECUTE FUNCTION clinic_export_event_no_change();

-- This setting is proposal-only; it never purges health, audit or finance evidence.
CREATE TABLE clinic_retention_preferences (
 clinic_id text PRIMARY KEY REFERENCES clinics(id),
 requested_days integer NOT NULL DEFAULT 1825 CHECK(requested_days IN (365,730,1825,3650)),
 updated_by text NOT NULL REFERENCES auth_users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
