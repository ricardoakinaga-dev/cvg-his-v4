import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Migration 0007 — Text-to-UUID Conversion', () => {
  const migrationPath = resolve(
    __dirname,
    '../../../packages/db/migrations/0007_text_to_uuid_tables.sql'
  );
  const revertPath = resolve(
    __dirname,
    '../../../packages/db/migrations/0007_text_to_uuid_tables.revert.sql'
  );

  let migrationContent: string;
  let revertContent: string;

  beforeAll(() => {
    migrationContent = readFileSync(migrationPath, 'utf-8');
    revertContent = readFileSync(revertPath, 'utf-8');
  });

  describe('Forward migration', () => {
    it('should exist and be non-empty', () => {
      expect(migrationContent.length).toBeGreaterThan(100);
    });

    it('should validate UUID format before conversion', () => {
      expect(migrationContent).toContain('invalid_triage');
      expect(migrationContent).toContain('invalid_triage_ver');
      expect(migrationContent).toContain('invalid_scheduling');
      expect(migrationContent).toContain('RAISE EXCEPTION');
    });

    it('should validate triage_records account_id values', () => {
      expect(migrationContent).toContain('FROM triage_records');
      expect(migrationContent).toContain(
        "account_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'"
      );
    });

    it('should validate triage_record_versions account_id values', () => {
      expect(migrationContent).toContain('FROM triage_record_versions');
    });

    it('should validate scheduling_queue_entries account_id values', () => {
      expect(migrationContent).toContain('FROM scheduling_queue_entries');
    });

    it('should drop old indexes on triage_records', () => {
      expect(migrationContent).toContain('DROP INDEX IF EXISTS idx_triage_records_account_created');
    });

    it('should drop old indexes on scheduling_queue_entries', () => {
      expect(migrationContent).toContain(
        'DROP INDEX IF EXISTS idx_scheduling_queue_account_checked_in'
      );
      expect(migrationContent).toContain(
        'DROP INDEX IF EXISTS idx_scheduling_queue_account_status'
      );
      expect(migrationContent).toContain(
        'DROP INDEX IF EXISTS idx_scheduling_queue_account_priority'
      );
    });

    it('should add temporary uuid column for triage_records', () => {
      expect(migrationContent).toContain(
        'ALTER TABLE triage_records ADD COLUMN account_id_uuid uuid'
      );
    });

    it('should cast text to uuid for triage_records', () => {
      expect(migrationContent).toContain(
        'UPDATE triage_records SET account_id_uuid = account_id::uuid'
      );
    });

    it('should set NOT NULL on uuid column', () => {
      expect(migrationContent).toContain(
        'ALTER TABLE triage_records ALTER COLUMN account_id_uuid SET NOT NULL'
      );
      expect(migrationContent).toContain(
        'ALTER TABLE triage_record_versions ALTER COLUMN account_id_uuid SET NOT NULL'
      );
      expect(migrationContent).toContain(
        'ALTER TABLE scheduling_queue_entries ALTER COLUMN account_id_uuid SET NOT NULL'
      );
    });

    it('should drop text column and rename uuid column', () => {
      expect(migrationContent).toContain('ALTER TABLE triage_records DROP COLUMN account_id');
      expect(migrationContent).toContain(
        'ALTER TABLE triage_records RENAME COLUMN account_id_uuid TO account_id'
      );
    });

    it('should create FK for triage_records', () => {
      expect(migrationContent).toContain('ALTER TABLE triage_records');
      expect(migrationContent).toContain('ADD CONSTRAINT triage_records_account_id_fkey');
      expect(migrationContent).toContain('FOREIGN KEY (account_id) REFERENCES accounts(id)');
      expect(migrationContent).toContain('ON DELETE CASCADE');
    });

    it('should create FK for triage_record_versions', () => {
      expect(migrationContent).toContain('ADD CONSTRAINT triage_record_versions_account_id_fkey');
      expect(migrationContent).toContain('FOREIGN KEY (account_id) REFERENCES accounts(id)');
    });

    it('should create FK for scheduling_queue_entries', () => {
      expect(migrationContent).toContain('ADD CONSTRAINT scheduling_queue_entries_account_id_fkey');
      expect(migrationContent).toContain('FOREIGN KEY (account_id) REFERENCES accounts(id)');
    });

    it('should recreate indexes with uuid type', () => {
      expect(migrationContent).toContain(
        'CREATE INDEX idx_triage_records_account_created ON triage_records USING btree (account_id, created_at)'
      );
      expect(migrationContent).toContain(
        'CREATE INDEX idx_triage_versions_account_created ON triage_record_versions USING btree (account_id, created_at)'
      );
      expect(migrationContent).toContain(
        'CREATE INDEX idx_scheduling_queue_account_checked_in ON scheduling_queue_entries USING btree (account_id, checked_in_at)'
      );
    });

    it('should add column comments', () => {
      expect(migrationContent).toContain('COMMENT ON COLUMN triage_records.account_id');
      expect(migrationContent).toContain('COMMENT ON COLUMN triage_record_versions.account_id');
      expect(migrationContent).toContain('COMMENT ON COLUMN scheduling_queue_entries.account_id');
    });
  });

  describe('Revert migration', () => {
    it('should exist and be non-empty', () => {
      expect(revertContent.length).toBeGreaterThan(100);
    });

    it('should drop new indexes', () => {
      expect(revertContent).toContain('DROP INDEX IF EXISTS idx_triage_records_account_created');
      expect(revertContent).toContain('DROP INDEX IF EXISTS idx_triage_versions_account_created');
      expect(revertContent).toContain(
        'DROP INDEX IF EXISTS idx_scheduling_queue_account_checked_in'
      );
    });

    it('should drop FK constraints', () => {
      expect(revertContent).toContain(
        'ALTER TABLE triage_records DROP CONSTRAINT IF EXISTS triage_records_account_id_fkey'
      );
      expect(revertContent).toContain(
        'ALTER TABLE triage_record_versions DROP CONSTRAINT IF EXISTS triage_record_versions_account_id_fkey'
      );
      expect(revertContent).toContain(
        'ALTER TABLE scheduling_queue_entries DROP CONSTRAINT IF EXISTS scheduling_queue_entries_account_id_fkey'
      );
    });

    it('should revert triage_records to text', () => {
      expect(revertContent).toContain('ALTER TABLE triage_records ADD COLUMN account_id_text text');
      expect(revertContent).toContain(
        'UPDATE triage_records SET account_id_text = account_id::text'
      );
      expect(revertContent).toContain('ALTER TABLE triage_records DROP COLUMN account_id');
      expect(revertContent).toContain(
        'ALTER TABLE triage_records RENAME COLUMN account_id_text TO account_id'
      );
    });

    it('should revert triage_record_versions to text', () => {
      expect(revertContent).toContain(
        'ALTER TABLE triage_record_versions ADD COLUMN account_id_text text'
      );
      expect(revertContent).toContain('ALTER TABLE triage_record_versions DROP COLUMN account_id');
      expect(revertContent).toContain(
        'ALTER TABLE triage_record_versions RENAME COLUMN account_id_text TO account_id'
      );
    });

    it('should revert scheduling_queue_entries to text', () => {
      expect(revertContent).toContain(
        'ALTER TABLE scheduling_queue_entries ADD COLUMN account_id_text text'
      );
      expect(revertContent).toContain(
        'ALTER TABLE scheduling_queue_entries DROP COLUMN account_id'
      );
      expect(revertContent).toContain(
        'ALTER TABLE scheduling_queue_entries RENAME COLUMN account_id_text TO account_id'
      );
    });

    it('should recreate old indexes', () => {
      expect(revertContent).toContain(
        'CREATE INDEX idx_triage_records_account_created ON triage_records USING btree (account_id, created_at)'
      );
      expect(revertContent).toContain(
        'CREATE INDEX idx_triage_versions_account_created ON triage_record_versions USING btree (account_id, created_at)'
      );
      expect(revertContent).toContain(
        'CREATE INDEX idx_scheduling_queue_account_checked_in ON scheduling_queue_entries USING btree (account_id, checked_in_at)'
      );
      expect(revertContent).toContain(
        'CREATE INDEX idx_scheduling_queue_account_status ON scheduling_queue_entries USING btree (account_id, status)'
      );
      expect(revertContent).toContain(
        'CREATE INDEX idx_scheduling_queue_account_priority ON scheduling_queue_entries USING btree (account_id, priority, checked_in_at)'
      );
    });
  });
});

