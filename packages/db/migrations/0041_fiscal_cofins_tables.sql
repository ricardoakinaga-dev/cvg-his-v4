-- Vetus parity: simple COFINS table cadastro
-- Mirrors Vetus Estoque > Configuracoes Fiscais > Tabela COFINS.

CREATE TABLE IF NOT EXISTS cofins_tables (
  id VARCHAR(80) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  percent DECIMAL(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cofins_tables_code ON cofins_tables (code);
CREATE INDEX IF NOT EXISTS idx_cofins_tables_description ON cofins_tables (description);
