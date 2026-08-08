import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { analyzeRlsMigrationCoverage, type RlsMigrationFile } from '../packages/db/src/rls.js';

const migrationsDir = resolve(process.cwd(), 'packages/db/migrations');
const requiredTenantTables = [
  'access_teams',
  'access_sectors',
  'access_team_memberships',
  'access_sector_memberships',
  'access_user_permissions',
  'access_team_permissions',
  'access_sector_permissions',
  'mfa_credentials',
  'encounter_timeline',
  'webhook_deliveries',
  'owner_patient_links',
  'inpatient_progress',
  'surgery_cases'
] as const;

function loadMigrationFiles(): RlsMigrationFile[] {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql') && !file.endsWith('.revert.sql') && !file.endsWith('.seed.sql'))
    .sort()
    .map((file) => ({
      name: file,
      sql: readFileSync(resolve(migrationsDir, file), 'utf8')
    }));
}

const report = analyzeRlsMigrationCoverage(loadMigrationFiles(), { requiredTenantTables });
const failing = report.tables.filter(
  (table) =>
    table.status === 'missing_account_scope' ||
    table.status === 'missing_rls' ||
    table.status === 'missing_policy'
);

if (failing.length > 0) {
  console.error(
    `RLS coverage failed: ${failing.length}/${report.totalTenantTables} tenant table(s) missing RLS coverage.`
  );
  for (const table of failing) {
    console.error(
      `- ${table.tableName}: missing ${table.missing.join(', ')} (${table.sourceFiles.join(', ')})`
    );
  }
  process.exitCode = 1;
} else {
  console.info(
    `RLS coverage valid: ${report.protectedTables}/${report.totalTenantTables} tenant table(s) protected, ${report.exceptionTables} documented exception(s).`
  );
}
