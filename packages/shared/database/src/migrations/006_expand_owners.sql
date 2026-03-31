-- Migration 006: Expand owners schema
-- Adiciona colunas faltantes para alinhar com documentação e schema Drizzle

ALTER TABLE owners ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE owners ADD COLUMN IF NOT EXISTS contacts_json JSONB;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS financial_responsible VARCHAR(255);
ALTER TABLE owners ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- Migrar dados de name → full_name onde full_name é nulo
UPDATE owners SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_owners_full_name ON owners(account_id, full_name);
CREATE INDEX IF NOT EXISTS idx_owners_document ON owners(account_id, document_number);
