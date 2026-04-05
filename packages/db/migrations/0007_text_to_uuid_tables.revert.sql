-- Onda 1 - Fase 3b: REVERT — Reverter conversão text→uuid
-- Reverte a migration 0007_text_to_uuid_tables.sql
-- Use apenas em caso de emergencia ou rollback planejado.
--
-- ATENCAO: Esta migration recria as colunas text e remove as FKs.
-- Dados inseridos apos a migration 0007 serao perdidos.

-- ============================================================================
-- 1. REMOVER FKs E INDICES NOVOS
-- ============================================================================

-- triage_records
DROP INDEX IF EXISTS idx_triage_records_account_created;
ALTER TABLE triage_records DROP CONSTRAINT IF EXISTS triage_records_account_id_fkey;

-- triage_record_versions
DROP INDEX IF EXISTS idx_triage_versions_account_created;
ALTER TABLE triage_record_versions DROP CONSTRAINT IF EXISTS triage_record_versions_account_id_fkey;

-- scheduling_queue_entries
DROP INDEX IF EXISTS idx_scheduling_queue_account_checked_in;
DROP INDEX IF EXISTS idx_scheduling_queue_account_status;
DROP INDEX IF EXISTS idx_scheduling_queue_account_priority;
ALTER TABLE scheduling_queue_entries DROP CONSTRAINT IF EXISTS scheduling_queue_entries_account_id_fkey;

-- ============================================================================
-- 2. REVERTER TRIAGE_RECORDS
-- ============================================================================

ALTER TABLE triage_records ADD COLUMN account_id_text text;
UPDATE triage_records SET account_id_text = account_id::text;
ALTER TABLE triage_records ALTER COLUMN account_id_text SET NOT NULL;
ALTER TABLE triage_records DROP COLUMN account_id;
ALTER TABLE triage_records RENAME COLUMN account_id_text TO account_id;
CREATE INDEX idx_triage_records_account_created ON triage_records USING btree (account_id, created_at);

-- ============================================================================
-- 3. REVERTER TRIAGE_RECORD_VERSIONS
-- ============================================================================

ALTER TABLE triage_record_versions ADD COLUMN account_id_text text;
UPDATE triage_record_versions SET account_id_text = account_id::text;
ALTER TABLE triage_record_versions ALTER COLUMN account_id_text SET NOT NULL;
ALTER TABLE triage_record_versions DROP COLUMN account_id;
ALTER TABLE triage_record_versions RENAME COLUMN account_id_text TO account_id;
CREATE INDEX idx_triage_versions_account_created ON triage_record_versions USING btree (account_id, created_at);

-- ============================================================================
-- 4. REVERTER SCHEDULING_QUEUE_ENTRIES
-- ============================================================================

ALTER TABLE scheduling_queue_entries ADD COLUMN account_id_text text;
UPDATE scheduling_queue_entries SET account_id_text = account_id::text;
ALTER TABLE scheduling_queue_entries ALTER COLUMN account_id_text SET NOT NULL;
ALTER TABLE scheduling_queue_entries DROP COLUMN account_id;
ALTER TABLE scheduling_queue_entries RENAME COLUMN account_id_text TO account_id;
CREATE INDEX idx_scheduling_queue_account_checked_in ON scheduling_queue_entries USING btree (account_id, checked_in_at);
CREATE INDEX idx_scheduling_queue_account_status ON scheduling_queue_entries USING btree (account_id, status);
CREATE INDEX idx_scheduling_queue_account_priority ON scheduling_queue_entries USING btree (account_id, priority, checked_in_at);
