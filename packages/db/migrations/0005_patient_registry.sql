-- PH05 patient registry: clinic-owned identifiers and restricted, auditable minimal clinical intake.
-- PH04 scheduling tables are deliberately not fabricated by PH05.
CREATE TABLE clinic_patient_counters (
 clinic_id text PRIMARY KEY REFERENCES clinics(id),
 next_number integer NOT NULL DEFAULT 1 CHECK (next_number BETWEEN 1 AND 2147483646)
);

CREATE TABLE clinic_patients (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 patient_number text NOT NULL,
 preferred_name text NOT NULL CHECK (length(trim(preferred_name)) BETWEEN 2 AND 120),
 family_name text,
 normalized_name text NOT NULL,
 phone text,
 phone_verified boolean NOT NULL DEFAULT false,
 alternate_contact text,
 date_of_birth date,
 age_estimate integer CHECK (age_estimate IS NULL OR age_estimate BETWEEN 0 AND 120),
 dob_is_estimated boolean NOT NULL DEFAULT false,
 province text,
 city text,
 address text,
 emergency_contact text,
 import_source_id text,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
 notice_acknowledged boolean NOT NULL DEFAULT false,
 notice_acknowledged_at timestamptz,
 intake_source text NOT NULL DEFAULT 'frontdesk' CHECK (intake_source IN ('frontdesk','import')),
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 created_by text NOT NULL REFERENCES auth_users(id),
 updated_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT unique_clinic_patient_number UNIQUE (clinic_id,patient_number),
 CONSTRAINT unique_clinic_import_source UNIQUE (clinic_id,import_source_id),
 CONSTRAINT dob_or_age_not_both CHECK (date_of_birth IS NULL OR age_estimate IS NULL)
);
CREATE INDEX clinic_patients_list_idx ON clinic_patients(clinic_id,status,updated_at DESC,id);
CREATE INDEX clinic_patients_search_idx ON clinic_patients(clinic_id,normalized_name,phone);
CREATE INDEX clinic_patients_phone_idx ON clinic_patients(clinic_id,phone);

-- Clinical content is NOT returned from any demographics endpoints or imported from CSV.
CREATE TABLE clinic_patient_intakes (
 patient_id text PRIMARY KEY REFERENCES clinic_patients(id),
 clinic_id text NOT NULL REFERENCES clinics(id),
 allergies_status text NOT NULL DEFAULT 'unknown' CHECK (allergies_status IN ('unknown','none_reported','reported')),
 allergies_notes text,
 medications_status text NOT NULL DEFAULT 'unknown' CHECK (medications_status IN ('unknown','none_reported','reported')),
 medications_notes text,
 conditions_status text NOT NULL DEFAULT 'unknown' CHECK (conditions_status IN ('unknown','none_reported','reported')),
 conditions_notes text,
 source_kind text NOT NULL DEFAULT 'not_collected' CHECK (source_kind IN ('not_collected','patient_reported','clinician_observed','transcribed')),
 source_date date,
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 recorded_by text REFERENCES auth_users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_patient_intakes_clinic_idx ON clinic_patient_intakes(clinic_id);

CREATE TABLE clinic_patient_import_jobs (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 created_by text NOT NULL REFERENCES auth_users(id),
 digest text NOT NULL,
 row_count integer NOT NULL CHECK (row_count BETWEEN 0 AND 500),
 state text NOT NULL DEFAULT 'processing' CHECK (state IN ('processing','completed')),
 created integer NOT NULL DEFAULT 0,
 skipped integer NOT NULL DEFAULT 0,
 needs_review integer NOT NULL DEFAULT 0,
 failed integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CONSTRAINT clinic_import_counts_nonnegative CHECK (created >= 0 AND skipped >= 0 AND needs_review >= 0 AND failed >= 0)
);
CREATE INDEX patient_import_jobs_clinic_idx ON clinic_patient_import_jobs(clinic_id,created_at DESC);

CREATE TABLE clinic_patient_import_rows (
 job_id text NOT NULL REFERENCES clinic_patient_import_jobs(id),
 row_number integer NOT NULL CHECK (row_number >= 2),
 result text NOT NULL CHECK (result IN ('created','skipped','needs_review','failed')),
 code text NOT NULL,
 patient_id text REFERENCES clinic_patients(id),
 PRIMARY KEY (job_id,row_number)
);
