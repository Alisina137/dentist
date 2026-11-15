-- Phase E: Per-platform-admin read state for operational notification inbox.
-- Only opaque alert keys are persisted; no patient, clinical, clinic, message or financial payload.
CREATE TABLE admin_notice_reads (
 admin_id text NOT NULL REFERENCES platform_admins(user_id) ON DELETE CASCADE,
 notice_key text NOT NULL CHECK(length(notice_key) BETWEEN 4 AND 120),
 read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(admin_id,notice_key)
);
CREATE INDEX admin_notice_reads_admin_time_idx ON admin_notice_reads(admin_id,read_at DESC);
