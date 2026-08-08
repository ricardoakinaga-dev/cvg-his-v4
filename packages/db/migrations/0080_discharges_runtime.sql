-- Persistent clinical discharge aggregate for the canonical PostgreSQL runtime.

CREATE TABLE IF NOT EXISTS discharges (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  discharge_type TEXT NOT NULL CHECK (discharge_type IN ('ambulatory', 'inpatient', 'transfer', 'death')),
  outcome TEXT,
  clinical_summary TEXT,
  continuity_instructions TEXT,
  follow_up_date TIMESTAMPTZ,
  follow_up_notes TEXT,
  discharged_by UUID NOT NULL REFERENCES users(id),
  discharged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discharges_account_encounter_unique UNIQUE (account_id, encounter_id)
);

CREATE INDEX IF NOT EXISTS idx_discharges_account_discharged_at
  ON discharges (account_id, discharged_at DESC);

ALTER TABLE discharges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS discharges_tenant_isolation ON discharges;
CREATE POLICY discharges_tenant_isolation ON discharges
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE discharges IS
  'Alta clinica duravel; mutacoes pertencem ao agregado do atendimento e ao tenant atual.';
