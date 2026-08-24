-- 0131 is reserved for commissions. Both 0132_laboratory_order_workflow.sql and
-- 0132_marketing_delivery_guarantees.sql are already present in the shared workspace;
-- counter-sales therefore uses the next free migration number, 0133.

ALTER TABLE counter_sale_payments
  ADD COLUMN IF NOT EXISTS idempotency_key_hash CHAR(64);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM counter_sale_payments
     WHERE idempotency_key_hash IS NOT NULL
       AND idempotency_key_hash !~ '^[0-9a-f]{64}$'
  ) THEN
    RAISE EXCEPTION 'Cannot enable counter-sale payment idempotency: invalid key hash exists';
  END IF;

  IF EXISTS (
    SELECT account_id, idempotency_key_hash
      FROM counter_sale_payments
     WHERE idempotency_key_hash IS NOT NULL
     GROUP BY account_id, idempotency_key_hash
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enable counter-sale payment idempotency: duplicate key hash exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'counter_sale_payments_idempotency_key_hash_chk'
       AND conrelid = 'counter_sale_payments'::regclass
  ) THEN
    ALTER TABLE counter_sale_payments
      ADD CONSTRAINT counter_sale_payments_idempotency_key_hash_chk
      CHECK (
        idempotency_key_hash IS NULL
        OR idempotency_key_hash ~ '^[0-9a-f]{64}$'
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS counter_sale_payments_account_idempotency_unique
  ON counter_sale_payments (account_id, idempotency_key_hash)
  WHERE idempotency_key_hash IS NOT NULL;

-- catalog_item_id is polymorphic, so a regular FK cannot express its tenant
-- boundary. Validate legacy rows before installing a fail-closed trigger.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM counter_sale_items AS item
     WHERE item.catalog_item_id IS NOT NULL
       AND NOT (
         (item.item_type = 'product' AND EXISTS (
           SELECT 1
             FROM products
            WHERE products.account_id = item.account_id
              AND products.id = item.catalog_item_id
         ))
         OR (item.item_type = 'service' AND EXISTS (
           SELECT 1
             FROM services
            WHERE services.account_id = item.account_id
              AND services.id = item.catalog_item_id
         ))
       )
  ) THEN
    RAISE EXCEPTION 'Counter sale catalog item is missing or belongs to another tenant';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION app.assert_counter_sale_item_catalog_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $$
BEGIN
  IF NEW.catalog_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.item_type = 'product' AND NOT EXISTS (
    SELECT 1
      FROM public.products
     WHERE account_id = NEW.account_id
       AND id = NEW.catalog_item_id
  ) THEN
    RAISE EXCEPTION 'Counter sale catalog item is missing or belongs to another tenant';
  END IF;

  IF NEW.item_type = 'service' AND NOT EXISTS (
    SELECT 1
      FROM public.services
     WHERE account_id = NEW.account_id
       AND id = NEW.catalog_item_id
  ) THEN
    RAISE EXCEPTION 'Counter sale catalog item is missing or belongs to another tenant';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS counter_sale_items_catalog_tenant_guard ON counter_sale_items;
CREATE TRIGGER counter_sale_items_catalog_tenant_guard
BEFORE INSERT OR UPDATE OF account_id, item_type, catalog_item_id
ON counter_sale_items
FOR EACH ROW
EXECUTE FUNCTION app.assert_counter_sale_item_catalog_tenant();

-- 0128 normally creates these constraints. Re-check the legacy data and add
-- any missing composite constraints so a partially upgraded database fails
-- closed instead of accepting a cross-tenant transfer reference.
CREATE UNIQUE INDEX IF NOT EXISTS scheduling_queue_entries_account_id_id_unique
  ON scheduling_queue_entries (account_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS billing_records_account_id_id_unique
  ON billing_records (account_id, id);

DO $$
BEGIN
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
      LEFT JOIN counter_sales AS sale
        ON sale.account_id = transfer.account_id
       AND sale.id = transfer.counter_sale_id
     WHERE transfer.counter_sale_id IS NOT NULL
       AND sale.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot tenant-scope queue transfers: counter sale is missing or belongs to another tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'scheduling_queue_transfers_account_queue_entry_fk'
       AND conrelid = 'scheduling_queue_transfers'::regclass
  ) THEN
    ALTER TABLE scheduling_queue_transfers
      ADD CONSTRAINT scheduling_queue_transfers_account_queue_entry_fk
      FOREIGN KEY (account_id, queue_entry_id)
      REFERENCES scheduling_queue_entries (account_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'scheduling_queue_transfers_account_counter_sale_fk'
       AND conrelid = 'scheduling_queue_transfers'::regclass
  ) THEN
    ALTER TABLE scheduling_queue_transfers
      ADD CONSTRAINT scheduling_queue_transfers_account_counter_sale_fk
      FOREIGN KEY (account_id, counter_sale_id)
      REFERENCES counter_sales (account_id, id)
      ON DELETE RESTRICT;
  END IF;
END $$;
