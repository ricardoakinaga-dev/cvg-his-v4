ALTER TABLE pix_transactions
  ADD COLUMN IF NOT EXISTS cash_reconciliation_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cash_reconciled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cash_reconciliation_error TEXT,
  ADD COLUMN IF NOT EXISTS cash_register_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cash_movement_id VARCHAR(255);
