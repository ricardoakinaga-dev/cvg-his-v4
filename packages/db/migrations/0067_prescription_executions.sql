-- Materialize prescription execution persistence and reconcile installations
-- previously created by shared migration 012. Legacy identifiers that now
-- reference UUID parents are converted only after their values are audited.

CREATE TABLE IF NOT EXISTS prescription_executions (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL,
  clinical_entry_id VARCHAR(255) NOT NULL,
  patient_id UUID NOT NULL,
  encounter_id UUID NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(255) NOT NULL,
  route VARCHAR(100),
  frequency VARCHAR(100),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  administered_by UUID,
  administered_at TIMESTAMPTZ,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS administration_events (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID,
  execution_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  actor_id VARCHAR(255) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  vitals_snapshot_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE administration_events
  ADD COLUMN IF NOT EXISTS account_id UUID;

CREATE OR REPLACE FUNCTION pg_temp.cvg_0067_convert_uuid_column(
  target_table TEXT,
  target_column TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $migration$
DECLARE
  target_relation REGCLASS;
  target_type REGTYPE;
  invalid_count BIGINT;
  dependency RECORD;
BEGIN
  target_relation := to_regclass(format('%I.%I', current_schema(), target_table));

  IF target_relation IS NULL THEN
    RAISE EXCEPTION '0067 unsafe upgrade: required table % is missing', target_table;
  END IF;

  SELECT attribute.atttypid::regtype
    INTO target_type
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = target_relation
    AND attribute.attname = target_column
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  IF target_type IS NULL THEN
    RAISE EXCEPTION
      '0067 unsafe upgrade: required column %.% is missing',
      target_table,
      target_column;
  END IF;

  IF target_type = 'uuid'::regtype THEN
    RETURN;
  END IF;

  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE %I IS NOT NULL AND btrim(%I::text) !~* %L',
    target_table,
    target_column,
    target_column,
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) INTO invalid_count;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0067 unsafe upgrade: %.% contains % non-UUID %',
      target_table,
      target_column,
      invalid_count,
      CASE WHEN invalid_count = 1 THEN 'value' ELSE 'values' END;
  END IF;

  FOR dependency IN
    SELECT constraint_row.conname
    FROM pg_constraint AS constraint_row
    JOIN pg_attribute AS attribute
      ON attribute.attrelid = constraint_row.conrelid
     AND attribute.attname = target_column
     AND attribute.attnum = ANY (constraint_row.conkey)
    WHERE constraint_row.conrelid = target_relation
      AND constraint_row.contype = 'f'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT %I',
      target_table,
      dependency.conname
    );
  END LOOP;

  EXECUTE format(
    'ALTER TABLE %I ALTER COLUMN %I TYPE UUID USING btrim(%I::text)::uuid',
    target_table,
    target_column,
    target_column
  );
END
$migration$;

CREATE OR REPLACE FUNCTION pg_temp.cvg_0067_convert_timestamptz_column(
  target_table TEXT,
  target_column TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $migration$
DECLARE
  target_relation REGCLASS;
  target_type REGTYPE;
BEGIN
  target_relation := to_regclass(format('%I.%I', current_schema(), target_table));

  SELECT attribute.atttypid::regtype
    INTO target_type
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = target_relation
    AND attribute.attname = target_column
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  IF target_type IS NULL THEN
    RAISE EXCEPTION
      '0067 unsafe upgrade: required column %.% is missing',
      target_table,
      target_column;
  END IF;

  IF target_type = 'timestamp with time zone'::regtype THEN
    RETURN;
  END IF;

  IF target_type <> 'timestamp without time zone'::regtype THEN
    RAISE EXCEPTION
      '0067 unsafe upgrade: %.% has unsupported type %',
      target_table,
      target_column,
      target_type;
  END IF;

  EXECUTE format(
    'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE %L',
    target_table,
    target_column,
    target_column,
    'UTC'
  );
END
$migration$;

SELECT pg_temp.cvg_0067_convert_uuid_column('prescription_executions', 'account_id');
SELECT pg_temp.cvg_0067_convert_uuid_column('prescription_executions', 'patient_id');
SELECT pg_temp.cvg_0067_convert_uuid_column('prescription_executions', 'encounter_id');
SELECT pg_temp.cvg_0067_convert_uuid_column('prescription_executions', 'administered_by');
SELECT pg_temp.cvg_0067_convert_uuid_column('administration_events', 'account_id');

SELECT pg_temp.cvg_0067_convert_timestamptz_column(
  'prescription_executions',
  'scheduled_at'
);
SELECT pg_temp.cvg_0067_convert_timestamptz_column(
  'prescription_executions',
  'administered_at'
);
SELECT pg_temp.cvg_0067_convert_timestamptz_column(
  'prescription_executions',
  'created_at'
);
SELECT pg_temp.cvg_0067_convert_timestamptz_column(
  'prescription_executions',
  'updated_at'
);
SELECT pg_temp.cvg_0067_convert_timestamptz_column(
  'administration_events',
  'occurred_at'
);
SELECT pg_temp.cvg_0067_convert_timestamptz_column(
  'administration_events',
  'created_at'
);

-- Remove every legacy single-column FK, including the names emitted by shared
-- migration 012, before rebuilding the canonical tenant-aware constraints.
DO $migration$
DECLARE
  target_table TEXT;
  target_relation REGCLASS;
  dependency RECORD;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'prescription_executions',
    'administration_events'
  ]
  LOOP
    target_relation := to_regclass(format('%I.%I', current_schema(), target_table));

    FOR dependency IN
      SELECT constraint_row.conname
      FROM pg_constraint AS constraint_row
      WHERE constraint_row.conrelid = target_relation
        AND constraint_row.contype = 'f'
    LOOP
      EXECUTE format(
        'ALTER TABLE %I DROP CONSTRAINT %I',
        target_table,
        dependency.conname
      );
    END LOOP;
  END LOOP;
END
$migration$;

UPDATE administration_events AS event
SET account_id = execution.account_id
FROM prescription_executions AS execution
WHERE event.account_id IS NULL
  AND event.execution_id = execution.id;

DO $migration$
DECLARE
  invalid_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM prescription_executions AS execution
  LEFT JOIN accounts AS account ON account.id = execution.account_id
  LEFT JOIN clinical_entries AS clinical_entry
    ON clinical_entry.id = execution.clinical_entry_id
  LEFT JOIN patients AS patient ON patient.id = execution.patient_id
  LEFT JOIN encounters AS encounter ON encounter.id = execution.encounter_id
  LEFT JOIN users AS administrator ON administrator.id = execution.administered_by
  WHERE account.id IS NULL
     OR clinical_entry.id IS NULL
     OR patient.id IS NULL
     OR encounter.id IS NULL
     OR clinical_entry.account_id <> execution.account_id
     OR patient.account_id <> execution.account_id
     OR encounter.account_id <> execution.account_id
     OR (
       execution.administered_by IS NOT NULL
       AND (
         administrator.id IS NULL
         OR administrator.account_id <> execution.account_id
       )
     );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0067 unsafe upgrade: prescription_executions contains % missing or cross-account relationship(s)',
      invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM prescription_executions
  WHERE version <= 0;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0067 unsafe upgrade: prescription_executions contains % non-positive version value(s)',
      invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM administration_events AS event
  LEFT JOIN prescription_executions AS execution
    ON execution.id = event.execution_id
  WHERE event.account_id IS NULL
     OR execution.id IS NULL
     OR event.account_id <> execution.account_id;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0067 unsafe upgrade: administration_events contains % orphaned or cross-account relationship(s)',
      invalid_count;
  END IF;
END
$migration$;

ALTER TABLE administration_events
  ALTER COLUMN account_id SET DEFAULT app.current_account_id(),
  ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE prescription_executions
  DROP CONSTRAINT IF EXISTS prescription_exec_status_chk;
ALTER TABLE prescription_executions
  DROP CONSTRAINT IF EXISTS prescription_executions_status_check;
ALTER TABLE prescription_executions
  ADD CONSTRAINT prescription_executions_status_check CHECK (
    status IN ('pending', 'administered', 'not-administered', 'suspended', 'cancelled')
  );
ALTER TABLE prescription_executions
  DROP CONSTRAINT IF EXISTS prescription_executions_version_check;
ALTER TABLE prescription_executions
  ADD CONSTRAINT prescription_executions_version_check CHECK (version > 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clinical_entries_id_account
  ON clinical_entries (id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_prescription_executions_id_account
  ON prescription_executions (id, account_id);

ALTER TABLE prescription_executions
  ADD CONSTRAINT prescription_executions_account_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE prescription_executions
  ADD CONSTRAINT prescription_executions_clinical_entry_account_fk
  FOREIGN KEY (clinical_entry_id, account_id)
  REFERENCES clinical_entries(id, account_id) ON DELETE CASCADE;
ALTER TABLE prescription_executions
  ADD CONSTRAINT prescription_executions_patient_account_fk
  FOREIGN KEY (patient_id, account_id)
  REFERENCES patients(id, account_id);
ALTER TABLE prescription_executions
  ADD CONSTRAINT prescription_executions_encounter_account_fk
  FOREIGN KEY (encounter_id, account_id)
  REFERENCES encounters(id, account_id) ON DELETE CASCADE;
ALTER TABLE prescription_executions
  ADD CONSTRAINT prescription_executions_administered_by_account_fk
  FOREIGN KEY (administered_by, account_id)
  REFERENCES users(id, account_id);

ALTER TABLE administration_events
  ADD CONSTRAINT administration_events_account_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE administration_events
  ADD CONSTRAINT administration_events_execution_account_fk
  FOREIGN KEY (execution_id, account_id)
  REFERENCES prescription_executions(id, account_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_prescription_executions_account
  ON prescription_executions (account_id);
CREATE INDEX IF NOT EXISTS idx_prescription_executions_patient
  ON prescription_executions (account_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_executions_encounter
  ON prescription_executions (account_id, encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescription_executions_status_scheduled
  ON prescription_executions (account_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_administration_events_execution_occurred
  ON administration_events (account_id, execution_id, occurred_at);

ALTER TABLE prescription_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_executions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prescription_executions_tenant_isolation ON prescription_executions;
CREATE POLICY prescription_executions_tenant_isolation ON prescription_executions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE administration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS administration_events_tenant_isolation ON administration_events;
CREATE POLICY administration_events_tenant_isolation ON administration_events
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
