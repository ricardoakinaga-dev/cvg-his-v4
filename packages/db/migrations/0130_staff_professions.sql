-- Cadastro mestre de profissões e vínculo tenant-safe com profissionais.

CREATE TABLE IF NOT EXISTS professions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT professions_account_id_id_unique UNIQUE (account_id, id),
  CONSTRAINT professions_account_code_unique UNIQUE (account_id, code),
  CONSTRAINT professions_account_name_unique UNIQUE (account_id, name)
);

CREATE INDEX IF NOT EXISTS idx_professions_account_active
  ON professions(account_id, is_active, name);

ALTER TABLE professions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS professions_tenant_isolation ON professions;
CREATE POLICY professions_tenant_isolation ON professions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE staff ADD COLUMN IF NOT EXISTS profession_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_staff_account_id
  ON staff(account_id, id);
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_account_profession_fk;
ALTER TABLE staff
  ADD CONSTRAINT staff_account_profession_fk
  FOREIGN KEY (account_id, profession_id)
  REFERENCES professions(account_id, id)
  ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_staff_account_profession
  ON staff(account_id, profession_id);

CREATE OR REPLACE FUNCTION app.enforce_active_staff_profession()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app
AS $$
BEGIN
  IF NEW.profession_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.profession_id IS NOT DISTINCT FROM OLD.profession_id THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM professions p
     WHERE p.account_id = NEW.account_id
       AND p.id = NEW.profession_id
       AND p.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'staff profession must be active and belong to the same account';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_profession_active_guard ON staff;
CREATE TRIGGER staff_profession_active_guard
  BEFORE INSERT OR UPDATE OF account_id, profession_id ON staff
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_active_staff_profession();

COMMENT ON TABLE professions IS
  'Cadastro mestre tenant-scoped de profissões usado por profissionais, agenda e comissões.';
COMMENT ON COLUMN staff.profession_id IS
  'Vínculo opcional ao cadastro mestre de profissões; job_title permanece como texto legado.';
