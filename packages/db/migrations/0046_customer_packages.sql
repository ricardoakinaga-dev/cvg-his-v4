-- Pacotes comerciais persistentes: saldo contratado, consumo e renovacao por tutor/paciente.

CREATE TABLE IF NOT EXISTS customer_packages (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owners(id),
  patient_id UUID REFERENCES patients(id),
  package_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  starts_at DATE NOT NULL,
  expires_at DATE,
  notes TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  renewed_from_package_id TEXT REFERENCES customer_packages(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT customer_packages_status_chk CHECK (
    status IN ('draft', 'active', 'expired', 'cancelled', 'completed')
  ),
  CONSTRAINT customer_packages_validity_window_chk CHECK (
    expires_at IS NULL OR starts_at <= expires_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_customer_packages_account_number
  ON customer_packages (account_id, package_number);

CREATE INDEX IF NOT EXISTS idx_customer_packages_account_status
  ON customer_packages (account_id, status);

CREATE INDEX IF NOT EXISTS idx_customer_packages_account_owner
  ON customer_packages (account_id, owner_id);

CREATE INDEX IF NOT EXISTS idx_customer_packages_account_patient
  ON customer_packages (account_id, patient_id)
  WHERE patient_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer_package_items (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  item_kind TEXT NOT NULL,
  catalog_item_id TEXT,
  name_snapshot TEXT NOT NULL,
  quantity_purchased INTEGER NOT NULL,
  quantity_consumed INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_package_items_kind_chk CHECK (item_kind IN ('service', 'product')),
  CONSTRAINT customer_package_items_quantity_purchased_chk CHECK (quantity_purchased > 0),
  CONSTRAINT customer_package_items_quantity_consumed_chk CHECK (
    quantity_consumed >= 0 AND quantity_consumed <= quantity_purchased
  ),
  CONSTRAINT customer_package_items_unit_price_chk CHECK (unit_price >= 0),
  CONSTRAINT customer_package_items_validity_window_chk CHECK (
    valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until
  )
);

CREATE INDEX IF NOT EXISTS idx_customer_package_items_account_package
  ON customer_package_items (account_id, package_id);

CREATE INDEX IF NOT EXISTS idx_customer_package_items_account_kind
  ON customer_package_items (account_id, item_kind);

CREATE TABLE IF NOT EXISTS customer_package_consumptions (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  package_item_id TEXT NOT NULL REFERENCES customer_package_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  consumed_by_user_id UUID NOT NULL REFERENCES users(id),
  consumed_at DATE NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  notes TEXT,
  CONSTRAINT customer_package_consumptions_quantity_chk CHECK (quantity > 0),
  CONSTRAINT customer_package_consumptions_source_type_chk CHECK (
    source_type IN ('appointment', 'encounter', 'counter_sale', 'manual')
  )
);

CREATE INDEX IF NOT EXISTS idx_customer_package_consumptions_account_package
  ON customer_package_consumptions (account_id, package_id);

CREATE INDEX IF NOT EXISTS idx_customer_package_consumptions_account_item
  ON customer_package_consumptions (account_id, package_item_id);

CREATE INDEX IF NOT EXISTS idx_customer_package_consumptions_source
  ON customer_package_consumptions (account_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

ALTER TABLE customer_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_packages_tenant_isolation ON customer_packages;
CREATE POLICY customer_packages_tenant_isolation ON customer_packages
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE customer_package_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_package_items_tenant_isolation ON customer_package_items;
CREATE POLICY customer_package_items_tenant_isolation ON customer_package_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE customer_package_consumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_package_consumptions_tenant_isolation ON customer_package_consumptions;
CREATE POLICY customer_package_consumptions_tenant_isolation ON customer_package_consumptions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE customer_packages IS
  'Pacotes comerciais persistentes vendidos para tutores, com status, validade e linhagem de renovacao.';

COMMENT ON TABLE customer_package_items IS
  'Itens contratados em cada pacote, com saldo adquirido e consumido.';

COMMENT ON TABLE customer_package_consumptions IS
  'Lancamentos de consumo que debitam saldo dos itens de pacote.';
