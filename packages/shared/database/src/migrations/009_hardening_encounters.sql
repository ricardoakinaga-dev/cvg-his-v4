-- Migration 009: Hardening encounters
-- Adiciona constraints de integridade referencial e de domínio

-- FK para patients (se não existir)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'encounters_patient_id_fk'
  ) THEN
    ALTER TABLE encounters ADD CONSTRAINT encounters_patient_id_fk 
      FOREIGN KEY (patient_id) REFERENCES patients(id);
  END IF;
END $$;

-- FK para owners
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'encounters_owner_id_fk'
  ) THEN
    ALTER TABLE encounters ADD CONSTRAINT encounters_owner_id_fk 
      FOREIGN KEY (owner_id) REFERENCES owners(id);
  END IF;
END $$;

-- CHECK constraint para encounter_type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'encounters_type_chk'
  ) THEN
    ALTER TABLE encounters ADD CONSTRAINT encounters_type_chk 
      CHECK (encounter_type IN ('consultation', 'emergency', 'return', 'vaccination', 'surgery', 'other'));
  END IF;
END $$;

-- CHECK constraint para priority
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'encounters_priority_chk'
  ) THEN
    ALTER TABLE encounters ADD CONSTRAINT encounters_priority_chk 
      CHECK (priority IS NULL OR priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

-- NOT NULL em chief_complaint (depois de garantir que não há nulos)
-- UPDATE encounters SET chief_complaint = 'Não informado' WHERE chief_complaint IS NULL;
-- ALTER TABLE encounters ALTER COLUMN chief_complaint SET NOT NULL;
-- (Comentado: pode haver encounters antigos sem chief_complaint)
