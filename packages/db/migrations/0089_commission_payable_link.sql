-- Vincula o fechamento de comissão ao pagamento persistido no subledger financeiro.

ALTER TABLE financial_payables
  DROP CONSTRAINT IF EXISTS financial_payables_account_id_id_unique;

ALTER TABLE financial_payables
  ADD CONSTRAINT financial_payables_account_id_id_unique UNIQUE (account_id, id);

ALTER TABLE commission_calculations
  ADD COLUMN IF NOT EXISTS payable_id TEXT;

ALTER TABLE commission_calculations
  DROP CONSTRAINT IF EXISTS commission_calculations_account_payable_fk;

ALTER TABLE commission_calculations
  ADD CONSTRAINT commission_calculations_account_payable_fk
  FOREIGN KEY (account_id, payable_id)
  REFERENCES financial_payables(account_id, id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_commission_calculations_account_payable
  ON commission_calculations (account_id, payable_id)
  WHERE payable_id IS NOT NULL;
