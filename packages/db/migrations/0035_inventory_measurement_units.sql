-- Vetus parity: Estoque > Cadastros > Unidades de Medida.
-- Stores stock/product measurement units such as un, kg, ml and cx.

CREATE TABLE IF NOT EXISTS inventory_measurement_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  decimal_places INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_measurement_units_code_len_chk CHECK (
    char_length(trim(code)) BETWEEN 1 AND 30
  ),
  CONSTRAINT inventory_measurement_units_description_len_chk CHECK (
    char_length(trim(description)) BETWEEN 1 AND 160
  ),
  CONSTRAINT inventory_measurement_units_decimal_places_chk CHECK (
    decimal_places BETWEEN 0 AND 6
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_measurement_units_account_code
  ON inventory_measurement_units (account_id, code);

CREATE INDEX IF NOT EXISTS idx_inventory_measurement_units_account_description
  ON inventory_measurement_units (account_id, description);

CREATE INDEX IF NOT EXISTS idx_inventory_measurement_units_account_active
  ON inventory_measurement_units (account_id, active);

INSERT INTO inventory_measurement_units (
  account_id,
  code,
  description,
  decimal_places,
  active
)
SELECT
  accounts.id,
  seed.code,
  seed.description,
  seed.decimal_places,
  true
FROM accounts
CROSS JOIN (
  VALUES
    ('UN', 'Unidade', 0),
    ('KG', 'Quilograma', 3),
    ('G', 'Grama', 3),
    ('L', 'Litro', 3),
    ('ML', 'Mililitro', 3),
    ('CX', 'Caixa', 0)
) AS seed(code, description, decimal_places)
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory_measurement_units existing
  WHERE existing.account_id = accounts.id
)
ON CONFLICT (account_id, code) DO NOTHING;

ALTER TABLE inventory_measurement_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_measurement_units_tenant_isolation ON inventory_measurement_units;
CREATE POLICY inventory_measurement_units_tenant_isolation ON inventory_measurement_units
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE inventory_measurement_units IS
  'Cadastro Vetus-like de unidades de medida do modulo Estoque > Cadastros > Unidades de Medida.';
