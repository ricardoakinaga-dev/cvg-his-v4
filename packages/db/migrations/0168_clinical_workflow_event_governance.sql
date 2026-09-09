-- Version the clinical workflow event contract without rewriting historical rows.
-- Existing installations receive deterministic defaults; future event versions
-- must be introduced by an append-only migration and a reviewed code contract.

ALTER TABLE clinical_workflow_task_events
  ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE clinical_workflow_task_events
  ADD COLUMN IF NOT EXISTS source VARCHAR(80) NOT NULL DEFAULT 'clinical-workflow';

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'clinical_workflow_task_events_schema_version_chk'
  ) THEN
    ALTER TABLE clinical_workflow_task_events
      ADD CONSTRAINT clinical_workflow_task_events_schema_version_chk
      CHECK (schema_version > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'clinical_workflow_task_events_source_chk'
  ) THEN
    ALTER TABLE clinical_workflow_task_events
      ADD CONSTRAINT clinical_workflow_task_events_source_chk
      CHECK (source ~ '^[a-z0-9][a-z0-9._-]{1,79}$');
  END IF;
END
$migration$;

COMMENT ON COLUMN clinical_workflow_task_events.schema_version IS
  'Positive schema version for the immutable lifecycle event contract.';
COMMENT ON COLUMN clinical_workflow_task_events.source IS
  'Stable producer identifier for the immutable lifecycle event contract.';
