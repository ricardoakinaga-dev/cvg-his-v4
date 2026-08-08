-- Lotes persistentes para saldo, validade e consumo FEFO no estoque operacional.

CREATE TABLE IF NOT EXISTS inventory_lots (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  inventory_item_id TEXT NOT NULL,
  lot_number TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  location TEXT,
  supplier TEXT,
  manufacture_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_lots_account_item_fk
    FOREIGN KEY (account_id, inventory_item_id)
    REFERENCES inventory_items(account_id, id) ON DELETE CASCADE,
  CONSTRAINT inventory_lots_quantity_chk CHECK (quantity >= 0),
  CONSTRAINT inventory_lots_status_chk
    CHECK (status IN ('active', 'expiring', 'expired', 'depleted')),
  CONSTRAINT inventory_lots_identity_unique
    UNIQUE (account_id, inventory_item_id, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_lots_account_expiry
  ON inventory_lots(account_id, expiry_date ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_account_item_expiry
  ON inventory_lots(account_id, inventory_item_id, expiry_date ASC NULLS LAST);

ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_lots_tenant_isolation ON inventory_lots;
CREATE POLICY inventory_lots_tenant_isolation ON inventory_lots
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
