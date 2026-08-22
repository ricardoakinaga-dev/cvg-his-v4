-- Atomic proof for a full encounter settlement received in BRL cash.
-- This migration deliberately refuses to normalize duplicate open drawers:
-- operational ambiguity must be resolved explicitly before rollout.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cash_registers
    WHERE status = 'open'
    GROUP BY account_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one open cash register per account: duplicate open registers exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_cash_registers_one_open_per_account
  ON cash_registers(account_id)
  WHERE status = 'open';

-- Composite unique keys let every receipt reference prove tenant ownership in
-- the FK itself instead of relying only on RLS or an application-side check.
CREATE UNIQUE INDEX IF NOT EXISTS idx_efa_account_id_id_unique
  ON encounter_financial_accounts(account_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_er_account_id_id_unique
  ON encounter_receivables(account_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_erp_account_id_id_unique
  ON encounter_receivable_payments(account_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_registers_account_id_id_unique
  ON cash_registers(account_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_movements_account_id_id_unique
  ON cash_movements(account_id, id);

CREATE TABLE encounter_cash_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  encounter_id UUID NOT NULL,
  billing_record_id TEXT NOT NULL,
  financial_account_id UUID NOT NULL,
  receivable_id UUID NOT NULL,
  receivable_payment_id UUID NOT NULL,
  cash_register_id UUID NOT NULL,
  cash_movement_id UUID NOT NULL,
  journal_entry_id UUID NOT NULL,
  received_by_user_id UUID NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT encounter_cash_receipts_amount_positive_chk CHECK (amount > 0),
  CONSTRAINT encounter_cash_receipts_currency_brl_chk CHECK (currency = 'BRL'),
  CONSTRAINT encounter_cash_receipts_account_encounter_unique
    UNIQUE (account_id, encounter_id),
  CONSTRAINT encounter_cash_receipts_receivable_payment_unique
    UNIQUE (receivable_payment_id),
  CONSTRAINT encounter_cash_receipts_cash_movement_unique
    UNIQUE (cash_movement_id),
  CONSTRAINT encounter_cash_receipts_journal_entry_unique
    UNIQUE (journal_entry_id),
  CONSTRAINT encounter_cash_receipts_account_fk
    FOREIGN KEY (account_id)
    REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT encounter_cash_receipts_account_encounter_fk
    FOREIGN KEY (account_id, encounter_id)
    REFERENCES encounters(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipts_account_billing_fk
    FOREIGN KEY (account_id, billing_record_id)
    REFERENCES billing_records(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipts_account_financial_fk
    FOREIGN KEY (account_id, financial_account_id)
    REFERENCES encounter_financial_accounts(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipts_account_receivable_fk
    FOREIGN KEY (account_id, receivable_id)
    REFERENCES encounter_receivables(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipts_account_receivable_payment_fk
    FOREIGN KEY (account_id, receivable_payment_id)
    REFERENCES encounter_receivable_payments(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipts_account_register_fk
    FOREIGN KEY (account_id, cash_register_id)
    REFERENCES cash_registers(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipts_account_movement_fk
    FOREIGN KEY (account_id, cash_movement_id)
    REFERENCES cash_movements(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipts_account_journal_fk
    FOREIGN KEY (account_id, journal_entry_id)
    REFERENCES financial_journal_entries(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipts_account_user_fk
    FOREIGN KEY (account_id, received_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_encounter_cash_receipts_account_received_at
  ON encounter_cash_receipts(account_id, received_at DESC);
CREATE INDEX idx_encounter_cash_receipts_account_billing
  ON encounter_cash_receipts(account_id, billing_record_id);
CREATE INDEX idx_encounter_cash_receipts_account_financial
  ON encounter_cash_receipts(account_id, financial_account_id);

ALTER TABLE encounter_cash_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_cash_receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY encounter_cash_receipts_tenant_isolation ON encounter_cash_receipts
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE OR REPLACE FUNCTION app.guard_encounter_cash_receipt_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Encounter cash receipts are append-only and cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF (to_jsonb(NEW) - ARRAY['notes', 'updated_at'])
       IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['notes', 'updated_at'])
     OR NEW.updated_at < OLD.updated_at THEN
    RAISE EXCEPTION 'Encounter cash receipt financial proof is immutable'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER encounter_cash_receipts_immutability_trigger
BEFORE UPDATE OR DELETE ON encounter_cash_receipts
FOR EACH ROW
EXECUTE FUNCTION app.guard_encounter_cash_receipt_immutability();

CREATE OR REPLACE FUNCTION app.assert_encounter_cash_receipt_consistent(
  receipt_id UUID,
  require_open_register BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM encounter_cash_receipts AS receipt
    INNER JOIN encounters AS encounter
      ON encounter.account_id = receipt.account_id
     AND encounter.id = receipt.encounter_id
    INNER JOIN billing_records AS billing
      ON billing.account_id = receipt.account_id
     AND billing.id = receipt.billing_record_id
     AND billing.encounter_id = receipt.encounter_id
    INNER JOIN encounter_financial_accounts AS financial_account
      ON financial_account.account_id = receipt.account_id
     AND financial_account.id = receipt.financial_account_id
     AND financial_account.encounter_id = receipt.encounter_id
    INNER JOIN encounter_receivables AS receivable
      ON receivable.account_id = receipt.account_id
     AND receivable.id = receipt.receivable_id
     AND receivable.encounter_id = receipt.encounter_id
     AND receivable.financial_account_id = receipt.financial_account_id
    INNER JOIN encounter_receivable_payments AS receivable_payment
      ON receivable_payment.account_id = receipt.account_id
     AND receivable_payment.id = receipt.receivable_payment_id
     AND receivable_payment.encounter_id = receipt.encounter_id
     AND receivable_payment.financial_account_id = receipt.financial_account_id
     AND receivable_payment.receivable_id = receipt.receivable_id
    INNER JOIN cash_registers AS cash_register
      ON cash_register.account_id = receipt.account_id
     AND cash_register.id = receipt.cash_register_id
    INNER JOIN cash_movements AS cash_movement
      ON cash_movement.account_id = receipt.account_id
     AND cash_movement.id = receipt.cash_movement_id
     AND cash_movement.cash_register_id = receipt.cash_register_id
    INNER JOIN financial_journal_entries AS journal_entry
      ON journal_entry.account_id = receipt.account_id
     AND journal_entry.id = receipt.journal_entry_id
    INNER JOIN LATERAL (
      SELECT
        COUNT(*)::INTEGER AS line_count,
        COALESCE(SUM(journal_line.debit), 0)::NUMERIC(14, 2) AS total_debit,
        COALESCE(SUM(journal_line.credit), 0)::NUMERIC(14, 2) AS total_credit,
        COALESCE(
          SUM(journal_line.debit) FILTER (
            WHERE journal_line.account_code = '1.1.01-caixa'
          ),
          0
        )::NUMERIC(14, 2) AS cash_debit,
        COALESCE(
          SUM(journal_line.credit) FILTER (
            WHERE journal_line.account_code = '3.1.01-receita-clinica'
          ),
          0
        )::NUMERIC(14, 2) AS clinical_revenue_credit
      FROM financial_journal_lines AS journal_line
      WHERE journal_line.account_id = receipt.account_id
        AND journal_line.entry_id = receipt.journal_entry_id
    ) AS journal_totals ON TRUE
    WHERE receipt.id = receipt_id
      AND encounter.status = 'closed'
      AND billing.status = 'settled'
      AND billing.currency = 'BRL'
      AND billing.subtotal_amount = receipt.amount
      AND financial_account.financial_status = 'paid'
      AND financial_account.total_snapshot = receipt.amount
      AND financial_account.paid_amount = receipt.amount
      AND financial_account.balance_due = 0
      AND receivable.status = 'settled'
      AND receivable.amount_original = receipt.amount
      AND receivable.amount_paid = receipt.amount
      AND receivable.amount_outstanding = 0
      AND receivable_payment.amount_paid = receipt.amount
      AND receivable_payment.paid_by_user_id = receipt.received_by_user_id
      AND receivable_payment.external_reference_type = 'cash_movement'
      AND receivable_payment.external_reference_id = receipt.cash_movement_id::TEXT
      AND cash_register.opened_at <= receipt.received_at
      AND (
        (cash_register.status = 'open' AND cash_register.closed_at IS NULL)
        OR (
          NOT require_open_register
          AND cash_register.status = 'closed'
          AND cash_register.closed_at >= receipt.received_at
        )
      )
      AND cash_movement.movement_type = 'payment'
      AND cash_movement.amount = receipt.amount
      AND cash_movement.created_by_user_id = receipt.received_by_user_id
      AND journal_entry.source_type = 'encounter_cash_receipt'
      AND journal_entry.source_id = receipt.id::TEXT
      AND journal_entry.created_by_user_id = receipt.received_by_user_id
      AND journal_totals.line_count >= 2
      AND journal_totals.total_debit = receipt.amount
      AND journal_totals.total_credit = receipt.amount
      AND journal_totals.cash_debit = receipt.amount
      AND journal_totals.clinical_revenue_credit = receipt.amount
  ) THEN
    RAISE EXCEPTION 'Encounter cash receipt % is inconsistent with its settlement artifacts', receipt_id
      USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION app.assert_encounter_cash_receipt_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM app.assert_encounter_cash_receipt_consistent(NEW.id, TG_OP = 'INSERT');
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER encounter_cash_receipts_consistency_trigger
AFTER INSERT OR UPDATE ON encounter_cash_receipts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.assert_encounter_cash_receipt_trigger();

-- A receipt remains a proof after its creation transaction. Revalidate that
-- proof when a linked artifact changes later. The cash-register rule is
-- historical here: a normal close after received_at remains valid.
CREATE OR REPLACE FUNCTION app.recheck_linked_encounter_cash_receipts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  linked_receipt RECORD;
  affected_account_id UUID;
  affected_artifact_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'financial_journal_lines' THEN
    IF TG_OP <> 'INSERT' THEN
      FOR linked_receipt IN
        SELECT id
        FROM encounter_cash_receipts
        WHERE account_id = OLD.account_id
          AND journal_entry_id = OLD.entry_id
      LOOP
        PERFORM app.assert_encounter_cash_receipt_consistent(linked_receipt.id, FALSE);
      END LOOP;
    END IF;

    IF TG_OP <> 'DELETE' THEN
      FOR linked_receipt IN
        SELECT id
        FROM encounter_cash_receipts
        WHERE account_id = NEW.account_id
          AND journal_entry_id = NEW.entry_id
      LOOP
        PERFORM app.assert_encounter_cash_receipt_consistent(linked_receipt.id, FALSE);
      END LOOP;
    END IF;

    RETURN NULL;
  END IF;

  affected_account_id := COALESCE(NEW.account_id, OLD.account_id);
  affected_artifact_id := COALESCE(NEW.id, OLD.id)::TEXT;

  FOR linked_receipt IN EXECUTE format(
    'SELECT id FROM encounter_cash_receipts WHERE account_id = $1 AND %I::text = $2',
    TG_ARGV[0]
  ) USING affected_account_id, affected_artifact_id
  LOOP
    PERFORM app.assert_encounter_cash_receipt_consistent(linked_receipt.id, FALSE);
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER encounter_cash_receipts_encounter_recheck_trigger
AFTER UPDATE ON encounters
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_cash_receipts('encounter_id');

CREATE CONSTRAINT TRIGGER encounter_cash_receipts_billing_recheck_trigger
AFTER UPDATE ON billing_records
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_cash_receipts('billing_record_id');

CREATE CONSTRAINT TRIGGER encounter_cash_receipts_financial_recheck_trigger
AFTER UPDATE ON encounter_financial_accounts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_cash_receipts('financial_account_id');

CREATE CONSTRAINT TRIGGER encounter_cash_receipts_receivable_recheck_trigger
AFTER UPDATE ON encounter_receivables
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_cash_receipts('receivable_id');

CREATE CONSTRAINT TRIGGER encounter_cash_receipts_payment_recheck_trigger
AFTER UPDATE ON encounter_receivable_payments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_cash_receipts('receivable_payment_id');

CREATE CONSTRAINT TRIGGER encounter_cash_receipts_register_recheck_trigger
AFTER UPDATE ON cash_registers
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_cash_receipts('cash_register_id');

CREATE CONSTRAINT TRIGGER encounter_cash_receipts_movement_recheck_trigger
AFTER UPDATE ON cash_movements
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_cash_receipts('cash_movement_id');

CREATE CONSTRAINT TRIGGER encounter_cash_receipts_journal_recheck_trigger
AFTER UPDATE ON financial_journal_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_cash_receipts('journal_entry_id');

CREATE CONSTRAINT TRIGGER encounter_cash_receipts_journal_lines_recheck_trigger
AFTER INSERT OR UPDATE OR DELETE ON financial_journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_cash_receipts('journal_entry_id');

COMMENT ON TABLE encounter_cash_receipts IS
  'Atomic proof joining one full BRL cash settlement to billing, receivable, drawer movement and balanced journal artifacts.';
