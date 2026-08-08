-- Persistencia canonica para execucao de prescricao e trilha de administracao.
-- Os identificadores clinicos V2 sao polimorficos (ex.: pe_<correlation>),
-- portanto as tabelas usam TEXT para IDs de execucao e entrada clinica.

CREATE TABLE IF NOT EXISTS prescription_executions (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  clinical_entry_id TEXT NOT NULL,
  patient_id UUID NOT NULL,
  encounter_id UUID NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  route TEXT,
  frequency TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  administered_by UUID,
  administered_at TIMESTAMPTZ,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prescription_executions_status_chk
    CHECK (status IN ('pending', 'administered', 'not-administered', 'suspended', 'cancelled')),
  CONSTRAINT prescription_executions_version_chk CHECK (version > 0),
  CONSTRAINT prescription_executions_medication_chk CHECK (length(btrim(medication_name)) > 0),
  CONSTRAINT prescription_executions_dosage_chk CHECK (length(btrim(dosage)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_prescription_executions_account_scheduled
  ON prescription_executions(account_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_executions_account_encounter
  ON prescription_executions(account_id, encounter_id, scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_prescription_executions_account_patient
  ON prescription_executions(account_id, patient_id, scheduled_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prescription_executions_account_id_unique
  ON prescription_executions(account_id, id);

CREATE TABLE IF NOT EXISTS administration_events (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  execution_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  vitals_snapshot_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT administration_events_account_execution_fk
    FOREIGN KEY (account_id, execution_id)
    REFERENCES prescription_executions(account_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_administration_events_account_execution
  ON administration_events(account_id, execution_id, occurred_at ASC);

ALTER TABLE prescription_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prescription_executions_tenant_isolation ON prescription_executions;
CREATE POLICY prescription_executions_tenant_isolation ON prescription_executions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE administration_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS administration_events_tenant_isolation ON administration_events;
CREATE POLICY administration_events_tenant_isolation ON administration_events
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
