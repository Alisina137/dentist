-- PH14: patient portal identity, explicit consent, independent adult authorizations.
-- The patient portal has no foreign key into clinic_patients, encounters, invoices or chart records.
-- No PHI is released by membership in a patient portal account or by a family declaration.
CREATE TABLE patient_profiles (
 user_id text PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
 preferred_name text NOT NULL,
 city text NOT NULL DEFAULT 'Kabul',
 phone text,
 legal_version text NOT NULL,
 privacy_version text NOT NULL,
 accepted_at timestamptz NOT NULL,
 adult_attested boolean NOT NULL CHECK (adult_attested = true),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(char_length(preferred_name) BETWEEN 2 AND 120),
 CHECK(char_length(city) BETWEEN 2 AND 90),
 CHECK(phone IS NULL OR char_length(phone) BETWEEN 7 AND 22)
);
CREATE TABLE patient_notification_preferences (
 user_id text PRIMARY KEY REFERENCES patient_profiles(user_id) ON DELETE CASCADE,
 email_booking boolean NOT NULL DEFAULT false,
 email_updates boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE patient_dependents (
 id text PRIMARY KEY,
 guardian_user_id text NOT NULL REFERENCES patient_profiles(user_id) ON DELETE CASCADE,
 member_type text NOT NULL CHECK(member_type IN ('minor','adult')),
 display_name text NOT NULL,
 relationship text NOT NULL CHECK(relationship IN ('child','legal_guardian','adult_authorized')),
 date_of_birth date,
 adult_user_id text REFERENCES auth_users(id),
 authorization_basis text NOT NULL CHECK(authorization_basis IN
   ('minor_guardian_attestation','adult_account_acceptance')),
 guardian_policy_version text NOT NULL,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 authorized_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (char_length(display_name) BETWEEN 2 AND 120),
 CHECK ((member_type='minor' AND date_of_birth IS NOT NULL AND adult_user_id IS NULL
     AND authorization_basis='minor_guardian_attestation' AND relationship IN ('child','legal_guardian'))
   OR (member_type='adult' AND adult_user_id IS NOT NULL AND date_of_birth IS NULL
     AND authorization_basis='adult_account_acceptance' AND relationship='adult_authorized')),
 CHECK ((status='revoked')=(revoked_at IS NOT NULL)),
 CHECK (guardian_user_id<>adult_user_id)
);
CREATE UNIQUE INDEX patient_active_adult_delegate_unique ON patient_dependents
 (guardian_user_id,adult_user_id) WHERE member_type='adult' AND status='active';
CREATE INDEX patient_dependents_guardian_idx ON patient_dependents
 (guardian_user_id,status,created_at DESC);
CREATE INDEX patient_dependents_adult_idx ON patient_dependents
 (adult_user_id,status,created_at DESC) WHERE adult_user_id IS NOT NULL;
CREATE TABLE patient_family_invitations (
 id text PRIMARY KEY,
 guardian_user_id text NOT NULL REFERENCES patient_profiles(user_id) ON DELETE CASCADE,
 target_user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
 relationship text NOT NULL DEFAULT 'adult_authorized' CHECK(relationship='adult_authorized'),
 status text NOT NULL DEFAULT 'pending'
   CHECK(status IN ('pending','accepted','declined','cancelled','expired')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 decided_at timestamptz,
 dependent_id text REFERENCES patient_dependents(id),
 CHECK(guardian_user_id<>target_user_id),
 CHECK((status='pending' AND decided_at IS NULL) OR
  (status<>'pending' AND decided_at IS NOT NULL)),
 CHECK((status='accepted')=(dependent_id IS NOT NULL))
);
CREATE UNIQUE INDEX patient_pending_family_invite_unique ON patient_family_invitations
 (guardian_user_id,target_user_id) WHERE status='pending';
CREATE INDEX patient_family_invitations_target_idx ON patient_family_invitations
 (target_user_id,status,expires_at);
CREATE INDEX patient_family_invitations_guardian_idx ON patient_family_invitations
 (guardian_user_id,status,created_at DESC);
CREATE TABLE patient_consent_events (
 id text PRIMARY KEY,
 user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
 subject_type text NOT NULL CHECK(subject_type IN
  ('portal_terms','portal_privacy','family_minor','family_adult','notifications','data_access')),
 subject_id text,
 consent boolean NOT NULL,
 policy_version text NOT NULL,
 actor_id text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_consent_events_user_idx ON patient_consent_events(user_id,created_at DESC);

-- Consent records may only be appended; medical/legal audit changes are not silently rewritten.
CREATE OR REPLACE FUNCTION block_patient_consent_rewrite()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'PATIENT_CONSENT_EVENTS_APPEND_ONLY' USING ERRCODE='23514';
END;$$;
CREATE TRIGGER patient_consent_events_immutable
 BEFORE UPDATE OR DELETE ON patient_consent_events
 FOR EACH ROW EXECUTE FUNCTION block_patient_consent_rewrite();
