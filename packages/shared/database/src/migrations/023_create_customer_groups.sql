-- Migration 023: Vetus-like customer groups catalog

CREATE TABLE IF NOT EXISTS customer_groups (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(80),
  segment VARCHAR(80),
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  payment_term_days INTEGER NOT NULL DEFAULT 0,
  credit_limit_amount NUMERIC(12, 2),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_groups_account_name
  ON customer_groups(account_id, name);
CREATE INDEX IF NOT EXISTS idx_customer_groups_account_segment
  ON customer_groups(account_id, segment);
CREATE INDEX IF NOT EXISTS idx_customer_groups_account_active
  ON customer_groups(account_id, active);
