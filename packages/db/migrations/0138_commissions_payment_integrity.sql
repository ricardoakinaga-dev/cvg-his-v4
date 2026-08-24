-- Make commission payment creation durable, replay-safe and tenant-scoped.
-- 0131 added the first authority guards. This sequential migration completes
-- validation and replaces remaining single-column commission references with
-- composite account-aware constraints.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM financial_payables
     WHERE source_expense_id IS NOT NULL
     GROUP BY account_id, source_expense_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot install commission payable idempotency: duplicate account/source_expense_id rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_rules AS rule
      LEFT JOIN staff AS staff
        ON staff.account_id = rule.account_id
       AND staff.id = rule.staff_id
     WHERE rule.staff_id IS NOT NULL
       AND staff.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission rule staff authority across accounts';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_rules AS rule
      LEFT JOIN users AS creator
        ON creator.account_id = rule.account_id
       AND creator.id = rule.created_by_user_id
     WHERE creator.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission rule creator authority across accounts';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_calculations AS calculation
      LEFT JOIN users AS creator
        ON creator.account_id = calculation.account_id
       AND creator.id = calculation.created_by_user_id
     WHERE creator.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission calculation creator authority across accounts';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_calculations AS calculation
      LEFT JOIN users AS reviewer
        ON reviewer.account_id = calculation.account_id
       AND reviewer.id = calculation.reviewed_by_user_id
     WHERE calculation.reviewed_by_user_id IS NOT NULL
       AND reviewer.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission calculation reviewer authority across accounts';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_calculations AS calculation
      LEFT JOIN users AS payer
        ON payer.account_id = calculation.account_id
       AND payer.id = calculation.paid_by_user_id
     WHERE calculation.paid_by_user_id IS NOT NULL
       AND payer.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission calculation payer authority across accounts';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_calculations AS calculation
      LEFT JOIN users AS canceller
        ON canceller.account_id = calculation.account_id
       AND canceller.id = calculation.cancelled_by_user_id
     WHERE calculation.cancelled_by_user_id IS NOT NULL
       AND canceller.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission calculation canceller authority across accounts';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_calculations AS calculation
      LEFT JOIN financial_payables AS payable
        ON payable.account_id = calculation.account_id
       AND payable.id = calculation.payable_id
     WHERE calculation.payable_id IS NOT NULL
       AND payable.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission calculation payable ownership across accounts';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_lines AS line
      LEFT JOIN commission_calculations AS calculation
        ON calculation.account_id = line.account_id
       AND calculation.id = line.calculation_id
     WHERE calculation.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission line calculation ownership across accounts';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_lines AS line
      LEFT JOIN commission_rules AS rule
        ON rule.account_id = line.account_id
       AND rule.id = line.rule_id
     WHERE line.rule_id IS NOT NULL
       AND rule.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission line rule ownership across accounts';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_lines AS line
      LEFT JOIN staff AS staff
        ON staff.account_id = line.account_id
       AND staff.id = line.staff_id
     WHERE staff.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission line staff authority across accounts';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM commission_lines AS line
      LEFT JOIN professions AS profession
        ON profession.account_id = line.account_id
       AND profession.id = line.profession_id
     WHERE line.profession_id IS NOT NULL
       AND profession.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate commission line profession authority across accounts';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS financial_payables_account_source_expense_unique
  ON financial_payables (account_id, source_expense_id)
  WHERE source_expense_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commission_rules_account_id_unique
  ON commission_rules (account_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS commission_calculations_account_id_unique
  ON commission_calculations (account_id, id);

-- The original commission migration created single-column references. They
-- remain valid for same-tenant data but cannot enforce tenant ownership.
ALTER TABLE commission_rules
  DROP CONSTRAINT IF EXISTS commission_rules_staff_id_fkey,
  DROP CONSTRAINT IF EXISTS commission_rules_created_by_user_id_fkey;

ALTER TABLE commission_calculations
  DROP CONSTRAINT IF EXISTS commission_calculations_created_by_user_id_fkey,
  DROP CONSTRAINT IF EXISTS commission_calculations_reviewed_by_user_id_fkey,
  DROP CONSTRAINT IF EXISTS commission_calculations_paid_by_user_id_fkey,
  DROP CONSTRAINT IF EXISTS commission_calculations_cancelled_by_user_id_fkey;

ALTER TABLE commission_lines
  DROP CONSTRAINT IF EXISTS commission_lines_calculation_id_fkey,
  DROP CONSTRAINT IF EXISTS commission_lines_rule_id_fkey,
  DROP CONSTRAINT IF EXISTS commission_lines_staff_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_rules_account_staff_fk'
       AND conrelid = 'commission_rules'::regclass
  ) THEN
    ALTER TABLE commission_rules
      ADD CONSTRAINT commission_rules_account_staff_fk
      FOREIGN KEY (account_id, staff_id)
      REFERENCES staff(account_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_rules_account_creator_fk'
       AND conrelid = 'commission_rules'::regclass
  ) THEN
    ALTER TABLE commission_rules
      ADD CONSTRAINT commission_rules_account_creator_fk
      FOREIGN KEY (account_id, created_by_user_id)
      REFERENCES users(account_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_calculations_account_creator_fk'
       AND conrelid = 'commission_calculations'::regclass
  ) THEN
    ALTER TABLE commission_calculations
      ADD CONSTRAINT commission_calculations_account_creator_fk
      FOREIGN KEY (account_id, created_by_user_id)
      REFERENCES users(account_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_calculations_account_reviewer_fk'
       AND conrelid = 'commission_calculations'::regclass
  ) THEN
    ALTER TABLE commission_calculations
      ADD CONSTRAINT commission_calculations_account_reviewer_fk
      FOREIGN KEY (account_id, reviewed_by_user_id)
      REFERENCES users(account_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_calculations_account_payer_fk'
       AND conrelid = 'commission_calculations'::regclass
  ) THEN
    ALTER TABLE commission_calculations
      ADD CONSTRAINT commission_calculations_account_payer_fk
      FOREIGN KEY (account_id, paid_by_user_id)
      REFERENCES users(account_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_calculations_account_canceller_fk'
       AND conrelid = 'commission_calculations'::regclass
  ) THEN
    ALTER TABLE commission_calculations
      ADD CONSTRAINT commission_calculations_account_canceller_fk
      FOREIGN KEY (account_id, cancelled_by_user_id)
      REFERENCES users(account_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_calculations_account_payable_fk'
       AND conrelid = 'commission_calculations'::regclass
  ) THEN
    ALTER TABLE commission_calculations
      ADD CONSTRAINT commission_calculations_account_payable_fk
      FOREIGN KEY (account_id, payable_id)
      REFERENCES financial_payables(account_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_lines_account_calculation_fk'
       AND conrelid = 'commission_lines'::regclass
  ) THEN
    ALTER TABLE commission_lines
      ADD CONSTRAINT commission_lines_account_calculation_fk
      FOREIGN KEY (account_id, calculation_id)
      REFERENCES commission_calculations(account_id, id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_lines_account_rule_fk'
       AND conrelid = 'commission_lines'::regclass
  ) THEN
    ALTER TABLE commission_lines
      ADD CONSTRAINT commission_lines_account_rule_fk
      FOREIGN KEY (account_id, rule_id)
      REFERENCES commission_rules(account_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

-- 0131 names the authority FK differently. Keep its established name and
-- validate it here, while the remaining calculation/rule FKs are introduced
-- with the explicit account-prefixed names above.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_lines_staff_account_fk'
       AND conrelid = 'commission_lines'::regclass
  ) THEN
    ALTER TABLE commission_lines
      ADD CONSTRAINT commission_lines_staff_account_fk
      FOREIGN KEY (account_id, staff_id)
      REFERENCES staff(account_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
     WHERE conname = 'commission_lines_profession_account_fk'
       AND conrelid = 'commission_lines'::regclass
  ) THEN
    ALTER TABLE commission_lines
      ADD CONSTRAINT commission_lines_profession_account_fk
      FOREIGN KEY (account_id, profession_id)
      REFERENCES professions(account_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

ALTER TABLE commission_rules
  VALIDATE CONSTRAINT commission_rules_account_staff_fk,
  VALIDATE CONSTRAINT commission_rules_account_creator_fk;

ALTER TABLE commission_calculations
  VALIDATE CONSTRAINT commission_calculations_account_creator_fk,
  VALIDATE CONSTRAINT commission_calculations_account_reviewer_fk,
  VALIDATE CONSTRAINT commission_calculations_account_payer_fk,
  VALIDATE CONSTRAINT commission_calculations_account_canceller_fk,
  VALIDATE CONSTRAINT commission_calculations_account_payable_fk,
  VALIDATE CONSTRAINT commission_calculations_paid_payable_chk;

ALTER TABLE commission_lines
  VALIDATE CONSTRAINT commission_lines_account_calculation_fk,
  VALIDATE CONSTRAINT commission_lines_account_rule_fk,
  VALIDATE CONSTRAINT commission_lines_staff_account_fk,
  VALIDATE CONSTRAINT commission_lines_profession_account_fk;

COMMENT ON INDEX financial_payables_account_source_expense_unique IS
  'At most one payable may be created for a tenant-scoped source expense, including a commission calculation.';
