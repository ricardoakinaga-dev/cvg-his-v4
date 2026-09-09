#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const REQUIRED_FILES = [
  'packages/db/migrations/0166_clinical_workflow_tasks.sql',
  'packages/db/migrations/0167_clinical_workflow_permissions.sql',
  'packages/db/src/schema/clinical_workflow_tasks.ts',
  'packages/modules/workflows/src/index.ts',
  'packages/modules/workflows/src/repository.ts',
  'apps/api/src/routes/workflow-task-routes.ts',
  'apps/worker/src/workflow-task-runner.ts'
];

const REQUIRED_SQL_MARKERS = [
  'CREATE TABLE IF NOT EXISTS clinical_workflow_tasks',
  'CREATE TABLE IF NOT EXISTS clinical_workflow_task_events',
  'revision INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE clinical_workflow_tasks ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE clinical_workflow_tasks FORCE ROW LEVEL SECURITY',
  'ALTER TABLE clinical_workflow_task_events ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE clinical_workflow_task_events FORCE ROW LEVEL SECURITY',
  'clinical_workflow_task_events_immutability_trigger',
  "account_id, idempotency_key",
  'clinical_workflow_task_events_task_account_fk',
  "execution_mode IN ('manual', 'worker')",
  'FOREIGN KEY (account_id, patient_id)',
  'FOREIGN KEY (account_id, encounter_id)',
  'app.current_account_id()'
];

export function inspectClinicalWorkflowSchema(rootDirectory = root) {
  const failures = [];
  for (const relativePath of REQUIRED_FILES) {
    if (!existsSync(resolve(rootDirectory, relativePath))) failures.push(`${relativePath} is missing`);
  }

  const migrationPath = resolve(rootDirectory, REQUIRED_FILES[0]);
  if (existsSync(migrationPath)) {
    const source = readFileSync(migrationPath, 'utf8');
    for (const marker of REQUIRED_SQL_MARKERS) {
      if (!source.includes(marker)) failures.push(`0166 migration is missing marker: ${marker}`);
    }
    if (/\bDROP\s+TABLE\b/i.test(source)) failures.push('0166 migration must be append-only; DROP TABLE is forbidden');
  }

  return { failures };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = inspectClinicalWorkflowSchema();
  if (result.failures.length > 0) {
    for (const failure of result.failures) console.error(`[clinical-workflow] FAIL ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('[clinical-workflow] PASS schema, migration, API and worker control-plane sources are present');
  }
}
