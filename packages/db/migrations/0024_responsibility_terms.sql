-- Vetus parity: responsibility term templates for attendance, inpatient, procedures and authorizations.

CREATE TABLE IF NOT EXISTS responsibility_terms (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  code VARCHAR(80),
  usage_context VARCHAR(32) NOT NULL DEFAULT 'atendimento',
  content TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  requires_owner_signature BOOLEAN NOT NULL DEFAULT true,
  requires_witness_signature BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT responsibility_terms_usage_context_chk CHECK (
    usage_context IN ('atendimento', 'internacao', 'procedimento', 'autorizacao', 'outro')
  ),
  CONSTRAINT responsibility_terms_content_len_chk CHECK (char_length(content) <= 20000)
);

CREATE INDEX IF NOT EXISTS idx_responsibility_terms_account_title
  ON responsibility_terms (account_id, title);

CREATE INDEX IF NOT EXISTS idx_responsibility_terms_account_active
  ON responsibility_terms (account_id, active);

CREATE INDEX IF NOT EXISTS idx_responsibility_terms_account_usage
  ON responsibility_terms (account_id, usage_context);

CREATE UNIQUE INDEX IF NOT EXISTS uq_responsibility_terms_account_code
  ON responsibility_terms (account_id, code)
  WHERE code IS NOT NULL;

ALTER TABLE responsibility_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS responsibility_terms_tenant_isolation ON responsibility_terms;
CREATE POLICY responsibility_terms_tenant_isolation ON responsibility_terms
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE responsibility_terms IS
  'Modelos de termos de responsabilidade usados em atendimento, internacao, procedimentos e autorizacoes.';
