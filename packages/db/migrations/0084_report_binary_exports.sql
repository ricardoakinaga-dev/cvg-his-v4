-- Exportações de relatórios em formatos binários com codificação explícita.

ALTER TABLE report_exports
  ADD COLUMN IF NOT EXISTS content_encoding TEXT NOT NULL DEFAULT 'utf8';

ALTER TABLE report_exports
  DROP CONSTRAINT IF EXISTS report_exports_format_chk;
ALTER TABLE report_exports
  ADD CONSTRAINT report_exports_format_chk
  CHECK (format IN ('json', 'csv', 'xlsx', 'pdf'));

ALTER TABLE report_exports
  DROP CONSTRAINT IF EXISTS report_exports_content_encoding_chk;
ALTER TABLE report_exports
  ADD CONSTRAINT report_exports_content_encoding_chk
  CHECK (content_encoding IN ('utf8', 'base64'));

ALTER TABLE report_schedules
  DROP CONSTRAINT IF EXISTS report_schedules_format_chk;
ALTER TABLE report_schedules
  ADD CONSTRAINT report_schedules_format_chk
  CHECK (format IN ('json', 'csv', 'xlsx', 'pdf'));

ALTER TABLE report_schedule_deliveries
  DROP CONSTRAINT IF EXISTS report_schedule_deliveries_format_chk;
ALTER TABLE report_schedule_deliveries
  ADD CONSTRAINT report_schedule_deliveries_format_chk
  CHECK (format IN ('json', 'csv', 'xlsx', 'pdf'));

COMMENT ON COLUMN report_exports.content_encoding IS
  'utf8 para artefatos textuais; base64 para XLSX/PDF persistidos em content.';
