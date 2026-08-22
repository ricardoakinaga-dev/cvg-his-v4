-- Durable proof for one full BRL encounter settlement confirmed by PIX.
-- Existing duplicate external references are never guessed or rewritten: the
-- deployment stops so operators can reconcile them before enforcing identity.

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM encounter_receivable_payments
     WHERE external_reference_type = 'pix_transaction'
       AND external_reference_id IS NOT NULL
     GROUP BY account_id, external_reference_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce unique PIX receivable references: duplicate references exist'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pix_transactions
     WHERE provider_webhook_event_id IS NOT NULL
     GROUP BY account_id, provider, provider_webhook_event_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce unique PIX provider events: duplicate events exist'
      USING ERRCODE = '23505';
  END IF;
END
$migration$;

CREATE UNIQUE INDEX uidx_erp_pix_external_reference
  ON encounter_receivable_payments(account_id, external_reference_id)
  WHERE external_reference_type = 'pix_transaction'
    AND external_reference_id IS NOT NULL;

CREATE UNIQUE INDEX idx_pix_transactions_account_transaction_unique
  ON pix_transactions(account_id, transaction_id);

CREATE UNIQUE INDEX uidx_pix_transactions_account_provider_event
  ON pix_transactions(account_id, provider, provider_webhook_event_id)
  WHERE provider_webhook_event_id IS NOT NULL;

-- PIX participates in the settlement proof and cannot rely on the runtime
-- role being NOBYPASSRLS alone. Table ownership must not bypass tenant policy.
ALTER TABLE pix_transactions FORCE ROW LEVEL SECURITY;

