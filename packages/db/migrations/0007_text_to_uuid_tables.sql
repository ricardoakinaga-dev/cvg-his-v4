-- Onda 1 - Fase 3b: Migrar tabelas text-based para UUID
-- Converte account_id de text para uuid em:
--   - triage_records
--   - triage_record_versions
--   - scheduling_queue_entries
--
-- Estratégia:
-- 1. Validar que todos os account_id existentes são UUIDs válidos
-- 2. Adicionar coluna temporária account_id_uuid
-- 3. Popular com cast seguro (falha se houver valores inválidos)
-- 4. Remover índices antigos
-- 5. Drop coluna text
-- 6. Renomear coluna uuid
-- 7. Criar FKs e índices novos
-- 8. Adicionar NOT NULL constraint

-- ============================================================================
-- 1. VALIDAÇÃO PRÉVIA
-- ============================================================================

-- Verificar se existem account_id que não são UUIDs válidos
-- Se qualquer uma dessas queries retornar rows, a migration DEVE falhar
DO $$
DECLARE
  invalid_triage int;
  invalid_triage_ver int;
  invalid_scheduling int;
BEGIN
  SELECT COUNT(*) INTO invalid_triage
    FROM triage_records
    WHERE account_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  SELECT COUNT(*) INTO invalid_triage_ver
    FROM triage_record_versions
    WHERE account_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  SELECT COUNT(*) INTO invalid_scheduling
    FROM scheduling_queue_entries
    WHERE account_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF invalid_triage > 0 OR invalid_triage_ver > 0 OR invalid_scheduling > 0 THEN
    RAISE EXCEPTION 'Invalid account_id values found: triage_records=%, triage_record_versions=%, scheduling_queue_entries=%. Fix data before running this migration.',
      invalid_triage, invalid_triage_ver, invalid_scheduling;
  END IF;
END
$$;

-- ============================================================================
-- 2. TRIAGE_RECORDS
-- ============================================================================

-- Drop índices antigos (usam coluna text)
DROP INDEX IF EXISTS idx_triage_records_account_created;

-- Adicionar coluna uuid temporária
ALTER TABLE triage_records ADD COLUMN account_id_uuid uuid;

-- Popular com cast seguro
UPDATE triage_records SET account_id_uuid = account_id::uuid;

-- Garantir NOT NULL na nova coluna
ALTER TABLE triage_records ALTER COLUMN account_id_uuid SET NOT NULL;

-- Drop coluna text
ALTER TABLE triage_records DROP COLUMN account_id;

-- Renomear
ALTER TABLE triage_records RENAME COLUMN account_id_uuid TO account_id;

-- Criar FK
ALTER TABLE triage_records
  ADD CONSTRAINT triage_records_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Recriar índice com uuid
CREATE INDEX idx_triage_records_account_created ON triage_records USING btree (account_id, created_at);

-- ============================================================================
-- 3. TRIAGE_RECORD_VERSIONS
-- ============================================================================

DROP INDEX IF EXISTS idx_triage_versions_account_created;

ALTER TABLE triage_record_versions ADD COLUMN account_id_uuid uuid;
UPDATE triage_record_versions SET account_id_uuid = account_id::uuid;
ALTER TABLE triage_record_versions ALTER COLUMN account_id_uuid SET NOT NULL;
ALTER TABLE triage_record_versions DROP COLUMN account_id;
ALTER TABLE triage_record_versions RENAME COLUMN account_id_uuid TO account_id;

ALTER TABLE triage_record_versions
  ADD CONSTRAINT triage_record_versions_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

CREATE INDEX idx_triage_versions_account_created ON triage_record_versions USING btree (account_id, created_at);

-- ============================================================================
-- 4. SCHEDULING_QUEUE_ENTRIES
-- ============================================================================

DROP INDEX IF EXISTS idx_scheduling_queue_account_checked_in;
DROP INDEX IF EXISTS idx_scheduling_queue_account_status;
DROP INDEX IF EXISTS idx_scheduling_queue_account_priority;

ALTER TABLE scheduling_queue_entries ADD COLUMN account_id_uuid uuid;
UPDATE scheduling_queue_entries SET account_id_uuid = account_id::uuid;
ALTER TABLE scheduling_queue_entries ALTER COLUMN account_id_uuid SET NOT NULL;
ALTER TABLE scheduling_queue_entries DROP COLUMN account_id;
ALTER TABLE scheduling_queue_entries RENAME COLUMN account_id_uuid TO account_id;

ALTER TABLE scheduling_queue_entries
  ADD CONSTRAINT scheduling_queue_entries_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

CREATE INDEX idx_scheduling_queue_account_checked_in ON scheduling_queue_entries USING btree (account_id, checked_in_at);
CREATE INDEX idx_scheduling_queue_account_status ON scheduling_queue_entries USING btree (account_id, status);
CREATE INDEX idx_scheduling_queue_account_priority ON scheduling_queue_entries USING btree (account_id, priority, checked_in_at);

-- ============================================================================
-- 5. COMENTÁRIOS
-- ============================================================================

COMMENT ON COLUMN triage_records.account_id IS 'FK to accounts — migrated from text to uuid in Fase 3b';
COMMENT ON COLUMN triage_record_versions.account_id IS 'FK to accounts — migrated from text to uuid in Fase 3b';
COMMENT ON COLUMN scheduling_queue_entries.account_id IS 'FK to accounts — migrated from text to uuid in Fase 3b';
