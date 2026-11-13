-- PH02: independent clinic verification, versioned plans and auditable manual billing.
CREATE TABLE platform_plan_versions (
 id text PRIMARY KEY, plan_key text NOT NULL CHECK (plan_key IN ('starter','professional','business')),
 version integer NOT NULL CHECK(version > 0),
 label text NOT NULL, billing_period text NOT NULL CHECK (billing_period IN ('monthly','annual')),
 price_afn integer NOT NULL CHECK (price_afn > 0),
 staff_limit integer NOT NULL CHECK (staff_limit > 0),
 branch_limit integer NOT NULL DEFAULT 1 CHECK (branch_limit > 0),
 trial_days integer NOT NULL DEFAULT 14 CHECK(trial_days BETWEEN 0 AND 30),
 grace_days integer NOT NULL DEFAULT 7 CHECK(grace_days BETWEEN 0 AND 30),
 entitlements text NOT NULL DEFAULT 'core',
 active boolean NOT NULL DEFAULT true,
 effective_at timestamptz NOT NULL DEFAULT now(),
 created_by text REFERENCES auth_users(id), created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT plan_key_version_period_idx UNIQUE(plan_key,version,billing_period)
);
CREATE TABLE clinics (
 id text PRIMARY KEY, owner_user_id text NOT NULL REFERENCES auth_users(id),
 legal_name text NOT NULL, display_name text NOT NULL,
 clinic_type text NOT NULL CHECK(clinic_type IN ('solo','office','specialty')),
 province text NOT NULL, city text NOT NULL, district text,
 address text NOT NULL, phone text NOT NULL, email text NOT NULL,
 license_number text, timezone text NOT NULL DEFAULT 'Asia/Kabul',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','needs_info','approved','rejected','suspended')),
 selected_plan_id text REFERENCES platform_plan_versions(id),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 submitted_at timestamptz,reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX clinics_license_idx ON clinics(lower(trim(license_number))) WHERE license_number IS NOT NULL;
CREATE INDEX clinics_owner_idx ON clinics(owner_user_id);
CREATE INDEX clinics_status_idx ON clinics(status,updated_at DESC);
CREATE TABLE clinic_subscriptions (
 id text PRIMARY KEY, clinic_id text NOT NULL UNIQUE REFERENCES clinics(id),
 plan_version_id text NOT NULL REFERENCES platform_plan_versions(id),
 status text NOT NULL DEFAULT 'trialing' CHECK(status IN ('trialing','active','grace','expired','cancelled')),
 trial_ends_at timestamptz,current_period_ends_at timestamptz,
 pending_plan_version_id text REFERENCES platform_plan_versions(id),
 started_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE platform_subscription_invoices (
 id text PRIMARY KEY, clinic_id text NOT NULL REFERENCES clinics(id),
 plan_version_id text NOT NULL REFERENCES platform_plan_versions(id),
 amount_afn integer NOT NULL CHECK (amount_afn>0),
 status text NOT NULL DEFAULT 'awaiting' CHECK(status IN ('awaiting','paid','void')),
 evidence_reference text,verified_by text REFERENCES auth_users(id),
 verified_at timestamptz,period_ends_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX platform_invoice_clinic_idx ON platform_subscription_invoices(clinic_id);
CREATE UNIQUE INDEX platform_invoice_one_open_idx ON platform_subscription_invoices(clinic_id) WHERE status='awaiting';
CREATE TABLE clinic_evidence (
 id text PRIMARY KEY,clinic_id text NOT NULL REFERENCES clinics(id),
 kind text NOT NULL CHECK(kind IN ('clinic_license','professional_credential','other')),
 file_name text NOT NULL, mime text NOT NULL CHECK(mime IN ('application/pdf','image/png','image/jpeg')),
 size_bytes integer NOT NULL CHECK(size_bytes>0 AND size_bytes<=2097152),
 digest text NOT NULL,content text NOT NULL,uploaded_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_evidence_clinic_idx ON clinic_evidence(clinic_id);
CREATE TABLE clinic_review_events (
 id text PRIMARY KEY,clinic_id text NOT NULL REFERENCES clinics(id),
 actor_id text NOT NULL REFERENCES auth_users(id),
 action text NOT NULL,reason text,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_review_clinic_idx ON clinic_review_events(clinic_id,created_at DESC);
