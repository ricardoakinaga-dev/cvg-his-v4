-- Materialize tables that were declared in the TypeScript schemas and used by
-- runtime repositories but were absent from the canonical migration trail.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'counter_sale_status') THEN
    CREATE TYPE counter_sale_status AS ENUM ('open', 'closed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'counter_sale_item_type') THEN
    CREATE TYPE counter_sale_item_type AS ENUM ('product', 'service');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'counter_sale_payment_method') THEN
    CREATE TYPE counter_sale_payment_method AS ENUM (
      'cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check', 'insurance', 'other'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status') THEN
    CREATE TYPE quote_status AS ENUM ('draft', 'approved', 'rejected', 'expired', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_item_type') THEN
    CREATE TYPE quote_item_type AS ENUM ('product', 'service');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS access_teams (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT access_teams_account_code_unique UNIQUE (account_id, code)
);
CREATE INDEX IF NOT EXISTS idx_access_teams_account ON access_teams(account_id);

CREATE TABLE IF NOT EXISTS access_sectors (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT access_sectors_account_code_unique UNIQUE (account_id, code)
);
CREATE INDEX IF NOT EXISTS idx_access_sectors_account ON access_sectors(account_id);

CREATE TABLE IF NOT EXISTS access_team_memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES access_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT access_team_memberships_pkey PRIMARY KEY (user_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_access_team_memberships_user ON access_team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_access_team_memberships_team ON access_team_memberships(team_id);

CREATE TABLE IF NOT EXISTS access_sector_memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sector_id TEXT NOT NULL REFERENCES access_sectors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT access_sector_memberships_pkey PRIMARY KEY (user_id, sector_id)
);
CREATE INDEX IF NOT EXISTS idx_access_sector_memberships_user ON access_sector_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_access_sector_memberships_sector ON access_sector_memberships(sector_id);

CREATE TABLE IF NOT EXISTS access_user_permissions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect VARCHAR(16) NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT access_user_permissions_pkey PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE IF NOT EXISTS access_team_permissions (
  team_id TEXT NOT NULL REFERENCES access_teams(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect VARCHAR(16) NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT access_team_permissions_pkey PRIMARY KEY (team_id, permission_id)
);

CREATE TABLE IF NOT EXISTS access_sector_permissions (
  sector_id TEXT NOT NULL REFERENCES access_sectors(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect VARCHAR(16) NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT access_sector_permissions_pkey PRIMARY KEY (sector_id, permission_id)
);

CREATE TABLE IF NOT EXISTS counter_sales (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  owner_id UUID REFERENCES owners(id),
  status counter_sale_status NOT NULL DEFAULT 'open',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
  notes TEXT,
  opened_by_user_id UUID NOT NULL REFERENCES users(id),
  closed_by_user_id UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT counter_sales_account_number_unique UNIQUE (account_id, number)
);
CREATE INDEX IF NOT EXISTS idx_counter_sales_account ON counter_sales(account_id);
CREATE INDEX IF NOT EXISTS idx_counter_sales_status ON counter_sales(account_id, status);

CREATE TABLE IF NOT EXISTS counter_sale_items (
  id TEXT PRIMARY KEY,
  counter_sale_id TEXT NOT NULL REFERENCES counter_sales(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_type counter_sale_item_type NOT NULL,
  catalog_item_id TEXT,
  name_snapshot TEXT NOT NULL,
  code_snapshot TEXT,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csi_counter_sale ON counter_sale_items(counter_sale_id);
CREATE INDEX IF NOT EXISTS idx_csi_account ON counter_sale_items(account_id);

CREATE TABLE IF NOT EXISTS counter_sale_payments (
  id TEXT PRIMARY KEY,
  counter_sale_id TEXT NOT NULL REFERENCES counter_sales(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  method counter_sale_payment_method NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  installments INTEGER NOT NULL DEFAULT 1 CHECK (installments > 0),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csp_counter_sale ON counter_sale_payments(counter_sale_id);
CREATE INDEX IF NOT EXISTS idx_csp_account ON counter_sale_payments(account_id);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  owner_id UUID REFERENCES owners(id),
  status quote_status NOT NULL DEFAULT 'draft',
  valid_until TIMESTAMPTZ,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  converted_to_sale_id TEXT REFERENCES counter_sales(id),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quotes_account_number_unique UNIQUE (account_id, number)
);
CREATE INDEX IF NOT EXISTS idx_quotes_account ON quotes(account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(account_id, status);

CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_type quote_item_type NOT NULL,
  catalog_item_id TEXT,
  name_snapshot TEXT NOT NULL,
  code_snapshot TEXT,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qi_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_qi_account ON quote_items(account_id);

CREATE TABLE IF NOT EXISTS finance_cost_centers (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  owner VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_cost_centers_pkey PRIMARY KEY (account_id, code)
);

CREATE TABLE IF NOT EXISTS finance_expense_catalog_items (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  category VARCHAR(64) NOT NULL,
  cost_center_code VARCHAR(100) NOT NULL,
  cost_center_name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_expense_cost_center_fkey
    FOREIGN KEY (account_id, cost_center_code)
    REFERENCES finance_cost_centers(account_id, code)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  on_hand_quantity NUMERIC(10, 2) NOT NULL CHECK (on_hand_quantity >= 0),
  reorder_level NUMERIC(10, 2) NOT NULL CHECK (reorder_level >= 0),
  unit_cost_amount NUMERIC(12, 2) NOT NULL CHECK (unit_cost_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_items_account_sku_unique UNIQUE (account_id, sku)
);

CREATE TABLE IF NOT EXISTS inventory_consumptions (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) NOT NULL,
  cost_amount NUMERIC(12, 2) NOT NULL CHECK (cost_amount >= 0),
  source_entity_type VARCHAR(50),
  source_entity_id TEXT,
  recorded_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inpatient_progress (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stay_id UUID NOT NULL REFERENCES inpatient_stays(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  note VARCHAR(5000) NOT NULL,
  authored_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surgery_cases (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  procedure_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (
    status IN ('requested', 'scheduled', 'preparation', 'in_progress', 'recovery', 'completed', 'cancelled')
  ),
  surgeon_user_id UUID REFERENCES users(id),
  surgical_team JSONB,
  preparation_notes VARCHAR(2000),
  operative_notes VARCHAR(5000),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS owner_patient_links (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  relationship VARCHAR(50),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT owner_patient_links_owner_patient_unique UNIQUE (owner_id, patient_id)
);

-- Reconcile tables that may already exist in the legacy runtime schema.  The
-- migration validates every textual UUID before casting and validates tenant
-- ownership before adding composite foreign keys.  Any ambiguous or invalid
-- row aborts the transaction with an actionable error; no row is discarded or
-- assigned to a fallback account.
--
-- Existing FORCE RLS policies must not hide rows from a non-superuser schema
-- owner while it validates the complete dataset.  These flags are restored at
-- the end of the same transaction; an error rolls the temporary change back.
ALTER TABLE accounts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE users NO FORCE ROW LEVEL SECURITY;
ALTER TABLE owners NO FORCE ROW LEVEL SECURITY;
ALTER TABLE patients NO FORCE ROW LEVEL SECURITY;
ALTER TABLE encounters NO FORCE ROW LEVEL SECURITY;
ALTER TABLE inpatient_stays NO FORCE ROW LEVEL SECURITY;
ALTER TABLE access_teams NO FORCE ROW LEVEL SECURITY;
ALTER TABLE access_sectors NO FORCE ROW LEVEL SECURITY;
ALTER TABLE access_team_memberships NO FORCE ROW LEVEL SECURITY;
ALTER TABLE access_sector_memberships NO FORCE ROW LEVEL SECURITY;
ALTER TABLE access_user_permissions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE access_team_permissions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE access_sector_permissions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE finance_cost_centers NO FORCE ROW LEVEL SECURITY;
ALTER TABLE finance_expense_catalog_items NO FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_items NO FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_consumptions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE inpatient_progress NO FORCE ROW LEVEL SECURITY;
ALTER TABLE surgery_cases NO FORCE ROW LEVEL SECURITY;
ALTER TABLE owner_patient_links NO FORCE ROW LEVEL SECURITY;

ALTER TABLE owner_patient_links ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE inpatient_progress ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS surgeon_user_id UUID;
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS surgical_team JSONB;
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS preparation_notes VARCHAR(2000);
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS operative_notes VARCHAR(5000);
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE surgery_cases ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION pg_temp.cvg_0060_convert_uuid_column(
  target_table TEXT,
  target_column TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $migration$
DECLARE
  target_relation REGCLASS;
  target_type REGTYPE;
  invalid_count BIGINT;
  dependency RECORD;
BEGIN
  target_relation := to_regclass(format('%I.%I', current_schema(), target_table));

  IF target_relation IS NULL THEN
    RAISE EXCEPTION '0060 unsafe upgrade: required table % is missing', target_table;
  END IF;

  SELECT attribute.atttypid::regtype
    INTO target_type
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = target_relation
    AND attribute.attname = target_column
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  IF target_type IS NULL THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: required column %.% is missing',
      target_table,
      target_column;
  END IF;

  IF target_type = 'uuid'::regtype THEN
    RETURN;
  END IF;

  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE %I IS NOT NULL AND btrim(%I::text) !~* %L',
    target_table,
    target_column,
    target_column,
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) INTO invalid_count;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: %.% contains % non-UUID %',
      target_table,
      target_column,
      invalid_count,
      CASE WHEN invalid_count = 1 THEN 'value' ELSE 'values' END;
  END IF;

  -- Only foreign keys that depend on this column block a safe type change.
  -- They are rebuilt below after all columns and tenant invariants are checked.
  FOR dependency IN
    SELECT constraint_row.conname
    FROM pg_constraint AS constraint_row
    JOIN pg_attribute AS attribute
      ON attribute.attrelid = constraint_row.conrelid
     AND attribute.attname = target_column
     AND attribute.attnum = ANY (constraint_row.conkey)
    WHERE constraint_row.conrelid = target_relation
      AND constraint_row.contype = 'f'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT %I',
      target_table,
      dependency.conname
    );
  END LOOP;

  EXECUTE format(
    'ALTER TABLE %I ALTER COLUMN %I TYPE UUID USING btrim(%I::text)::uuid',
    target_table,
    target_column,
    target_column
  );
END
$migration$;

CREATE OR REPLACE FUNCTION pg_temp.cvg_0060_replace_constraint(
  target_table TEXT,
  constraint_name TEXT,
  constraint_definition TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $migration$
DECLARE
  target_relation REGCLASS;
BEGIN
  target_relation := to_regclass(format('%I.%I', current_schema(), target_table));

  IF target_relation IS NULL THEN
    RAISE EXCEPTION '0060 unsafe upgrade: required table % is missing', target_table;
  END IF;

  EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', target_table, constraint_name);
  EXECUTE format(
    'ALTER TABLE %I ADD CONSTRAINT %I %s',
    target_table,
    constraint_name,
    constraint_definition
  );
END
$migration$;

-- Access governance legacy columns.
SELECT pg_temp.cvg_0060_convert_uuid_column('access_teams', 'account_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('access_sectors', 'account_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('access_team_memberships', 'user_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('access_sector_memberships', 'user_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('access_user_permissions', 'user_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('access_user_permissions', 'permission_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('access_team_permissions', 'permission_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('access_sector_permissions', 'permission_id');

-- Financial, inventory and advanced-care legacy columns.
SELECT pg_temp.cvg_0060_convert_uuid_column(
  'finance_expense_catalog_items',
  'created_by_user_id'
);
SELECT pg_temp.cvg_0060_convert_uuid_column('inventory_items', 'account_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('inventory_consumptions', 'account_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('inventory_consumptions', 'encounter_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('inventory_consumptions', 'patient_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('inventory_consumptions', 'recorded_by_user_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('inpatient_progress', 'account_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('inpatient_progress', 'stay_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('inpatient_progress', 'encounter_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('inpatient_progress', 'authored_by_user_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('surgery_cases', 'account_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('surgery_cases', 'encounter_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('surgery_cases', 'patient_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('surgery_cases', 'surgeon_user_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('owner_patient_links', 'account_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('owner_patient_links', 'owner_id');
SELECT pg_temp.cvg_0060_convert_uuid_column('owner_patient_links', 'patient_id');

DO $migration$
DECLARE
  invalid_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM access_teams AS team
  LEFT JOIN accounts AS account ON account.id = team.account_id
  WHERE account.id IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: access_teams contains % row(s) with an unknown account_id',
      invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM access_sectors AS sector
  LEFT JOIN accounts AS account ON account.id = sector.account_id
  WHERE account.id IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: access_sectors contains % row(s) with an unknown account_id',
      invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM access_team_memberships AS membership
  LEFT JOIN users AS app_user ON app_user.id = membership.user_id
  LEFT JOIN access_teams AS team ON team.id = membership.team_id
  WHERE app_user.id IS NULL
     OR team.id IS NULL
     OR app_user.account_id <> team.account_id;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: access_team_memberships contains % missing or cross-account relationship(s)',
      invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM access_sector_memberships AS membership
  LEFT JOIN users AS app_user ON app_user.id = membership.user_id
  LEFT JOIN access_sectors AS sector ON sector.id = membership.sector_id
  WHERE app_user.id IS NULL
     OR sector.id IS NULL
     OR app_user.account_id <> sector.account_id;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: access_sector_memberships contains % missing or cross-account relationship(s)',
      invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM (
    SELECT effect FROM access_user_permissions
    UNION ALL SELECT effect FROM access_team_permissions
    UNION ALL SELECT effect FROM access_sector_permissions
  ) AS permission_effects
  WHERE effect NOT IN ('allow', 'deny');
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: access permission tables contain % unsupported effect value(s)',
      invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM owner_patient_links AS link
  LEFT JOIN owners AS owner ON owner.id = link.owner_id
  LEFT JOIN patients AS patient ON patient.id = link.patient_id
  WHERE owner.id IS NULL
     OR patient.id IS NULL
     OR owner.account_id <> patient.account_id
     OR (link.account_id IS NOT NULL AND link.account_id <> owner.account_id);
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: owner_patient_links contains % missing, ambiguous or cross-account relationship(s)',
      invalid_count;
  END IF;

  UPDATE owner_patient_links AS link
  SET account_id = owner.account_id
  FROM owners AS owner
  WHERE owner.id = link.owner_id
    AND link.account_id IS NULL;

  SELECT COUNT(*) INTO invalid_count
  FROM inventory_items AS item
  LEFT JOIN accounts AS account ON account.id = item.account_id
  WHERE account.id IS NULL
     OR item.on_hand_quantity < 0
     OR item.reorder_level < 0
     OR item.unit_cost_amount < 0;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: inventory_items contains % invalid account or negative quantity/cost row(s)',
      invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM inventory_consumptions AS consumption
  LEFT JOIN inventory_items AS item ON item.id = consumption.inventory_item_id
  LEFT JOIN encounters AS encounter ON encounter.id = consumption.encounter_id
  LEFT JOIN patients AS patient ON patient.id = consumption.patient_id
  LEFT JOIN users AS app_user ON app_user.id = consumption.recorded_by_user_id
  WHERE item.id IS NULL
     OR encounter.id IS NULL
     OR patient.id IS NULL
     OR app_user.id IS NULL
     OR item.account_id <> consumption.account_id
     OR encounter.account_id <> consumption.account_id
     OR patient.account_id <> consumption.account_id
     OR app_user.account_id <> consumption.account_id
     OR consumption.quantity <= 0
     OR consumption.cost_amount < 0;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: inventory_consumptions contains % missing, cross-account or invalid quantity/cost row(s)',
      invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM inpatient_progress AS progress
  LEFT JOIN inpatient_stays AS stay ON stay.id = progress.stay_id
  LEFT JOIN encounters AS encounter ON encounter.id = progress.encounter_id
  LEFT JOIN users AS author ON author.id = progress.authored_by_user_id
  WHERE stay.id IS NULL
     OR encounter.id IS NULL
     OR author.id IS NULL
     OR stay.account_id <> encounter.account_id
     OR stay.account_id <> author.account_id
     OR (progress.account_id IS NOT NULL AND progress.account_id <> stay.account_id);
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: inpatient_progress contains % missing, ambiguous or cross-account relationship(s)',
      invalid_count;
  END IF;

  UPDATE inpatient_progress AS progress
  SET account_id = stay.account_id
  FROM inpatient_stays AS stay
  WHERE stay.id = progress.stay_id
    AND progress.account_id IS NULL;

  SELECT COUNT(*) INTO invalid_count
  FROM surgery_cases AS surgery
  LEFT JOIN encounters AS encounter ON encounter.id = surgery.encounter_id
  LEFT JOIN patients AS patient ON patient.id = surgery.patient_id
  LEFT JOIN users AS surgeon ON surgeon.id = surgery.surgeon_user_id
  WHERE encounter.id IS NULL
     OR patient.id IS NULL
     OR encounter.account_id <> surgery.account_id
     OR patient.account_id <> surgery.account_id
     OR (surgery.surgeon_user_id IS NOT NULL AND surgeon.id IS NULL)
     OR (surgeon.id IS NOT NULL AND surgeon.account_id <> surgery.account_id)
     OR surgery.status NOT IN (
       'requested', 'scheduled', 'preparation', 'in_progress',
       'recovery', 'completed', 'cancelled'
     );
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: surgery_cases contains % missing, cross-account or unsupported-status row(s)',
      invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM finance_expense_catalog_items AS expense
  LEFT JOIN finance_cost_centers AS cost_center
    ON cost_center.account_id = expense.account_id
   AND cost_center.code = expense.cost_center_code
  LEFT JOIN users AS creator ON creator.id = expense.created_by_user_id
  WHERE cost_center.code IS NULL
     OR creator.id IS NULL
     OR creator.account_id <> expense.account_id;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      '0060 unsafe upgrade: finance_expense_catalog_items contains % missing or cross-account relationship(s)',
      invalid_count;
  END IF;
END
$migration$;

ALTER TABLE owner_patient_links ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE inpatient_progress ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE inventory_items ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE inventory_items ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE inventory_consumptions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE inpatient_progress ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE surgery_cases ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE surgery_cases ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE owner_patient_links ALTER COLUMN created_at SET DEFAULT NOW();

SELECT pg_temp.cvg_0060_replace_constraint('access_teams', 'access_teams_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_sectors', 'access_sectors_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_team_memberships', 'access_team_memberships_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_team_memberships', 'access_team_memberships_team_id_fkey', 'FOREIGN KEY (team_id) REFERENCES access_teams(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_sector_memberships', 'access_sector_memberships_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_sector_memberships', 'access_sector_memberships_sector_id_fkey', 'FOREIGN KEY (sector_id) REFERENCES access_sectors(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_user_permissions', 'access_user_permissions_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_user_permissions', 'access_user_permissions_permission_id_fkey', 'FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_team_permissions', 'access_team_permissions_team_id_fkey', 'FOREIGN KEY (team_id) REFERENCES access_teams(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_team_permissions', 'access_team_permissions_permission_id_fkey', 'FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_sector_permissions', 'access_sector_permissions_sector_id_fkey', 'FOREIGN KEY (sector_id) REFERENCES access_sectors(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_sector_permissions', 'access_sector_permissions_permission_id_fkey', 'FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('access_user_permissions', 'access_user_permissions_effect_check', 'CHECK (effect IN (''allow'', ''deny''))');
SELECT pg_temp.cvg_0060_replace_constraint('access_team_permissions', 'access_team_permissions_effect_check', 'CHECK (effect IN (''allow'', ''deny''))');
SELECT pg_temp.cvg_0060_replace_constraint('access_sector_permissions', 'access_sector_permissions_effect_check', 'CHECK (effect IN (''allow'', ''deny''))');

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
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_id_account
  ON inventory_items (id, account_id);

SELECT pg_temp.cvg_0060_replace_constraint('owner_patient_links', 'owner_patient_links_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('owner_patient_links', 'owner_patient_links_owner_account_fk', 'FOREIGN KEY (owner_id, account_id) REFERENCES owners(id, account_id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('owner_patient_links', 'owner_patient_links_patient_account_fk', 'FOREIGN KEY (patient_id, account_id) REFERENCES patients(id, account_id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('owner_patient_links', 'owner_patient_links_owner_patient_unique', 'UNIQUE (owner_id, patient_id)');

SELECT pg_temp.cvg_0060_replace_constraint('inventory_items', 'inventory_items_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('inventory_items', 'inventory_items_account_sku_unique', 'UNIQUE (account_id, sku)');
SELECT pg_temp.cvg_0060_replace_constraint('inventory_items', 'inventory_items_on_hand_quantity_check', 'CHECK (on_hand_quantity >= 0)');
SELECT pg_temp.cvg_0060_replace_constraint('inventory_items', 'inventory_items_reorder_level_check', 'CHECK (reorder_level >= 0)');
SELECT pg_temp.cvg_0060_replace_constraint('inventory_items', 'inventory_items_unit_cost_amount_check', 'CHECK (unit_cost_amount >= 0)');

SELECT pg_temp.cvg_0060_replace_constraint('inventory_consumptions', 'inventory_consumptions_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('inventory_consumptions', 'inventory_consumptions_item_account_fk', 'FOREIGN KEY (inventory_item_id, account_id) REFERENCES inventory_items(id, account_id)');
SELECT pg_temp.cvg_0060_replace_constraint('inventory_consumptions', 'inventory_consumptions_encounter_account_fk', 'FOREIGN KEY (encounter_id, account_id) REFERENCES encounters(id, account_id)');
SELECT pg_temp.cvg_0060_replace_constraint('inventory_consumptions', 'inventory_consumptions_patient_account_fk', 'FOREIGN KEY (patient_id, account_id) REFERENCES patients(id, account_id)');
SELECT pg_temp.cvg_0060_replace_constraint('inventory_consumptions', 'inventory_consumptions_user_account_fk', 'FOREIGN KEY (recorded_by_user_id, account_id) REFERENCES users(id, account_id)');
SELECT pg_temp.cvg_0060_replace_constraint('inventory_consumptions', 'inventory_consumptions_quantity_check', 'CHECK (quantity > 0)');
SELECT pg_temp.cvg_0060_replace_constraint('inventory_consumptions', 'inventory_consumptions_cost_amount_check', 'CHECK (cost_amount >= 0)');

SELECT pg_temp.cvg_0060_replace_constraint('inpatient_progress', 'inpatient_progress_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('inpatient_progress', 'inpatient_progress_stay_account_fk', 'FOREIGN KEY (stay_id, account_id) REFERENCES inpatient_stays(id, account_id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('inpatient_progress', 'inpatient_progress_encounter_account_fk', 'FOREIGN KEY (encounter_id, account_id) REFERENCES encounters(id, account_id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('inpatient_progress', 'inpatient_progress_author_account_fk', 'FOREIGN KEY (authored_by_user_id, account_id) REFERENCES users(id, account_id)');

SELECT pg_temp.cvg_0060_replace_constraint('surgery_cases', 'surgery_cases_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('surgery_cases', 'surgery_cases_encounter_account_fk', 'FOREIGN KEY (encounter_id, account_id) REFERENCES encounters(id, account_id) ON DELETE CASCADE');
SELECT pg_temp.cvg_0060_replace_constraint('surgery_cases', 'surgery_cases_patient_account_fk', 'FOREIGN KEY (patient_id, account_id) REFERENCES patients(id, account_id)');
SELECT pg_temp.cvg_0060_replace_constraint('surgery_cases', 'surgery_cases_surgeon_account_fk', 'FOREIGN KEY (surgeon_user_id, account_id) REFERENCES users(id, account_id)');
SELECT pg_temp.cvg_0060_replace_constraint('surgery_cases', 'surgery_cases_status_check', 'CHECK (status IN (''requested'', ''scheduled'', ''preparation'', ''in_progress'', ''recovery'', ''completed'', ''cancelled''))');

SELECT pg_temp.cvg_0060_replace_constraint('finance_expense_catalog_items', 'finance_expenses_created_by_account_fk', 'FOREIGN KEY (created_by_user_id, account_id) REFERENCES users(id, account_id)');

CREATE INDEX IF NOT EXISTS idx_access_user_permissions_user
  ON access_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_access_user_permissions_permission
  ON access_user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_access_team_permissions_team
  ON access_team_permissions(team_id);
CREATE INDEX IF NOT EXISTS idx_access_team_permissions_permission
  ON access_team_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_access_sector_permissions_sector
  ON access_sector_permissions(sector_id);
CREATE INDEX IF NOT EXISTS idx_access_sector_permissions_permission
  ON access_sector_permissions(permission_id);

ALTER TABLE accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE owners FORCE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;
ALTER TABLE encounters FORCE ROW LEVEL SECURITY;
ALTER TABLE inpatient_stays FORCE ROW LEVEL SECURITY;

-- Directly tenant-owned tables.
ALTER TABLE access_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_teams FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_teams_tenant_isolation ON access_teams;
CREATE POLICY access_teams_tenant_isolation ON access_teams FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE access_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_sectors FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_sectors_tenant_isolation ON access_sectors;
CREATE POLICY access_sectors_tenant_isolation ON access_sectors FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE counter_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_sales FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS counter_sales_tenant_isolation ON counter_sales;
CREATE POLICY counter_sales_tenant_isolation ON counter_sales FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE counter_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_sale_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS counter_sale_items_tenant_isolation ON counter_sale_items;
CREATE POLICY counter_sale_items_tenant_isolation ON counter_sale_items FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE counter_sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_sale_payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS counter_sale_payments_tenant_isolation ON counter_sale_payments;
CREATE POLICY counter_sale_payments_tenant_isolation ON counter_sale_payments FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotes_tenant_isolation ON quotes;
CREATE POLICY quotes_tenant_isolation ON quotes FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quote_items_tenant_isolation ON quote_items;
CREATE POLICY quote_items_tenant_isolation ON quote_items FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE finance_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_cost_centers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_cost_centers_tenant_isolation ON finance_cost_centers;
CREATE POLICY finance_cost_centers_tenant_isolation ON finance_cost_centers FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE finance_expense_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expense_catalog_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_expense_catalog_items_tenant_isolation ON finance_expense_catalog_items;
CREATE POLICY finance_expense_catalog_items_tenant_isolation ON finance_expense_catalog_items FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_items_tenant_isolation ON inventory_items;
CREATE POLICY inventory_items_tenant_isolation ON inventory_items FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE inventory_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_consumptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_consumptions_tenant_isolation ON inventory_consumptions;
CREATE POLICY inventory_consumptions_tenant_isolation ON inventory_consumptions FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE inpatient_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE inpatient_progress FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inpatient_progress_tenant_isolation ON inpatient_progress;
CREATE POLICY inpatient_progress_tenant_isolation ON inpatient_progress FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE surgery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgery_cases FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS surgery_cases_tenant_isolation ON surgery_cases;
CREATE POLICY surgery_cases_tenant_isolation ON surgery_cases FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());
ALTER TABLE owner_patient_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_patient_links FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_patient_links_tenant_isolation ON owner_patient_links;
CREATE POLICY owner_patient_links_tenant_isolation ON owner_patient_links FOR ALL
  USING (account_id = app.current_account_id()) WITH CHECK (account_id = app.current_account_id());

-- Relationship tables derive their tenant through the secured parent row.
ALTER TABLE access_team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_team_memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_team_memberships_tenant_isolation ON access_team_memberships;
CREATE POLICY access_team_memberships_tenant_isolation ON access_team_memberships FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.account_id = app.current_account_id())
    AND EXISTS (SELECT 1 FROM access_teams t WHERE t.id = team_id AND t.account_id = app.current_account_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.account_id = app.current_account_id())
    AND EXISTS (SELECT 1 FROM access_teams t WHERE t.id = team_id AND t.account_id = app.current_account_id())
  );
ALTER TABLE access_sector_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_sector_memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_sector_memberships_tenant_isolation ON access_sector_memberships;
CREATE POLICY access_sector_memberships_tenant_isolation ON access_sector_memberships FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.account_id = app.current_account_id())
    AND EXISTS (SELECT 1 FROM access_sectors s WHERE s.id = sector_id AND s.account_id = app.current_account_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.account_id = app.current_account_id())
    AND EXISTS (SELECT 1 FROM access_sectors s WHERE s.id = sector_id AND s.account_id = app.current_account_id())
  );
ALTER TABLE access_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_user_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_user_permissions_tenant_isolation ON access_user_permissions;
CREATE POLICY access_user_permissions_tenant_isolation ON access_user_permissions FOR ALL
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.account_id = app.current_account_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.account_id = app.current_account_id()));
ALTER TABLE access_team_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_team_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_team_permissions_tenant_isolation ON access_team_permissions;
CREATE POLICY access_team_permissions_tenant_isolation ON access_team_permissions FOR ALL
  USING (EXISTS (SELECT 1 FROM access_teams t WHERE t.id = team_id AND t.account_id = app.current_account_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM access_teams t WHERE t.id = team_id AND t.account_id = app.current_account_id()));
ALTER TABLE access_sector_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_sector_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_sector_permissions_tenant_isolation ON access_sector_permissions;
CREATE POLICY access_sector_permissions_tenant_isolation ON access_sector_permissions FOR ALL
  USING (EXISTS (SELECT 1 FROM access_sectors s WHERE s.id = sector_id AND s.account_id = app.current_account_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM access_sectors s WHERE s.id = sector_id AND s.account_id = app.current_account_id()));
