-- Motor persistente de comissoes: regras, fechamentos e linhas calculadas.

CREATE TABLE IF NOT EXISTS commission_rules (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  scope TEXT NOT NULL,
  staff_id UUID REFERENCES staff(id),
  department TEXT,
  job_title TEXT,
  item_kind TEXT NOT NULL DEFAULT 'any',
  percentage NUMERIC(7, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commission_rules_scope_chk CHECK (scope IN ('global', 'department', 'job_title', 'staff')),
  CONSTRAINT commission_rules_item_kind_chk CHECK (
    item_kind IN ('any', 'service', 'product', 'procedure', 'exam', 'other')
  ),
  CONSTRAINT commission_rules_percentage_chk CHECK (percentage >= 0 AND percentage <= 100),
  CONSTRAINT commission_rules_scope_target_chk CHECK (
    (scope = 'global' AND staff_id IS NULL AND department IS NULL AND job_title IS NULL)
    OR (scope = 'department' AND department IS NOT NULL AND staff_id IS NULL)
    OR (scope = 'job_title' AND job_title IS NOT NULL AND staff_id IS NULL)
    OR (scope = 'staff' AND staff_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_account_active
  ON commission_rules (account_id, is_active);

CREATE INDEX IF NOT EXISTS idx_commission_rules_account_scope
  ON commission_rules (account_id, scope, item_kind);

CREATE INDEX IF NOT EXISTS idx_commission_rules_account_staff
  ON commission_rules (account_id, staff_id)
  WHERE staff_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS commission_calculations (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  calculation_number TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_base_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  reviewed_by_user_id UUID REFERENCES users(id),
  paid_by_user_id UUID REFERENCES users(id),
  cancelled_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT commission_calculations_period_chk CHECK (period_start <= period_end),
  CONSTRAINT commission_calculations_status_chk CHECK (status IN ('draft', 'reviewed', 'paid', 'cancelled')),
  CONSTRAINT commission_calculations_totals_chk CHECK (
    total_base_amount >= 0 AND total_commission_amount >= 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_commission_calculations_account_number
  ON commission_calculations (account_id, calculation_number);

CREATE INDEX IF NOT EXISTS idx_commission_calculations_account_status
  ON commission_calculations (account_id, status);

CREATE INDEX IF NOT EXISTS idx_commission_calculations_account_period
  ON commission_calculations (account_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS commission_lines (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  calculation_id TEXT NOT NULL REFERENCES commission_calculations(id) ON DELETE CASCADE,
  rule_id TEXT REFERENCES commission_rules(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  staff_name TEXT NOT NULL,
  department TEXT,
  job_title TEXT,
  item_kind TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_description TEXT NOT NULL,
  base_amount NUMERIC(14, 2) NOT NULL,
  percentage NUMERIC(7, 2) NOT NULL,
  commission_amount NUMERIC(14, 2) NOT NULL,
  occurred_at DATE NOT NULL,
  CONSTRAINT commission_lines_item_kind_chk CHECK (
    item_kind IN ('service', 'product', 'procedure', 'exam', 'other')
  ),
  CONSTRAINT commission_lines_source_type_chk CHECK (
    source_type IN ('billing_item', 'counter_sale_item', 'package_consumption', 'manual')
  ),
  CONSTRAINT commission_lines_amounts_chk CHECK (
    base_amount >= 0 AND percentage >= 0 AND percentage <= 100 AND commission_amount >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_commission_lines_account_calculation
  ON commission_lines (account_id, calculation_id);

CREATE INDEX IF NOT EXISTS idx_commission_lines_account_staff
  ON commission_lines (account_id, staff_id);

CREATE INDEX IF NOT EXISTS idx_commission_lines_account_source
  ON commission_lines (account_id, source_type, source_id);

ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commission_rules_tenant_isolation ON commission_rules;
CREATE POLICY commission_rules_tenant_isolation ON commission_rules
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE commission_calculations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commission_calculations_tenant_isolation ON commission_calculations;
CREATE POLICY commission_calculations_tenant_isolation ON commission_calculations
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE commission_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commission_lines_tenant_isolation ON commission_lines;
CREATE POLICY commission_lines_tenant_isolation ON commission_lines
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE commission_rules IS
  'Regras persistentes de comissao por escopo, tipo de item e percentual.';

COMMENT ON TABLE commission_calculations IS
  'Fechamentos persistentes de comissao com ciclo rascunho, revisado, pago e cancelado.';

COMMENT ON TABLE commission_lines IS
  'Linhas produtivas calculadas para cada fechamento de comissao.';
