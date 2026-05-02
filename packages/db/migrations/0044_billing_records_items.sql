-- Billing persistente por atendimento.
-- Leitura de billing continua sem criar registro; writes explicitos passam a ter tabelas duraveis.

CREATE TABLE IF NOT EXISTS billing_records (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  owner_id UUID NOT NULL REFERENCES owners(id),
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  administrative_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_records_status_chk CHECK (status IN ('draft', 'estimated', 'open', 'settled')),
  CONSTRAINT billing_records_currency_chk CHECK (currency = 'BRL'),
  CONSTRAINT billing_records_subtotal_non_negative_chk CHECK (subtotal_amount >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_billing_records_account_encounter
  ON billing_records (account_id, encounter_id);

CREATE INDEX IF NOT EXISTS idx_billing_records_account_status
  ON billing_records (account_id, status);

CREATE INDEX IF NOT EXISTS idx_billing_records_account_patient
  ON billing_records (account_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_billing_records_account_owner
  ON billing_records (account_id, owner_id);

CREATE TABLE IF NOT EXISTS billing_items (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  billing_record_id TEXT NOT NULL REFERENCES billing_records(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL,
  unit_price_amount NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  source_entity_type TEXT,
  source_entity_id TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_items_item_type_chk CHECK (
    item_type IN ('service', 'supply', 'procedure', 'exam', 'daily_rate', 'other')
  ),
  CONSTRAINT billing_items_source_type_chk CHECK (
    source_entity_type IS NULL
    OR source_entity_type IN ('encounter', 'diagnostic_order', 'surgery_case', 'inpatient_stay', 'prescription')
  ),
  CONSTRAINT billing_items_quantity_positive_chk CHECK (quantity > 0),
  CONSTRAINT billing_items_unit_price_non_negative_chk CHECK (unit_price_amount >= 0),
  CONSTRAINT billing_items_total_non_negative_chk CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_billing_items_account_record
  ON billing_items (account_id, billing_record_id);

CREATE INDEX IF NOT EXISTS idx_billing_items_account_encounter
  ON billing_items (account_id, encounter_id);

CREATE INDEX IF NOT EXISTS idx_billing_items_account_type
  ON billing_items (account_id, item_type);

CREATE INDEX IF NOT EXISTS idx_billing_items_source
  ON billing_items (account_id, source_entity_type, source_entity_id);

ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS billing_records_tenant_isolation ON billing_records;
CREATE POLICY billing_records_tenant_isolation ON billing_records
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE billing_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS billing_items_tenant_isolation ON billing_items;
CREATE POLICY billing_items_tenant_isolation ON billing_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE billing_records IS
  'Registros persistentes de faturamento por atendimento. Leituras nao criam registros.';

COMMENT ON TABLE billing_items IS
  'Itens persistentes vinculados a billing_records e isolados por account.';
