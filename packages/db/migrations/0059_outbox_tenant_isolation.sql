ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS account_id uuid;

UPDATE outbox_events AS event
SET account_id = account.id
FROM accounts AS account
WHERE event.account_id IS NULL
  AND account.id::text = COALESCE(
    event.payload ->> 'accountId',
    event.payload #>> '{_meta,accountId}'
  );

UPDATE outbox_events
SET account_id = (SELECT id FROM accounts ORDER BY created_at LIMIT 1)
WHERE account_id IS NULL
  AND (SELECT count(*) FROM accounts) = 1;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM outbox_events WHERE account_id IS NULL) THEN
    RAISE EXCEPTION
      'Cannot enable tenant isolation: outbox_events contains rows without a resolvable account_id';
  END IF;
END $$;

ALTER TABLE outbox_events ALTER COLUMN account_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'outbox_events_account_id_accounts_id_fk'
      AND conrelid = 'outbox_events'::regclass
  ) THEN
    ALTER TABLE outbox_events
      ADD CONSTRAINT outbox_events_account_id_accounts_id_fk
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS outbox_events_account_status_scheduled_idx
  ON outbox_events(account_id, status, scheduled_at);

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outbox_events_tenant_isolation ON outbox_events;
CREATE POLICY outbox_events_tenant_isolation ON outbox_events
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
