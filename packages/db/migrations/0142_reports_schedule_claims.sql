-- Durable report worker claims. The lease is account-scoped through the owning
-- schedule and prevents two worker instances from executing one due schedule.

ALTER TABLE report_schedules
  ADD COLUMN IF NOT EXISTS claim_token TEXT,
  ADD COLUMN IF NOT EXISTS claim_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claim_worker_id TEXT;

CREATE INDEX IF NOT EXISTS report_schedules_due_claim_idx
  ON report_schedules (account_id, is_active, next_run_at, claim_until)
  WHERE is_active = TRUE;

COMMENT ON COLUMN report_schedules.claim_token IS
  'Opaque worker lease token for the current scheduled-report execution.';
