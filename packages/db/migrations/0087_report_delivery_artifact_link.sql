ALTER TABLE report_schedule_deliveries
  ADD COLUMN IF NOT EXISTS export_id TEXT REFERENCES report_exports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_report_schedule_deliveries_account_export
  ON report_schedule_deliveries (account_id, export_id)
  WHERE export_id IS NOT NULL;

COMMENT ON COLUMN report_schedule_deliveries.export_id IS
  'Persisted report artifact associated with the delivery attempt.';
