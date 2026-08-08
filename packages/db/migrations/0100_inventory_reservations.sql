-- INV-001: reserva FEFO, consumo da reserva e devolucao rastreavel por lote.

ALTER TABLE inventory_lots
  ADD COLUMN IF NOT EXISTS reserved_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_lots_account_id_id_unique
  ON inventory_lots(account_id, id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_lots_reserved_quantity_chk'
  ) THEN
    ALTER TABLE inventory_lots
      ADD CONSTRAINT inventory_lots_reserved_quantity_chk
      CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  inventory_item_id TEXT NOT NULL,
  inventory_lot_id TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  unit TEXT NOT NULL,
  unit_cost_amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT,
  reference TEXT,
  reserved_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  CONSTRAINT inventory_reservations_account_item_fk
    FOREIGN KEY (account_id, inventory_item_id)
    REFERENCES inventory_items(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT inventory_reservations_account_lot_fk
    FOREIGN KEY (account_id, inventory_lot_id)
    REFERENCES inventory_lots(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT inventory_reservations_quantity_chk
    CHECK (quantity > 0 AND unit_cost_amount >= 0),
  CONSTRAINT inventory_reservations_status_chk
    CHECK (status IN ('reserved', 'released', 'consumed', 'returned')),
  CONSTRAINT inventory_reservations_source_type_chk
    CHECK (source_entity_type IN ('encounter', 'diagnostic_order', 'surgery_case', 'inpatient_stay', 'prescription', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_account_status
  ON inventory_reservations(account_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_account_item
  ON inventory_reservations(account_id, inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_account_lot
  ON inventory_reservations(account_id, inventory_lot_id, status);

ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_reservations_tenant_isolation ON inventory_reservations;
CREATE POLICY inventory_reservations_tenant_isolation ON inventory_reservations
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE inventory_reservations IS
  'Reservas FEFO tenant-aware com transicao auditavel para consumo, liberacao e devolucao.';
