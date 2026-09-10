#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const REQUIRED_FILES = [
  'packages/db/migrations/0166_clinical_workflow_tasks.sql',
  'packages/db/migrations/0167_clinical_workflow_permissions.sql',
  'packages/db/migrations/0168_clinical_workflow_event_governance.sql',
  'packages/db/migrations/0169_clinical_workflow_event_order.sql',
  'packages/db/src/schema/clinical_workflow_tasks.ts',
  'packages/modules/workflows/src/types.ts',
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

const EVENT_GOVERNANCE_MARKERS = [
  'schema_version INTEGER NOT NULL DEFAULT 1',
  "source VARCHAR(80) NOT NULL DEFAULT 'clinical-workflow'",
  'clinical_workflow_task_events_schema_version_chk',
  'clinical_workflow_task_events_source_chk'
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

  const eventGovernancePath = resolve(rootDirectory, 'packages/db/migrations/0168_clinical_workflow_event_governance.sql');
  if (existsSync(eventGovernancePath)) {
    const source = readFileSync(eventGovernancePath, 'utf8');
    for (const marker of EVENT_GOVERNANCE_MARKERS) {
      if (!source.includes(marker)) failures.push(`0168 migration is missing marker: ${marker}`);
    }
    if (/\bDROP\s+TABLE\b/i.test(source)) failures.push('0168 migration must be append-only; DROP TABLE is forbidden');
  }

  const eventOrderPath = resolve(rootDirectory, 'packages/db/migrations/0169_clinical_workflow_event_order.sql');
  if (existsSync(eventOrderPath)) {
    const source = readFileSync(eventOrderPath, 'utf8');
    for (const marker of ['ADD COLUMN task_revision INTEGER', 'SECURITY INVOKER',
      'clinical_workflow_task_events_revision_trigger', 'clinical_workflow_task_events_revision_unique',
      'FOR UPDATE', 'UNIQUE (account_id, task_id, task_revision)']) {
      if (!source.includes(marker)) failures.push(`0169 migration is missing marker: ${marker}`);
    }
    if (/\bDROP\s+TABLE\b/i.test(source)) failures.push('0169 migration must be append-only; DROP TABLE is forbidden');
  }

  const schemaPath = resolve(rootDirectory, 'packages/db/src/schema/clinical_workflow_tasks.ts');
  if (existsSync(schemaPath)) {
    const source = readFileSync(schemaPath, 'utf8');
    for (const marker of ["taskRevision: integer('task_revision')", "schemaVersion: integer('schema_version')", "source: varchar('source'"]) {
      if (!source.includes(marker)) failures.push(`Drizzle schema is missing event governance marker: ${marker}`);
    }
  }

  const workflowTypesPath = resolve(rootDirectory, 'packages/modules/workflows/src/types.ts');
  if (existsSync(workflowTypesPath)) {
    const source = readFileSync(workflowTypesPath, 'utf8');
    for (const marker of ['WORKFLOW_TASK_EVENT_SCHEMA_VERSION', 'WORKFLOW_TASK_EVENT_SOURCE', 'schemaVersion:', 'source:']) {
      if (!source.includes(marker)) failures.push(`Workflow event types are missing marker: ${marker}`);
    }
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