describe('Migration 0008 — RLS on Text-Based Tables', () => {
  const migrationPath = resolve(
    __dirname,
    '../../../packages/db/migrations/0008_rls_text_based_tables.sql'
  );
  const revertPath = resolve(
    __dirname,
    '../../../packages/db/migrations/0008_rls_text_based_tables.revert.sql'
  );

  let migrationContent: string;
  let revertContent: string;

  beforeAll(() => {
    migrationContent = readFileSync(migrationPath, 'utf-8');
    revertContent = readFileSync(revertPath, 'utf-8');
  });

  describe('Forward migration', () => {
    it('should exist and be non-empty', () => {
      expect(migrationContent.length).toBeGreaterThan(100);
    });

    it('should enable RLS on triage_records', () => {
      expect(migrationContent).toContain('ALTER TABLE triage_records ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on triage_record_versions', () => {
      expect(migrationContent).toContain(
        'ALTER TABLE triage_record_versions ENABLE ROW LEVEL SECURITY'
      );
    });

    it('should enable RLS on scheduling_queue_entries', () => {
      expect(migrationContent).toContain(
        'ALTER TABLE scheduling_queue_entries ENABLE ROW LEVEL SECURITY'
      );
    });

    it('should create policy for triage_records', () => {
      expect(migrationContent).toContain(
        'CREATE POLICY triage_records_tenant_isolation ON triage_records'
      );
      expect(migrationContent).toContain('FOR ALL');
      expect(migrationContent).toContain('USING (account_id = app.current_account_id())');
      expect(migrationContent).toContain('WITH CHECK (account_id = app.current_account_id())');
    });

    it('should create policy for triage_record_versions', () => {
      expect(migrationContent).toContain(
        'CREATE POLICY triage_record_versions_tenant_isolation ON triage_record_versions'
      );
    });

    it('should create policy for scheduling_queue_entries', () => {
      expect(migrationContent).toContain(
        'CREATE POLICY scheduling_queue_entries_tenant_isolation ON scheduling_queue_entries'
      );
    });

    it('should update app.rls_summary() to remove exclusion list', () => {
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION app.rls_summary()');
      expect(migrationContent).not.toContain("'triage_records'");
      expect(migrationContent).not.toContain("'triage_record_versions'");
      expect(migrationContent).not.toContain("'scheduling_queue_entries'");
    });

    it('should add policy comments', () => {
      expect(migrationContent).toContain('COMMENT ON POLICY triage_records_tenant_isolation');
      expect(migrationContent).toContain(
        'COMMENT ON POLICY triage_record_versions_tenant_isolation'
      );
      expect(migrationContent).toContain(
        'COMMENT ON POLICY scheduling_queue_entries_tenant_isolation'
      );
    });
  });

  describe('Revert migration', () => {
    it('should exist and be non-empty', () => {
      expect(revertContent.length).toBeGreaterThan(100);
    });

    it('should drop triage_records policy', () => {
      expect(revertContent).toContain(
        'DROP POLICY IF EXISTS triage_records_tenant_isolation ON triage_records'
      );
    });

    it('should drop triage_record_versions policy', () => {
      expect(revertContent).toContain(
        'DROP POLICY IF EXISTS triage_record_versions_tenant_isolation ON triage_record_versions'
      );
    });

    it('should drop scheduling_queue_entries policy', () => {
      expect(revertContent).toContain(
        'DROP POLICY IF EXISTS scheduling_queue_entries_tenant_isolation ON scheduling_queue_entries'
      );
    });

    it('should disable RLS on all 3 tables', () => {
      expect(revertContent).toContain('ALTER TABLE triage_records DISABLE ROW LEVEL SECURITY');
      expect(revertContent).toContain(
        'ALTER TABLE triage_record_versions DISABLE ROW LEVEL SECURITY'
      );
      expect(revertContent).toContain(
        'ALTER TABLE scheduling_queue_entries DISABLE ROW LEVEL SECURITY'
      );
    });

    it('should restore app.rls_summary() with exclusion list', () => {
      expect(revertContent).toContain('CREATE OR REPLACE FUNCTION app.rls_summary()');
      expect(revertContent).toContain("'triage_records'");
      expect(revertContent).toContain("'triage_record_versions'");
      expect(revertContent).toContain("'scheduling_queue_entries'");
    });
  });
});
