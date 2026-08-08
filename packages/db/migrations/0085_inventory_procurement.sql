-- Compras, recebimentos parciais e transferências de estoque.

CREATE TABLE IF NOT EXISTS inventory_purchases (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  invoice_number TEXT,
  status TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  received_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payable_id TEXT,
  created_by_user_id TEXT NOT NULL,
  approved_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ,
  CONSTRAINT inventory_purchases_account_id_id_unique UNIQUE (account_id, id),
  CONSTRAINT inventory_purchases_status_chk CHECK (
    status IN ('draft', 'approved', 'partially_received', 'received', 'cancelled')
  ),
  CONSTRAINT inventory_purchases_amounts_chk CHECK (
    total_amount >= 0 AND received_amount >= 0 AND received_amount <= total_amount
  )
);

CREATE TABLE IF NOT EXISTS inventory_purchase_lines (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL REFERENCES inventory_purchases(id) ON DELETE CASCADE,
  inventory_item_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  ordered_quantity NUMERIC(12, 2) NOT NULL,
  received_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  unit_cost_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  lot_number TEXT NOT NULL,
  expiry_date TIMESTAMPTZ,
  manufacture_date TIMESTAMPTZ,
  location TEXT,
  supplier TEXT,
  CONSTRAINT inventory_purchase_lines_amounts_chk CHECK (
    ordered_quantity > 0 AND received_quantity >= 0 AND received_quantity <= ordered_quantity
    AND unit_cost_amount >= 0
  ),
  CONSTRAINT inventory_purchase_lines_account_purchase_fk
    FOREIGN KEY (account_id, purchase_id)
    REFERENCES inventory_purchases(account_id, id) ON DELETE CASCADE,
  CONSTRAINT inventory_purchase_lines_account_item_fk
    FOREIGN KEY (account_id, inventory_item_id)
    REFERENCES inventory_items(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT inventory_purchase_lines_identity_unique
    UNIQUE (purchase_id, inventory_item_id, lot_number)
);

CREATE TABLE IF NOT EXISTS inventory_transfers (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  inventory_item_id TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  reference TEXT,
  outbound_movement_id TEXT NOT NULL,
  inbound_movement_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_transfers_quantity_chk CHECK (quantity > 0),
  CONSTRAINT inventory_transfers_status_chk CHECK (status IN ('completed', 'cancelled')),
  CONSTRAINT inventory_transfers_locations_chk CHECK (from_location <> to_location),
  CONSTRAINT inventory_transfers_account_item_fk
    FOREIGN KEY (account_id, inventory_item_id)
    REFERENCES inventory_items(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_inventory_purchases_account_created
  ON inventory_purchases(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_purchases_account_status
  ON inventory_purchases(account_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_lines_account_purchase
  ON inventory_purchase_lines(account_id, purchase_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_account_created
  ON inventory_transfers(account_id, created_at DESC);

ALTER TABLE inventory_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_purchases_tenant_isolation ON inventory_purchases;
CREATE POLICY inventory_purchases_tenant_isolation ON inventory_purchases
  FOR ALL USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE inventory_purchase_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_purchase_lines_tenant_isolation ON inventory_purchase_lines;
CREATE POLICY inventory_purchase_lines_tenant_isolation ON inventory_purchase_lines
  FOR ALL USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_transfers_tenant_isolation ON inventory_transfers;
CREATE POLICY inventory_transfers_tenant_isolation ON inventory_transfers
  FOR ALL USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE inventory_purchases IS
  'Ordens de compra por tenant, com aprovação, recebimento parcial e vínculo opcional a contas a pagar.';
COMMENT ON TABLE inventory_purchase_lines IS
  'Linhas de compra com lote, validade e quantidade recebida para reconciliação do estoque.';
COMMENT ON TABLE inventory_transfers IS
  'Transferências auditáveis entre localizações do estoque sem alterar o saldo global do item.';
