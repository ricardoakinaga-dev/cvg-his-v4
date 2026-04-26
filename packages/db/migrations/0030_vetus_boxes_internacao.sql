-- Vetus parity: Atendimento > Cadastros > Boxes de Internacao
-- Adds the sector/box catalog expected by the current inpatient module while
-- keeping compatibility with legacy wards/beds rows.

CREATE TABLE IF NOT EXISTS sectors (
  id varchar(255) PRIMARY KEY,
  account_id varchar(255) NOT NULL,
  code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  kind varchar(50) NOT NULL DEFAULT 'other',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO sectors (id, account_id, code, name, kind, active, created_at, updated_at)
SELECT
  w.id::text,
  w.account_id::text,
  COALESCE(NULLIF(w.code, ''), LEFT(w.id::text, 8)),
  w.name,
  'observation',
  w.is_active,
  w.created_at,
  w.updated_at
FROM wards w
ON CONFLICT (id) DO UPDATE SET
  account_id = EXCLUDED.account_id,
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  updated_at = EXCLUDED.updated_at;

ALTER TABLE beds
  ADD COLUMN IF NOT EXISTS sector_id varchar(255),
  ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS supports_species varchar(100),
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

UPDATE beds
SET
  sector_id = COALESCE(sector_id, ward_id::text),
  code = COALESCE(NULLIF(code, ''), LEFT(id::text, 8)),
  active = is_active
WHERE sector_id IS NULL OR code IS NULL OR active IS DISTINCT FROM is_active;

ALTER TABLE beds
  ALTER COLUMN ward_id DROP NOT NULL,
  ALTER COLUMN sector_id SET NOT NULL,
  ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'beds_sector_id_sectors_id_fk'
  ) THEN
    ALTER TABLE beds
      ADD CONSTRAINT beds_sector_id_sectors_id_fk
      FOREIGN KEY (sector_id) REFERENCES sectors(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sectors_account_active
  ON sectors (account_id, active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sectors_account_code_unique
  ON sectors (account_id, code);

CREATE INDEX IF NOT EXISTS idx_beds_account_sector_active
  ON beds (account_id, sector_id, active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_beds_account_sector_code_unique
  ON beds (account_id, sector_id, code);

ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sectors_tenant_isolation ON sectors;
CREATE POLICY sectors_tenant_isolation ON sectors
  USING (account_id::uuid = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id::uuid = current_setting('app.current_account_id', true)::uuid);
