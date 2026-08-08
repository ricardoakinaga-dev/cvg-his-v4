-- MIG-001: durable, tenant-scoped and idempotent Vetus import ledger.

CREATE TABLE IF NOT EXISTS vetus_import_logs (
  id VARCHAR(120) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_system VARCHAR(80) NOT NULL,
  source_reference VARCHAR(255),
  status VARCHAR(20) NOT NULL CHECK (status IN ('imported', 'linked')),
  owner_id UUID NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  patient_id UUID NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  imported_by_user_id UUID NOT NULL,
  reviewed_by VARCHAR(255),
  imported_at TIMESTAMPTZ NOT NULL,
  summary VARCHAR(1000) NOT NULL,
  CONSTRAINT vetus_import_logs_account_owner_fk
    FOREIGN KEY (account_id, owner_id) REFERENCES owners(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT vetus_import_logs_account_patient_fk
    FOREIGN KEY (account_id, patient_id) REFERENCES patients(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT vetus_import_logs_account_user_fk
    FOREIGN KEY (account_id, imported_by_user_id) REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_vetus_import_logs_account_imported_at
  ON vetus_import_logs(account_id, imported_at DESC);

CREATE INDEX IF NOT EXISTS idx_vetus_import_logs_account_legacy_reference
  ON vetus_import_logs(account_id, source_system, source_reference)
  WHERE source_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vetus_import_logs_account_source_reference_unique
  ON vetus_import_logs(account_id, source_system, source_reference)
  WHERE source_reference IS NOT NULL;

ALTER TABLE vetus_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vetus_import_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vetus_import_logs_tenant_isolation ON vetus_import_logs;
CREATE POLICY vetus_import_logs_tenant_isolation ON vetus_import_logs
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
