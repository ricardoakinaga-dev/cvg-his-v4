-- Durable webhook delivery executor: tenant-scoped claim, retries and fencing.

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS response_error text,
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz,
  ADD COLUMN IF NOT EXISTS lease_owner varchar(160),
  ADD COLUMN IF NOT EXISTS lease_token uuid,
  ADD COLUMN IF NOT EXISTS lease_version bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;

UPDATE webhook_deliveries
SET status = 'retrying',
    next_retry_at = COALESCE(next_retry_at, now()),
    lease_owner = NULL,
    lease_token = NULL,
    lease_expires_at = NULL
WHERE status = 'processing';

-- Preserve legacy attempt history while making the new invariant valid.
UPDATE webhook_deliveries
SET max_attempts = GREATEST(max_attempts, attempts)
WHERE attempts > max_attempts;

ALTER TABLE webhook_deliveries
  ADD CONSTRAINT webhook_deliveries_status_check
    CHECK (status IN ('pending', 'processing', 'retrying', 'delivered', 'failed')),
  ADD CONSTRAINT webhook_deliveries_attempts_check
    CHECK (attempts >= 0 AND max_attempts > 0 AND attempts <= max_attempts),
  ADD CONSTRAINT webhook_deliveries_lease_version_check
    CHECK (lease_version >= 0),
  ADD CONSTRAINT webhook_deliveries_lease_state_check
    CHECK (
      (status = 'processing'
        AND lease_owner IS NOT NULL
        AND lease_token IS NOT NULL
        AND lease_expires_at IS NOT NULL)
      OR
      (status <> 'processing'
        AND lease_owner IS NULL
        AND lease_token IS NULL
        AND lease_expires_at IS NULL)
    );

CREATE INDEX IF NOT EXISTS webhook_deliveries_claim_idx
  ON webhook_deliveries(account_id, status, next_retry_at, lease_expires_at, created_at);

ALTER TABLE webhooks FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN webhook_deliveries.lease_owner IS
  'Worker instance currently responsible for this webhook attempt';
COMMENT ON COLUMN webhook_deliveries.lease_token IS
  'Opaque fencing token required by every processing transition';
COMMENT ON COLUMN webhook_deliveries.lease_version IS
  'Monotonic fencing version incremented on every claim or takeover';
COMMENT ON COLUMN webhook_deliveries.lease_expires_at IS
  'Database-clock deadline after which another worker may take over';
COMMENT ON COLUMN webhook_deliveries.dead_lettered_at IS
  'Terminal timestamp after max attempts are exhausted';
