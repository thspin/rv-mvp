-- ============================================================================
-- MIGRATION 004: Payment due-date tracking + reminder log
-- Purpose: Track next_payment_due and last_payment_date per athlete so the
--          daily cron can send reminders (T-7d, T-3d, T-0, T+1d, T+7d) and
--          stop the manual WhatsApp collection workflow.
-- ============================================================================

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS next_payment_due  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;

-- Idempotency log: one row per (athlete, reminder_type, calendar day).
-- The cron can be re-run safely without spamming notifications.
CREATE TABLE IF NOT EXISTS payment_reminder_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id    UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (athlete_id, reminder_type, (sent_at::date))
);

CREATE INDEX IF NOT EXISTS idx_payment_reminder_log_athlete
  ON payment_reminder_log (athlete_id);

-- Index for the cron job: find athletes whose payment is due/overdue.
CREATE INDEX IF NOT EXISTS idx_athletes_next_payment_due_active
  ON athletes (next_payment_due)
  WHERE team_status = 'activo' AND payment_status IS DISTINCT FROM 'Pagado';

ALTER TABLE payment_reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_reminder_log_select_admin" ON payment_reminder_log;
DROP POLICY IF EXISTS "payment_reminder_log_insert_service" ON payment_reminder_log;

-- Only the cron job (service_role) needs to read/insert into the log.
-- Admins may want visibility, so allow SELECT for admins.
CREATE POLICY "payment_reminder_log_select_admin"
  ON payment_reminder_log
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()::TEXT));
