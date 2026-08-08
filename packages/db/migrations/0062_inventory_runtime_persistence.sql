CREATE TABLE inventory_items (
  id text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sku varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  unit varchar(50) NOT NULL,
  on_hand_quantity numeric(12, 2) NOT NULL DEFAULT 0,
  reorder_level numeric(12, 2) NOT NULL DEFAULT 0,
  unit_cost_amount numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_account_sku_unique UNIQUE (account_id, sku),
  CONSTRAINT inventory_items_account_id_id_unique UNIQUE (account_id, id),
  CONSTRAINT inventory_items_balances_chk CHECK (on_hand_quantity >= 0 AND reorder_level >= 0),
  CONSTRAINT inventory_items_cost_chk CHECK (unit_cost_amount >= 0)
);

CREATE TABLE inventory_consumptions (
  id text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  inventory_item_id text NOT NULL,
  encounter_id text NOT NULL,
  patient_id text NOT NULL,
  quantity numeric(12, 2) NOT NULL,
  unit varchar(50) NOT NULL,
  cost_amount numeric(12, 2) NOT NULL,
  source_entity_type varchar(32) NOT NULL,
  source_entity_id text,
  recorded_by_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_consumptions_quantity_chk CHECK (quantity > 0),
  CONSTRAINT inventory_consumptions_cost_chk CHECK (cost_amount >= 0),
  CONSTRAINT inventory_consumptions_source_type_chk CHECK (
    source_entity_type IN (
      'encounter',
      'diagnostic_order',
      'surgery_case',
      'inpatient_stay',
      'prescription',
      'other'
    )
  ),
  CONSTRAINT inventory_consumptions_account_item_fk
    FOREIGN KEY (account_id, inventory_item_id)
    REFERENCES inventory_items(account_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX idx_inventory_items_account_name ON inventory_items(account_id, name);
CREATE INDEX idx_inventory_consumptions_account_created
  ON inventory_consumptions(account_id, created_at DESC);
CREATE INDEX idx_inventory_consumptions_account_item
  ON inventory_consumptions(account_id, inventory_item_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM inventory_stock_movements AS movement
    LEFT JOIN accounts AS account_record ON account_record.id::text = movement.account_id
    WHERE account_record.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot convert inventory_stock_movements.account_id to UUID: invalid or missing account';
  END IF;
END $$;

DROP POLICY IF EXISTS inventory_stock_movements_tenant_isolation ON inventory_stock_movements;

ALTER TABLE inventory_stock_movements
  ALTER COLUMN account_id TYPE uuid USING account_id::uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM inventory_stock_movements AS movement
    LEFT JOIN inventory_items AS item
      ON item.account_id = movement.account_id
     AND item.id = movement.inventory_item_id
    WHERE item.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot scope inventory stock movements: missing or cross-account inventory item';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_stock_movements_account_id_accounts_id_fk'
  ) THEN
    ALTER TABLE inventory_stock_movements
      ADD CONSTRAINT inventory_stock_movements_account_id_accounts_id_fk
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_stock_movements_account_item_fk'
  ) THEN
    ALTER TABLE inventory_stock_movements
      ADD CONSTRAINT inventory_stock_movements_account_item_fk
      FOREIGN KEY (account_id, inventory_item_id)
      REFERENCES inventory_items(account_id, id)
      ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_items_tenant_isolation ON inventory_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE POLICY inventory_consumptions_tenant_isolation ON inventory_consumptions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE POLICY inventory_stock_movements_tenant_isolation ON inventory_stock_movements
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
