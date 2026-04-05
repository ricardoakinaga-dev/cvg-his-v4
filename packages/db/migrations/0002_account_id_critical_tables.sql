-- Onda 1 - Fase 2: Account ID em tabelas criticas sem tenant isolation
-- Adiciona account_id nas 3 tabelas com TODOs de seguranca

-- 1. clinical_notes
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS account_id UUID;
UPDATE clinical_notes cn SET account_id = (SELECT account_id FROM encounters e WHERE e.id = cn.encounter_id) WHERE account_id IS NULL;
ALTER TABLE clinical_notes ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE clinical_notes ADD CONSTRAINT clinical_notes_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_clinical_notes_account_id ON clinical_notes (account_id);

-- 2. clinical_note_versions
ALTER TABLE clinical_note_versions ADD COLUMN IF NOT EXISTS account_id UUID;
UPDATE clinical_note_versions cnv SET account_id = (SELECT account_id FROM clinical_notes cn WHERE cn.id = cnv.note_id) WHERE account_id IS NULL;
ALTER TABLE clinical_note_versions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE clinical_note_versions ADD CONSTRAINT clinical_note_versions_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_clinical_note_versions_account_id ON clinical_note_versions (account_id);

-- 3. encounter_documents
ALTER TABLE encounter_documents ADD COLUMN IF NOT EXISTS account_id UUID;
UPDATE encounter_documents ed SET account_id = (SELECT account_id FROM encounters e WHERE e.id = ed.encounter_id) WHERE account_id IS NULL;
ALTER TABLE encounter_documents ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE encounter_documents ADD CONSTRAINT encounter_documents_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_encounter_documents_account_id ON encounter_documents (account_id);
