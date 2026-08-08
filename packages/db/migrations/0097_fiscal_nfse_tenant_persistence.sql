-- FISCAL-001: make NFS-e layouts/documents durable and tenant scoped.
-- The legacy 0017 migration created shared layout rows and used UUID layout ids.
-- Shared rows remain read-only defaults; every tenant mutation is stored with its
-- own account_id and every document belongs to exactly one account.

ALTER TABLE nfse_layouts
  ALTER COLUMN id TYPE VARCHAR(60) USING id::text;

ALTER TABLE nfse_layouts
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

UPDATE nfse_layouts
SET environment = CASE
  WHEN LOWER(environment) IN ('production', 'producao') THEN 'producao'
  ELSE 'homologacao'
END
WHERE environment IS NOT NULL;

ALTER TABLE nfse_layouts
  ALTER COLUMN environment SET DEFAULT 'homologacao';

ALTER TABLE nfse_layouts
  DROP CONSTRAINT IF EXISTS unique_city_state;

CREATE UNIQUE INDEX IF NOT EXISTS nfse_layouts_global_city_state_unique
  ON nfse_layouts(city, state)
  WHERE account_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS nfse_layouts_account_city_state_unique
  ON nfse_layouts(account_id, city, state)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfse_layouts_account_state
  ON nfse_layouts(account_id, state, city);

ALTER TABLE nfse_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfse_layouts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nfse_layouts_tenant_isolation ON nfse_layouts;
CREATE POLICY nfse_layouts_tenant_isolation ON nfse_layouts
  FOR ALL
  USING (account_id IS NULL OR account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE TABLE IF NOT EXISTS fiscal_nfse_documents (
  id VARCHAR(120) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  serie VARCHAR(20) NOT NULL,
  numero INTEGER NOT NULL CHECK (numero > 0),
  competencia DATE NOT NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('abrasf', 'iss_sp', 'iss_net', 'nota_rio')),
  municipality_code VARCHAR(10) NOT NULL,
  api_url TEXT NOT NULL,
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('producao', 'homologacao')),
  issuer JSONB NOT NULL,
  customer JSONB NOT NULL,
  services JSONB NOT NULL,
  subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0),
  total_iss NUMERIC(14, 2) NOT NULL CHECK (total_iss >= 0),
  total_pis NUMERIC(14, 2) NOT NULL CHECK (total_pis >= 0),
  total_cofins NUMERIC(14, 2) NOT NULL CHECK (total_cofins >= 0),
  total_csll NUMERIC(14, 2) NOT NULL CHECK (total_csll >= 0),
  total_irrf NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_irrf >= 0),
  total_inss NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_inss >= 0),
  total_document NUMERIC(14, 2) NOT NULL CHECK (total_document >= 0),
  observations TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'issued', 'cancelled', 'error')),
  authorization_code VARCHAR(255),
  verification_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fiscal_nfse_documents_account_number_unique UNIQUE (account_id, serie, numero)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfse_documents_account_status
  ON fiscal_nfse_documents(account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfse_documents_account_competencia
  ON fiscal_nfse_documents(account_id, competencia DESC);

ALTER TABLE fiscal_nfse_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_nfse_documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fiscal_nfse_documents_tenant_isolation ON fiscal_nfse_documents;
CREATE POLICY fiscal_nfse_documents_tenant_isolation ON fiscal_nfse_documents
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE fiscal_nfse_documents IS
  'NFS-e emitidas e em rascunho; payload fiscal e transicoes persistidos por tenant.';
COMMENT ON TABLE nfse_layouts IS
  'Layouts NFS-e compartilhados como defaults (account_id nulo) ou sobrescritos por tenant.';
