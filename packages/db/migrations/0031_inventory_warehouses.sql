-- Vetus parity: Estoque > Cadastros > Estoques.
-- Stores physical/logical stock locations used by transfers, audits and stock validity flows.

CREATE TABLE IF NOT EXISTS inventory_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  display_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_warehouses_description_len_chk CHECK (
    char_length(trim(description)) BETWEEN 1 AND 160
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_warehouses_account_display_id
  ON inventory_warehouses (account_id, display_id);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouses_account_description
  ON inventory_warehouses (account_id, description);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouses_account_active
  ON inventory_warehouses (account_id, active);

INSERT INTO inventory_warehouses (
  account_id,
  display_id,
  description,
  active
)
SELECT
  accounts.id,
  seed.display_id,
  seed.description,
  true
FROM accounts
CROSS JOIN (
  VALUES
    (1, 'Estoque Principal'),
    (2, 'Farmacia'),
    (3, 'Laboratorio')
) AS seed(display_id, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory_warehouses existing
  WHERE existing.account_id = accounts.id
)
ON CONFLICT (account_id, display_id) DO NOTHING;

ALTER TABLE inventory_warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_warehouses_tenant_isolation ON inventory_warehouses;
CREATE POLICY inventory_warehouses_tenant_isolation ON inventory_warehouses
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE inventory_warehouses IS
  'Cadastro Vetus-like de estoques fisicos e logicos do modulo Estoque > Cadastros > Estoques.';
