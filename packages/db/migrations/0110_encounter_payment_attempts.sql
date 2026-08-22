-- Durable, tenant-scoped PIX dispatch attempts. Provider calls happen outside
-- the tenant transaction; the lease fields fence the later persisted result.

-- The three-column target lets an attempt prove that its billing record belongs
-- to the same encounter, not merely to the same tenant.
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_records_account_id_id_encounter_id_unique
  ON billing_records(account_id, id, encounter_id);

CREATE TABLE encounter_payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  encounter_id UUID NOT NULL,
  billing_record_id TEXT NOT NULL,
  requested_by_user_id UUID NOT NULL,
  payment_method VARCHAR(16) NOT NULL DEFAULT 'pix',
  provider_key VARCHAR(64) NOT NULL,
  state VARCHAR(40) NOT NULL DEFAULT 'pending_dispatch',
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  request_key_hash CHAR(64) NOT NULL,
  provider_idempotency_key VARCHAR(128) NOT NULL,
  provider_transaction_id VARCHAR(255),
  qr_code_payload TEXT,
  qr_code_base64 TEXT,
  expires_at TIMESTAMPTZ,
  last_error_code VARCHAR(64),
  last_error_class VARCHAR(32),
  last_error_public_message VARCHAR(512),
  dispatch_attempts INTEGER NOT NULL DEFAULT 0,
  max_dispatch_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),
  lease_owner VARCHAR(160),
  lease_token UUID,
  lease_version BIGINT NOT NULL DEFAULT 0,
  lease_expires_at TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT encounter_payment_attempts_account_id_id_unique
    UNIQUE (account_id, id),
  CONSTRAINT encounter_payment_attempts_account_id_id_billing_unique
    UNIQUE (account_id, id, billing_record_id),
  CONSTRAINT encounter_payment_attempts_account_request_key_unique
    UNIQUE (account_id, request_key_hash),
  CONSTRAINT encounter_payment_attempts_account_billing_method_unique
    UNIQUE (account_id, billing_record_id, payment_method),
  CONSTRAINT encounter_payment_attempts_provider_idempotency_key_unique
    UNIQUE (provider_key, provider_idempotency_key),
  CONSTRAINT encounter_payment_attempts_account_fk
    FOREIGN KEY (account_id)
    REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT encounter_payment_attempts_account_encounter_fk
    FOREIGN KEY (account_id, encounter_id)
    REFERENCES encounters(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_payment_attempts_account_billing_fk
    FOREIGN KEY (account_id, billing_record_id, encounter_id)
    REFERENCES billing_records(account_id, id, encounter_id) ON DELETE RESTRICT,
  CONSTRAINT encounter_payment_attempts_account_requested_by_user_fk
    FOREIGN KEY (account_id, requested_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT encounter_payment_attempts_payment_method_pix_chk
    CHECK (payment_method = 'pix'),
  CONSTRAINT encounter_payment_attempts_provider_key_not_blank_chk
    CHECK (btrim(provider_key) <> ''),
  CONSTRAINT encounter_payment_attempts_state_chk
    CHECK (state IN (
      'pending_dispatch',
      'awaiting_confirmation',
      'confirmed_pending_apply',
      'settled',
      'expired',
      'cancelled',
      'dispatch_failed',
      'reconciliation_required'
    )),
  CONSTRAINT encounter_payment_attempts_amount_cents_positive_chk
    CHECK (amount_cents > 0),
  CONSTRAINT encounter_payment_attempts_currency_brl_chk
    CHECK (currency = 'BRL'),
  CONSTRAINT encounter_payment_attempts_request_key_hash_chk
    CHECK (request_key_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT encounter_payment_attempts_provider_idempotency_key_chk
    CHECK (provider_idempotency_key = 'cvg:pix:create:v1:' || id::text),
  CONSTRAINT encounter_payment_attempts_dispatch_attempts_chk
    CHECK (
      dispatch_attempts >= 0
      AND max_dispatch_attempts > 0
      AND dispatch_attempts <= max_dispatch_attempts
    ),
  CONSTRAINT encounter_payment_attempts_lease_version_chk
    CHECK (lease_version >= 0),
  CONSTRAINT encounter_payment_attempts_version_chk
    CHECK (version > 0),
  CONSTRAINT encounter_payment_attempts_next_attempt_state_chk
    CHECK (next_attempt_at IS NULL OR state = 'pending_dispatch'),
  CONSTRAINT encounter_payment_attempts_lease_state_chk
    CHECK (
      (
        lease_owner IS NULL
        AND lease_token IS NULL
        AND lease_expires_at IS NULL
      )
      OR
      (
        state = 'pending_dispatch'
        AND lease_owner IS NOT NULL
        AND btrim(lease_owner) <> ''
        AND lease_token IS NOT NULL
        AND lease_expires_at IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX uidx_encounter_payment_attempts_provider_transaction
  ON encounter_payment_attempts(provider_key, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX idx_encounter_payment_attempts_dispatch_claim
  ON encounter_payment_attempts(account_id, state, next_attempt_at, lease_expires_at);

CREATE INDEX idx_encounter_payment_attempts_account_encounter
  ON encounter_payment_attempts(account_id, encounter_id);

-- A pending or ambiguous provider attempt owns the right to collect this
-- billing record. Every competing mutation takes the billing row lock first,
-- so request creation, cash settlement and item changes serialize without a
-- check-then-act gap before the out-of-transaction provider call.
ALTER TABLE billing_records
  ADD COLUMN active_payment_attempt_id UUID,
  ADD CONSTRAINT billing_records_account_active_payment_attempt_billing_fk
    FOREIGN KEY (account_id, active_payment_attempt_id, id)
    REFERENCES encounter_payment_attempts(account_id, id, billing_record_id)
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED;

CREATE UNIQUE INDEX uidx_billing_records_account_active_payment_attempt
  ON billing_records(account_id, active_payment_attempt_id)
  WHERE active_payment_attempt_id IS NOT NULL;

CREATE OR REPLACE FUNCTION app.guard_billing_payment_attempt_marker()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  linked_state TEXT;
  linked_billing_record_id TEXT;
BEGIN
  IF OLD.active_payment_attempt_id IS NOT DISTINCT FROM NEW.active_payment_attempt_id THEN
    RETURN NEW;
  END IF;

  IF NEW.active_payment_attempt_id IS NULL THEN
    SELECT state
      INTO linked_state
      FROM encounter_payment_attempts
     WHERE account_id = OLD.account_id
       AND id = OLD.active_payment_attempt_id;
    IF linked_state IN (
      'pending_dispatch',
      'awaiting_confirmation',
      'confirmed_pending_apply',
      'reconciliation_required'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'BILLING_PAYMENT_RESERVATION_CANNOT_BE_CLEARED';
    END IF;
    RETURN NEW;
  END IF;

  SELECT state, billing_record_id
    INTO linked_state, linked_billing_record_id
    FROM encounter_payment_attempts
   WHERE account_id = NEW.account_id
     AND id = NEW.active_payment_attempt_id;
  IF NOT FOUND
     OR linked_billing_record_id <> NEW.id
     OR linked_state NOT IN (
       'pending_dispatch',
       'awaiting_confirmation',
       'confirmed_pending_apply',
       'reconciliation_required'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'BILLING_PAYMENT_RESERVATION_MARKER_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER billing_records_payment_attempt_marker_trigger
BEFORE UPDATE OF active_payment_attempt_id ON billing_records
FOR EACH ROW
EXECUTE FUNCTION app.guard_billing_payment_attempt_marker();

CREATE OR REPLACE FUNCTION app.guard_encounter_payment_attempt_reopen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'closed'
     AND NEW.status = 'open'
     AND EXISTS (
       SELECT 1
         FROM billing_records AS billing
        WHERE billing.account_id = OLD.account_id
          AND billing.encounter_id = OLD.id
          AND billing.active_payment_attempt_id IS NOT NULL
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'ENCOUNTER_PAYMENT_RESERVED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER encounters_payment_attempt_reopen_trigger
BEFORE UPDATE OF status ON encounters
FOR EACH ROW
EXECUTE FUNCTION app.guard_encounter_payment_attempt_reopen();

CREATE OR REPLACE FUNCTION app.guard_payment_attempt_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  billing_status TEXT;
  billing_currency TEXT;
  billing_amount_cents BIGINT;
  billing_has_items BOOLEAN;
  reserved_attempt_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (
      OLD.account_id IS DISTINCT FROM NEW.account_id
      OR OLD.encounter_id IS DISTINCT FROM NEW.encounter_id
      OR OLD.billing_record_id IS DISTINCT FROM NEW.billing_record_id
      OR OLD.requested_by_user_id IS DISTINCT FROM NEW.requested_by_user_id
      OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
      OR OLD.provider_key IS DISTINCT FROM NEW.provider_key
      OR OLD.amount_cents IS DISTINCT FROM NEW.amount_cents
      OR OLD.currency IS DISTINCT FROM NEW.currency
      OR OLD.request_key_hash IS DISTINCT FROM NEW.request_key_hash
      OR OLD.provider_idempotency_key IS DISTINCT FROM NEW.provider_idempotency_key
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'PIX_PAYMENT_ATTEMPT_IDENTITY_IMMUTABLE';
    END IF;

    IF OLD.state NOT IN (
      'pending_dispatch',
      'awaiting_confirmation',
      'confirmed_pending_apply',
      'reconciliation_required'
    ) AND NEW.state IN (
      'pending_dispatch',
      'awaiting_confirmation',
      'confirmed_pending_apply',
      'reconciliation_required'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'PIX_PAYMENT_ATTEMPT_CANNOT_REOPEN';
    END IF;

    -- The billing row is the global mutex. INSERT owns it before the attempt
    -- exists; active-to-active updates retain the materialized reservation and
    -- must not acquire attempt -> billing locks in the dispatcher.
    RETURN NEW;
  END IF;

  SELECT
    billing.status,
    billing.currency,
    (billing.subtotal_amount * 100)::BIGINT,
    billing.active_payment_attempt_id,
    EXISTS (
      SELECT 1
        FROM billing_items AS item
       WHERE item.account_id = billing.account_id
         AND item.billing_record_id = billing.id
         AND item.encounter_id = billing.encounter_id
    )
    INTO billing_status, billing_currency, billing_amount_cents,
         reserved_attempt_id, billing_has_items
    FROM billing_records AS billing
   WHERE billing.account_id = NEW.account_id
     AND billing.id = NEW.billing_record_id
     AND billing.encounter_id = NEW.encounter_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'PIX_PAYMENT_RESERVATION_BILLING_MISMATCH';
  END IF;

  IF NEW.state NOT IN (
    'pending_dispatch',
    'awaiting_confirmation',
    'confirmed_pending_apply',
    'reconciliation_required'
  ) THEN
    RETURN NEW;
  END IF;

  IF (reserved_attempt_id IS NOT NULL AND reserved_attempt_id <> NEW.id)
     OR billing_status <> 'open'
     OR billing_currency <> 'BRL'
     OR billing_amount_cents <> NEW.amount_cents
     OR NOT billing_has_items THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'PIX_PAYMENT_RESERVATION_BILLING_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER encounter_payment_attempts_reservation_insert_trigger
BEFORE INSERT ON encounter_payment_attempts
FOR EACH ROW
EXECUTE FUNCTION app.guard_payment_attempt_reservation();

CREATE OR REPLACE FUNCTION app.sync_payment_attempt_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.state IN (
       'pending_dispatch',
       'awaiting_confirmation',
       'confirmed_pending_apply',
       'reconciliation_required'
     )
     AND NEW.state IN (
       'pending_dispatch',
       'awaiting_confirmation',
       'confirmed_pending_apply',
       'reconciliation_required'
     ) THEN
    RETURN NEW;
  END IF;

  IF NEW.state IN (
    'pending_dispatch',
    'awaiting_confirmation',
    'confirmed_pending_apply',
    'reconciliation_required'
  ) THEN
    UPDATE billing_records
       SET active_payment_attempt_id = NEW.id
     WHERE account_id = NEW.account_id
       AND id = NEW.billing_record_id
       AND (active_payment_attempt_id IS NULL OR active_payment_attempt_id = NEW.id);
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'BILLING_PAYMENT_ALREADY_RESERVED';
    END IF;
  ELSE
    UPDATE billing_records
       SET active_payment_attempt_id = NULL
     WHERE account_id = NEW.account_id
       AND id = NEW.billing_record_id
       AND active_payment_attempt_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER encounter_payment_attempts_reservation_sync_insert_trigger
AFTER INSERT ON encounter_payment_attempts
FOR EACH ROW
EXECUTE FUNCTION app.sync_payment_attempt_reservation();

CREATE TRIGGER encounter_payment_attempts_reservation_sync_update_trigger
AFTER UPDATE OF state, account_id, billing_record_id ON encounter_payment_attempts
FOR EACH ROW
EXECUTE FUNCTION app.sync_payment_attempt_reservation();

CREATE TRIGGER encounter_payment_attempts_reservation_update_trigger
BEFORE UPDATE OF state, account_id, encounter_id, billing_record_id,
  requested_by_user_id, payment_method, provider_key, amount_cents, currency,
  request_key_hash, provider_idempotency_key
ON encounter_payment_attempts
FOR EACH ROW
EXECUTE FUNCTION app.guard_payment_attempt_reservation();

CREATE OR REPLACE FUNCTION app.guard_reserved_billing_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.subtotal_amount IS DISTINCT FROM NEW.subtotal_amount
    OR OLD.currency IS DISTINCT FROM NEW.currency
  ) AND OLD.active_payment_attempt_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'BILLING_PAYMENT_RESERVED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER billing_records_payment_reservation_trigger
BEFORE UPDATE OF status, subtotal_amount, currency ON billing_records
FOR EACH ROW
EXECUTE FUNCTION app.guard_reserved_billing_update();

CREATE OR REPLACE FUNCTION app.guard_reserved_billing_item_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_account_id UUID;
  target_billing_record_id TEXT;
  reserved_attempt_id UUID;
BEGIN
  target_account_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.account_id ELSE NEW.account_id END;
  target_billing_record_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.billing_record_id
    ELSE NEW.billing_record_id
  END;

  SELECT active_payment_attempt_id
    INTO reserved_attempt_id
    FROM billing_records
   WHERE account_id = target_account_id
     AND id = target_billing_record_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'PIX_PAYMENT_RESERVATION_BILLING_MISMATCH';
  END IF;

  IF reserved_attempt_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'BILLING_PAYMENT_RESERVED';
  END IF;

  IF TG_OP = 'UPDATE'
     AND (
       OLD.account_id IS DISTINCT FROM NEW.account_id
       OR OLD.billing_record_id IS DISTINCT FROM NEW.billing_record_id
     ) THEN
    SELECT active_payment_attempt_id
      INTO reserved_attempt_id
      FROM billing_records
     WHERE account_id = OLD.account_id
       AND id = OLD.billing_record_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'PIX_PAYMENT_RESERVATION_BILLING_MISMATCH';
    END IF;
    IF reserved_attempt_id IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'BILLING_PAYMENT_RESERVED';
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER billing_items_payment_reservation_trigger
BEFORE INSERT OR UPDATE OR DELETE ON billing_items
FOR EACH ROW
EXECUTE FUNCTION app.guard_reserved_billing_item_mutation();

ALTER TABLE encounter_payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_payment_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY encounter_payment_attempts_tenant_isolation ON encounter_payment_attempts
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Legacy/B1 rows intentionally remain NULL. Only B2a dispatch persistence sets
-- this link, and the composite FK proves that the attempt belongs to the tenant.
ALTER TABLE pix_transactions
  ADD COLUMN payment_attempt_id UUID,
  ADD CONSTRAINT pix_transactions_account_payment_attempt_fk
    FOREIGN KEY (account_id, payment_attempt_id)
    REFERENCES encounter_payment_attempts(account_id, id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX uidx_pix_transactions_account_payment_attempt
  ON pix_transactions(account_id, payment_attempt_id)
  WHERE payment_attempt_id IS NOT NULL;

COMMENT ON TABLE encounter_payment_attempts IS
  'Durable tenant-scoped attempts for outbound encounter payment dispatch';
COMMENT ON COLUMN encounter_payment_attempts.request_key_hash IS
  'Lowercase SHA-256 hash of the opaque HTTP idempotency key; this table never stores the raw key';
COMMENT ON COLUMN encounter_payment_attempts.provider_idempotency_key IS
  'Stable opaque key reused for every provider retry of this attempt';
COMMENT ON COLUMN encounter_payment_attempts.last_error_public_message IS
  'Sanitized public error message without provider body, QR data, secrets, or PII';
COMMENT ON COLUMN encounter_payment_attempts.lease_version IS
  'Monotonic fencing version incremented on each claim or takeover';
COMMENT ON COLUMN billing_records.active_payment_attempt_id IS
  'Durable mutex for an outbound payment attempt that still owns collection of this billing record';
COMMENT ON COLUMN pix_transactions.payment_attempt_id IS
  'Optional B2 payment-attempt origin; NULL identifies legacy and B1 transactions';
