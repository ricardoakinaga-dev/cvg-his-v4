-- Migration 007: Expand patients schema
-- Adiciona colunas clínicas estruturadas

ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_neutered BOOLEAN;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS microchip VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS color VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinical_alerts_json JSONB DEFAULT '{}';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10, 3);

-- Migrar weight → weight_kg onde weight_kg é nulo
UPDATE patients SET weight_kg = weight WHERE weight_kg IS NULL AND weight IS NOT NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_patients_microchip ON patients(account_id, microchip);
CREATE INDEX IF NOT EXISTS idx_patients_species ON patients(account_id, species);
