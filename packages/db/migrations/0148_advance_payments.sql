-- Canonical immutable minor-unit source for the Paymento Antecipado report.
-- Application writes issue immutable facts and append-only compensations;
-- balances are derived from allocations rather than stored mutable totals.

CREATE TABLE IF NOT EXISTS advance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  amount_cents bigint NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'BRL',
  source_type varchar(80) NOT NULL,
  source_id varchar(255) NOT NULL,
  reference varchar(255),
  notes text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid NOT NULL,
  idempotency_key_hash varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT advance_payments_account_id_id_unique UNIQUE (account_id, id),
  CONSTRAINT advance_payments_amount_cents_positive_chk CHECK (amount_cents > 0),
  CONSTRAINT advance_payments_currency_brl_chk CHECK (currency = 'BRL'),
  CONSTRAINT advance_payments_idempotency_key_hash_chk CHECK (
    idempotency_key_hash IS NULL OR idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT advance_payments_account_owner_fk FOREIGN KEY (account_id, owner_id)
    REFERENCES owners(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT advance_payments_account_creator_fk FOREIGN KEY (account_id, created_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS advance_payments_account_idempotency_unique
  ON advance_payments (account_id, idempotency_key_hash)
  WHERE idempotency_key_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_advance_payments_account_owner_issued_at
  ON advance_payments (account_id, owner_id, issued_at);
CREATE INDEX IF NOT EXISTS idx_advance_payments_account_issued_at
  ON advance_payments (account_id, issued_at);

CREATE TABLE IF NOT EXISTS advance_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  advance_payment_id uuid NOT NULL,
  amount_cents bigint NOT NULL,
  allocation_type varchar(32) NOT NULL DEFAULT 'compensation',
  reference varchar(255),
  notes text,
  allocated_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid NOT NULL,
  idempotency_key_hash varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT advance_payment_allocations_account_id_id_unique UNIQUE (account_id, id),
  CONSTRAINT advance_payment_allocations_amount_cents_positive_chk CHECK (amount_cents > 0),
  CONSTRAINT advance_payment_allocations_type_chk CHECK (allocation_type = 'compensation'),
  CONSTRAINT advance_payment_allocations_idempotency_key_hash_chk CHECK (
    idempotency_key_hash IS NULL OR idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT advance_payment_allocations_account_payment_fk FOREIGN KEY (account_id, advance_payment_id)
    REFERENCES advance_payments(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT advance_payment_allocations_account_creator_fk FOREIGN KEY (account_id, created_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS advance_payment_allocations_account_idempotency_unique
  ON advance_payment_allocations (account_id, idempotency_key_hash)
  WHERE idempotency_key_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_advance_payment_allocations_account_payment
  ON advance_payment_allocations (account_id, advance_payment_id, allocated_at);

-- Keep the derived balance non-negative even when a future write path inserts
-- allocations concurrently. The parent row lock serializes compensations for
-- one advance and the append-only tables remain the source of truth.
CREATE OR REPLACE FUNCTION app.prevent_advance_payment_overallocation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app
AS $$
DECLARE
  original_amount bigint;
  allocated_amount bigint;
BEGIN
  -- Trigger execution precedes the row-policy check in PostgreSQL. Reject a
  -- mismatched explicit context first so a cross-account attempt cannot learn
  -- whether the referenced advance exists.
  IF app.current_account_id() IS NOT NULL
     AND NEW.account_id IS DISTINCT FROM app.current_account_id() THEN
    RAISE EXCEPTION 'new row violates row-level security policy for table "advance_payment_allocations"'
      USING ERRCODE = '42501';
  END IF;

  SELECT amount_cents
    INTO original_amount
    FROM public.advance_payments
   WHERE account_id = NEW.account_id
     AND id = NEW.advance_payment_id
   FOR UPDATE;

  IF original_amount IS NULL THEN
    RAISE EXCEPTION 'Advance payment does not exist for allocation';
  END IF;

  SELECT COALESCE(SUM(amount_cents), 0)
    INTO allocated_amount
    FROM public.advance_payment_allocations
   WHERE account_id = NEW.account_id
     AND advance_payment_id = NEW.advance_payment_id
     AND id <> NEW.id;

  IF allocated_amount + NEW.amount_cents > original_amount THEN
    RAISE EXCEPTION 'Advance payment allocation exceeds original amount'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS advance_payment_allocations_prevent_overallocation
  ON advance_payment_allocations;
CREATE TRIGGER advance_payment_allocations_prevent_overallocation
  BEFORE INSERT OR UPDATE ON advance_payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION app.prevent_advance_payment_overallocation();

-- Preserve the ledger facts even for administrative sessions. Future lifecycle
-- changes must append a new fact or allocation; they must never rewrite or
-- erase the source used by the audited report.
CREATE OR REPLACE FUNCTION app.guard_advance_payment_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'advance_payments' THEN
      RAISE EXCEPTION 'Advance payments are append-only and cannot be deleted'
        USING ERRCODE = '55000';
    END IF;
    RAISE EXCEPTION 'Advance payment allocations are append-only and cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF TG_TABLE_NAME = 'advance_payments' THEN
    RAISE EXCEPTION 'Advance payment facts are immutable'
      USING ERRCODE = '55000';
  END IF;
  RAISE EXCEPTION 'Advance payment allocation facts are immutable'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS advance_payments_immutability_trigger ON advance_payments;
CREATE TRIGGER advance_payments_immutability_trigger
  BEFORE UPDATE OR DELETE ON advance_payments
  FOR EACH ROW
  EXECUTE FUNCTION app.guard_advance_payment_immutability();

DROP TRIGGER IF EXISTS advance_payment_allocations_immutability_trigger
  ON advance_payment_allocations;
CREATE TRIGGER advance_payment_allocations_immutability_trigger
  BEFORE UPDATE OR DELETE ON advance_payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION app.guard_advance_payment_immutability();

ALTER TABLE advance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE advance_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_payment_allocations FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'advance_payments'
       AND policyname = 'advance_payments_tenant_select'
  ) THEN
    CREATE POLICY advance_payments_tenant_select ON advance_payments
      FOR SELECT USING (account_id = app.current_account_id());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'advance_payments'
       AND policyname = 'advance_payments_tenant_insert'
  ) THEN
    CREATE POLICY advance_payments_tenant_insert ON advance_payments
      FOR INSERT WITH CHECK (account_id = app.current_account_id());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'advance_payment_allocations'
       AND policyname = 'advance_payment_allocations_tenant_select'
  ) THEN
    CREATE POLICY advance_payment_allocations_tenant_select ON advance_payment_allocations
      FOR SELECT USING (account_id = app.current_account_id());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'advance_payment_allocations'
       AND policyname = 'advance_payment_allocations_tenant_insert'
  ) THEN
    CREATE POLICY advance_payment_allocations_tenant_insert ON advance_payment_allocations
      FOR INSERT WITH CHECK (account_id = app.current_account_id());
  END IF;
END
$$;
