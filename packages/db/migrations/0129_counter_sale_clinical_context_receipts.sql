-- Comandas precisam permanecer ligadas ao episodio clinico e ao comprovante
-- financeiro que nasce no fechamento. Nenhuma referencia aceita outro tenant.

ALTER TABLE counter_sales
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS encounter_id UUID,
  ADD COLUMN IF NOT EXISTS queue_entry_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_record_id TEXT;

-- billing_records and the legacy queue table expose single-column primary keys;
-- these tenant keys make the foreign keys below prove ownership as well.
CREATE UNIQUE INDEX IF NOT EXISTS billing_records_account_id_id_unique
  ON billing_records(account_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS scheduling_queue_entries_account_id_id_unique
  ON scheduling_queue_entries(account_id, id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'counter_sales_account_patient_fk'
       AND conrelid = 'counter_sales'::regclass
  ) THEN
    ALTER TABLE counter_sales
      ADD CONSTRAINT counter_sales_account_patient_fk
      FOREIGN KEY (account_id, patient_id)
      REFERENCES patients(account_id, id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'counter_sales_account_encounter_fk'
       AND conrelid = 'counter_sales'::regclass
  ) THEN
    ALTER TABLE counter_sales
      ADD CONSTRAINT counter_sales_account_encounter_fk
      FOREIGN KEY (account_id, encounter_id)
      REFERENCES encounters(account_id, id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'counter_sales_account_queue_entry_fk'
       AND conrelid = 'counter_sales'::regclass
  ) THEN
    ALTER TABLE counter_sales
      ADD CONSTRAINT counter_sales_account_queue_entry_fk
      FOREIGN KEY (account_id, queue_entry_id)
      REFERENCES scheduling_queue_entries(account_id, id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'counter_sales_account_billing_record_fk'
       AND conrelid = 'counter_sales'::regclass
  ) THEN
    ALTER TABLE counter_sales
      ADD CONSTRAINT counter_sales_account_billing_record_fk
      FOREIGN KEY (account_id, billing_record_id)
      REFERENCES billing_records(account_id, id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'counter_sales_encounter_requires_patient_chk'
       AND conrelid = 'counter_sales'::regclass
  ) THEN
    ALTER TABLE counter_sales
      ADD CONSTRAINT counter_sales_encounter_requires_patient_chk
      CHECK (encounter_id IS NULL OR patient_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS counter_sales_account_patient_idx
  ON counter_sales(account_id, patient_id);
CREATE INDEX IF NOT EXISTS counter_sales_account_encounter_idx
  ON counter_sales(account_id, encounter_id);
CREATE INDEX IF NOT EXISTS counter_sales_account_queue_entry_idx
  ON counter_sales(account_id, queue_entry_id);
CREATE INDEX IF NOT EXISTS counter_sales_account_billing_record_idx
  ON counter_sales(account_id, billing_record_id);

CREATE OR REPLACE FUNCTION app.assert_counter_sale_clinical_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $$
BEGIN
  IF NEW.encounter_id IS NOT NULL
     AND NEW.patient_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
         FROM public.encounters
        WHERE account_id = NEW.account_id
          AND id = NEW.encounter_id
          AND patient_id = NEW.patient_id
     ) THEN
    RAISE EXCEPTION 'Counter sale clinical context patient does not match encounter';
  END IF;

  IF NEW.queue_entry_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
         FROM public.scheduling_queue_entries
        WHERE account_id = NEW.account_id
          AND id = NEW.queue_entry_id
          AND (NEW.patient_id IS NULL OR patient_id = NEW.patient_id::TEXT)
          AND (NEW.owner_id IS NULL OR owner_id = NEW.owner_id::TEXT)
          AND (NEW.encounter_id IS NULL OR encounter_id = NEW.encounter_id::TEXT)
     ) THEN
    RAISE EXCEPTION 'Counter sale clinical context does not match queue entry';
  END IF;

  IF NEW.billing_record_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
         FROM public.billing_records
        WHERE account_id = NEW.account_id
          AND id = NEW.billing_record_id
          AND (NEW.patient_id IS NULL OR patient_id = NEW.patient_id)
          AND (NEW.owner_id IS NULL OR owner_id = NEW.owner_id)
          AND (NEW.encounter_id IS NULL OR encounter_id = NEW.encounter_id)
     ) THEN
    RAISE EXCEPTION 'Counter sale clinical context does not match billing record';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS counter_sales_clinical_context_consistency ON counter_sales;
CREATE CONSTRAINT TRIGGER counter_sales_clinical_context_consistency
AFTER INSERT OR UPDATE OF owner_id, patient_id, encounter_id, queue_entry_id, billing_record_id
ON counter_sales
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION app.assert_counter_sale_clinical_context();

CREATE TABLE IF NOT EXISTS counter_sale_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  counter_sale_id UUID NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  received_by_user_id UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cash_register_id UUID,
  cash_movement_id UUID,
  journal_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT counter_sale_receipts_amount_positive_chk CHECK (amount > 0),
  CONSTRAINT counter_sale_receipts_currency_brl_chk CHECK (currency = 'BRL'),
  CONSTRAINT counter_sale_receipts_account_sale_unique UNIQUE (account_id, counter_sale_id),
  CONSTRAINT counter_sale_receipts_account_fk
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT counter_sale_receipts_account_sale_fk
    FOREIGN KEY (account_id, counter_sale_id)
    REFERENCES counter_sales(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT counter_sale_receipts_account_user_fk
    FOREIGN KEY (account_id, received_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT counter_sale_receipts_account_register_fk
    FOREIGN KEY (account_id, cash_register_id)
    REFERENCES cash_registers(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT counter_sale_receipts_account_movement_fk
    FOREIGN KEY (account_id, cash_movement_id)
    REFERENCES cash_movements(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT counter_sale_receipts_account_journal_fk
    FOREIGN KEY (account_id, journal_entry_id)
    REFERENCES financial_journal_entries(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT counter_sale_receipts_movement_register_chk
    CHECK (cash_movement_id IS NULL OR cash_register_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS counter_sale_receipts_account_received_at_idx
  ON counter_sale_receipts(account_id, received_at DESC);
CREATE INDEX IF NOT EXISTS counter_sale_receipts_account_encounter_idx
  ON counter_sale_receipts(account_id, counter_sale_id);

ALTER TABLE counter_sale_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_sale_receipts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS counter_sale_receipts_tenant_isolation ON counter_sale_receipts;
CREATE POLICY counter_sale_receipts_tenant_isolation ON counter_sale_receipts
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE OR REPLACE FUNCTION app.guard_counter_sale_receipt_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Counter sale receipts are append-only and cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  RAISE EXCEPTION 'Counter sale receipt financial proof is immutable'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS counter_sale_receipts_immutability_trigger ON counter_sale_receipts;
CREATE TRIGGER counter_sale_receipts_immutability_trigger
BEFORE UPDATE OR DELETE ON counter_sale_receipts
FOR EACH ROW
EXECUTE FUNCTION app.guard_counter_sale_receipt_immutability();

COMMENT ON TABLE counter_sale_receipts IS
  'Comprovante financeiro imutavel, tenant-scoped e unico por comanda fechada.';
COMMENT ON COLUMN counter_sales.encounter_id IS
  'Atendimento clinico que originou a comanda; nunca deve cruzar account_id.';
