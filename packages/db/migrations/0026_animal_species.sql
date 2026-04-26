-- Vetus parity: animal species registry used by patient and breed registration.

CREATE TABLE IF NOT EXISTS animal_species (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(80),
  system_code VARCHAR(32) NOT NULL DEFAULT 'other',
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT animal_species_system_code_chk CHECK (
    system_code IN ('canine', 'feline', 'avian', 'rodent', 'reptile', 'other')
  ),
  CONSTRAINT animal_species_description_len_chk CHECK (
    description IS NULL OR char_length(description) <= 1000
  )
);

CREATE INDEX IF NOT EXISTS idx_animal_species_account_name
  ON animal_species (account_id, name);

CREATE INDEX IF NOT EXISTS idx_animal_species_account_system_code
  ON animal_species (account_id, system_code);

CREATE INDEX IF NOT EXISTS idx_animal_species_account_active
  ON animal_species (account_id, active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_animal_species_account_code
  ON animal_species (account_id, code)
  WHERE code IS NOT NULL;

INSERT INTO animal_species (
  id,
  account_id,
  name,
  code,
  system_code,
  description,
  active
)
SELECT
  'species_' || seed.system_code || '_' || accounts.id::text,
  accounts.id,
  seed.name,
  seed.code,
  seed.system_code,
  seed.description,
  true
FROM accounts
CROSS JOIN (
  VALUES
    ('Canina', 'CANINE', 'canine', 'Pacientes cães.'),
    ('Felina', 'FELINE', 'feline', 'Pacientes gatos.'),
    ('Ave', 'AVIAN', 'avian', 'Pacientes aves ornamentais ou silvestres autorizadas.'),
    ('Roedor', 'RODENT', 'rodent', 'Pacientes roedores.'),
    ('Réptil', 'REPTILE', 'reptile', 'Pacientes répteis.'),
    ('Outro', 'OTHER', 'other', 'Outras espécies cadastradas para atendimento.')
) AS seed(name, code, system_code, description)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE animal_species ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS animal_species_tenant_isolation ON animal_species;
CREATE POLICY animal_species_tenant_isolation ON animal_species
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE animal_species IS
  'Cadastro de especies usado no cadastro de animais, racas e sincronizacao de dados Vetus.';
