-- CVG-004: append-only reversal proof for full BRL cash receipts.
-- The original receipt, payment, cash movement and journal remain immutable;
-- this migration adds a compensating graph and makes the active receipt guard
-- aware of the historical reversal.

CREATE UNIQUE INDEX IF NOT EXISTS idx_encounter_cash_receipts_account_id_id_unique
  ON encounter_cash_receipts(account_id, id);

ALTER TABLE encounter_cash_receipts
  DROP CONSTRAINT IF EXISTS encounter_cash_receipts_account_encounter_unique;

CREATE INDEX IF NOT EXISTS idx_encounter_cash_receipts_account_encounter
  ON encounter_cash_receipts(account_id, encounter_id);

-- Existing cash movement rows must prove that their register belongs to the
-- same tenant. The explicit preflight gives operators a useful failure before
-- PostgreSQL attempts to install the constraint.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM cash_movements AS movement
      LEFT JOIN cash_registers AS register
        ON register.account_id = movement.account_id
       AND register.id = movement.cash_register_id
     WHERE register.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot enforce cash movement tenant ownership: register belongs to another account or is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'cash_movements_account_register_fk'
       AND conrelid = 'cash_movements'::regclass
  ) THEN
    ALTER TABLE cash_movements
      ADD CONSTRAINT cash_movements_account_register_fk
      FOREIGN KEY (account_id, cash_register_id)
      REFERENCES cash_registers(account_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE encounter_cash_receipt_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  receipt_id UUID NOT NULL,
  encounter_id UUID NOT NULL,
  billing_record_id TEXT NOT NULL,
  financial_account_id UUID NOT NULL,
  receivable_id UUID NOT NULL,
  receivable_payment_id UUID NOT NULL,
  original_cash_register_id UUID NOT NULL,
  reversal_cash_register_id UUID NOT NULL,
  original_cash_movement_id UUID NOT NULL,
  reversal_cash_movement_id UUID NOT NULL,
  original_journal_entry_id UUID NOT NULL,
  reversal_journal_entry_id UUID NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  reason TEXT NOT NULL,
  reversed_by_user_id UUID NOT NULL,
  reversed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT encounter_cash_receipt_reversals_account_id_id_unique
    UNIQUE (account_id, id),
  CONSTRAINT encounter_cash_receipt_reversals_account_receipt_unique
    UNIQUE (account_id, receipt_id),
  CONSTRAINT encounter_cash_receipt_reversals_amount_positive_chk
    CHECK (amount > 0),
  CONSTRAINT encounter_cash_receipt_reversals_currency_brl_chk
    CHECK (currency = 'BRL'),
  CONSTRAINT encounter_cash_receipt_reversals_reason_chk
    CHECK (char_length(btrim(reason)) BETWEEN 1 AND 500),
  CONSTRAINT encounter_cash_receipt_reversals_account_fk
    FOREIGN KEY (account_id)
    REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT encounter_cash_receipt_reversals_account_receipt_fk
    FOREIGN KEY (account_id, receipt_id)
    REFERENCES encounter_cash_receipts(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_encounter_fk
    FOREIGN KEY (account_id, encounter_id)
    REFERENCES encounters(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_billing_fk
    FOREIGN KEY (account_id, billing_record_id)
    REFERENCES billing_records(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_financial_fk
    FOREIGN KEY (account_id, financial_account_id)
    REFERENCES encounter_financial_accounts(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_receivable_fk
    FOREIGN KEY (account_id, receivable_id)
    REFERENCES encounter_receivables(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_payment_fk
    FOREIGN KEY (account_id, receivable_payment_id)
    REFERENCES encounter_receivable_payments(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_original_register_fk
    FOREIGN KEY (account_id, original_cash_register_id)
    REFERENCES cash_registers(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_reversal_register_fk
    FOREIGN KEY (account_id, reversal_cash_register_id)
    REFERENCES cash_registers(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_original_movement_fk
    FOREIGN KEY (account_id, original_cash_movement_id)
    REFERENCES cash_movements(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_reversal_movement_fk
    FOREIGN KEY (account_id, reversal_cash_movement_id)
    REFERENCES cash_movements(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_original_journal_fk
    FOREIGN KEY (account_id, original_journal_entry_id)
    REFERENCES financial_journal_entries(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_reversal_journal_fk
    FOREIGN KEY (account_id, reversal_journal_entry_id)
    REFERENCES financial_journal_entries(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_cash_receipt_reversals_account_user_fk
    FOREIGN KEY (account_id, reversed_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_encounter_cash_receipt_reversals_account_encounter
  ON encounter_cash_receipt_reversals(account_id, encounter_id);
CREATE INDEX idx_encounter_cash_receipt_reversals_account_reversed_at
  ON encounter_cash_receipt_reversals(account_id, reversed_at DESC);
CREATE INDEX idx_encounter_cash_receipt_reversals_account_receivable
  ON encounter_cash_receipt_reversals(account_id, receivable_id);

ALTER TABLE encounter_cash_receipt_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_cash_receipt_reversals FORCE ROW LEVEL SECURITY;
CREATE POLICY encounter_cash_receipt_reversals_tenant_isolation
  ON encounter_cash_receipt_reversals
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE OR REPLACE FUNCTION app.guard_encounter_cash_receipt_reversal_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Encounter cash receipt reversals are append-only and cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  RAISE EXCEPTION 'Encounter cash receipt reversal financial proof is immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER encounter_cash_receipt_reversals_immutability_trigger
BEFORE UPDATE OR DELETE ON encounter_cash_receipt_reversals
FOR EACH ROW
EXECUTE FUNCTION app.guard_encounter_cash_receipt_reversal_immutability();

-- A reversal is an append-only financial fact. The reversal row's immutable
-- trigger is not enough: its withdrawal and inverse journal graph must not be
-- edited through their base tables after the proof has been posted.
CREATE OR REPLACE FUNCTION app.guard_encounter_cash_receipt_reversal_artifacts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME = 'cash_movements' AND EXISTS (
    SELECT 1
      FROM encounter_cash_receipt_reversals AS reversal
     WHERE reversal.account_id = OLD.account_id
       AND reversal.reversal_cash_movement_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Encounter cash receipt reversal movements are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF TG_TABLE_NAME = 'financial_journal_entries' AND EXISTS (
    SELECT 1
      FROM encounter_cash_receipt_reversals AS reversal
     WHERE reversal.account_id = OLD.account_id
       AND reversal.reversal_journal_entry_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Encounter cash receipt reversal journal entries are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF TG_TABLE_NAME = 'financial_journal_lines' THEN
    IF TG_OP = 'INSERT' AND EXISTS (
      SELECT 1
        FROM encounter_cash_receipt_reversals AS reversal
       WHERE reversal.account_id = NEW.account_id
         AND reversal.reversal_journal_entry_id = NEW.entry_id
    ) THEN
      RAISE EXCEPTION 'Encounter cash receipt reversal journal lines are immutable'
        USING ERRCODE = '55000';
    END IF;

    IF TG_OP = 'UPDATE' AND (
      EXISTS (
        SELECT 1
          FROM encounter_cash_receipt_reversals AS reversal
         WHERE reversal.account_id = OLD.account_id
           AND reversal.reversal_journal_entry_id = OLD.entry_id
      ) OR EXISTS (
        SELECT 1
          FROM encounter_cash_receipt_reversals AS reversal
         WHERE reversal.account_id = NEW.account_id
           AND reversal.reversal_journal_entry_id = NEW.entry_id
      )
    ) THEN
      RAISE EXCEPTION 'Encounter cash receipt reversal journal lines are immutable'
        USING ERRCODE = '55000';
    END IF;

    IF TG_OP = 'DELETE' AND EXISTS (
      SELECT 1
        FROM encounter_cash_receipt_reversals AS reversal
       WHERE reversal.account_id = OLD.account_id
         AND reversal.reversal_journal_entry_id = OLD.entry_id
    ) THEN
      RAISE EXCEPTION 'Encounter cash receipt reversal journal lines are immutable'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encounter_cash_receipt_reversal_movement_guard_trigger
  ON cash_movements;
CREATE TRIGGER encounter_cash_receipt_reversal_movement_guard_trigger
BEFORE UPDATE OR DELETE ON cash_movements
FOR EACH ROW
EXECUTE FUNCTION app.guard_encounter_cash_receipt_reversal_artifacts();

DROP TRIGGER IF EXISTS encounter_cash_receipt_reversal_journal_guard_trigger
  ON financial_journal_entries;
CREATE TRIGGER encounter_cash_receipt_reversal_journal_guard_trigger
BEFORE UPDATE OR DELETE ON financial_journal_entries
FOR EACH ROW
EXECUTE FUNCTION app.guard_encounter_cash_receipt_reversal_artifacts();

DROP TRIGGER IF EXISTS encounter_cash_receipt_reversal_journal_line_guard_trigger
  ON financial_journal_lines;
CREATE TRIGGER encounter_cash_receipt_reversal_journal_line_guard_trigger
BEFORE INSERT OR UPDATE OR DELETE ON financial_journal_lines
FOR EACH ROW
EXECUTE FUNCTION app.guard_encounter_cash_receipt_reversal_artifacts();

-- The original proof is valid either as an active settlement or as an
-- immutable historical settlement with one exact compensating graph. When a
-- replacement receipt exists, its active proof is the current settled state.
CREATE OR REPLACE FUNCTION app.assert_encounter_cash_receipt_consistent(
  receipt_id UUID,
  require_open_register BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
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
      ) AS original_journal_totals ON TRUE
      LEFT JOIN encounter_cash_receipt_reversals AS reversal
        ON reversal.account_id = receipt.account_id
       AND reversal.receipt_id = receipt.id
      LEFT JOIN cash_registers AS reversal_cash_register
        ON reversal_cash_register.account_id = reversal.account_id
       AND reversal_cash_register.id = reversal.reversal_cash_register_id
      LEFT JOIN cash_movements AS reversal_cash_movement
        ON reversal_cash_movement.account_id = reversal.account_id
       AND reversal_cash_movement.id = reversal.reversal_cash_movement_id
       AND reversal_cash_movement.cash_register_id = reversal.reversal_cash_register_id
      LEFT JOIN financial_journal_entries AS reversal_journal_entry
        ON reversal_journal_entry.account_id = reversal.account_id
       AND reversal_journal_entry.id = reversal.reversal_journal_entry_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::INTEGER AS line_count,
          COALESCE(SUM(journal_line.debit), 0)::NUMERIC(14, 2) AS total_debit,
          COALESCE(SUM(journal_line.credit), 0)::NUMERIC(14, 2) AS total_credit,
          COALESCE(
            SUM(journal_line.debit) FILTER (
              WHERE journal_line.account_code = '3.1.01-receita-clinica'
            ),
            0
          )::NUMERIC(14, 2) AS clinical_revenue_debit,
          COALESCE(
            SUM(journal_line.credit) FILTER (
              WHERE journal_line.account_code = '1.1.01-caixa'
            ),
            0
          )::NUMERIC(14, 2) AS cash_credit
        FROM financial_journal_lines AS journal_line
       WHERE journal_line.account_id = reversal.account_id
         AND journal_line.entry_id = reversal.reversal_journal_entry_id
      ) AS reversal_journal_totals ON TRUE
     WHERE receipt.id = $1
       AND receipt.currency = 'BRL'
       AND receipt.amount > 0
       AND billing.currency = 'BRL'
       AND billing.subtotal_amount = receipt.amount
       AND receivable_payment.amount_paid = receipt.amount
       AND receivable_payment.paid_by_user_id = receipt.received_by_user_id
       AND receivable_payment.external_reference_type = 'cash_movement'
       AND receivable_payment.external_reference_id = receipt.cash_movement_id::TEXT
       AND cash_register.opened_at <= receipt.received_at
       AND cash_movement.movement_type = 'payment'
       AND cash_movement.amount = receipt.amount
       AND cash_movement.created_by_user_id = receipt.received_by_user_id
       AND journal_entry.source_type = 'encounter_cash_receipt'
       AND journal_entry.source_id = receipt.id::TEXT
       AND journal_entry.created_by_user_id = receipt.received_by_user_id
       AND original_journal_totals.line_count >= 2
       AND original_journal_totals.total_debit = receipt.amount
       AND original_journal_totals.total_credit = receipt.amount
           AND original_journal_totals.cash_debit = receipt.amount
       AND original_journal_totals.clinical_revenue_credit = receipt.amount
       AND (
         (cash_register.status = 'open' AND cash_register.closed_at IS NULL)
         OR (
           cash_register.status = 'closed'
           AND cash_register.closed_at >= receipt.received_at
         )
       )
       AND (
         (
           reversal.id IS NULL
           AND encounter.status = 'closed'
           AND billing.status = 'settled'
           AND financial_account.financial_status = 'paid'
           AND financial_account.total_snapshot = receipt.amount
           AND financial_account.paid_amount = receipt.amount
           AND financial_account.balance_due = 0
           AND receivable.status = 'settled'
           AND receivable.amount_original = receipt.amount
           AND receivable.amount_paid = receipt.amount
           AND receivable.amount_outstanding = 0
           AND (
             (cash_register.status = 'open' AND cash_register.closed_at IS NULL)
             OR (
               NOT require_open_register
               AND cash_register.status = 'closed'
               AND cash_register.closed_at >= receipt.received_at
             )
           )
         )
         OR
         (
           reversal.id IS NOT NULL
           AND encounter.status IN ('open', 'closed')
           AND reversal.account_id = receipt.account_id
           AND reversal.encounter_id = receipt.encounter_id
           AND reversal.billing_record_id = receipt.billing_record_id
           AND reversal.financial_account_id = receipt.financial_account_id
           AND reversal.receivable_id = receipt.receivable_id
           AND reversal.receivable_payment_id = receipt.receivable_payment_id
           AND reversal.original_cash_register_id = receipt.cash_register_id
           AND reversal.original_cash_movement_id = receipt.cash_movement_id
           AND reversal.original_journal_entry_id = receipt.journal_entry_id
           AND reversal.amount = receipt.amount
           AND reversal.currency = 'BRL'
           AND char_length(btrim(reversal.reason)) BETWEEN 1 AND 500
           AND reversal.reversed_by_user_id IS NOT NULL
           AND reversal.reversed_at >= receipt.received_at
           AND reversal_cash_register.opened_at <= reversal.reversed_at
           AND (
             (
               reversal_cash_register.status = 'open'
               AND reversal_cash_register.closed_at IS NULL
               AND (require_open_register OR reversal_cash_register.status = 'open')
             )
             OR (
               NOT require_open_register
               AND reversal_cash_register.status = 'closed'
               AND reversal_cash_register.closed_at >= reversal.reversed_at
             )
           )
           AND reversal_cash_movement.movement_type = 'withdrawal'
           AND reversal_cash_movement.amount = reversal.amount
           AND reversal_cash_movement.created_by_user_id = reversal.reversed_by_user_id
           AND reversal_cash_movement.reference =
             'encounter_cash_receipt_reversal:' || reversal.id::TEXT
           AND reversal_journal_entry.source_type = 'encounter_cash_receipt_reversal'
           AND reversal_journal_entry.source_id = reversal.id::TEXT
           AND reversal_journal_entry.created_by_user_id = reversal.reversed_by_user_id
           AND reversal_journal_totals.line_count >= 2
           AND reversal_journal_totals.total_debit = reversal.amount
           AND reversal_journal_totals.total_credit = reversal.amount
           AND reversal_journal_totals.clinical_revenue_debit = reversal.amount
           AND reversal_journal_totals.cash_credit = reversal.amount
           AND (
             (
               billing.status = 'open'
               AND financial_account.financial_status = 'pending'
               AND financial_account.total_snapshot = receipt.amount
               AND financial_account.paid_amount = 0
               AND financial_account.balance_due = receipt.amount
               AND receivable.status = 'open'
               AND receivable.amount_original = receipt.amount
               AND receivable.amount_paid = 0
               AND receivable.amount_outstanding = receipt.amount
             )
             OR (
               billing.status = 'settled'
               AND financial_account.financial_status = 'paid'
               AND financial_account.total_snapshot = receipt.amount
               AND financial_account.paid_amount = receipt.amount
               AND financial_account.balance_due = 0
               AND receivable.status = 'settled'
               AND receivable.amount_original = receipt.amount
               AND receivable.amount_paid = receipt.amount
               AND receivable.amount_outstanding = 0
               AND EXISTS (
                 SELECT 1
                   FROM encounter_cash_receipts AS replacement
                  WHERE replacement.account_id = receipt.account_id
                    AND replacement.encounter_id = receipt.encounter_id
                    AND replacement.id <> receipt.id
                    AND NOT EXISTS (
                      SELECT 1
                        FROM encounter_cash_receipt_reversals AS replacement_reversal
                       WHERE replacement_reversal.account_id = replacement.account_id
                         AND replacement_reversal.receipt_id = replacement.id
                    )
               )
             )
           )
         )
       )
  ) THEN
    RAISE EXCEPTION 'Encounter cash receipt % is inconsistent with its settlement artifacts', receipt_id
      USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION app.assert_encounter_cash_receipt_reversal_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $$
BEGIN
  PERFORM app.assert_encounter_cash_receipt_consistent(NEW.receipt_id, TRUE);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS encounter_cash_receipt_reversals_consistency_trigger
  ON encounter_cash_receipt_reversals;
CREATE CONSTRAINT TRIGGER encounter_cash_receipt_reversals_consistency_trigger
AFTER INSERT ON encounter_cash_receipt_reversals
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.assert_encounter_cash_receipt_reversal_trigger();

CREATE OR REPLACE FUNCTION app.assert_one_active_encounter_cash_receipt(
  target_account_id UUID,
  target_encounter_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $$
BEGIN
  -- Deferred constraint triggers run at commit, so serialize direct SQL
  -- writers as well as the application command's explicit row locks. Under
  -- READ COMMITTED the second writer observes the first committed receipt.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(target_account_id::TEXT || ':' || target_encounter_id::TEXT, 0)
  );

  IF (
    SELECT COUNT(*)
      FROM encounter_cash_receipts AS receipt
     WHERE receipt.account_id = target_account_id
       AND receipt.encounter_id = target_encounter_id
       AND NOT EXISTS (
         SELECT 1
           FROM encounter_cash_receipt_reversals AS reversal
          WHERE reversal.account_id = receipt.account_id
            AND reversal.receipt_id = receipt.id
       )
  ) > 1 THEN
    RAISE EXCEPTION 'Only one active encounter cash receipt is allowed per encounter'
      USING ERRCODE = '23505';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION app.assert_one_active_encounter_cash_receipt_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $$
BEGIN
  PERFORM app.assert_one_active_encounter_cash_receipt(NEW.account_id, NEW.encounter_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS encounter_cash_receipts_active_unique_trigger
  ON encounter_cash_receipts;
CREATE CONSTRAINT TRIGGER encounter_cash_receipts_active_unique_trigger
AFTER INSERT ON encounter_cash_receipts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.assert_one_active_encounter_cash_receipt_trigger();

DROP TRIGGER IF EXISTS encounter_cash_receipt_reversals_active_unique_trigger
  ON encounter_cash_receipt_reversals;
CREATE CONSTRAINT TRIGGER encounter_cash_receipt_reversals_active_unique_trigger
AFTER INSERT ON encounter_cash_receipt_reversals
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.assert_one_active_encounter_cash_receipt_trigger();

-- The original-register recheck installed by 0108 cannot see a reversal's
-- second register. Recheck that register as well so later close/status/time
-- changes cannot invalidate a posted compensation graph silently.
CREATE OR REPLACE FUNCTION app.recheck_linked_encounter_cash_receipt_reversals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $$
DECLARE
  linked_receipt_id UUID;
BEGIN
  FOR linked_receipt_id IN
    SELECT reversal.receipt_id
      FROM encounter_cash_receipt_reversals AS reversal
     WHERE reversal.account_id = NEW.account_id
       AND reversal.reversal_cash_register_id = NEW.id
  LOOP
    PERFORM app.assert_encounter_cash_receipt_consistent(linked_receipt_id, FALSE);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS encounter_cash_receipt_reversals_register_recheck_trigger
  ON cash_registers;
CREATE CONSTRAINT TRIGGER encounter_cash_receipt_reversals_register_recheck_trigger
AFTER UPDATE ON cash_registers
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_cash_receipt_reversals();

COMMENT ON TABLE encounter_cash_receipt_reversals IS
  'Immutable append-only compensation graph for a full BRL encounter cash receipt; one reversal per source receipt.';
