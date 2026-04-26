-- Vetus parity: customer groups registry used by owners, commercial policies and marketing filters.

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_groups_discount_percent_chk CHECK (
    discount_percent >= 0 AND discount_percent <= 100
  ),
  CONSTRAINT customer_groups_payment_term_days_chk CHECK (
    payment_term_days >= 0 AND payment_term_days <= 365
  ),
  CONSTRAINT customer_groups_credit_limit_amount_chk CHECK (
    credit_limit_amount IS NULL OR credit_limit_amount >= 0
  ),
  CONSTRAINT customer_groups_description_len_chk CHECK (
    description IS NULL OR char_length(description) <= 1000
  )
);

CREATE INDEX IF NOT EXISTS idx_customer_groups_account_name
  ON customer_groups (account_id, name);

CREATE INDEX IF NOT EXISTS idx_customer_groups_account_segment
  ON customer_groups (account_id, segment);

CREATE INDEX IF NOT EXISTS idx_customer_groups_account_active
  ON customer_groups (account_id, active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_groups_account_code
  ON customer_groups (account_id, code)
  WHERE code IS NOT NULL;

INSERT INTO customer_groups (
  id,
  account_id,
  name,
  code,
  segment,
  discount_percent,
  payment_term_days,
  credit_limit_amount,
  description,
  active
)
SELECT
  'customer_group_' || lower(seed.code) || '_' || accounts.id::text,
  accounts.id,
  seed.name,
  seed.code,
  seed.segment,
  seed.discount_percent,
  seed.payment_term_days,
  seed.credit_limit_amount,
  seed.description,
  true
FROM accounts
CROSS JOIN (
  VALUES
    ('Padrao', 'STANDARD', 'Geral', 0.00::numeric, 0, NULL::numeric, 'Grupo padrao para clientes sem classificacao comercial especifica.'),
    ('Frequente', 'FREQUENT', 'Relacionamento', 5.00::numeric, 0, NULL::numeric, 'Grupo para tutores com recorrencia operacional.'),
    ('Convenio', 'AGREEMENT', 'Convenio', 10.00::numeric, 30, 1000.00::numeric, 'Grupo para clientes vinculados a acordo comercial ou convenio.')
) AS seed(name, code, segment, discount_percent, payment_term_days, credit_limit_amount, description)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_groups_tenant_isolation ON customer_groups;
CREATE POLICY customer_groups_tenant_isolation ON customer_groups
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE customer_groups IS
  'Cadastro de grupos de clientes usado para classificacao, politicas comerciais, atendimento e marketing Vetus-like.';
