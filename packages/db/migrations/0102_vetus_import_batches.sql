-- MIG-001: batch control plane for dry-run, rejected rows, resume and rollback.

CREATE UNIQUE INDEX IF NOT EXISTS vetus_import_logs_account_id_id_unique
  ON vetus_import_logs(account_id, id);

CREATE TABLE IF NOT EXISTS vetus_import_batches (
  id VARCHAR(120) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_system VARCHAR(80) NOT NULL,
  source_reference VARCHAR(255),
  status VARCHAR(20) NOT NULL CHECK (status IN ('dry_run', 'completed', 'partial', 'rolled_back')),
  total_count INTEGER NOT NULL CHECK (total_count >= 0),
  imported_count INTEGER NOT NULL CHECK (imported_count >= 0),
  linked_count INTEGER NOT NULL CHECK (linked_count >= 0),
  rejected_count INTEGER NOT NULL CHECK (rejected_count >= 0),
  rolled_back_count INTEGER NOT NULL CHECK (rolled_back_count >= 0),
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT vetus_import_batches_account_id_unique UNIQUE (account_id, id),
  CONSTRAINT vetus_import_batches_account_user_fk
    FOREIGN KEY (account_id, created_by_user_id) REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_vetus_import_batches_account_updated_at
  ON vetus_import_batches(account_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS vetus_import_batches_account_source_reference_unique
  ON vetus_import_batches(account_id, source_system, source_reference)
  WHERE source_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS vetus_import_batch_items (
  id VARCHAR(120) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  batch_id VARCHAR(120) NOT NULL,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  source_reference VARCHAR(255),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'validated', 'imported', 'linked', 'rejected', 'rolled_back')),
  import_log_id VARCHAR(120),
  owner_id UUID,
  patient_id UUID,
  owner_created BOOLEAN NOT NULL DEFAULT FALSE,
  patient_created BOOLEAN NOT NULL DEFAULT FALSE,
  reason VARCHAR(1000),
  payload_json JSONB NOT NULL CHECK (jsonb_typeof(payload_json) = 'object'),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT vetus_import_batch_items_account_batch_fk
    FOREIGN KEY (account_id, batch_id) REFERENCES vetus_import_batches(account_id, id) ON DELETE CASCADE,
  CONSTRAINT vetus_import_batch_items_account_log_fk
    FOREIGN KEY (account_id, import_log_id) REFERENCES vetus_import_logs(account_id, id) ON DELETE SET NULL,
  CONSTRAINT vetus_import_batch_items_account_owner_fk
    FOREIGN KEY (account_id, owner_id) REFERENCES owners(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT vetus_import_batch_items_account_patient_fk
    FOREIGN KEY (account_id, patient_id) REFERENCES patients(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT vetus_import_batch_items_batch_row_unique UNIQUE (account_id, batch_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_vetus_import_batch_items_account_batch
  ON vetus_import_batch_items(account_id, batch_id, row_number);

CREATE INDEX IF NOT EXISTS idx_vetus_import_batch_items_account_status
  ON vetus_import_batch_items(account_id, status, updated_at DESC);

ALTER TABLE vetus_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE vetus_import_batches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vetus_import_batches_tenant_isolation ON vetus_import_batches;
CREATE POLICY vetus_import_batches_tenant_isolation ON vetus_import_batches
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE vetus_import_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vetus_import_batch_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vetus_import_batch_items_tenant_isolation ON vetus_import_batch_items;
CREATE POLICY vetus_import_batch_items_tenant_isolation ON vetus_import_batch_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
