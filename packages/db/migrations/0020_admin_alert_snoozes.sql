-- Phase E: individual admin alert acknowledgements. Live signals remain authoritative.
-- Per-admin snoozes expire automatically; acknowledging never hides or disables the underlying fault.
CREATE TABLE platform_admin_alert_snoozes (
 user_id text NOT NULL REFERENCES platform_admins(user_id) ON DELETE CASCADE,
 alert_key text NOT NULL CHECK (alert_key IN (
  'delivery_backlog','booking_notifications_failed','support_first_reply_overdue',
  'support_triage_overdue','high_priority_support','unassigned_support',
  'payment_reviews_overdue','clinic_reviews_overdue','security_denials')),
 snoozed_at timestamptz NOT NULL DEFAULT now(),
 until_at timestamptz NOT NULL,
 PRIMARY KEY(user_id,alert_key),
 CHECK(until_at>snoozed_at)
);
CREATE INDEX platform_admin_alert_snoozes_due_idx ON platform_admin_alert_snoozes(until_at);
