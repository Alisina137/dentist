-- PH03: tenant-scoped verified staff access, one-role-per-membership and unpublished dentist identities.
CREATE TABLE clinic_memberships (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id),
  user_id text NOT NULL REFERENCES auth_users(id),
  role text NOT NULL CHECK (role IN ('owner','manager','dentist','receptionist','assistant','cashier')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  invited_by text REFERENCES auth_users(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  changed_at timestamptz NOT NULL DEFAULT now(),
  suspended_at timestamptz,
  revoked_at timestamptz,
  reason text,
  CONSTRAINT clinic_membership_unique UNIQUE (clinic_id,user_id)
);
CREATE INDEX clinic_membership_user_status_idx ON clinic_memberships(user_id,status);
CREATE INDEX clinic_membership_clinic_status_idx ON clinic_memberships(clinic_id,status,role);
-- Preserve ownership of existing PH02 clinics. The owner is never mutable by staff endpoints.
INSERT INTO clinic_memberships(id,clinic_id,user_id,role,status)
SELECT gen_random_uuid()::text,c.id,c.owner_user_id,'owner','active'
FROM clinics c
ON CONFLICT (clinic_id,user_id) DO NOTHING;

CREATE TABLE clinic_invitations (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager','dentist','receptionist','assistant','cashier')),
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  invited_by text NOT NULL REFERENCES auth_users(id),
  accepted_by text REFERENCES auth_users(id),
  resend_count integer NOT NULL DEFAULT 0 CHECK (resend_count BETWEEN 0 AND 25)
);
CREATE INDEX clinic_invite_clinic_status_idx ON clinic_invitations(clinic_id,status,created_at DESC);
CREATE UNIQUE INDEX clinic_invite_pending_email_idx ON clinic_invitations(clinic_id,lower(email)) WHERE status='pending';

CREATE TABLE clinic_dentist_drafts (
  membership_id text PRIMARY KEY REFERENCES clinic_memberships(id),
  clinic_id text NOT NULL REFERENCES clinics(id),
  user_id text NOT NULL REFERENCES auth_users(id),
  display_name text NOT NULL,
  specialty text,
  qualifications text,
  professional_license text,
  experience_years integer CHECK (experience_years IS NULL OR (experience_years >= 0 AND experience_years <= 70)),
  biography text,
  draft_version integer NOT NULL DEFAULT 1 CHECK(draft_version > 0),
  verification_state text NOT NULL DEFAULT 'unverified' CHECK (verification_state='unverified'),
  updated_by text REFERENCES auth_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dentist_drafts_clinic_idx ON clinic_dentist_drafts(clinic_id);
