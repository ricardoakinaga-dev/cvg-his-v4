-- Vetus parity: Estoque > Cadastros > Fabricantes.
-- Stores manufacturers/brands used to organize the product catalog.

CREATE TABLE IF NOT EXISTS inventory_manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  display_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_manufacturers_name_len_chk CHECK (
    char_length(trim(name)) BETWEEN 1 AND 160
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_manufacturers_account_display_id
  ON inventory_manufacturers (account_id, display_id);

CREATE INDEX IF NOT EXISTS idx_inventory_manufacturers_account_name
  ON inventory_manufacturers (account_id, name);

CREATE INDEX IF NOT EXISTS idx_inventory_manufacturers_account_active
  ON inventory_manufacturers (account_id, active);

ALTER TABLE inventory_manufacturers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_manufacturers_tenant_isolation ON inventory_manufacturers;
CREATE POLICY inventory_manufacturers_tenant_isolation ON inventory_manufacturers
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE inventory_manufacturers IS
  'Cadastro Vetus-like de fabricantes do modulo Estoque > Cadastros > Fabricantes.';
