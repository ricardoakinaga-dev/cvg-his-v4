-- Subledger persistente de contas a pagar.

CREATE TABLE IF NOT EXISTS financial_payables (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  cost_center_code TEXT NOT NULL,
  cost_center_name TEXT NOT NULL,
  issued_at DATE NOT NULL,
  due_at DATE NOT NULL,
  total_amount NUMERIC(14, 2) NOT NULL,
  paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  outstanding_amount NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  source_expense_id TEXT,
  notes TEXT,
  payment_method TEXT,
  payment_reference TEXT,
  reconciliation_status TEXT NOT NULL DEFAULT 'not_required',
  reconciliation_reference TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  paid_by_user_id UUID REFERENCES users(id),
  cancelled_by_user_id UUID REFERENCES users(id),
  reconciled_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  reconciled_at TIMESTAMPTZ,
  CONSTRAINT financial_payables_status_chk CHECK (status IN ('open', 'partial', 'paid', 'cancelled')),
  CONSTRAINT financial_payables_payment_method_chk CHECK (
    payment_method IS NULL
    OR payment_method IN ('cash', 'bank_transfer', 'pix', 'card', 'cheque', 'other')
  ),
  CONSTRAINT financial_payables_reconciliation_status_chk CHECK (
    reconciliation_status IN ('not_required', 'pending', 'reconciled')
  ),
  CONSTRAINT financial_payables_amounts_chk CHECK (
    total_amount > 0
    AND paid_amount >= 0
    AND outstanding_amount >= 0
    AND paid_amount <= total_amount
    AND outstanding_amount <= total_amount
  ),
  CONSTRAINT financial_payables_dates_chk CHECK (issued_at <= due_at)
);

CREATE INDEX IF NOT EXISTS idx_financial_payables_account_status
  ON financial_payables (account_id, status);

CREATE INDEX IF NOT EXISTS idx_financial_payables_account_due
  ON financial_payables (account_id, due_at);

CREATE INDEX IF NOT EXISTS idx_financial_payables_account_cost_center
  ON financial_payables (account_id, cost_center_code);

CREATE INDEX IF NOT EXISTS idx_financial_payables_account_reconciliation
  ON financial_payables (account_id, reconciliation_status);

ALTER TABLE financial_payables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS financial_payables_tenant_isolation ON financial_payables;
CREATE POLICY financial_payables_tenant_isolation ON financial_payables
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE financial_payables IS
  'Subledger persistente de contas a pagar por fornecedor, vencimento, centro de custo e status.';
