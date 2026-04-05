import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('RLS Migration Validation', () => {
  const migrationPath = resolve(
    __dirname,
    '../../../packages/db/migrations/0003_rls_core_tables.sql'
  );
  const revertPath = resolve(
    __dirname,
    '../../../packages/db/migrations/0003_rls_core_tables.revert.sql'
  );

  let migrationContent: string;
  let revertContent: string;

  beforeAll(() => {
    migrationContent = readFileSync(migrationPath, 'utf-8');
    revertContent = readFileSync(revertPath, 'utf-8');
  });

  describe('Migration file', () => {
    it('should exist and be non-empty', () => {
      expect(migrationContent.length).toBeGreaterThan(100);
    });

    it('should create app.current_account_id function', () => {
      expect(migrationContent).toContain('app.current_account_id()');
    });

    it('should create app.has_account_context function', () => {
      expect(migrationContent).toContain('app.has_account_context()');
    });

    it('should enable RLS on owners table', () => {
      expect(migrationContent).toContain('ALTER TABLE owners ENABLE ROW LEVEL SECURITY');
    });

    it('should create policy for owners', () => {
      expect(migrationContent).toContain('owners_tenant_isolation');
    });

    it('should enable RLS on encounters table', () => {
      expect(migrationContent).toContain('ALTER TABLE encounters ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on patients table', () => {
      expect(migrationContent).toContain('ALTER TABLE patients ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on appointments table', () => {
      expect(migrationContent).toContain('ALTER TABLE appointments ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on users table', () => {
      expect(migrationContent).toContain('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on clinical_notes table', () => {
      expect(migrationContent).toContain('ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on audit_events table', () => {
      expect(migrationContent).toContain('ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on financial tables', () => {
      expect(migrationContent).toContain('ALTER TABLE payments ENABLE ROW LEVEL SECURITY');
      expect(migrationContent).toContain('ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY');
      expect(migrationContent).toContain('ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on stock tables', () => {
      expect(migrationContent).toContain('ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY');
      expect(migrationContent).toContain('ALTER TABLE stock_lots ENABLE ROW LEVEL SECURITY');
      expect(migrationContent).toContain('ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on inpatient tables', () => {
      expect(migrationContent).toContain('ALTER TABLE inpatient_stays ENABLE ROW LEVEL SECURITY');
      expect(migrationContent).toContain('ALTER TABLE beds ENABLE ROW LEVEL SECURITY');
      expect(migrationContent).toContain('ALTER TABLE wards ENABLE ROW LEVEL SECURITY');
    });

    it('should NOT enable RLS on global tables', () => {
      expect(migrationContent).not.toContain('ALTER TABLE tenants ENABLE ROW LEVEL SECURITY');
      expect(migrationContent).not.toContain('ALTER TABLE roles ENABLE ROW LEVEL SECURITY');
      expect(migrationContent).not.toContain('ALTER TABLE permissions ENABLE ROW LEVEL SECURITY');
    });

    it('should NOT enable RLS on text-based tables', () => {
      expect(migrationContent).not.toContain(
        'ALTER TABLE triage_records ENABLE ROW LEVEL SECURITY'
      );
      expect(migrationContent).not.toContain(
        'ALTER TABLE scheduling_queue_entries ENABLE ROW LEVEL SECURITY'
      );
    });

    it('should create rls_status view', () => {
      expect(migrationContent).toContain('CREATE OR REPLACE VIEW app.rls_status');
    });

    it('should create rls_summary function', () => {
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION app.rls_summary()');
    });

    it('should use account_id in all policies', () => {
      const policyLines = migrationContent
        .split('\n')
        .filter((line) => line.includes('USING (account_id = app.current_account_id())'));
      expect(policyLines.length).toBeGreaterThan(30);
    });

    it('should use WITH CHECK in all policies', () => {
      const checkLines = migrationContent
        .split('\n')
        .filter((line) => line.includes('WITH CHECK (account_id = app.current_account_id())'));
      expect(checkLines.length).toBeGreaterThan(30);
    });
  });

  describe('Revert migration file', () => {
    it('should exist and be non-empty', () => {
      expect(revertContent.length).toBeGreaterThan(100);
    });

    it('should drop all policies', () => {
      const dropPolicies = revertContent.match(/DROP POLICY/g) || [];
      expect(dropPolicies.length).toBeGreaterThan(20);
    });

    it('should disable RLS on all tables', () => {
      const disableRls = revertContent.match(/DISABLE ROW LEVEL SECURITY/g) || [];
      expect(disableRls.length).toBeGreaterThan(20);
    });

    it('should drop app functions', () => {
      expect(revertContent).toContain('DROP FUNCTION IF EXISTS app.current_account_id()');
      expect(revertContent).toContain('DROP FUNCTION IF EXISTS app.has_account_context()');
      expect(revertContent).toContain('DROP FUNCTION IF EXISTS app.rls_summary()');
    });

    it('should drop rls_status view', () => {
      expect(revertContent).toContain('DROP VIEW IF EXISTS app.rls_status');
    });
  });

  describe('Policy count consistency', () => {
    it('should have matching enable/disable counts', () => {
      const enableCount = (migrationContent.match(/ENABLE ROW LEVEL SECURITY/g) || []).length;
      const disableCount = (revertContent.match(/DISABLE ROW LEVEL SECURITY/g) || []).length;
      expect(enableCount).toBe(disableCount);
    });

    it('should have matching policy create/drop counts', () => {
      const createCount = (migrationContent.match(/CREATE POLICY/g) || []).length;
      const dropCount = (revertContent.match(/DROP POLICY/g) || []).length;
      expect(createCount).toBe(dropCount);
    });
  });
});
