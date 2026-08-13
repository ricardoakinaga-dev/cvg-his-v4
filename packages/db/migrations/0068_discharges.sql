-- Materialize the clinical discharge persistence used by the API runtime.
-- A legacy shared migration used VARCHAR tenant identifiers and timestamp
-- values without a zone; align those installations with the canonical schema.

CREATE TABLE IF NOT EXISTS discharges (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL,
  encounter_id UUID NOT NULL,
  discharge_type VARCHAR(50) NOT NULL,
  outcome VARCHAR(255),
  clinical_summary TEXT,
  continuity_instructions TEXT,
  follow_up_date TIMESTAMPTZ,
  follow_up_notes TEXT,
  discharged_by UUID NOT NULL,
  discharged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE discharges DROP CONSTRAINT IF EXISTS discharges_encounter_id_fk;
ALTER TABLE discharges DROP CONSTRAINT IF EXISTS discharges_encounter_unique;
ALTER TABLE discharges DROP CONSTRAINT IF EXISTS discharges_account_id_fkey;
ALTER TABLE discharges DROP CONSTRAINT IF EXISTS discharges_encounter_id_fkey;
ALTER TABLE discharges DROP CONSTRAINT IF EXISTS discharges_discharged_by_fkey;
ALTER TABLE discharges DROP CONSTRAINT IF EXISTS discharges_account_fk;
ALTER TABLE discharges DROP CONSTRAINT IF EXISTS discharges_encounter_account_fk;
ALTER TABLE discharges DROP CONSTRAINT IF EXISTS discharges_user_account_fk;

ALTER TABLE discharges
  ALTER COLUMN account_id TYPE UUID USING account_id::uuid,
  ALTER COLUMN encounter_id TYPE UUID USING encounter_id::uuid,
  ALTER COLUMN discharged_by TYPE UUID USING discharged_by::uuid,
  ALTER COLUMN follow_up_date TYPE TIMESTAMPTZ USING follow_up_date AT TIME ZONE 'UTC',
  ALTER COLUMN discharged_at TYPE TIMESTAMPTZ USING discharged_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE discharges DROP CONSTRAINT IF EXISTS discharges_type_chk;
ALTER TABLE discharges
  ADD CONSTRAINT discharges_type_chk CHECK (
    discharge_type IN ('ambulatory', 'inpatient', 'transfer', 'death')
  );
ALTER TABLE discharges DROP CONSTRAINT IF EXISTS discharges_version_chk;
ALTER TABLE discharges
  ADD CONSTRAINT discharges_version_chk CHECK (version > 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_discharges_id_account
  ON discharges (id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_discharges_account_encounter
  ON discharges (account_id, encounter_id);

ALTER TABLE discharges
  ADD CONSTRAINT discharges_account_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE discharges
  ADD CONSTRAINT discharges_encounter_account_fk
  FOREIGN KEY (encounter_id, account_id)
  REFERENCES encounters(id, account_id) ON DELETE CASCADE;
ALTER TABLE discharges
  ADD CONSTRAINT discharges_user_account_fk
  FOREIGN KEY (discharged_by, account_id)
  REFERENCES users(id, account_id);

CREATE INDEX IF NOT EXISTS idx_discharges_account
  ON discharges (account_id);
CREATE INDEX IF NOT EXISTS idx_discharges_encounter
  ON discharges (account_id, encounter_id);
CREATE INDEX IF NOT EXISTS idx_discharges_discharged_by
  ON discharges (account_id, discharged_by);
CREATE INDEX IF NOT EXISTS idx_discharges_discharged_at
  ON discharges (account_id, discharged_at DESC);

ALTER TABLE discharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE discharges FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS discharges_tenant_isolation ON discharges;
CREATE POLICY discharges_tenant_isolation ON discharges
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
