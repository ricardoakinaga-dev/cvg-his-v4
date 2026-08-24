-- Fecha a fronteira de autoridade das comissões.
-- A migration 0130 fornece professions e o vínculo tenant-safe em staff.
-- PostgreSQL não possui ADD CONSTRAINT IF NOT EXISTS. Os blocos abaixo preservam
-- uma constraint já criada e adicionam apenas o que estiver ausente, permitindo
-- replay após falha parcial sem rebaixar uma constraint validada para NOT VALID.

ALTER TABLE commission_rules
  DROP CONSTRAINT IF EXISTS commission_rules_staff_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_rules_account_staff_fk'
       AND conrelid = 'commission_rules'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE commission_rules
      ADD CONSTRAINT commission_rules_account_staff_fk
      FOREIGN KEY (account_id, staff_id)
      REFERENCES staff(account_id, id)
      ON DELETE RESTRICT
      NOT VALID';
  END IF;
END
$$;

ALTER TABLE commission_lines
  ADD COLUMN IF NOT EXISTS profession_id UUID;

ALTER TABLE commission_lines
  ADD COLUMN IF NOT EXISTS profession_name TEXT;

ALTER TABLE commission_lines
  DROP CONSTRAINT IF EXISTS commission_lines_staff_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_lines_staff_account_fk'
       AND conrelid = 'commission_lines'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE commission_lines
      ADD CONSTRAINT commission_lines_staff_account_fk
      FOREIGN KEY (account_id, staff_id)
      REFERENCES staff(account_id, id)
      ON DELETE RESTRICT
      NOT VALID';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_lines_profession_account_fk'
       AND conrelid = 'commission_lines'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE commission_lines
      ADD CONSTRAINT commission_lines_profession_account_fk
      FOREIGN KEY (account_id, profession_id)
      REFERENCES professions(account_id, id)
      ON DELETE RESTRICT
      NOT VALID';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_commission_lines_account_profession
  ON commission_lines(account_id, profession_id)
  WHERE profession_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commission_lines_account_billing_source_unique
  ON commission_lines(account_id, source_id)
  WHERE source_type = 'billing_item';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_calculations_paid_payable_chk'
       AND conrelid = 'commission_calculations'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE commission_calculations
      ADD CONSTRAINT commission_calculations_paid_payable_chk
      CHECK (status <> ''paid'' OR payable_id IS NOT NULL)
      NOT VALID';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION app.guard_commission_line_authority()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app
AS $$
DECLARE
  staff_row staff%ROWTYPE;
  profession_row professions%ROWTYPE;
  billing_row RECORD;
BEGIN
  SELECT *
    INTO staff_row
    FROM staff
   WHERE account_id = NEW.account_id
     AND id = NEW.staff_id;

  IF NOT FOUND OR staff_row.is_active IS NOT TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'commission line requires an active staff member in the same account';
  END IF;

  IF NEW.staff_name IS DISTINCT FROM staff_row.full_name
     OR NEW.department IS DISTINCT FROM staff_row.department
     OR NEW.job_title IS DISTINCT FROM staff_row.job_title THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'commission line staff snapshot must match authoritative staff';
  END IF;

  IF staff_row.profession_id IS NOT NULL THEN
    SELECT *
      INTO profession_row
      FROM professions
     WHERE account_id = NEW.account_id
       AND id = staff_row.profession_id;

    IF NOT FOUND OR profession_row.is_active IS NOT TRUE THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'commission line requires an active profession';
    END IF;

    IF NEW.profession_id IS DISTINCT FROM staff_row.profession_id
       OR NEW.profession_name IS DISTINCT FROM profession_row.name THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'commission line profession snapshot must match authoritative profession';
    END IF;
  ELSIF NEW.profession_id IS NOT NULL OR NEW.profession_name IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'commission line cannot invent a profession for staff without one';
  END IF;

  IF NEW.source_type = 'billing_item' THEN
    SELECT bi.total_amount,
           bi.description,
           bi.created_at,
           br.status,
           CASE bi.item_type
             WHEN 'service' THEN 'service'
             WHEN 'supply' THEN 'product'
             WHEN 'procedure' THEN 'procedure'
             WHEN 'exam' THEN 'exam'
             ELSE 'other'
           END AS item_kind
      INTO billing_row
      FROM billing_items AS bi
      JOIN billing_records AS br
        ON br.account_id = bi.account_id
       AND br.id = bi.billing_record_id
     WHERE bi.account_id = NEW.account_id
       AND bi.id::text = NEW.source_id;

    IF NOT FOUND OR billing_row.status <> 'settled' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'commission billing source must belong to the account and be settled';
    END IF;

    IF NEW.base_amount IS DISTINCT FROM billing_row.total_amount
       OR NEW.source_description IS DISTINCT FROM billing_row.description
       OR NEW.item_kind IS DISTINCT FROM billing_row.item_kind
       OR NEW.occurred_at IS DISTINCT FROM (billing_row.created_at AT TIME ZONE 'UTC')::date THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'commission billing source snapshot must match settled billing item';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS commission_lines_authority_guard ON commission_lines;
CREATE TRIGGER commission_lines_authority_guard
  BEFORE INSERT OR UPDATE ON commission_lines
  FOR EACH ROW
  EXECUTE FUNCTION app.guard_commission_line_authority();

COMMENT ON COLUMN commission_lines.profession_id IS
  'Tenant-safe authoritative profession snapshot used for commission eligibility.';
COMMENT ON COLUMN commission_lines.profession_name IS
  'Profession label copied from the authoritative profession registry.';
COMMENT ON INDEX commission_lines_account_billing_source_unique IS
  'A settled billing item can contribute to at most one commission line per account.';
