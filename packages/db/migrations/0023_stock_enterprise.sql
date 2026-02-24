-- Stock Lots Table
CREATE TABLE IF NOT EXISTS stock_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_number TEXT NOT NULL,
  expiry_date DATE,
  quantity NUMERIC(12, 4) NOT NULL DEFAULT '0',
  cost NUMERIC(12, 4),
  location TEXT,
  supplier TEXT,
  notes TEXT,
  active NUMERIC(12, 4) NOT NULL DEFAULT '1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock Lots Indexes
CREATE UNIQUE INDEX stock_lots_account_product_lot_unique ON stock_lots(account_id, product_id, lot_number);
CREATE INDEX stock_lots_account_product_idx ON stock_lots(account_id, product_id);
CREATE INDEX stock_lots_expiry_idx ON stock_lots(account_id, expiry_date);

-- Stock Movement Type Enum
CREATE TYPE stock_movement_type AS ENUM ('entrada', 'saida', 'ajuste', 'consumo', 'devolucao', 'transferencia');

-- Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_id UUID REFERENCES stock_lots(id) ON DELETE SET NULL,
  movement_type stock_movement_type NOT NULL,
  quantity NUMERIC(12, 4) NOT NULL,
  unit_cost NUMERIC(12, 4),
  total_cost NUMERIC(12, 4),
  balance_after NUMERIC(12, 4),
  lot_balance_after NUMERIC(12, 4),
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  inpatient_stay_id UUID REFERENCES inpatient_stays(id) ON DELETE SET NULL,
  performed_by_user_id UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  notes TEXT,
  document_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock Movements Indexes
CREATE INDEX stock_movements_account_product_idx ON stock_movements(account_id, product_id);
CREATE INDEX stock_movements_account_lot_idx ON stock_movements(account_id, lot_id);
CREATE INDEX stock_movements_account_type_idx ON stock_movements(account_id, movement_type);
CREATE INDEX stock_movements_encounter_idx ON stock_movements(encounter_id) WHERE encounter_id IS NOT NULL;
CREATE INDEX stock_movements_inpatient_stay_idx ON stock_movements(inpatient_stay_id) WHERE inpatient_stay_id IS NOT NULL;
CREATE INDEX stock_movements_created_at_idx ON stock_movements(account_id, created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock_lots
CREATE TRIGGER update_stock_lots_updated_at
  BEFORE UPDATE ON stock_lots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE stock_lots IS 'Stock lots with batch tracking and expiry management';
COMMENT ON TABLE stock_movements IS 'Stock movement history (Kardex) for inventory tracking';
COMMENT ON COLUMN stock_lots.active IS 'Active quantity available for use (may differ from quantity due to reservations)';
COMMENT ON COLUMN stock_movements.balance_after IS 'Product total balance after this movement';
COMMENT ON COLUMN stock_movements.lot_balance_after IS 'Lot balance after this movement (if applicable)';
COMMENT ON COLUMN stock_movements.document_ref IS 'Reference to external document (invoice, prescription, etc.)';
