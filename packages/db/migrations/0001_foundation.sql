-- PH01: authentication, admin grants, audit and safe asynchronous message contract.
CREATE TABLE IF NOT EXISTS auth_users (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false, image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  two_factor_enabled boolean NOT NULL DEFAULT false,
  locale text NOT NULL DEFAULT 'fa-AF' CHECK (locale IN ('fa-AF','ps-AF','en')),
  calendar text NOT NULL DEFAULT 'solar_hijri' CHECK (calendar IN ('solar_hijri','gregorian'))
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id text PRIMARY KEY, expires_at timestamptz NOT NULL, token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text, user_agent text,
  user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_accounts (
  id text PRIMARY KEY, account_id text NOT NULL, provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  access_token text, refresh_token text, id_token text,
  access_token_expires_at timestamptz, refresh_token_expires_at timestamptz,
  scope text, password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_accounts_user_idx ON auth_accounts(user_id);
CREATE TABLE IF NOT EXISTS auth_verifications (
  id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx ON auth_verifications(identifier);
CREATE TABLE IF NOT EXISTS auth_two_factors (
  id text PRIMARY KEY,
  user_id text NOT NULL UNIQUE REFERENCES auth_users(id) ON DELETE CASCADE,
  secret text NOT NULL, backup_codes text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  failed_verification_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz
);
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id text PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text,
  revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY, actor_id text, clinic_id text, action text NOT NULL,
  subject_type text NOT NULL, subject_id text, outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events(actor_id, created_at);
CREATE TABLE IF NOT EXISTS outbox_events (
  id text PRIMARY KEY, kind text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  safe_payload text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_events_pending_idx ON outbox_events(state, available_at);
