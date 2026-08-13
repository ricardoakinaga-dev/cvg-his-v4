-- Atomic inventory balance mutations with monotonic stock versioning.

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS stock_version BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_items_stock_version_chk'
      AND conrelid = 'inventory_items'::regclass
  ) THEN
    ALTER TABLE inventory_items
      ADD CONSTRAINT inventory_items_stock_version_chk CHECK (stock_version >= 0);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_inventory_items_account_version
  ON inventory_items (account_id, id, stock_version);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_stock_movements_balance_equation_chk'
      AND conrelid = 'inventory_stock_movements'::regclass
  ) THEN
    ALTER TABLE inventory_stock_movements
      ADD CONSTRAINT inventory_stock_movements_balance_equation_chk
      CHECK (balance_after = balance_before + quantity_delta);
  END IF;
END
$$;
