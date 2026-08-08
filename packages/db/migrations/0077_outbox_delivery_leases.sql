ALTER TABLE outbox_events
  ADD COLUMN lease_owner varchar(160),
  ADD COLUMN lease_token uuid,
  ADD COLUMN lease_version bigint NOT NULL DEFAULT 0,
  ADD COLUMN lease_expires_at timestamptz,
  ADD COLUMN last_attempt_at timestamptz;

UPDATE outbox_events
SET payload = COALESCE(payload, '{}'::jsonb)
  || jsonb_build_object(
       'accountId', account_id::text,
       '_meta',
       CASE
         WHEN jsonb_typeof(payload -> '_meta') = 'object' THEN payload -> '_meta'
         ELSE '{}'::jsonb
       END || jsonb_build_object('accountId', account_id::text)
     );

UPDATE outbox_events
SET status = 'retrying',
    scheduled_at = now(),
    lease_owner = NULL,
    lease_token = NULL,
    lease_expires_at = NULL
WHERE status = 'processing';

ALTER TABLE outbox_events
  ADD CONSTRAINT outbox_events_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
  ADD CONSTRAINT outbox_events_attempts_check
    CHECK (attempts >= 0 AND max_attempts > 0 AND attempts <= max_attempts),
  ADD CONSTRAINT outbox_events_lease_version_check
    CHECK (lease_version >= 0),
  ADD CONSTRAINT outbox_events_lease_state_check
    CHECK (
      (status = 'processing'
        AND lease_owner IS NOT NULL
        AND lease_token IS NOT NULL
        AND lease_expires_at IS NOT NULL)
      OR
      (status <> 'processing'
        AND lease_owner IS NULL
        AND lease_token IS NULL
        AND lease_expires_at IS NULL)
    );

CREATE INDEX outbox_events_delivery_claim_idx
  ON outbox_events(account_id, status, scheduled_at, lease_expires_at);

ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN outbox_events.lease_owner IS
  'Worker instance currently responsible for this delivery attempt';
COMMENT ON COLUMN outbox_events.lease_token IS
  'Opaque fencing token required by every processing state transition';
COMMENT ON COLUMN outbox_events.lease_version IS
  'Monotonic fencing version incremented on every claim or takeover';
COMMENT ON COLUMN outbox_events.lease_expires_at IS
  'Database-clock deadline after which another worker may take over';
