-- DATA-001: preserve an explicit, tenant-scoped record whenever duplicate
-- patient identities are consolidated. Source rows remain available as
-- inactive records so clinical history is never hard-deleted.
CREATE TABLE IF NOT EXISTS patient_merges (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_patient_id UUID NOT NULL,
  target_patient_id UUID NOT NULL,
  merged_by_user_id UUID NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patient_merges_distinct_patients_chk CHECK (source_patient_id <> target_patient_id),
  CONSTRAINT patient_merges_source_fk
    FOREIGN KEY (account_id, source_patient_id) REFERENCES patients(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT patient_merges_target_fk
    FOREIGN KEY (account_id, target_patient_id) REFERENCES patients(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT patient_merges_actor_fk
    FOREIGN KEY (account_id, merged_by_user_id) REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS patient_merges_one_source
  ON patient_merges(account_id, source_patient_id);
CREATE INDEX IF NOT EXISTS patient_merges_account_created
  ON patient_merges(account_id, created_at DESC);

ALTER TABLE patient_merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_merges FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS patient_merges_tenant_isolation ON patient_merges;
CREATE POLICY patient_merges_tenant_isolation ON patient_merges
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
