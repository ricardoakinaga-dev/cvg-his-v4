-- LAB-002: tenant-scoped durable idempotency ledger for equipment/provider results.
CREATE TABLE IF NOT EXISTS laboratory_result_imports (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  external_result_id VARCHAR(120) NOT NULL,
  order_id VARCHAR(120) NOT NULL,
  equipment_id VARCHAR(120) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('imported', 'failed')),
  imported_at TIMESTAMPTZ NOT NULL,
  result_summary VARCHAR(4000) NOT NULL,
  failure_reason VARCHAR(1000),
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  last_attempt_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (account_id, external_result_id)
);

CREATE INDEX IF NOT EXISTS laboratory_result_imports_account_time
  ON laboratory_result_imports(account_id, imported_at DESC);

ALTER TABLE laboratory_result_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_result_imports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS laboratory_result_imports_tenant_isolation ON laboratory_result_imports;
CREATE POLICY laboratory_result_imports_tenant_isolation ON laboratory_result_imports
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
