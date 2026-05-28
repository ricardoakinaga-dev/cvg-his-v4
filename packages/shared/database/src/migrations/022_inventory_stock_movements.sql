CREATE TABLE IF NOT EXISTS inventory_stock_movements (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  inventory_item_id VARCHAR(255) NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  quantity_delta NUMERIC(12, 2) NOT NULL,
  balance_before NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  unit_cost_amount NUMERIC(12, 2) NOT NULL,
  reason VARCHAR(5000) NOT NULL,
  reference VARCHAR(255),
  recorded_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_movements_account_item
  ON inventory_stock_movements(account_id, inventory_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_movements_account_type
  ON inventory_stock_movements(account_id, movement_type, created_at DESC);
