-- PH18: privacy-safe support, delegated nonclinical support staff and audit trails.
-- No diagnosis, chart, patient record identifiers or invoice line items in support tables.
CREATE TABLE platform_support_agents (
 user_id text PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
 granted_by text NOT NULL REFERENCES auth_users(id),
 granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
CREATE TABLE support_categories (
 code text PRIMARY KEY CHECK(code ~ '^[a-z][a-z0-9_]{2,31}$'),
 label_en text NOT NULL CHECK(length(trim(label_en)) BETWEEN 2 AND 80),
 label_fa text NOT NULL CHECK(length(trim(label_fa)) BETWEEN 2 AND 80),
 label_ps text NOT NULL CHECK(length(trim(label_ps)) BETWEEN 2 AND 80),
 active boolean NOT NULL DEFAULT true,
 sort_order integer NOT NULL DEFAULT 100
);
INSERT INTO support_categories(code,label_en,label_fa,label_ps,sort_order) VALUES
 ('booking','Appointments','نوبت‌ها','لیدنې',10),
 ('account','Account access','دسترسی حساب','حساب ته لاسرسی',20),
 ('billing','Payments and invoices','پرداخت‌ها و فاکتورها','تادیات او بلونه',30),
 ('clinic','Clinic operations','عملیات کلینیک','د کلینیک چارې',40),
 ('technical','Technical problem','مشکل تخنیکی','تخنیکي ستونزه',50),
 ('other','Other question','سوال دیگر','بله پوښتنه',60);
CREATE TABLE support_templates (
 id text PRIMARY KEY CHECK(id ~ '^[a-z][a-z0-9_]{2,31}$'),
 title_en text NOT NULL CHECK(length(trim(title_en)) BETWEEN 3 AND 120),
 title_fa text NOT NULL CHECK(length(trim(title_fa)) BETWEEN 3 AND 120),
 title_ps text NOT NULL CHECK(length(trim(title_ps)) BETWEEN 3 AND 120),
 body_en text NOT NULL CHECK(length(trim(body_en)) BETWEEN 10 AND 1000),
 body_fa text NOT NULL CHECK(length(trim(body_fa)) BETWEEN 10 AND 1000),
 body_ps text NOT NULL CHECK(length(trim(body_ps)) BETWEEN 10 AND 1000),
 active boolean NOT NULL DEFAULT true
);
INSERT INTO support_templates(id,title_en,title_fa,title_ps,body_en,body_fa,body_ps) VALUES
 ('acknowledged','Request received','درخواست دریافت شد','غوښتنه ترلاسه شوه',
 'Your request is in our queue. We will respond here. Please do not send medical or personal details.',
 'درخواست شما ثبت شد. پاسخ را در همین‌جا می‌بینید. لطفاً معلومات صحی یا شخصی نفرستید.',
 'ستاسې غوښتنه ثبت شوه. ځواب دلته ګورئ. مهرباني وکړئ طبي یا شخصي معلومات مه لېږئ.');
CREATE TABLE support_tickets (
 id text PRIMARY KEY,
 reference text NOT NULL UNIQUE CHECK(length(reference) BETWEEN 12 AND 32),
 requester_id text NOT NULL REFERENCES auth_users(id),
 clinic_id text REFERENCES clinics(id),
 category_code text NOT NULL REFERENCES support_categories(code),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 5 AND 120),
 source text NOT NULL CHECK(source IN ('patient','clinic')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','waiting_user','resolved','closed')),
 priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','high')),
 assignee_id text REFERENCES auth_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz
);
CREATE INDEX support_tickets_requester_idx ON support_tickets(requester_id,created_at DESC);
CREATE INDEX support_tickets_status_idx ON support_tickets(status,updated_at DESC);
CREATE INDEX support_tickets_clinic_idx ON support_tickets(clinic_id,created_at DESC);
CREATE TABLE support_ticket_messages (
 id text PRIMARY KEY,
 ticket_id text NOT NULL REFERENCES support_tickets(id),
 author_id text NOT NULL REFERENCES auth_users(id),
 author_role text NOT NULL CHECK(author_role IN ('requester','support')),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 5 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_timeline_idx ON support_ticket_messages(ticket_id,created_at,id);
CREATE TABLE support_ticket_events (
 id text PRIMARY KEY,
 ticket_id text NOT NULL REFERENCES support_tickets(id),
 actor_id text NOT NULL REFERENCES auth_users(id),
 action text NOT NULL CHECK(action IN ('opened','reply','status','assign','escalate')),
 previous_state text,
 new_state text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_events_timeline_idx ON support_ticket_events(ticket_id,created_at,id);
CREATE TABLE support_ticket_internal_notes (
 id text PRIMARY KEY,
 ticket_id text NOT NULL REFERENCES support_tickets(id),
 author_id text NOT NULL REFERENCES auth_users(id),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 5 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_internal_notes_ticket_idx ON support_ticket_internal_notes(ticket_id,created_at,id);
CREATE OR REPLACE FUNCTION support_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Support conversations and events are append-only';
END; $$;
CREATE TRIGGER support_messages_immutable BEFORE UPDATE OR DELETE ON support_ticket_messages
 FOR EACH ROW EXECUTE FUNCTION support_history_immutable();
CREATE TRIGGER support_events_immutable BEFORE UPDATE OR DELETE ON support_ticket_events
 FOR EACH ROW EXECUTE FUNCTION support_history_immutable();
CREATE TRIGGER support_notes_immutable BEFORE UPDATE OR DELETE ON support_ticket_internal_notes
 FOR EACH ROW EXECUTE FUNCTION support_history_immutable();
CREATE INDEX IF NOT EXISTS clinic_payment_entries_reporting_idx
 ON clinic_payment_entries(clinic_id,occurred_at) WHERE kind<>'credit';
CREATE INDEX IF NOT EXISTS clinic_patients_reporting_idx ON clinic_patients(clinic_id,created_at);
CREATE INDEX IF NOT EXISTS audit_events_activity_idx ON audit_events(created_at DESC,action,outcome);
