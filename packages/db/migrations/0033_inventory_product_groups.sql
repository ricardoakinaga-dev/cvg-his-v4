-- Vetus parity: Estoque > Cadastros > Grupos de Produto.
-- Stores product groups used to classify the stock/product catalog.

CREATE TABLE IF NOT EXISTS inventory_product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  display_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_product_groups_description_len_chk CHECK (
    char_length(trim(description)) BETWEEN 1 AND 160
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_product_groups_account_display_id
  ON inventory_product_groups (account_id, display_id);

CREATE INDEX IF NOT EXISTS idx_inventory_product_groups_account_description
  ON inventory_product_groups (account_id, description);

CREATE INDEX IF NOT EXISTS idx_inventory_product_groups_account_active
  ON inventory_product_groups (account_id, active);

INSERT INTO inventory_product_groups (
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
    (1, 'Insumos'),
    (2, 'Medicamentos'),
    (3, 'Medicamentos Controlados'),
    (4, 'Vacinas'),
    (5, 'Banho e Tosa'),
    (6, 'Farmacia')
) AS seed(display_id, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory_product_groups existing
  WHERE existing.account_id = accounts.id
)
ON CONFLICT (account_id, display_id) DO NOTHING;

ALTER TABLE inventory_product_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_product_groups_tenant_isolation ON inventory_product_groups;
CREATE POLICY inventory_product_groups_tenant_isolation ON inventory_product_groups
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE inventory_product_groups IS
  'Cadastro Vetus-like de grupos de produto do modulo Estoque > Cadastros > Grupos de Produto.';
