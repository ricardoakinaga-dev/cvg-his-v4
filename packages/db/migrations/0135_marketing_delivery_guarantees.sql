ALTER TABLE marketing_campaign_deliveries
  ADD COLUMN IF NOT EXISTS delivery_key TEXT,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

UPDATE marketing_campaign_deliveries
SET delivery_key = id
WHERE delivery_key IS NULL;

ALTER TABLE marketing_campaign_deliveries
  ALTER COLUMN delivery_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS marketing_campaign_deliveries_account_delivery_key_unique
  ON marketing_campaign_deliveries (account_id, delivery_key);

CREATE INDEX IF NOT EXISTS idx_marketing_deliveries_account_retry
  ON marketing_campaign_deliveries (account_id, status, next_attempt_at)
  WHERE status = 'failed';

COMMENT ON COLUMN marketing_campaign_deliveries.delivery_key IS
  'Stable tenant-scoped idempotency key for a campaign delivery.';

COMMENT ON COLUMN marketing_campaign_deliveries.next_attempt_at IS
  'Earliest timestamp at which a failed delivery may be retried.';

COMMENT ON COLUMN marketing_campaign_deliveries.last_attempt_at IS
  'Timestamp of the most recent provider attempt.';
