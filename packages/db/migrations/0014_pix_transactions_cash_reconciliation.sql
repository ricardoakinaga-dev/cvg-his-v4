-- Onda 3.7: Conciliacao financeira explicita de PIX em caixa

ALTER TABLE pix_transactions
  ADD COLUMN IF NOT EXISTS cash_reconciliation_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cash_reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cash_reconciliation_error TEXT,
  ADD COLUMN IF NOT EXISTS cash_register_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cash_movement_id VARCHAR(255);

COMMENT ON COLUMN pix_transactions.cash_reconciliation_status IS 'Estado da conciliacao explicita em caixa apos confirmacao do PIX';
