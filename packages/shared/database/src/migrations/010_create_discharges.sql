-- Migration 010: Create discharges table
-- Módulo de Alta / Desfecho Clínico

CREATE TABLE IF NOT EXISTS discharges (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  discharge_type VARCHAR(50) NOT NULL,
  outcome VARCHAR(255),
  clinical_summary TEXT,
  continuity_instructions TEXT,
  follow_up_date TIMESTAMP,
  follow_up_notes TEXT,
  discharged_by VARCHAR(255) NOT NULL,
  discharged_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT discharges_type_chk CHECK (discharge_type IN ('ambulatory', 'inpatient', 'transfer', 'death')),
  CONSTRAINT discharges_encounter_unique UNIQUE (encounter_id)
);

-- FK para encounters
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'discharges_encounter_id_fk'
  ) THEN
    ALTER TABLE discharges ADD CONSTRAINT discharges_encounter_id_fk 
      FOREIGN KEY (encounter_id) REFERENCES encounters(id);
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_discharges_account ON discharges(account_id);
CREATE INDEX IF NOT EXISTS idx_discharges_encounter ON discharges(encounter_id);
CREATE INDEX IF NOT EXISTS idx_discharges_discharged_by ON discharges(discharged_by);
CREATE INDEX IF NOT EXISTS idx_discharges_discharged_at ON discharges(account_id, discharged_at);
