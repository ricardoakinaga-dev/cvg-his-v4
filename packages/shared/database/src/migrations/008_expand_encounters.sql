-- Migration 008: Expand encounters schema
-- Adiciona campos para suportar o fluxo completo de atendimento

ALTER TABLE encounters ADD COLUMN IF NOT EXISTS encounter_type VARCHAR(50) DEFAULT 'consultation';
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS origin VARCHAR(50) DEFAULT 'walk_in';
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS clinical_snapshot_json JSONB;

-- Migrar visit_type → encounter_type onde encounter_type é nulo ou default
UPDATE encounters SET encounter_type = visit_type WHERE encounter_type = 'consultation' AND visit_type IS NOT NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_encounters_type ON encounters(account_id, encounter_type);
CREATE INDEX IF NOT EXISTS idx_encounters_priority ON encounters(account_id, priority);
CREATE INDEX IF NOT EXISTS idx_encounters_assigned ON encounters(account_id, assigned_to_user_id);
