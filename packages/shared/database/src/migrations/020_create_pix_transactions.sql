CREATE TABLE IF NOT EXISTS pix_transactions (
  transaction_id VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  billing_record_id VARCHAR(255),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  description VARCHAR(255) NOT NULL,
  qr_code_payload TEXT NOT NULL,
  qr_code_base64 TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  provider_transaction_id VARCHAR(255),
  provider_confirmation_id VARCHAR(255),
  provider_webhook_event_id VARCHAR(255),
  completed_at TIMESTAMP,
  last_provider_sync_at TIMESTAMP,
  billing_settlement_status VARCHAR(32) NOT NULL DEFAULT 'not_applicable',
  billing_settled_at TIMESTAMP,
  billing_settlement_error TEXT,
  cash_reconciliation_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  cash_reconciled_at TIMESTAMP,
  cash_reconciliation_error TEXT,
  cash_register_id VARCHAR(255),
  cash_movement_id VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pix_transactions_provider_tx
  ON pix_transactions(provider, provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_pix_transactions_account_status
  ON pix_transactions(account_id, status);

CREATE INDEX IF NOT EXISTS idx_pix_transactions_billing_record
  ON pix_transactions(billing_record_id);
