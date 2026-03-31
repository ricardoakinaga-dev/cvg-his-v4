-- Migration 011: Expand inpatient_stays
-- Adiciona colunas para suportar internação completa

ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS admission_type VARCHAR(50) DEFAULT 'clinical';
ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS estimated_discharge TIMESTAMP;
ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS actual_discharge TIMESTAMP;
ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS admitted_by VARCHAR(255);
ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS discharged_by VARCHAR(255);
ALTER TABLE inpatient_stays ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- CHECK constraint para admission_type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inpatient_admission_type_chk'
  ) THEN
    ALTER TABLE inpatient_stays ADD CONSTRAINT inpatient_admission_type_chk 
      CHECK (admission_type IN ('clinical', 'surgical', 'emergency', 'observation'));
  END IF;
END $$;

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_inpatient_admitted_by ON inpatient_stays(admitted_by);
CREATE INDEX IF NOT EXISTS idx_inpatient_admission_type ON inpatient_stays(account_id, admission_type);
