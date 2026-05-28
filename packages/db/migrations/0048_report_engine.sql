-- Motor persistente de relatorios: execucoes, exportacoes e agendamentos.

CREATE TABLE IF NOT EXISTS report_executions (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  report_id TEXT NOT NULL,
  requested_by_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'completed',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT report_executions_status_chk CHECK (status IN ('completed')),
  CONSTRAINT report_executions_row_count_chk CHECK (row_count >= 0),
  CONSTRAINT report_executions_json_chk CHECK (
    jsonb_typeof(filters) = 'object'
    AND jsonb_typeof(columns) = 'array'
    AND jsonb_typeof(rows) = 'array'
  )
);

CREATE INDEX IF NOT EXISTS idx_report_executions_account_report
  ON report_executions (account_id, report_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_executions_account_generated
  ON report_executions (account_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS report_exports (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  execution_id TEXT NOT NULL REFERENCES report_executions(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content TEXT NOT NULL,
  exported_by_user_id UUID NOT NULL REFERENCES users(id),
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_exports_format_chk CHECK (format IN ('json', 'csv'))
);

CREATE INDEX IF NOT EXISTS idx_report_exports_account_execution
  ON report_exports (account_id, execution_id, exported_at DESC);

CREATE TABLE IF NOT EXISTS report_schedules (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  report_id TEXT NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  last_execution_id TEXT REFERENCES report_executions(id) ON DELETE SET NULL,
  last_error TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_schedules_frequency_chk CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  CONSTRAINT report_schedules_format_chk CHECK (format IN ('json', 'csv')),
  CONSTRAINT report_schedules_json_chk CHECK (
    jsonb_typeof(filters) = 'object'
    AND jsonb_typeof(recipients) = 'array'
  )
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_account_report
  ON report_schedules (account_id, report_id, is_active);

CREATE INDEX IF NOT EXISTS idx_report_schedules_account_due
  ON report_schedules (account_id, is_active, next_run_at);

CREATE INDEX IF NOT EXISTS idx_report_schedules_account_name
  ON report_schedules (account_id, name);

CREATE TABLE IF NOT EXISTS report_schedule_deliveries (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  schedule_id TEXT NOT NULL REFERENCES report_schedules(id) ON DELETE CASCADE,
  execution_id TEXT REFERENCES report_executions(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  format TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_schedule_deliveries_status_chk CHECK (status IN ('sent', 'failed')),
  CONSTRAINT report_schedule_deliveries_format_chk CHECK (format IN ('json', 'csv'))
);

CREATE INDEX IF NOT EXISTS idx_report_schedule_deliveries_account_schedule
  ON report_schedule_deliveries (account_id, schedule_id, delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_schedule_deliveries_account_status
  ON report_schedule_deliveries (account_id, status, delivered_at DESC);

ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_executions_tenant_isolation ON report_executions;
CREATE POLICY report_executions_tenant_isolation ON report_executions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_exports_tenant_isolation ON report_exports;
CREATE POLICY report_exports_tenant_isolation ON report_exports
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_schedules_tenant_isolation ON report_schedules;
CREATE POLICY report_schedules_tenant_isolation ON report_schedules
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE report_schedule_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_schedule_deliveries_tenant_isolation ON report_schedule_deliveries;
CREATE POLICY report_schedule_deliveries_tenant_isolation ON report_schedule_deliveries
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE report_executions IS
  'Execucoes persistentes do motor de relatorios enterprise, incluindo filtros, colunas e linhas retornadas.';

COMMENT ON TABLE report_exports IS
  'Exportacoes persistentes geradas a partir de execucoes de relatorio.';

COMMENT ON TABLE report_schedules IS
  'Agendamentos recorrentes de relatorios enterprise por conta.';

COMMENT ON TABLE report_schedule_deliveries IS
  'Historico de entregas por destinatario dos relatorios agendados.';
