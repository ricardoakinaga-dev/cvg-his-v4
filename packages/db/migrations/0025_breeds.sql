-- Vetus parity: animal breed registry used by patient registration and imports.

CREATE TABLE IF NOT EXISTS breeds (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(80),
  species VARCHAR(32) NOT NULL DEFAULT 'canine',
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT breeds_species_chk CHECK (
    species IN ('canine', 'feline', 'avian', 'rodent', 'reptile', 'other')
  ),
  CONSTRAINT breeds_description_len_chk CHECK (
    description IS NULL OR char_length(description) <= 1000
  )
);

CREATE INDEX IF NOT EXISTS idx_breeds_account_name
  ON breeds (account_id, name);

CREATE INDEX IF NOT EXISTS idx_breeds_account_species
  ON breeds (account_id, species);

CREATE INDEX IF NOT EXISTS idx_breeds_account_active
  ON breeds (account_id, active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_breeds_account_code
  ON breeds (account_id, code)
  WHERE code IS NOT NULL;

ALTER TABLE breeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS breeds_tenant_isolation ON breeds;
CREATE POLICY breeds_tenant_isolation ON breeds
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE breeds IS
  'Cadastro de racas usado no cadastro de animais e sincronizacao de dados Vetus.';
