-- Clinic improvement Phase 17: structured, non-clinical pilot observations.
-- Contains NO patient names, contacts, diagnoses, free text or attachments.
-- Scope is always the authenticated clinic and all mutations have audit rows.
CREATE TABLE clinic_pilot_observations (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
 actor_id text NOT NULL REFERENCES auth_users(id),
 area text NOT NULL CHECK(area IN ('calendar','queue','booking','notifications','reports','finance','staff','settings','mobile','accessibility')),
 symptom text NOT NULL CHECK(symptom IN ('crash','blank','slow','wrong_state','permission','navigation','localization','offline','visual','other')),
 severity text NOT NULL CHECK(severity IN ('blocker','high','medium','low')),
 frequency text NOT NULL CHECK(frequency IN ('once','sometimes','always')),
 network text NOT NULL CHECK(network IN ('wifi','slow','offline','unknown')),
 device text NOT NULL CHECK(device IN ('desktop','android','ios','narrow')),
 locale text NOT NULL CHECK(locale IN ('en','fa-AF','ps-AF')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','triaged','in_progress','resolved','deferred')),
 resolution text CHECK(resolution IS NULL OR resolution IN ('reproduced','fixed_in_build','not_reproducible','duplicate','followup')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_pilot_observations_clinic_time_idx
 ON clinic_pilot_observations(clinic_id,created_at DESC,id);
CREATE INDEX clinic_pilot_observations_clinic_status_idx
 ON clinic_pilot_observations(clinic_id,status,updated_at DESC);
CREATE INDEX clinic_pilot_observations_actor_rate_idx
 ON clinic_pilot_observations(actor_id,created_at DESC);
-- Immutable event evidence; no clinical data or raw comments.
CREATE TABLE clinic_pilot_observation_events (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
 observation_id text NOT NULL REFERENCES clinic_pilot_observations(id),
 actor_id text NOT NULL REFERENCES auth_users(id),
 previous_status text,
 next_status text NOT NULL CHECK(next_status IN ('open','triaged','in_progress','resolved','deferred')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_pilot_observation_events_clinic_idx
 ON clinic_pilot_observation_events(clinic_id,created_at DESC);
CREATE OR REPLACE FUNCTION clinic_pilot_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Pilot observation events are append-only';
END; $$;
CREATE TRIGGER clinic_pilot_event_immutable
 BEFORE UPDATE OR DELETE ON clinic_pilot_observation_events
 FOR EACH ROW EXECUTE FUNCTION clinic_pilot_event_immutable();