CREATE TABLE encounter_non_cash_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  encounter_id UUID NOT NULL,
  billing_record_id TEXT NOT NULL,
  financial_account_id UUID NOT NULL,
  receivable_id UUID NOT NULL,
  receivable_payment_id UUID NOT NULL,
  journal_entry_id UUID NOT NULL,
  provider VARCHAR(32) NOT NULL,
  provider_event_id VARCHAR(255) NOT NULL,
  inbox_event_id VARCHAR(64) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  confirmed_at TIMESTAMPTZ NOT NULL,
  processed_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT encounter_non_cash_receipts_amount_cents_positive_chk
    CHECK (amount_cents > 0),
  CONSTRAINT encounter_non_cash_receipts_currency_brl_chk
    CHECK (currency = 'BRL'),
  CONSTRAINT encounter_non_cash_receipts_provider_chk
    CHECK (provider IN ('local-pix', 'mock', 'pagarme')),
  CONSTRAINT encounter_non_cash_receipts_inbox_event_id_chk
    CHECK (inbox_event_id ~ '^[a-f0-9]{64}$'),
  CONSTRAINT encounter_non_cash_receipts_account_provider_event_unique
    UNIQUE (account_id, provider, provider_event_id),
  CONSTRAINT encounter_non_cash_receipts_account_transaction_unique
    UNIQUE (account_id, transaction_id),
  CONSTRAINT encounter_non_cash_receipts_account_billing_unique
    UNIQUE (account_id, billing_record_id),
  CONSTRAINT encounter_non_cash_receipts_receivable_payment_unique
    UNIQUE (receivable_payment_id),
  CONSTRAINT encounter_non_cash_receipts_journal_entry_unique
    UNIQUE (journal_entry_id),
  CONSTRAINT encounter_non_cash_receipts_account_fk
    FOREIGN KEY (account_id)
    REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT encounter_non_cash_receipts_account_encounter_fk
    FOREIGN KEY (account_id, encounter_id)
    REFERENCES encounters(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_non_cash_receipts_account_billing_fk
    FOREIGN KEY (account_id, billing_record_id)
    REFERENCES billing_records(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_non_cash_receipts_account_financial_fk
    FOREIGN KEY (account_id, financial_account_id)
    REFERENCES encounter_financial_accounts(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_non_cash_receipts_account_receivable_fk
    FOREIGN KEY (account_id, receivable_id)
    REFERENCES encounter_receivables(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_non_cash_receipts_account_receivable_payment_fk
    FOREIGN KEY (account_id, receivable_payment_id)
    REFERENCES encounter_receivable_payments(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_non_cash_receipts_account_journal_fk
    FOREIGN KEY (account_id, journal_entry_id)
    REFERENCES financial_journal_entries(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_non_cash_receipts_account_pix_transaction_fk
    FOREIGN KEY (account_id, transaction_id)
    REFERENCES pix_transactions(account_id, transaction_id) ON DELETE RESTRICT,
  CONSTRAINT encounter_non_cash_receipts_account_user_fk
    FOREIGN KEY (account_id, processed_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_encounter_non_cash_receipts_account_confirmed_at
  ON encounter_non_cash_receipts(account_id, confirmed_at DESC);

CREATE INDEX idx_encounter_non_cash_receipts_account_encounter
  ON encounter_non_cash_receipts(account_id, encounter_id);

CREATE INDEX idx_encounter_non_cash_receipts_account_financial
  ON encounter_non_cash_receipts(account_id, financial_account_id);

CREATE INDEX idx_encounter_non_cash_receipts_account_receivable
  ON encounter_non_cash_receipts(account_id, receivable_id);

ALTER TABLE encounter_non_cash_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_non_cash_receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY encounter_non_cash_receipts_tenant_isolation ON encounter_non_cash_receipts
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE OR REPLACE FUNCTION app.guard_encounter_non_cash_receipt_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $guard$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Encounter non-cash receipts are append-only and cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  RAISE EXCEPTION 'Encounter non-cash receipt financial proof is immutable'
    USING ERRCODE = '55000';
END;
$guard$;

CREATE TRIGGER encounter_non_cash_receipts_immutability_trigger
BEFORE UPDATE OR DELETE ON encounter_non_cash_receipts
FOR EACH ROW
EXECUTE FUNCTION app.guard_encounter_non_cash_receipt_immutability();

CREATE OR REPLACE FUNCTION app.assert_encounter_non_cash_receipt_consistent(receipt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $consistency$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM encounter_non_cash_receipts AS receipt
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
      INNER JOIN pix_transactions AS pix
        ON pix.account_id = receipt.account_id
       AND pix.transaction_id = receipt.transaction_id
      INNER JOIN financial_journal_entries AS journal_entry
        ON journal_entry.account_id = receipt.account_id
       AND journal_entry.id = receipt.journal_entry_id
      INNER JOIN LATERAL (
        SELECT
          COUNT(*)::INTEGER AS line_count,
          COALESCE(SUM(line.debit), 0)::NUMERIC(14, 2) AS total_debit,
          COALESCE(SUM(line.credit), 0)::NUMERIC(14, 2) AS total_credit,
          COALESCE(
            SUM(line.debit) FILTER (WHERE line.account_code = '1.1.02-bancos-pix'),
            0
          )::NUMERIC(14, 2) AS pix_debit,
          COALESCE(
            SUM(line.credit) FILTER (WHERE line.account_code = '3.1.01-receita-clinica'),
            0
          )::NUMERIC(14, 2) AS clinical_revenue_credit
          FROM financial_journal_lines AS line
         WHERE line.account_id = receipt.account_id
           AND line.entry_id = receipt.journal_entry_id
      ) AS journal_totals ON TRUE
     WHERE receipt.id = receipt_id
       AND encounter.status = 'closed'
       AND billing.status = 'settled'
       AND billing.currency = receipt.currency
       AND billing.subtotal_amount = receipt.amount_cents::NUMERIC / 100
       AND financial_account.financial_status = 'paid'
       AND financial_account.total_snapshot = receipt.amount_cents::NUMERIC / 100
       AND financial_account.paid_amount = receipt.amount_cents::NUMERIC / 100
       AND financial_account.balance_due = 0
       AND receivable.status = 'settled'
       AND receivable.amount_original = receipt.amount_cents::NUMERIC / 100
       AND receivable.amount_paid = receipt.amount_cents::NUMERIC / 100
       AND receivable.amount_outstanding = 0
       AND receivable_payment.amount_paid = receipt.amount_cents::NUMERIC / 100
       AND receivable_payment.paid_at = receipt.confirmed_at
       AND receivable_payment.paid_by_user_id = receipt.processed_by_user_id
       AND receivable_payment.external_reference_type = 'pix_transaction'
       AND receivable_payment.external_reference_id = receipt.transaction_id
       AND pix.provider = receipt.provider
       AND pix.billing_record_id = receipt.billing_record_id
       AND pix.amount = receipt.amount_cents::NUMERIC / 100
       AND pix.currency = receipt.currency
       AND pix.status = 'completed'
       AND pix.completed_at = receipt.confirmed_at
       AND pix.provider_webhook_event_id = receipt.provider_event_id
       AND pix.billing_settlement_status = 'applied'
       AND pix.billing_settled_at = receipt.confirmed_at
       AND pix.cash_reconciliation_status = 'not_applicable'
       AND pix.cash_reconciled_at IS NULL
       AND pix.cash_reconciliation_error IS NULL
       AND pix.cash_register_id IS NULL
       AND pix.cash_movement_id IS NULL
       AND journal_entry.source_type = 'encounter_non_cash_receipt'
       AND journal_entry.source_id = receipt.id::TEXT
       AND journal_entry.occurred_at = receipt.confirmed_at
       AND journal_entry.created_by_user_id = receipt.processed_by_user_id
       AND journal_totals.line_count >= 2
       AND journal_totals.total_debit = receipt.amount_cents::NUMERIC / 100
       AND journal_totals.total_credit = receipt.amount_cents::NUMERIC / 100
       AND journal_totals.pix_debit = receipt.amount_cents::NUMERIC / 100
       AND journal_totals.clinical_revenue_credit = receipt.amount_cents::NUMERIC / 100
       AND EXISTS (
         SELECT 1
           FROM inbox_events AS inbox
          WHERE inbox.account_id = receipt.account_id
            AND inbox.consumer_name = 'confirmed-pix-settlement'
            AND inbox.event_id = receipt.inbox_event_id
       )
       AND EXISTS (
         SELECT 1
           FROM audit_events AS audit
          WHERE audit.account_id = receipt.account_id
            AND audit.entity_type = 'encounter_non_cash_receipt'
            AND audit.entity_id = receipt.id::TEXT
            AND audit.action = 'non_cash_received'
       )
       AND EXISTS (
         SELECT 1
           FROM outbox_events AS outbox
          WHERE outbox.account_id = receipt.account_id
            AND outbox.event_type = 'encounter.non-cash-receipt.created'
            AND outbox.payload ->> 'receiptId' = receipt.id::TEXT
       )
  ) THEN
    RAISE EXCEPTION 'Encounter non-cash receipt % is inconsistent with its settlement artifacts',
      receipt_id
      USING ERRCODE = '23514';
  END IF;
END;
$consistency$;

CREATE OR REPLACE FUNCTION app.assert_encounter_non_cash_receipt_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $trigger$
BEGIN
  PERFORM app.assert_encounter_non_cash_receipt_consistent(NEW.id);
  RETURN NULL;
END;
$trigger$;

CREATE CONSTRAINT TRIGGER encounter_non_cash_receipts_consistency_trigger
AFTER INSERT ON encounter_non_cash_receipts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.assert_encounter_non_cash_receipt_trigger();

CREATE OR REPLACE FUNCTION app.recheck_linked_encounter_non_cash_receipts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $recheck$
DECLARE
  linked_receipt RECORD;
  affected_account_id UUID;
  affected_artifact_id TEXT;
  affected_artifact_type TEXT;
BEGIN
  IF TG_TABLE_NAME = 'financial_journal_lines' THEN
    IF TG_OP <> 'INSERT' THEN
      FOR linked_receipt IN
        SELECT id
          FROM encounter_non_cash_receipts
         WHERE account_id = OLD.account_id
           AND journal_entry_id = OLD.entry_id
      LOOP
        PERFORM app.assert_encounter_non_cash_receipt_consistent(linked_receipt.id);
      END LOOP;
    END IF;

    IF TG_OP <> 'DELETE' THEN
      FOR linked_receipt IN
        SELECT id
          FROM encounter_non_cash_receipts
         WHERE account_id = NEW.account_id
           AND journal_entry_id = NEW.entry_id
      LOOP
        PERFORM app.assert_encounter_non_cash_receipt_consistent(linked_receipt.id);
      END LOOP;
    END IF;

    RETURN NULL;
  END IF;

  affected_account_id := COALESCE(
    to_jsonb(NEW) ->> 'account_id',
    to_jsonb(OLD) ->> 'account_id'
  )::UUID;
  affected_artifact_id := CASE
    WHEN TG_TABLE_NAME = 'pix_transactions'
      THEN COALESCE(
        to_jsonb(NEW) ->> 'transaction_id',
        to_jsonb(OLD) ->> 'transaction_id'
      )
    ELSE COALESCE(to_jsonb(NEW) ->> 'id', to_jsonb(OLD) ->> 'id')
  END;

  affected_artifact_type := TG_ARGV[1];
  IF affected_artifact_type NOT IN ('text', 'uuid') THEN
    RAISE EXCEPTION 'Unsupported non-cash receipt recheck type: %', affected_artifact_type
      USING ERRCODE = '22023';
  END IF;

  FOR linked_receipt IN EXECUTE format(
    'SELECT id FROM encounter_non_cash_receipts WHERE account_id = $1 AND %I = $2::%s',
    TG_ARGV[0],
    affected_artifact_type
  ) USING affected_account_id, affected_artifact_id
  LOOP
    PERFORM app.assert_encounter_non_cash_receipt_consistent(linked_receipt.id);
  END LOOP;

  RETURN NULL;
END;
$recheck$;

CREATE CONSTRAINT TRIGGER encounter_non_cash_receipts_encounter_recheck_trigger
AFTER UPDATE ON encounters
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_non_cash_receipts('encounter_id', 'uuid');

CREATE CONSTRAINT TRIGGER encounter_non_cash_receipts_billing_recheck_trigger
AFTER UPDATE ON billing_records
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_non_cash_receipts('billing_record_id', 'text');

CREATE CONSTRAINT TRIGGER encounter_non_cash_receipts_financial_recheck_trigger
AFTER UPDATE ON encounter_financial_accounts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_non_cash_receipts('financial_account_id', 'uuid');

CREATE CONSTRAINT TRIGGER encounter_non_cash_receipts_receivable_recheck_trigger
AFTER UPDATE ON encounter_receivables
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_non_cash_receipts('receivable_id', 'uuid');

CREATE CONSTRAINT TRIGGER encounter_non_cash_receipts_payment_recheck_trigger
AFTER UPDATE ON encounter_receivable_payments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_non_cash_receipts('receivable_payment_id', 'uuid');

CREATE CONSTRAINT TRIGGER encounter_non_cash_receipts_pix_recheck_trigger
AFTER UPDATE ON pix_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_non_cash_receipts('transaction_id', 'text');

CREATE CONSTRAINT TRIGGER encounter_non_cash_receipts_journal_recheck_trigger
AFTER UPDATE ON financial_journal_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_non_cash_receipts('journal_entry_id', 'uuid');

CREATE CONSTRAINT TRIGGER encounter_non_cash_receipts_journal_lines_recheck_trigger
AFTER INSERT OR UPDATE OR DELETE ON financial_journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.recheck_linked_encounter_non_cash_receipts('journal_entry_id');

COMMENT ON TABLE encounter_non_cash_receipts IS
  'Append-only proof joining one full BRL provider settlement to billing, receivable and balanced journal artifacts without a physical cash movement.';
