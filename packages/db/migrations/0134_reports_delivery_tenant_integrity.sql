-- Keep report delivery references inside the owning account at the database boundary.
-- The service and RLS checks remain useful, but direct SQL and worker paths must
-- not be able to pair an account with another tenant's report records.

CREATE UNIQUE INDEX IF NOT EXISTS report_executions_account_id_uidx
  ON report_executions (account_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS report_exports_account_id_uidx
  ON report_exports (account_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS report_schedules_account_id_uidx
  ON report_schedules (account_id, id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_exports_account_execution_fk'
  ) THEN
    ALTER TABLE report_exports
      ADD CONSTRAINT report_exports_account_execution_fk
      FOREIGN KEY (account_id, execution_id)
      REFERENCES report_executions (account_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_schedules_account_last_execution_fk'
  ) THEN
    ALTER TABLE report_schedules
      ADD CONSTRAINT report_schedules_account_last_execution_fk
      FOREIGN KEY (account_id, last_execution_id)
      REFERENCES report_executions (account_id, id)
      ON DELETE SET NULL (last_execution_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_deliveries_account_schedule_fk'
  ) THEN
    ALTER TABLE report_schedule_deliveries
      ADD CONSTRAINT report_deliveries_account_schedule_fk
      FOREIGN KEY (account_id, schedule_id)
      REFERENCES report_schedules (account_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_deliveries_account_execution_fk'
  ) THEN
    ALTER TABLE report_schedule_deliveries
      ADD CONSTRAINT report_deliveries_account_execution_fk
      FOREIGN KEY (account_id, execution_id)
      REFERENCES report_executions (account_id, id)
      ON DELETE SET NULL (execution_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_deliveries_account_export_fk'
  ) THEN
    ALTER TABLE report_schedule_deliveries
      ADD CONSTRAINT report_deliveries_account_export_fk
      FOREIGN KEY (account_id, export_id)
      REFERENCES report_exports (account_id, id)
      ON DELETE SET NULL (export_id);
  END IF;
END
$$;
