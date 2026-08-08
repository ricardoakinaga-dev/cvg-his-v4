CREATE TABLE idempotency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  operation varchar(128) NOT NULL,
  idempotency_key varchar(255) NOT NULL,
  request_hash char(64) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'processing',
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT idempotency_requests_scope_unique
    UNIQUE (account_id, operation, idempotency_key),
  CONSTRAINT idempotency_requests_status_check
    CHECK (status IN ('processing', 'completed')),
  CONSTRAINT idempotency_requests_hash_check
    CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT idempotency_requests_completion_check
    CHECK (
      (status = 'processing' AND completed_at IS NULL AND response_body IS NULL)
      OR (status = 'completed' AND completed_at IS NOT NULL AND response_body IS NOT NULL)
    )
);

CREATE INDEX idempotency_requests_expiry_idx
  ON idempotency_requests(expires_at);

CREATE TABLE inbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  consumer_name varchar(128) NOT NULL,
  event_id varchar(255) NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inbox_events_delivery_unique
    UNIQUE (account_id, consumer_name, event_id)
);

CREATE INDEX inbox_events_account_processed_idx
  ON inbox_events(account_id, processed_at DESC);

ALTER TABLE idempotency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE inbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_events FORCE ROW LEVEL SECURITY;

CREATE POLICY idempotency_requests_tenant_isolation ON idempotency_requests
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE POLICY inbox_events_tenant_isolation ON inbox_events
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE idempotency_requests IS
  'Tenant-scoped command replay records committed atomically with domain effects';
COMMENT ON TABLE inbox_events IS
  'Tenant-scoped consumer receipts committed atomically with local event effects';
