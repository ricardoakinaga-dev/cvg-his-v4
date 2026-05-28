ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS resulted_at TIMESTAMP;
ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS released_by_user_id VARCHAR(255);
ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS signed_by_user_id VARCHAR(255);
ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS signature_hash VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_diagnostic_orders_account_resulted
  ON diagnostic_orders(account_id, resulted_at DESC);
