-- Migration 016: Constraints e Índices de Hardening
-- NOT NULL, CHECK, FK constraints + índices de performance

-- === OWNERS ===
-- NOT NULL em full_name (já migrado via 006)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'owners_status_chk') THEN
    ALTER TABLE owners ADD CONSTRAINT owners_status_chk CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- === PATIENTS ===
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'patients_status_chk') THEN
    ALTER TABLE patients ADD CONSTRAINT patients_status_chk CHECK (status IN ('active', 'inactive', 'deceased'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'patients_sex_chk') THEN
    ALTER TABLE patients ADD CONSTRAINT patients_sex_chk CHECK (sex IS NULL OR sex IN ('male', 'female', 'unknown'));
  END IF;
END $$;

-- FK patients → owners
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'patients_owner_fk') THEN
    ALTER TABLE patients ADD CONSTRAINT patients_owner_fk FOREIGN KEY (owner_id) REFERENCES owners(id);
  END IF;
END $$;

-- === ENCOUNTERS ===
-- FK encounters → patients (se não existe)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'encounters_patient_fk') THEN
    ALTER TABLE encounters ADD CONSTRAINT encounters_patient_fk FOREIGN KEY (patient_id) REFERENCES patients(id);
  END IF;
END $$;

-- === MEDICAL RECORDS ===
-- FK medical_records → encounters
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'medical_records_encounter_fk') THEN
    ALTER TABLE medical_records ADD CONSTRAINT medical_records_encounter_fk FOREIGN KEY (encounter_id) REFERENCES encounters(id);
  END IF;
END $$;

-- === CLINICAL ENTRIES ===
-- FK clinical_entries → medical_records
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clinical_entries_record_fk') THEN
    ALTER TABLE clinical_entries ADD CONSTRAINT clinical_entries_record_fk FOREIGN KEY (medical_record_id) REFERENCES medical_records(id);
  END IF;
END $$;

-- === DISCHARGES ===
-- FK discharges → encounters (já em 010, reforçar)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'discharges_account_fk') THEN
    ALTER TABLE discharges ADD CONSTRAINT discharges_account_fk FOREIGN KEY (account_id) REFERENCES owners(account_id) DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- === INPATIENT STAYS ===
-- FK inpatient_stays → encounters
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inpatient_stays_encounter_fk') THEN
    ALTER TABLE inpatient_stays ADD CONSTRAINT inpatient_stays_encounter_fk FOREIGN KEY (encounter_id) REFERENCES encounters(id);
  END IF;
END $$;

-- CHECK em inpatient_stays.status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inpatient_stays_status_chk') THEN
    ALTER TABLE inpatient_stays ADD CONSTRAINT inpatient_stays_status_chk CHECK (status IN ('admitted', 'stable', 'transferred', 'discharged'));
  END IF;
END $$;

-- === PRESCRIPTION EXECUTIONS ===
-- CHECK em scheduled_at > 0 (validação básica)
-- já tem CHECK em status via 012

-- === ÍNDICES DE PERFORMANCE ===
CREATE INDEX IF NOT EXISTS idx_encounters_account_status_created ON encounters(account_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_entries_record_type ON clinical_entries(medical_record_id, entry_type);
CREATE INDEX IF NOT EXISTS idx_clinical_entries_patient ON clinical_entries(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_patient_links_composite ON owner_patient_links(owner_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_discharges_account_type ON discharges(account_id, discharge_type);
CREATE INDEX IF NOT EXISTS idx_pe_account_status_scheduled ON prescription_executions(account_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_account_status ON appointments(account_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_inpatient_stays_account_status ON inpatient_stays(account_id, status);
