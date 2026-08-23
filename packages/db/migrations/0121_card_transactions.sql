-- Durable card payment state for API and worker runtimes.
CREATE TABLE IF NOT EXISTS card_transactions (
  transaction_id VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  billing_record_id TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  description VARCHAR(255) NOT NULL,
  installments INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_at TIMESTAMPTZ,
  last_provider_sync_at TIMESTAMPTZ,
  provider_order_id VARCHAR(255),
  provider_charge_id VARCHAR(255),
  provider_authorization_code VARCHAR(255),
  provider_reference_id VARCHAR(255),
  failure_reason TEXT,
  card_holder_name VARCHAR(255),
  card_brand VARCHAR(64),
  card_last4 VARCHAR(4),
  billing_settlement_status VARCHAR(32) NOT NULL DEFAULT 'not_applicable',
  billing_settled_at TIMESTAMPTZ,
  billing_settlement_error TEXT,
  CONSTRAINT card_transactions_account_billing_record_fk
    FOREIGN KEY (account_id, billing_record_id)
    REFERENCES billing_records (account_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT card_transactions_currency_chk CHECK (currency = 'BRL'),
  CONSTRAINT card_transactions_installments_chk CHECK (installments BETWEEN 1 AND 24),
  CONSTRAINT card_transactions_amount_chk CHECK (amount >= 0),
  CONSTRAINT card_transactions_last4_chk CHECK (
    card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_transactions_account_transaction_unique
  ON card_transactions (account_id, transaction_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_account_status
  ON card_transactions (account_id, status);
CREATE INDEX IF NOT EXISTS idx_card_transactions_provider_reference
  ON card_transactions (provider, provider_reference_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_billing_record
  ON card_transactions (account_id, billing_record_id);

ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS card_transactions_tenant_isolation ON card_transactions;
CREATE POLICY card_transactions_tenant_isolation ON card_transactions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE card_transactions IS 'Persistencia canonica das transacoes de cartao do runtime de pagamentos';
COMMENT ON COLUMN card_transactions.card_last4 IS 'Somente os quatro ultimos digitos; nunca armazena PAN ou CVV';
