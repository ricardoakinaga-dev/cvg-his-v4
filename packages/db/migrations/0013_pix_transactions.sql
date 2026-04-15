-- Onda 3.6: Persistencia canonica de transacoes PIX

CREATE TABLE IF NOT EXISTS pix_transactions (
  transaction_id VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  billing_record_id VARCHAR(255),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  description VARCHAR(255) NOT NULL,
  qr_code_payload TEXT NOT NULL,
  qr_code_base64 TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_transaction_id VARCHAR(255),
  provider_confirmation_id VARCHAR(255),
  provider_webhook_event_id VARCHAR(255),
  completed_at TIMESTAMPTZ,
  last_provider_sync_at TIMESTAMPTZ,
  billing_settlement_status VARCHAR(32) NOT NULL DEFAULT 'not_applicable',
  billing_settled_at TIMESTAMPTZ,
  billing_settlement_error TEXT,
  cash_reconciliation_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  cash_reconciled_at TIMESTAMPTZ,
  cash_reconciliation_error TEXT,
  cash_register_id VARCHAR(255),
  cash_movement_id VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pix_transactions_provider_tx
  ON pix_transactions (provider, provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_pix_transactions_account_status
  ON pix_transactions (account_id, status);

CREATE INDEX IF NOT EXISTS idx_pix_transactions_billing_record
  ON pix_transactions (billing_record_id);

ALTER TABLE pix_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pix_transactions_tenant_isolation ON pix_transactions;
CREATE POLICY pix_transactions_tenant_isolation ON pix_transactions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE pix_transactions IS 'Persistencia canonica das transacoes PIX do runtime de pagamentos';
COMMENT ON COLUMN pix_transactions.provider_transaction_id IS 'Identificador da transacao no provider externo';
COMMENT ON COLUMN pix_transactions.billing_settlement_status IS 'Estado da liquidacao do billing apos confirmacao do PIX';
COMMENT ON COLUMN pix_transactions.cash_reconciliation_status IS 'Estado da conciliacao explicita em caixa apos confirmacao do PIX';
