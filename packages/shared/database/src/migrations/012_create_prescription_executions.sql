-- Migration 012: Create prescription executions tables
-- Módulo de Execução de Prescrição / Enfermagem

CREATE TABLE IF NOT EXISTS prescription_executions (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  clinical_entry_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(255) NOT NULL,
  route VARCHAR(100),
  frequency VARCHAR(100),
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  administered_by VARCHAR(255),
  administered_at TIMESTAMP,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT prescription_exec_status_chk CHECK (status IN ('pending', 'administered', 'not-administered', 'suspended', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS administration_events (
  id VARCHAR(255) PRIMARY KEY,
  execution_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  actor_id VARCHAR(255) NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT,
  vitals_snapshot_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- FK para clinical_entries
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pe_clinical_entry_id_fk'
  ) THEN
    ALTER TABLE prescription_executions ADD CONSTRAINT pe_clinical_entry_id_fk 
      FOREIGN KEY (clinical_entry_id) REFERENCES clinical_entries(id);
  END IF;
END $$;

-- FK para patients
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pe_patient_id_fk'
  ) THEN
    ALTER TABLE prescription_executions ADD CONSTRAINT pe_patient_id_fk 
      FOREIGN KEY (patient_id) REFERENCES patients(id);
  END IF;
END $$;

-- FK para encounters
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pe_encounter_id_fk'
  ) THEN
    ALTER TABLE prescription_executions ADD CONSTRAINT pe_encounter_id_fk 
      FOREIGN KEY (encounter_id) REFERENCES encounters(id);
  END IF;
END $$;

-- FK administration_events → prescription_executions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ae_execution_id_fk'
  ) THEN
    ALTER TABLE administration_events ADD CONSTRAINT ae_execution_id_fk 
      FOREIGN KEY (execution_id) REFERENCES prescription_executions(id);
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_pe_account ON prescription_executions(account_id);
CREATE INDEX IF NOT EXISTS idx_pe_patient ON prescription_executions(patient_id);
CREATE INDEX IF NOT EXISTS idx_pe_encounter ON prescription_executions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_pe_status ON prescription_executions(account_id, status);
CREATE INDEX IF NOT EXISTS idx_pe_scheduled ON prescription_executions(account_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ae_execution ON administration_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_ae_occurred ON administration_events(occurred_at);
