-- Tenant-scoped retry leases prevent concurrent report workers from sending
-- the same failed delivery. The token is also used to fence the final write.

ALTER TABLE report_schedule_deliveries
  ADD COLUMN IF NOT EXISTS claim_token TEXT,
  ADD COLUMN IF NOT EXISTS claim_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claim_worker_id TEXT;

CREATE INDEX IF NOT EXISTS report_schedule_deliveries_failed_claim_idx
  ON report_schedule_deliveries (account_id, status, claim_until, delivered_at, id)
  WHERE status = 'failed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'report_schedule_deliveries_claim_state_chk'
  ) THEN
    ALTER TABLE report_schedule_deliveries
      ADD CONSTRAINT report_schedule_deliveries_claim_state_chk
      CHECK (
        (
          claim_token IS NULL
          AND claim_until IS NULL
          AND claim_worker_id IS NULL
        )
        OR (
          NULLIF(BTRIM(claim_token), '') IS NOT NULL
          AND claim_until IS NOT NULL
          AND NULLIF(BTRIM(claim_worker_id), '') IS NOT NULL
        )
      );
  END IF;
END
$$;

COMMENT ON COLUMN report_schedule_deliveries.claim_token IS
  'Opaque fencing token for the current scheduled-report retry lease.';

COMMENT ON COLUMN report_schedule_deliveries.claim_until IS
  'Expiry of the current scheduled-report retry lease.';

COMMENT ON COLUMN report_schedule_deliveries.claim_worker_id IS
  'Bounded worker identity holding the scheduled-report retry lease.';
