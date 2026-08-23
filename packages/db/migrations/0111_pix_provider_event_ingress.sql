-- Durable, authenticated PIX provider receipts and their separately fenced
-- delivery queue. The receipt is forensic and append-only; the delivery is
-- operational and may move through retry/lease states.

CREATE TABLE pix_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'local-pix',
  provider_event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  payment_attempt_id UUID NOT NULL,
  provider_transaction_id VARCHAR(255) NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  confirmed_at TIMESTAMPTZ NOT NULL,
  body_fingerprint CHAR(64) NOT NULL,
  claims_fingerprint CHAR(64) NOT NULL,
  correlation_id VARCHAR(255) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pix_provider_events_account_id_unique
    UNIQUE (account_id, id),
  CONSTRAINT pix_provider_events_account_provider_event_unique
    UNIQUE (account_id, provider, provider_event_id),
  CONSTRAINT pix_provider_events_account_fk
    FOREIGN KEY (account_id)
    REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT pix_provider_events_account_attempt_fk
    FOREIGN KEY (account_id, payment_attempt_id)
    REFERENCES encounter_payment_attempts(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT pix_provider_events_provider_chk
    CHECK (provider = 'local-pix'),
  CONSTRAINT pix_provider_events_provider_event_id_chk
    CHECK (provider_event_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$'),
  CONSTRAINT pix_provider_events_type_chk
    CHECK (event_type = 'pix.payment.confirmed.v1'),
  CONSTRAINT pix_provider_events_provider_transaction_id_chk
    CHECK (provider_transaction_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$'),
  CONSTRAINT pix_provider_events_amount_cents_chk
    CHECK (amount_cents BETWEEN 1 AND 999999999999),
  CONSTRAINT pix_provider_events_currency_chk
    CHECK (currency = 'BRL'),
  CONSTRAINT pix_provider_events_body_fingerprint_chk
    CHECK (body_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT pix_provider_events_claims_fingerprint_chk
    CHECK (claims_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT pix_provider_events_correlation_id_chk
    CHECK (btrim(correlation_id) <> '')
);

CREATE INDEX pix_provider_events_account_received_idx
  ON pix_provider_events(account_id, received_at DESC);

CREATE INDEX pix_provider_events_account_attempt_idx
  ON pix_provider_events(account_id, payment_attempt_id, received_at DESC);

CREATE OR REPLACE FUNCTION app.guard_pix_provider_event_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $guard$
DECLARE
  attempt_provider TEXT;
  attempt_state TEXT;
  attempt_amount BIGINT;
  attempt_currency TEXT;
  attempt_provider_transaction_id TEXT;
BEGIN
  SELECT provider_key, state, amount_cents, currency, provider_transaction_id
    INTO attempt_provider, attempt_state, attempt_amount, attempt_currency,
         attempt_provider_transaction_id
    FROM encounter_payment_attempts
   WHERE account_id = NEW.account_id
     AND id = NEW.payment_attempt_id
   FOR SHARE;

  IF NOT FOUND
     OR attempt_provider <> NEW.provider
     OR attempt_state NOT IN ('pending_dispatch', 'awaiting_confirmation', 'confirmed_pending_apply')
     OR attempt_amount <> NEW.amount_cents
     OR attempt_currency <> NEW.currency
     OR (
       attempt_provider_transaction_id IS NOT NULL
       AND attempt_provider_transaction_id <> NEW.provider_transaction_id
     ) THEN
    RAISE EXCEPTION 'PIX provider event does not match an active payment attempt'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$guard$;

CREATE TRIGGER pix_provider_events_attempt_guard
BEFORE INSERT ON pix_provider_events
FOR EACH ROW
EXECUTE FUNCTION app.guard_pix_provider_event_attempt();

CREATE OR REPLACE FUNCTION app.guard_pix_provider_event_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $guard$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PIX provider events are append-only and cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  RAISE EXCEPTION 'PIX provider event receipts are immutable'
    USING ERRCODE = '55000';
END;
$guard$;

CREATE TRIGGER pix_provider_events_immutability_trigger
BEFORE UPDATE OR DELETE ON pix_provider_events
FOR EACH ROW
EXECUTE FUNCTION app.guard_pix_provider_event_immutability();

CREATE TABLE pix_provider_event_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  event_id UUID NOT NULL,
  state VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),
  lease_owner VARCHAR(160),
  lease_token UUID,
  lease_version BIGINT NOT NULL DEFAULT 0,
  lease_expires_at TIMESTAMPTZ,
  last_error_code VARCHAR(64),
  last_error_class VARCHAR(32),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pix_provider_event_deliveries_account_event_unique
    UNIQUE (account_id, event_id),
  CONSTRAINT pix_provider_event_deliveries_account_fk
    FOREIGN KEY (account_id)
    REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT pix_provider_event_deliveries_account_event_fk
    FOREIGN KEY (account_id, event_id)
    REFERENCES pix_provider_events(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT pix_provider_event_deliveries_state_chk
    CHECK (state IN ('pending', 'processing', 'applied', 'reconciliation_required')),
  CONSTRAINT pix_provider_event_deliveries_attempts_chk
    CHECK (attempts >= 0 AND max_attempts > 0 AND attempts <= max_attempts),
  CONSTRAINT pix_provider_event_deliveries_lease_version_chk
    CHECK (lease_version >= 0),
  CONSTRAINT pix_provider_event_deliveries_lease_state_chk
    CHECK (
      (
        state = 'processing'
        AND lease_owner IS NOT NULL
        AND btrim(lease_owner) <> ''
        AND lease_token IS NOT NULL
        AND lease_expires_at IS NOT NULL
      )
      OR
      (
        state <> 'processing'
        AND lease_owner IS NULL
        AND lease_token IS NULL
        AND lease_expires_at IS NULL
      )
    ),
  CONSTRAINT pix_provider_event_deliveries_next_attempt_chk
    CHECK (
      (state = 'pending' AND next_attempt_at IS NOT NULL)
      OR (state <> 'pending' AND next_attempt_at IS NULL)
    ),
  CONSTRAINT pix_provider_event_deliveries_error_code_chk
    CHECK (last_error_code IS NULL OR last_error_code ~ '^[A-Z0-9_]{1,64}$'),
  CONSTRAINT pix_provider_event_deliveries_error_class_chk
    CHECK (last_error_class IS NULL OR last_error_class IN ('retryable', 'terminal')),
  CONSTRAINT pix_provider_event_deliveries_applied_at_chk
    CHECK (applied_at IS NULL OR state = 'applied')
);

CREATE INDEX pix_provider_event_deliveries_claim_idx
  ON pix_provider_event_deliveries(account_id, state, next_attempt_at, lease_expires_at);

CREATE INDEX pix_provider_event_deliveries_event_idx
  ON pix_provider_event_deliveries(account_id, event_id);

ALTER TABLE pix_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pix_provider_events FORCE ROW LEVEL SECURITY;
CREATE POLICY pix_provider_events_tenant_isolation ON pix_provider_events
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE pix_provider_event_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pix_provider_event_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY pix_provider_event_deliveries_tenant_isolation ON pix_provider_event_deliveries
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Keep the runtime boundary explicit when the migration runner has the
-- configured role names available. Bootstrap/reconciliation repeats this
-- matrix after any broad RLS grants; absent roles are intentionally skipped
-- so the expand-only migration remains installable before role provisioning.
REVOKE ALL PRIVILEGES ON TABLE pix_provider_events, pix_provider_event_deliveries FROM PUBLIC;
DO $roles$
DECLARE
  api_role TEXT := NULLIF(current_setting('app.runtime_api_role', true), '');
  worker_role TEXT := NULLIF(current_setting('app.runtime_worker_role', true), '');
BEGIN
  IF api_role IS NOT NULL AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
    EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_events FROM %I', api_role);
    EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_event_deliveries FROM %I', api_role);
    EXECUTE format('GRANT SELECT, INSERT ON TABLE public.pix_provider_events TO %I', api_role);
    EXECUTE format('GRANT SELECT, INSERT ON TABLE public.pix_provider_event_deliveries TO %I', api_role);
  END IF;
  IF worker_role IS NOT NULL AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = worker_role) THEN
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_events FROM %I', worker_role);
    EXECUTE format('REVOKE INSERT, DELETE, TRUNCATE ON TABLE public.pix_provider_event_deliveries FROM %I', worker_role);
    EXECUTE format('GRANT SELECT ON TABLE public.pix_provider_events TO %I', worker_role);
    EXECUTE format('GRANT SELECT, UPDATE ON TABLE public.pix_provider_event_deliveries TO %I', worker_role);
  END IF;
END;
$roles$;

COMMENT ON TABLE pix_provider_events IS
  'Authenticated PIX provider receipts; append-only forensic record without raw body or secrets';
COMMENT ON TABLE pix_provider_event_deliveries IS
  'Tenant-scoped operational delivery queue for PIX provider receipts with lease fencing';
