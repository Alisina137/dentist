-- PH11: Operational clinic expenses. Distinct from PH10 patient receivables.
-- Monetary values are nonnegative integer AFN; expense corrections are versioned.
CREATE TABLE clinic_expense_counters (
 clinic_id text PRIMARY KEY REFERENCES clinics(id),
 next_number integer NOT NULL DEFAULT 1 CHECK(next_number BETWEEN 1 AND 2147483646)
);

CREATE TABLE clinic_expenses (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 expense_number integer NOT NULL CHECK(expense_number>0),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 status text NOT NULL DEFAULT 'posted' CHECK(status IN ('posted','void')),
 expense_date date NOT NULL,
 category text NOT NULL CHECK(category IN ('rent','salary','supplies','utilities','other')),
 description text NOT NULL CHECK(length(trim(description)) BETWEEN 3 AND 500),
 amount_afn integer NOT NULL CHECK(amount_afn BETWEEN 1 AND 2000000000),
 payment_method text NOT NULL CHECK(payment_method IN ('cash','bank_transfer','other_manual')),
 reference text,
 attribution text,
 void_reason text,
 created_by text NOT NULL REFERENCES auth_users(id),
 updated_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(clinic_id,expense_number),
 UNIQUE(id,clinic_id),
 CHECK(reference IS NULL OR length(reference)<=120),
 CHECK(attribution IS NULL OR length(attribution)<=120),
 CHECK((status='posted' AND void_reason IS NULL)
 OR (status='void' AND void_reason IS NOT NULL AND length(trim(void_reason))>=10))
);
CREATE INDEX clinic_expenses_period_idx ON clinic_expenses(clinic_id,expense_date DESC,id);
CREATE INDEX clinic_expenses_category_idx ON clinic_expenses(clinic_id,status,category,expense_date);

CREATE TABLE clinic_expense_receipts (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 expense_id text NOT NULL,
 version integer NOT NULL CHECK(version>0),
 file_name text NOT NULL CHECK(length(trim(file_name)) BETWEEN 3 AND 120),
 mime_type text NOT NULL CHECK(mime_type IN ('application/pdf','image/png','image/jpeg')),
 byte_length integer NOT NULL CHECK(byte_length BETWEEN 1 AND 1048576),
 sha256_hex text NOT NULL CHECK(length(sha256_hex)=64),
 document_bytes bytea NOT NULL,
 uploaded_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(expense_id,version),
 UNIQUE(id,expense_id),
 FOREIGN KEY(expense_id,clinic_id) REFERENCES clinic_expenses(id,clinic_id)
);
CREATE INDEX clinic_expense_receipts_idx ON clinic_expense_receipts(clinic_id,expense_id,version);

-- All create/correction/void records are immutable. Idempotency keyed per staff member.
CREATE TABLE clinic_expense_versions (
 id text PRIMARY KEY,
 expense_id text NOT NULL,
 clinic_id text NOT NULL REFERENCES clinics(id),
 version integer NOT NULL CHECK(version>0),
 action text NOT NULL CHECK(action IN ('created','corrected','voided')),
 expense_date date NOT NULL,
 category text NOT NULL CHECK(category IN ('rent','salary','supplies','utilities','other')),
 description text NOT NULL,
 amount_afn integer NOT NULL CHECK(amount_afn BETWEEN 1 AND 2000000000),
 payment_method text NOT NULL CHECK(payment_method IN ('cash','bank_transfer','other_manual')),
 reference text,
 attribution text,
 receipt_id text REFERENCES clinic_expense_receipts(id),
 correction_reason text,
 actor_id text NOT NULL REFERENCES auth_users(id),
 action_key text NOT NULL CHECK(length(action_key) BETWEEN 8 AND 100),
 request_digest text NOT NULL CHECK(length(request_digest)=64),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(expense_id,version),
 UNIQUE(clinic_id,actor_id,action_key),
 FOREIGN KEY(expense_id,clinic_id) REFERENCES clinic_expenses(id,clinic_id),
 CHECK((action='created' AND correction_reason IS NULL) OR
 (action IN ('corrected','voided') AND correction_reason IS NOT NULL
  AND length(trim(correction_reason)) BETWEEN 10 AND 500))
);
CREATE INDEX clinic_expense_versions_hist_idx ON clinic_expense_versions(clinic_id,expense_id,version DESC);

CREATE OR REPLACE FUNCTION clinic_expense_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Expense evidence and correction history are append-only';
END;
$$;
CREATE TRIGGER clinic_expense_version_history_immutable BEFORE UPDATE OR DELETE ON clinic_expense_versions
 FOR EACH ROW EXECUTE FUNCTION clinic_expense_immutable();
CREATE TRIGGER clinic_expense_receipt_immutable BEFORE UPDATE OR DELETE ON clinic_expense_receipts
 FOR EACH ROW EXECUTE FUNCTION clinic_expense_immutable();
CREATE TRIGGER clinic_expense_no_delete BEFORE DELETE ON clinic_expenses
 FOR EACH ROW EXECUTE FUNCTION clinic_expense_immutable();

CREATE OR REPLACE FUNCTION clinic_expense_update_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id
   OR NEW.expense_number IS DISTINCT FROM OLD.expense_number
   OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at
   OR NEW.revision IS DISTINCT FROM OLD.revision+1
 THEN RAISE EXCEPTION 'Expense identity and revision are immutable'; END IF;
 IF OLD.status='void' OR NEW.status NOT IN ('posted','void')
 THEN RAISE EXCEPTION 'Voided expenses cannot be modified'; END IF;
 IF NEW.status='void' AND (NEW.void_reason IS NULL OR length(trim(NEW.void_reason))<10)
 THEN RAISE EXCEPTION 'Voiding requires an explanation'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER clinic_expense_update_guard_trigger BEFORE UPDATE ON clinic_expenses
 FOR EACH ROW EXECUTE FUNCTION clinic_expense_update_guard();
