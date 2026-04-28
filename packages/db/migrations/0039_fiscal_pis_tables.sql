-- Vetus parity: simple PIS table cadastro
-- Mirrors Vetus Estoque > Configuracoes Fiscais > Tabela PIS.

CREATE TABLE IF NOT EXISTS pis_tables (
  id VARCHAR(80) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  percent DECIMAL(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pis_tables_code ON pis_tables (code);
CREATE INDEX IF NOT EXISTS idx_pis_tables_description ON pis_tables (description);
