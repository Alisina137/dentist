-- PH10: clinic-patient billing is separate from PLATFORM subscription invoices.
-- AFN integer amounts (not binary floating point); ledger entries always append-only.
CREATE TABLE clinic_invoice_counters (
 clinic_id text PRIMARY KEY REFERENCES clinics(id),
 next_number integer NOT NULL DEFAULT 1 CHECK(next_number BETWEEN 1 AND 2147483646)
);
CREATE TABLE clinic_invoices (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 patient_id text NOT NULL REFERENCES clinic_patients(id),
 invoice_number integer NOT NULL CHECK(invoice_number>0),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','void')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 source_type text NOT NULL CHECK(source_type IN ('appointment','encounter','treatment_stage')),
 source_id text NOT NULL,
 total_afn integer NOT NULL CHECK(total_afn BETWEEN 0 AND 2000000000),
 due_date date,
 issued_at timestamptz,
 voided_at timestamptz,
 void_reason text,
 internal_note text CHECK(internal_note IS NULL OR length(internal_note)<=1000),
 created_by text NOT NULL REFERENCES auth_users(id),
 issued_by text REFERENCES auth_users(id),
 voided_by text REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (clinic_id,invoice_number),
 UNIQUE (id,clinic_id,patient_id),
 CONSTRAINT invoice_status_dates CHECK(
  (status='draft' AND issued_at IS NULL AND voided_at IS NULL) OR
  (status='issued' AND issued_at IS NOT NULL AND voided_at IS NULL) OR
  (status='void' AND issued_at IS NOT NULL AND voided_at IS NOT NULL
    AND void_reason IS NOT NULL AND length(trim(void_reason))>=10)
 )
);
CREATE INDEX clinic_invoices_patient_idx ON clinic_invoices(clinic_id,patient_id,created_at DESC);
CREATE INDEX clinic_invoices_status_idx ON clinic_invoices(clinic_id,status,due_date,issued_at);
-- Prevent two live invoices from billing a single completed procedure/encounter/appointment.
CREATE UNIQUE INDEX clinic_invoices_source_unique ON clinic_invoices(clinic_id,source_type,source_id)
 WHERE status<>'void';

CREATE TABLE clinic_invoice_versions (
 invoice_id text NOT NULL REFERENCES clinic_invoices(id),
 clinic_id text NOT NULL REFERENCES clinics(id),
 patient_id text NOT NULL REFERENCES clinic_patients(id),
 version integer NOT NULL CHECK(version>0),
 items jsonb NOT NULL CHECK(jsonb_typeof(items)='array'),
 total_afn integer NOT NULL CHECK(total_afn BETWEEN 0 AND 2000000000),
 note text,
 author_id text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(invoice_id,version),
 FOREIGN KEY(invoice_id,clinic_id,patient_id)
   REFERENCES clinic_invoices(id,clinic_id,patient_id)
);
CREATE INDEX clinic_invoice_versions_history_idx
 ON clinic_invoice_versions(clinic_id,patient_id,invoice_id,version DESC);

