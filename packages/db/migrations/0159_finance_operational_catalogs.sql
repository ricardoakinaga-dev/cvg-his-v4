-- Persistent tenant-scoped catalogs for banks, payment methods, card terminals
-- and split rules. Domain-specific fields remain versioned in configuration_json
-- while identity, status, optimistic concurrency and audit actors are relational.

CREATE TABLE IF NOT EXISTS finance_operational_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  catalog_type VARCHAR(32) NOT NULL,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  configuration_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_by_user_id UUID NOT NULL,
  updated_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT finance_operational_catalog_type_chk
    CHECK (catalog_type IN ('banks', 'payment-methods', 'card-machines', 'split-rules')),
  CONSTRAINT finance_operational_catalog_status_chk
    CHECK (status IN ('active', 'inactive')),
  CONSTRAINT finance_operational_catalog_code_chk
    CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{0,63}$'),
  CONSTRAINT finance_operational_catalog_name_chk CHECK (length(btrim(name)) > 0),
  CONSTRAINT finance_operational_catalog_configuration_chk
    CHECK (jsonb_typeof(configuration_json) = 'object'),
  CONSTRAINT finance_operational_catalog_version_chk CHECK (version > 0),
  CONSTRAINT finance_operational_catalog_account_code_uq
    UNIQUE (account_id, catalog_type, code),
  CONSTRAINT finance_operational_catalog_account_id_uq UNIQUE (account_id, id),
  CONSTRAINT finance_operational_catalog_created_by_fk
    FOREIGN KEY (account_id, created_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT finance_operational_catalog_updated_by_fk
    FOREIGN KEY (account_id, updated_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_finance_operational_catalog_account_type_status
  ON finance_operational_catalog_items (account_id, catalog_type, status, name);

ALTER TABLE finance_operational_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_operational_catalog_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_operational_catalog_tenant_isolation
  ON finance_operational_catalog_items;
CREATE POLICY finance_operational_catalog_tenant_isolation
  ON finance_operational_catalog_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE finance_operational_catalog_items IS
  'Tenant-scoped banks, payment methods, card machines and split rules with optimistic versioning';
COMMENT ON COLUMN finance_operational_catalog_items.configuration_json IS
  'Validated type-specific operational fields; secrets and provider credentials are forbidden';
