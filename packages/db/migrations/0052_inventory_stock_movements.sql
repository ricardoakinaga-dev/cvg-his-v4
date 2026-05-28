-- Ledger transacional de estoque para ajustes, consumo, inventario e auditoria.

CREATE TABLE IF NOT EXISTS inventory_stock_movements (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  inventory_item_id TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  quantity_delta NUMERIC(12, 2) NOT NULL,
  balance_before NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  unit_cost_amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  reference TEXT,
  recorded_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_stock_movements_type_chk CHECK (
    movement_type IN ('adjustment', 'inbound', 'outbound', 'transfer', 'consumption')
  ),
  CONSTRAINT inventory_stock_movements_delta_chk CHECK (quantity_delta <> 0),
  CONSTRAINT inventory_stock_movements_balances_chk CHECK (balance_before >= 0 AND balance_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_movements_account_item
  ON inventory_stock_movements (account_id, inventory_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_movements_account_type
  ON inventory_stock_movements (account_id, movement_type, created_at DESC);

ALTER TABLE inventory_stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_stock_movements_tenant_isolation ON inventory_stock_movements;
CREATE POLICY inventory_stock_movements_tenant_isolation ON inventory_stock_movements
  FOR ALL
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

COMMENT ON TABLE inventory_stock_movements IS
  'Ledger auditavel de movimentacoes de estoque por item, incluindo ajustes, consumo, entradas e transferencias.';