CREATE TABLE clinic_payment_entries (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 patient_id text NOT NULL REFERENCES clinic_patients(id),
 invoice_id text NOT NULL REFERENCES clinic_invoices(id),
 kind text NOT NULL CHECK(kind IN ('payment','reversal','credit')),
 amount_afn integer NOT NULL CHECK(amount_afn BETWEEN 1 AND 2000000000),
 method text NOT NULL CHECK(method IN ('cash','bank_transfer','other_manual','credit')),
 reference text CHECK(reference IS NULL OR length(reference)<=120),
 note text CHECK(note IS NULL OR length(note)<=500),
 reverses_entry_id text UNIQUE REFERENCES clinic_payment_entries(id),
 action_key text NOT NULL CHECK(length(action_key) BETWEEN 8 AND 100),
 request_digest text NOT NULL CHECK(length(request_digest)=64),
 created_by text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(clinic_id,created_by,action_key),
 FOREIGN KEY(invoice_id,clinic_id,patient_id) REFERENCES clinic_invoices(id,clinic_id,patient_id),
 CONSTRAINT clinic_payment_kind_valid CHECK(
   (kind='payment' AND method<>'credit' AND reverses_entry_id IS NULL) OR
   (kind='credit' AND method='credit' AND reverses_entry_id IS NULL) OR
   (kind='reversal' AND reverses_entry_id IS NOT NULL)
 )
);
CREATE INDEX clinic_payment_entries_invoice_idx ON clinic_payment_entries(clinic_id,invoice_id,created_at);
CREATE INDEX clinic_payment_entries_clinic_idx ON clinic_payment_entries(clinic_id,created_at DESC);
CREATE UNIQUE INDEX clinic_payment_reference_unique
 ON clinic_payment_entries(clinic_id,invoice_id,method,reference)
 WHERE kind='payment' AND reference IS NOT NULL;
CREATE TABLE clinic_invoice_events (
 id text PRIMARY KEY,
 clinic_id text NOT NULL REFERENCES clinics(id),
 patient_id text NOT NULL REFERENCES clinic_patients(id),
 invoice_id text NOT NULL REFERENCES clinic_invoices(id),
 action text NOT NULL CHECK(action IN ('created','edited','issued','void')),
 version integer NOT NULL CHECK(version>0),
 reason text,
 actor_id text NOT NULL REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(invoice_id,clinic_id,patient_id) REFERENCES clinic_invoices(id,clinic_id,patient_id)
);
CREATE INDEX clinic_invoice_events_history_idx ON clinic_invoice_events(clinic_id,invoice_id,created_at);

CREATE OR REPLACE FUNCTION clinic_billing_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Issued finance evidence and ledger history are append-only';
END;
$$;
CREATE TRIGGER clinic_invoice_versions_no_change
 BEFORE UPDATE OR DELETE ON clinic_invoice_versions
 FOR EACH ROW EXECUTE FUNCTION clinic_billing_immutable();
CREATE TRIGGER clinic_payment_entries_no_change
 BEFORE UPDATE OR DELETE ON clinic_payment_entries
 FOR EACH ROW EXECUTE FUNCTION clinic_billing_immutable();
CREATE TRIGGER clinic_invoice_events_no_change
 BEFORE UPDATE OR DELETE ON clinic_invoice_events
 FOR EACH ROW EXECUTE FUNCTION clinic_billing_immutable();
CREATE OR REPLACE FUNCTION clinic_invoice_change_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id
 OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
 OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
 OR NEW.source_type IS DISTINCT FROM OLD.source_type OR NEW.source_id IS DISTINCT FROM OLD.source_id
 OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at
 THEN RAISE EXCEPTION 'Invoice identity and source are immutable'; END IF;
 IF OLD.status='void' THEN RAISE EXCEPTION 'Voided invoices are immutable'; END IF;
 IF OLD.status='issued' THEN
  IF NEW.status NOT IN ('issued','void') OR NEW.total_afn IS DISTINCT FROM OLD.total_afn
   OR NEW.version IS DISTINCT FROM OLD.version OR NEW.due_date IS DISTINCT FROM OLD.due_date
   OR NEW.internal_note IS DISTINCT FROM OLD.internal_note OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
  THEN RAISE EXCEPTION 'Issued invoice terms are immutable'; END IF;
  IF NEW.status='void' AND (NEW.voided_at IS NULL OR NEW.void_reason IS NULL)
  THEN RAISE EXCEPTION 'Voiding requires date and reason'; END IF;
 END IF;
 IF OLD.status='draft' AND NEW.status NOT IN ('draft','issued')
 THEN RAISE EXCEPTION 'Draft invoices must be issued before void'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER clinic_invoice_change_guard_trigger
 BEFORE UPDATE ON clinic_invoices FOR EACH ROW EXECUTE FUNCTION clinic_invoice_change_guard();
