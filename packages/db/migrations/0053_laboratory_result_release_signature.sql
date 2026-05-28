-- Metadados enterprise de liberacao e assinatura de resultados laboratoriais.

CREATE TABLE IF NOT EXISTS diagnostic_orders (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  exam_catalog_id TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  collected_at TIMESTAMPTZ,
  collected_by_user_id TEXT,
  result_summary TEXT,
  result_attachment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS laboratory_equipment (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  status TEXT NOT NULL,
  last_calibration_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS laboratory_report_types (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS laboratory_reference_values (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  parameter TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  min_value NUMERIC(12, 3) NOT NULL,
  max_value NUMERIC(12, 3) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS resulted_at TIMESTAMPTZ;
ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS released_by_user_id TEXT;
ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS signed_by_user_id TEXT;
ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS signature_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_diagnostic_orders_account_resulted
  ON diagnostic_orders (account_id, resulted_at DESC)
  WHERE resulted_at IS NOT NULL;

COMMENT ON COLUMN diagnostic_orders.resulted_at IS
  'Momento em que o resultado laboratorial foi liberado clinicamente.';
COMMENT ON COLUMN diagnostic_orders.released_by_user_id IS
  'Usuario autenticado que liberou o resultado no sistema.';
COMMENT ON COLUMN diagnostic_orders.signed_by_user_id IS
  'Responsavel tecnico associado a assinatura do laudo.';
COMMENT ON COLUMN diagnostic_orders.signature_hash IS
  'Hash auditavel do conteudo liberado e da assinatura tecnica.';

ALTER TABLE diagnostic_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS diagnostic_orders_tenant_isolation ON diagnostic_orders;
CREATE POLICY diagnostic_orders_tenant_isolation ON diagnostic_orders
  FOR ALL
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

ALTER TABLE laboratory_equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS laboratory_equipment_tenant_isolation ON laboratory_equipment;
CREATE POLICY laboratory_equipment_tenant_isolation ON laboratory_equipment
  FOR ALL
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

ALTER TABLE laboratory_report_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS laboratory_report_types_tenant_isolation ON laboratory_report_types;
CREATE POLICY laboratory_report_types_tenant_isolation ON laboratory_report_types
  FOR ALL
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

ALTER TABLE laboratory_reference_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS laboratory_reference_values_tenant_isolation ON laboratory_reference_values;
CREATE POLICY laboratory_reference_values_tenant_isolation ON laboratory_reference_values
  FOR ALL
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);
