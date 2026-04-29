-- Vetus parity: simple IBS/CBS table cadastro
-- Mirrors Vetus Estoque > Configuracoes Fiscais > Tabela IBS/CBS.

CREATE TABLE IF NOT EXISTS ibs_cbs_tables (
  id VARCHAR(80) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  ibs_percent DECIMAL(5,2) NOT NULL CHECK (ibs_percent >= 0 AND ibs_percent <= 100),
  cbs_percent DECIMAL(5,2) NOT NULL CHECK (cbs_percent >= 0 AND cbs_percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ibs_cbs_tables_code ON ibs_cbs_tables (code);
CREATE INDEX IF NOT EXISTS idx_ibs_cbs_tables_description ON ibs_cbs_tables (description);
