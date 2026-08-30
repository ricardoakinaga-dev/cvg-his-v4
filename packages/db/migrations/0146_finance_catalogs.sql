-- Canonical persistence for the finance catalog already exposed by the
-- application schema. This migration is additive: it creates no seed data and
-- does not rewrite or remove existing records.

CREATE TABLE IF NOT EXISTS finance_cost_centers (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  owner VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_cost_centers_pk PRIMARY KEY (account_id, code),
  CONSTRAINT finance_cost_centers_kind_chk CHECK (kind IN ('Operacional', 'Administrativo'))
);

CREATE INDEX IF NOT EXISTS idx_finance_cost_centers_account_name
  ON finance_cost_centers (account_id, name);

CREATE TABLE IF NOT EXISTS finance_expense_catalog_items (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  category VARCHAR(64) NOT NULL,
  cost_center_code VARCHAR(100) NOT NULL,
  cost_center_name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  created_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_expense_catalog_items_cost_center_fk
    FOREIGN KEY (account_id, cost_center_code)
    REFERENCES finance_cost_centers(account_id, code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_finance_expense_catalog_items_account_name
  ON finance_expense_catalog_items (account_id, name);

CREATE INDEX IF NOT EXISTS idx_finance_expense_catalog_items_account_category
  ON finance_expense_catalog_items (account_id, category);

CREATE INDEX IF NOT EXISTS idx_finance_expense_catalog_items_account_cost_center
  ON finance_expense_catalog_items (account_id, cost_center_code);

-- Existing installations may have created these relations from the historical
-- source before the canonical migration. Add missing integrity constraints only;
-- never rewrite or remove an existing constraint in this migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.finance_cost_centers'::regclass
       AND conname = 'finance_cost_centers_kind_chk'
  ) THEN
    ALTER TABLE finance_cost_centers
      ADD CONSTRAINT finance_cost_centers_kind_chk
      CHECK (kind IN ('Operacional', 'Administrativo'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.finance_expense_catalog_items'::regclass
       AND conname = 'finance_expense_catalog_items_cost_center_fk'
  ) THEN
    ALTER TABLE finance_expense_catalog_items
      ADD CONSTRAINT finance_expense_catalog_items_cost_center_fk
      FOREIGN KEY (account_id, cost_center_code)
      REFERENCES finance_cost_centers(account_id, code)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END
$$;

ALTER TABLE finance_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_cost_centers FORCE ROW LEVEL SECURITY;
DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  SELECT permissive, roles::text AS roles_text, cmd, qual, with_check
    INTO existing_policy
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'finance_cost_centers'
     AND policyname = 'finance_cost_centers_tenant_isolation';

  IF FOUND THEN
    IF existing_policy.permissive IS DISTINCT FROM 'PERMISSIVE'
       OR existing_policy.roles_text IS DISTINCT FROM '{public}'
       OR existing_policy.cmd IS DISTINCT FROM 'ALL'
       OR existing_policy.qual IS DISTINCT FROM '(account_id = app.current_account_id())'
       OR existing_policy.with_check IS DISTINCT FROM '(account_id = app.current_account_id())' THEN
      RAISE EXCEPTION
        'Existing finance_cost_centers tenant policy is incompatible with canonical isolation';
    END IF;
  ELSE
    CREATE POLICY finance_cost_centers_tenant_isolation ON finance_cost_centers
      FOR ALL
      USING (account_id = app.current_account_id())
      WITH CHECK (account_id = app.current_account_id());
  END IF;
END
$$;

ALTER TABLE finance_expense_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expense_catalog_items FORCE ROW LEVEL SECURITY;
DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  SELECT permissive, roles::text AS roles_text, cmd, qual, with_check
    INTO existing_policy
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'finance_expense_catalog_items'
     AND policyname = 'finance_expense_catalog_items_tenant_isolation';

  IF FOUND THEN
    IF existing_policy.permissive IS DISTINCT FROM 'PERMISSIVE'
       OR existing_policy.roles_text IS DISTINCT FROM '{public}'
       OR existing_policy.cmd IS DISTINCT FROM 'ALL'
       OR existing_policy.qual IS DISTINCT FROM '(account_id = app.current_account_id())'
       OR existing_policy.with_check IS DISTINCT FROM '(account_id = app.current_account_id())' THEN
      RAISE EXCEPTION
        'Existing finance_expense_catalog_items tenant policy is incompatible with canonical isolation';
    END IF;
  ELSE
    CREATE POLICY finance_expense_catalog_items_tenant_isolation ON finance_expense_catalog_items
      FOR ALL
      USING (account_id = app.current_account_id())
      WITH CHECK (account_id = app.current_account_id());
  END IF;
END
$$;
