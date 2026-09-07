-- A committed dispatch marker fences ambiguous capture retries. It is never
-- cleared automatically: subsequent requests reconcile the existing charge.
ALTER TABLE card_transactions ADD COLUMN capture_requested_at timestamptz;
