DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM scheduling_queue_transfers
     WHERE received_at IS NULL
     GROUP BY queue_entry_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enable one-pending-transfer invariant while duplicate pending queue transfers exist';
  END IF;
END $$;

-- Transfer context is an integrity boundary, not merely descriptive metadata.
-- Refuse legacy values that cannot be proven to belong to the current tenant
-- before narrowing UUID-backed references or adding the composite foreign keys.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM scheduling_queue_transfers
     WHERE encounter_id IS NOT NULL
       AND NULLIF(trim(encounter_id::text), '') IS NOT NULL
       AND trim(encounter_id::text) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'Cannot tenant-scope queue transfers: encounter_id contains a non-UUID value';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM scheduling_queue_transfers
     WHERE counter_sale_id IS NOT NULL
       AND NULLIF(trim(counter_sale_id::text), '') IS NOT NULL
       AND trim(counter_sale_id::text) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'Cannot tenant-scope queue transfers: counter_sale_id contains a non-UUID value';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM scheduling_queue_transfers AS transfer
      LEFT JOIN scheduling_queue_entries AS entry
        ON entry.account_id = transfer.account_id
       AND entry.id = transfer.queue_entry_id
     WHERE entry.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot tenant-scope queue transfers: queue entry is missing or belongs to another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM scheduling_queue_transfers AS transfer
      LEFT JOIN encounters AS encounter
        ON encounter.account_id = transfer.account_id
       AND encounter.id::text = NULLIF(trim(transfer.encounter_id::text), '')
     WHERE NULLIF(trim(transfer.encounter_id::text), '') IS NOT NULL
       AND encounter.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot tenant-scope queue transfers: encounter is missing or belongs to another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM scheduling_queue_transfers AS transfer
      LEFT JOIN billing_records AS billing
        ON billing.account_id = transfer.account_id
       AND billing.id = NULLIF(trim(transfer.billing_record_id::text), '')
     WHERE NULLIF(trim(transfer.billing_record_id::text), '') IS NOT NULL
       AND billing.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot tenant-scope queue transfers: billing record is missing or belongs to another tenant';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM scheduling_queue_transfers AS transfer
      LEFT JOIN counter_sales AS sale
        ON sale.account_id = transfer.account_id
       AND sale.id::text = NULLIF(trim(transfer.counter_sale_id::text), '')
     WHERE NULLIF(trim(transfer.counter_sale_id::text), '') IS NOT NULL
       AND sale.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot tenant-scope queue transfers: counter sale is missing or belongs to another tenant';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_queue_entries_account_id_id_unique
  ON scheduling_queue_entries(account_id, id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'scheduling_queue_transfers'
       AND column_name = 'encounter_id'
       AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE scheduling_queue_transfers
      ALTER COLUMN encounter_id TYPE UUID
      USING NULLIF(trim(encounter_id::text), '')::uuid;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'scheduling_queue_transfers'
       AND column_name = 'counter_sale_id'
       AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE scheduling_queue_transfers
      ALTER COLUMN counter_sale_id TYPE UUID
      USING NULLIF(trim(counter_sale_id::text), '')::uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'scheduling_queue_transfers_account_queue_entry_fk'
       AND conrelid = 'scheduling_queue_transfers'::regclass
  ) THEN
    ALTER TABLE scheduling_queue_transfers
      ADD CONSTRAINT scheduling_queue_transfers_account_queue_entry_fk
      FOREIGN KEY (account_id, queue_entry_id)
      REFERENCES scheduling_queue_entries(account_id, id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'scheduling_queue_transfers_account_encounter_fk'
       AND conrelid = 'scheduling_queue_transfers'::regclass
  ) THEN
    ALTER TABLE scheduling_queue_transfers
      ADD CONSTRAINT scheduling_queue_transfers_account_encounter_fk
      FOREIGN KEY (account_id, encounter_id)
      REFERENCES encounters(account_id, id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'scheduling_queue_transfers_account_billing_record_fk'
       AND conrelid = 'scheduling_queue_transfers'::regclass
  ) THEN
    ALTER TABLE scheduling_queue_transfers
      ADD CONSTRAINT scheduling_queue_transfers_account_billing_record_fk
      FOREIGN KEY (account_id, billing_record_id)
      REFERENCES billing_records(account_id, id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'scheduling_queue_transfers_account_counter_sale_fk'
       AND conrelid = 'scheduling_queue_transfers'::regclass
  ) THEN
    ALTER TABLE scheduling_queue_transfers
      ADD CONSTRAINT scheduling_queue_transfers_account_counter_sale_fk
      FOREIGN KEY (account_id, counter_sale_id)
      REFERENCES counter_sales(account_id, id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE scheduling_queue_transfers
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE scheduling_queue_transfers
   SET status = CASE WHEN received_at IS NULL THEN 'sent' ELSE 'received' END
 WHERE status IS NULL;

ALTER TABLE scheduling_queue_transfers
  ALTER COLUMN status SET DEFAULT 'sent',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'scheduling_queue_transfers_status_check'
       AND conrelid = 'scheduling_queue_transfers'::regclass
  ) THEN
    ALTER TABLE scheduling_queue_transfers
      ADD CONSTRAINT scheduling_queue_transfers_status_check
      CHECK (
        status IN ('sent', 'received')
        AND (
          status = 'sent'
          OR (received_by_user_id IS NOT NULL AND received_at IS NOT NULL)
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_queue_transfers_one_pending_per_entry
  ON scheduling_queue_transfers (queue_entry_id)
 WHERE status = 'sent';

ALTER TABLE scheduling_queue_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_queue_transfers FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN scheduling_queue_transfers.status IS
  'Transfer lifecycle: sent awaits explicit receiving-sector acknowledgement; received is terminal.';
