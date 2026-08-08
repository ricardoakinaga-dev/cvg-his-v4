-- Canonical double-entry journal for billing, receivables, inventory and cash.
-- Every posted entry is tenant scoped and must balance at transaction commit.

CREATE TABLE IF NOT EXISTS financial_journal_entries (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_type VARCHAR(80) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  description VARCHAR(500) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_journal_entries_account_id_unique UNIQUE (account_id, id),
  CONSTRAINT financial_journal_entries_source_unique
    UNIQUE (account_id, source_type, source_id)
);

CREATE TABLE IF NOT EXISTS financial_journal_lines (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL,
  account_code VARCHAR(80) NOT NULL,
  debit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  credit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  memo VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_journal_lines_entry_fk
    FOREIGN KEY (account_id, entry_id)
    REFERENCES financial_journal_entries(account_id, id)
    ON DELETE CASCADE,
  CONSTRAINT financial_journal_lines_amounts_chk
    CHECK (
      debit >= 0
      AND credit >= 0
      AND ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
    )
);

CREATE INDEX IF NOT EXISTS idx_financial_journal_entries_account_date
  ON financial_journal_entries (account_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_journal_entries_account_source
  ON financial_journal_entries (account_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_financial_journal_lines_account_code
  ON financial_journal_lines (account_id, account_code, created_at DESC);

ALTER TABLE financial_journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS financial_journal_entries_tenant_isolation ON financial_journal_entries;
CREATE POLICY financial_journal_entries_tenant_isolation ON financial_journal_entries
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE financial_journal_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS financial_journal_lines_tenant_isolation ON financial_journal_lines;
CREATE POLICY financial_journal_lines_tenant_isolation ON financial_journal_lines
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE OR REPLACE FUNCTION app.assert_financial_journal_entry_balanced()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_entry_id UUID;
  line_count INTEGER;
  total_debit NUMERIC(14, 2);
  total_credit NUMERIC(14, 2);
BEGIN
  affected_entry_id := COALESCE(NEW.entry_id, OLD.entry_id);
  SELECT COUNT(*)::INTEGER,
         COALESCE(SUM(debit), 0)::NUMERIC(14, 2),
         COALESCE(SUM(credit), 0)::NUMERIC(14, 2)
    INTO line_count, total_debit, total_credit
    FROM financial_journal_lines
   WHERE entry_id = affected_entry_id;

  IF line_count < 2 OR total_debit <> total_credit THEN
    RAISE EXCEPTION 'Financial journal entry % must have at least two balanced lines (debit %, credit %)',
      affected_entry_id, total_debit, total_credit;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS financial_journal_lines_balance_trigger ON financial_journal_lines;
CREATE CONSTRAINT TRIGGER financial_journal_lines_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON financial_journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.assert_financial_journal_entry_balanced();

COMMENT ON TABLE financial_journal_entries IS
  'Livro diario de partidas dobradas; a chave de origem torna o lancamento idempotente por tenant.';
COMMENT ON TABLE financial_journal_lines IS
  'Linhas do livro diario; cada entrada precisa fechar debito e credito no commit.';
