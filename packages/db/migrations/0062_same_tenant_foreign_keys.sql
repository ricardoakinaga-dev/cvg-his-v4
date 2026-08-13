-- Bind tenant-owned child rows to parent rows from the same account.
-- Existing cross-account references deliberately make this migration fail so
-- they can be investigated instead of being silently reassigned.

CREATE UNIQUE INDEX IF NOT EXISTS uq_owners_id_account
  ON owners (id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_id_account
  ON patients (id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_id_account
  ON users (id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_encounters_id_account
  ON encounters (id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inpatient_stays_id_account
  ON inpatient_stays (id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_counter_sales_id_account
  ON counter_sales (id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_id_account
  ON quotes (id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_id_account
  ON inventory_items (id, account_id);

ALTER TABLE counter_sales
  DROP CONSTRAINT IF EXISTS counter_sales_owner_account_fk;
ALTER TABLE counter_sales
  ADD CONSTRAINT counter_sales_owner_account_fk
  FOREIGN KEY (owner_id, account_id) REFERENCES owners(id, account_id);

ALTER TABLE counter_sales
  DROP CONSTRAINT IF EXISTS counter_sales_opened_by_account_fk;
ALTER TABLE counter_sales
  ADD CONSTRAINT counter_sales_opened_by_account_fk
  FOREIGN KEY (opened_by_user_id, account_id) REFERENCES users(id, account_id);

ALTER TABLE counter_sales
  DROP CONSTRAINT IF EXISTS counter_sales_closed_by_account_fk;
ALTER TABLE counter_sales
  ADD CONSTRAINT counter_sales_closed_by_account_fk
  FOREIGN KEY (closed_by_user_id, account_id) REFERENCES users(id, account_id);

ALTER TABLE counter_sale_items
  DROP CONSTRAINT IF EXISTS counter_sale_items_sale_account_fk;
ALTER TABLE counter_sale_items
  ADD CONSTRAINT counter_sale_items_sale_account_fk
  FOREIGN KEY (counter_sale_id, account_id) REFERENCES counter_sales(id, account_id)
  ON DELETE CASCADE;

ALTER TABLE counter_sale_payments
  DROP CONSTRAINT IF EXISTS counter_sale_payments_sale_account_fk;
ALTER TABLE counter_sale_payments
  ADD CONSTRAINT counter_sale_payments_sale_account_fk
  FOREIGN KEY (counter_sale_id, account_id) REFERENCES counter_sales(id, account_id)
  ON DELETE CASCADE;

ALTER TABLE quotes
  DROP CONSTRAINT IF EXISTS quotes_owner_account_fk;
ALTER TABLE quotes
  ADD CONSTRAINT quotes_owner_account_fk
  FOREIGN KEY (owner_id, account_id) REFERENCES owners(id, account_id);

ALTER TABLE quotes
  DROP CONSTRAINT IF EXISTS quotes_created_by_account_fk;
ALTER TABLE quotes
  ADD CONSTRAINT quotes_created_by_account_fk
  FOREIGN KEY (created_by_user_id, account_id) REFERENCES users(id, account_id);

ALTER TABLE quotes
  DROP CONSTRAINT IF EXISTS quotes_converted_sale_account_fk;
ALTER TABLE quotes
  ADD CONSTRAINT quotes_converted_sale_account_fk
  FOREIGN KEY (converted_to_sale_id, account_id) REFERENCES counter_sales(id, account_id);

ALTER TABLE quote_items
  DROP CONSTRAINT IF EXISTS quote_items_quote_account_fk;
ALTER TABLE quote_items
  ADD CONSTRAINT quote_items_quote_account_fk
  FOREIGN KEY (quote_id, account_id) REFERENCES quotes(id, account_id)
  ON DELETE CASCADE;

ALTER TABLE finance_expense_catalog_items
  DROP CONSTRAINT IF EXISTS finance_expenses_created_by_account_fk;
ALTER TABLE finance_expense_catalog_items
  ADD CONSTRAINT finance_expenses_created_by_account_fk
  FOREIGN KEY (created_by_user_id, account_id) REFERENCES users(id, account_id);

ALTER TABLE inventory_consumptions
  DROP CONSTRAINT IF EXISTS inventory_consumptions_item_account_fk;
ALTER TABLE inventory_consumptions
  ADD CONSTRAINT inventory_consumptions_item_account_fk
  FOREIGN KEY (inventory_item_id, account_id) REFERENCES inventory_items(id, account_id);

ALTER TABLE inventory_consumptions
  DROP CONSTRAINT IF EXISTS inventory_consumptions_encounter_account_fk;
ALTER TABLE inventory_consumptions
  ADD CONSTRAINT inventory_consumptions_encounter_account_fk
  FOREIGN KEY (encounter_id, account_id) REFERENCES encounters(id, account_id);

ALTER TABLE inventory_consumptions
  DROP CONSTRAINT IF EXISTS inventory_consumptions_patient_account_fk;
ALTER TABLE inventory_consumptions
  ADD CONSTRAINT inventory_consumptions_patient_account_fk
  FOREIGN KEY (patient_id, account_id) REFERENCES patients(id, account_id);

ALTER TABLE inventory_consumptions
  DROP CONSTRAINT IF EXISTS inventory_consumptions_user_account_fk;
ALTER TABLE inventory_consumptions
  ADD CONSTRAINT inventory_consumptions_user_account_fk
  FOREIGN KEY (recorded_by_user_id, account_id) REFERENCES users(id, account_id);

ALTER TABLE inpatient_progress
  DROP CONSTRAINT IF EXISTS inpatient_progress_stay_account_fk;
ALTER TABLE inpatient_progress
  ADD CONSTRAINT inpatient_progress_stay_account_fk
  FOREIGN KEY (stay_id, account_id) REFERENCES inpatient_stays(id, account_id)
  ON DELETE CASCADE;

ALTER TABLE inpatient_progress
  DROP CONSTRAINT IF EXISTS inpatient_progress_encounter_account_fk;
ALTER TABLE inpatient_progress
  ADD CONSTRAINT inpatient_progress_encounter_account_fk
  FOREIGN KEY (encounter_id, account_id) REFERENCES encounters(id, account_id)
  ON DELETE CASCADE;

ALTER TABLE inpatient_progress
  DROP CONSTRAINT IF EXISTS inpatient_progress_author_account_fk;
ALTER TABLE inpatient_progress
  ADD CONSTRAINT inpatient_progress_author_account_fk
  FOREIGN KEY (authored_by_user_id, account_id) REFERENCES users(id, account_id);

ALTER TABLE surgery_cases
  DROP CONSTRAINT IF EXISTS surgery_cases_encounter_account_fk;
ALTER TABLE surgery_cases
  ADD CONSTRAINT surgery_cases_encounter_account_fk
  FOREIGN KEY (encounter_id, account_id) REFERENCES encounters(id, account_id)
  ON DELETE CASCADE;

ALTER TABLE surgery_cases
  DROP CONSTRAINT IF EXISTS surgery_cases_patient_account_fk;
ALTER TABLE surgery_cases
  ADD CONSTRAINT surgery_cases_patient_account_fk
  FOREIGN KEY (patient_id, account_id) REFERENCES patients(id, account_id);

ALTER TABLE surgery_cases
  DROP CONSTRAINT IF EXISTS surgery_cases_surgeon_account_fk;
ALTER TABLE surgery_cases
  ADD CONSTRAINT surgery_cases_surgeon_account_fk
  FOREIGN KEY (surgeon_user_id, account_id) REFERENCES users(id, account_id);

ALTER TABLE owner_patient_links
  DROP CONSTRAINT IF EXISTS owner_patient_links_owner_account_fk;
ALTER TABLE owner_patient_links
  ADD CONSTRAINT owner_patient_links_owner_account_fk
  FOREIGN KEY (owner_id, account_id) REFERENCES owners(id, account_id)
  ON DELETE CASCADE;

ALTER TABLE owner_patient_links
  DROP CONSTRAINT IF EXISTS owner_patient_links_patient_account_fk;
ALTER TABLE owner_patient_links
  ADD CONSTRAINT owner_patient_links_patient_account_fk
  FOREIGN KEY (patient_id, account_id) REFERENCES patients(id, account_id)
  ON DELETE CASCADE;

-- Apply the same invariant to every remaining canonical single-column FK
-- between two tenant-owned tables. This keeps future schema additions from
-- reopening the class of cross-account reference defects fixed above.
CREATE OR REPLACE FUNCTION app.enforce_same_tenant_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
DECLARE
  referenced_id text;
  child_account_id text;
  parent_account_id text;
BEGIN
  referenced_id := to_jsonb(NEW) ->> TG_ARGV[2];
  child_account_id := to_jsonb(NEW) ->> 'account_id';

  IF referenced_id IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format(
    'SELECT account_id::text FROM %I.%I WHERE id::text = $1',
    TG_ARGV[0],
    TG_ARGV[1]
  )
  INTO parent_account_id
  USING referenced_id;

  IF parent_account_id IS NULL OR parent_account_id IS DISTINCT FROM child_account_id THEN
    RAISE EXCEPTION
      'Tenant reference violation on %.%: parent row is absent from the active account',
      TG_TABLE_NAME,
      TG_ARGV[2]
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END
$function$;

DO $same_tenant_foreign_keys$
DECLARE
  relation record;
  parent_index_name text;
  tenant_constraint_name text;
  tenant_trigger_name text;
BEGIN
  FOR relation IN
    SELECT DISTINCT
      child_namespace.nspname AS child_schema,
      child.oid AS child_oid,
      child.relname AS child_table,
      child_column.attname AS child_column,
      parent_namespace.nspname AS parent_schema,
      parent.oid AS parent_oid,
      parent.relname AS parent_table,
      child_account.atttypid AS child_account_type,
      parent_account.atttypid AS parent_account_type
    FROM pg_constraint base_fk
    JOIN pg_class child ON child.oid = base_fk.conrelid
    JOIN pg_class parent ON parent.oid = base_fk.confrelid
    JOIN pg_namespace child_namespace ON child_namespace.oid = child.relnamespace
    JOIN pg_namespace parent_namespace ON parent_namespace.oid = parent.relnamespace
    JOIN pg_attribute child_column
      ON child_column.attrelid = child.oid
     AND child_column.attnum = base_fk.conkey[1]
    JOIN pg_attribute parent_column
      ON parent_column.attrelid = parent.oid
     AND parent_column.attnum = base_fk.confkey[1]
    JOIN pg_attribute child_account
      ON child_account.attrelid = child.oid
     AND child_account.attname = 'account_id'
     AND NOT child_account.attisdropped
    JOIN pg_attribute parent_account
      ON parent_account.attrelid = parent.oid
     AND parent_account.attname = 'account_id'
     AND NOT parent_account.attisdropped
    WHERE child_namespace.nspname = 'public'
      AND parent_namespace.nspname = 'public'
      AND base_fk.contype = 'f'
      AND cardinality(base_fk.conkey) = 1
      AND cardinality(base_fk.confkey) = 1
      AND parent_column.attname = 'id'
      AND child_column.attname <> 'account_id'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint tenant_fk
        WHERE tenant_fk.contype = 'f'
          AND tenant_fk.conrelid = child.oid
          AND tenant_fk.confrelid = parent.oid
          AND child_account.attnum = ANY(tenant_fk.conkey)
          AND parent_account.attnum = ANY(tenant_fk.confkey)
      )
    ORDER BY child.relname, parent.relname, child_column.attname
  LOOP
    parent_index_name := format(
      'uq_tenant_parent_%s_%s',
      left(relation.parent_table, 25),
      left(md5(relation.parent_schema || '.' || relation.parent_table), 8)
    );
    tenant_constraint_name := format(
      'tenant_fk_%s_%s_%s',
      left(relation.child_table, 25),
      left(relation.child_column, 15),
      left(
        md5(
          relation.child_schema || '.' || relation.child_table || '.' || relation.child_column ||
          '->' || relation.parent_schema || '.' || relation.parent_table
        ),
        8
      )
    );
    tenant_trigger_name := format(
      'tenant_ref_%s_%s_%s',
      left(relation.child_table, 25),
      left(relation.child_column, 15),
      left(
        md5(
          relation.child_schema || '.' || relation.child_table || '.' || relation.child_column ||
          '->' || relation.parent_schema || '.' || relation.parent_table
        ),
        8
      )
    );

    IF relation.child_account_type = relation.parent_account_type THEN
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I.%I (id, account_id)',
        parent_index_name,
        relation.parent_schema,
        relation.parent_table
      );

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = relation.child_oid
          AND conname = tenant_constraint_name
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I, account_id) REFERENCES %I.%I (id, account_id)',
          relation.child_schema,
          relation.child_table,
          tenant_constraint_name,
          relation.child_column,
          relation.parent_schema,
          relation.parent_table
        );
      END IF;
    ELSIF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgrelid = relation.child_oid
        AND tgname = tenant_trigger_name
        AND NOT tgisinternal
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF %I, account_id ON %I.%I FOR EACH ROW EXECUTE FUNCTION app.enforce_same_tenant_reference(%L, %L, %L)',
        tenant_trigger_name,
        relation.child_column,
        relation.child_schema,
        relation.child_table,
        relation.parent_schema,
        relation.parent_table,
        relation.child_column
      );
    END IF;
  END LOOP;
END
$same_tenant_foreign_keys$;
