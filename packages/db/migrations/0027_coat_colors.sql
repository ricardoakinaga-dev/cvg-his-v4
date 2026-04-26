-- Vetus parity: coat colors / pelages registry used by patient identification.

CREATE TABLE IF NOT EXISTS coat_colors (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(80),
  color_group VARCHAR(80),
  hex_color VARCHAR(16),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coat_colors_hex_color_chk CHECK (
    hex_color IS NULL OR hex_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  CONSTRAINT coat_colors_description_len_chk CHECK (
    description IS NULL OR char_length(description) <= 1000
  )
);

CREATE INDEX IF NOT EXISTS idx_coat_colors_account_name
  ON coat_colors (account_id, name);

CREATE INDEX IF NOT EXISTS idx_coat_colors_account_group
  ON coat_colors (account_id, color_group);

CREATE INDEX IF NOT EXISTS idx_coat_colors_account_active
  ON coat_colors (account_id, active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_coat_colors_account_code
  ON coat_colors (account_id, code)
  WHERE code IS NOT NULL;

INSERT INTO coat_colors (
  id,
  account_id,
  name,
  code,
  color_group,
  hex_color,
  description,
  active
)
SELECT
  'coat_color_' || lower(seed.code) || '_' || accounts.id::text,
  accounts.id,
  seed.name,
  seed.code,
  seed.color_group,
  seed.hex_color,
  seed.description,
  true
FROM accounts
CROSS JOIN (
  VALUES
    ('Preta', 'BLACK', 'Solida', '#111827', 'Pelagem predominantemente preta.'),
    ('Branca', 'WHITE', 'Solida', '#f8fafc', 'Pelagem predominantemente branca.'),
    ('Caramelo', 'CARAMEL', 'Solida', '#c47f3f', 'Pelagem caramelo ou castanho claro.'),
    ('Tricolor', 'TRICOLOR', 'Composta', '#7c5f46', 'Composicao de tres cores na pelagem.'),
    ('Rajada', 'BRINDLE', 'Composta', '#8b7355', 'Pelagem rajada ou tigrada.')
) AS seed(name, code, color_group, hex_color, description)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE coat_colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coat_colors_tenant_isolation ON coat_colors;
CREATE POLICY coat_colors_tenant_isolation ON coat_colors
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE coat_colors IS
  'Cadastro de cores e pelagens usado na identificacao de animais e sincronizacao de dados Vetus.';
