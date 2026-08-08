CREATE TABLE IF NOT EXISTS access_teams (
  id varchar(255) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code varchar(100) NOT NULL,
  name varchar(150) NOT NULL,
  description varchar(500),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_teams_account_code_unique UNIQUE (account_id, code)
);

CREATE TABLE IF NOT EXISTS access_sectors (
  id varchar(255) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code varchar(100) NOT NULL,
  name varchar(150) NOT NULL,
  description varchar(500),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_sectors_account_code_unique UNIQUE (account_id, code)
);

CREATE TABLE IF NOT EXISTS access_team_memberships (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id varchar(255) NOT NULL REFERENCES access_teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);

CREATE TABLE IF NOT EXISTS access_sector_memberships (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sector_id varchar(255) NOT NULL REFERENCES access_sectors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sector_id)
);

CREATE TABLE IF NOT EXISTS access_user_permissions (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect varchar(16) NOT NULL CONSTRAINT access_user_permissions_effect_chk CHECK (effect IN ('allow', 'deny')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE IF NOT EXISTS access_team_permissions (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  team_id varchar(255) NOT NULL REFERENCES access_teams(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect varchar(16) NOT NULL CONSTRAINT access_team_permissions_effect_chk CHECK (effect IN ('allow', 'deny')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, permission_id)
);

CREATE TABLE IF NOT EXISTS access_sector_permissions (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sector_id varchar(255) NOT NULL REFERENCES access_sectors(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect varchar(16) NOT NULL CONSTRAINT access_sector_permissions_effect_chk CHECK (effect IN ('allow', 'deny')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sector_id, permission_id)
);

ALTER TABLE access_teams
  ALTER COLUMN account_id TYPE uuid USING account_id::text::uuid;
ALTER TABLE access_sectors
  ALTER COLUMN account_id TYPE uuid USING account_id::text::uuid;

ALTER TABLE access_team_memberships ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE access_sector_memberships ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE access_user_permissions ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE access_team_permissions ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE access_sector_permissions ADD COLUMN IF NOT EXISTS account_id uuid;

ALTER TABLE access_team_memberships
  ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;
ALTER TABLE access_sector_memberships
  ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;
ALTER TABLE access_user_permissions
  ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid,
  ALTER COLUMN permission_id TYPE uuid USING permission_id::text::uuid;
ALTER TABLE access_team_permissions
  ALTER COLUMN permission_id TYPE uuid USING permission_id::text::uuid;
ALTER TABLE access_sector_permissions
  ALTER COLUMN permission_id TYPE uuid USING permission_id::text::uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_user_permissions_effect_chk') THEN
    ALTER TABLE access_user_permissions
      ADD CONSTRAINT access_user_permissions_effect_chk CHECK (effect IN ('allow', 'deny'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_team_permissions_effect_chk') THEN
    ALTER TABLE access_team_permissions
      ADD CONSTRAINT access_team_permissions_effect_chk CHECK (effect IN ('allow', 'deny'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_sector_permissions_effect_chk') THEN
    ALTER TABLE access_sector_permissions
      ADD CONSTRAINT access_sector_permissions_effect_chk CHECK (effect IN ('allow', 'deny'));
  END IF;
END $$;

UPDATE access_team_memberships AS membership
SET account_id = user_record.account_id
FROM users AS user_record, access_teams AS team
WHERE membership.user_id = user_record.id
  AND membership.team_id = team.id
  AND user_record.account_id = team.account_id
  AND membership.account_id IS NULL;

UPDATE access_sector_memberships AS membership
SET account_id = user_record.account_id
FROM users AS user_record, access_sectors AS sector
WHERE membership.user_id = user_record.id
  AND membership.sector_id = sector.id
  AND user_record.account_id = sector.account_id
  AND membership.account_id IS NULL;

UPDATE access_user_permissions AS assignment
SET account_id = user_record.account_id
FROM users AS user_record
WHERE assignment.user_id = user_record.id
  AND assignment.account_id IS NULL;

UPDATE access_team_permissions AS assignment
SET account_id = team.account_id
FROM access_teams AS team
WHERE assignment.team_id = team.id
  AND assignment.account_id IS NULL;

UPDATE access_sector_permissions AS assignment
SET account_id = sector.account_id
FROM access_sectors AS sector
WHERE assignment.sector_id = sector.id
  AND assignment.account_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM access_team_memberships WHERE account_id IS NULL) OR
     EXISTS (SELECT 1 FROM access_sector_memberships WHERE account_id IS NULL) OR
     EXISTS (SELECT 1 FROM access_user_permissions WHERE account_id IS NULL) OR
     EXISTS (SELECT 1 FROM access_team_permissions WHERE account_id IS NULL) OR
     EXISTS (SELECT 1 FROM access_sector_permissions WHERE account_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot scope access governance rows: orphan or cross-account relationship detected';
  END IF;
END $$;

ALTER TABLE access_team_memberships ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE access_sector_memberships ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE access_user_permissions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE access_team_permissions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE access_sector_permissions ALTER COLUMN account_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_access_teams_account ON access_teams(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_teams_code_unique ON access_teams(account_id, code);
CREATE INDEX IF NOT EXISTS idx_access_sectors_account ON access_sectors(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_sectors_code_unique ON access_sectors(account_id, code);
CREATE INDEX IF NOT EXISTS idx_access_team_memberships_account ON access_team_memberships(account_id);
CREATE INDEX IF NOT EXISTS idx_access_team_memberships_user ON access_team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_access_team_memberships_team ON access_team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_access_sector_memberships_account ON access_sector_memberships(account_id);
CREATE INDEX IF NOT EXISTS idx_access_sector_memberships_user ON access_sector_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_access_sector_memberships_sector ON access_sector_memberships(sector_id);
CREATE INDEX IF NOT EXISTS idx_access_user_permissions_account ON access_user_permissions(account_id);
CREATE INDEX IF NOT EXISTS idx_access_team_permissions_account ON access_team_permissions(account_id);
CREATE INDEX IF NOT EXISTS idx_access_sector_permissions_account ON access_sector_permissions(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_account_id_id_unique ON users(account_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_teams_account_id_id_unique ON access_teams(account_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_sectors_account_id_id_unique ON access_sectors(account_id, id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_team_memberships_account_id_accounts_id_fk'
  ) THEN
    ALTER TABLE access_team_memberships
      ADD CONSTRAINT access_team_memberships_account_id_accounts_id_fk
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_team_memberships_account_user_fk'
  ) THEN
    ALTER TABLE access_team_memberships
      ADD CONSTRAINT access_team_memberships_account_user_fk
      FOREIGN KEY (account_id, user_id) REFERENCES users(account_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_team_memberships_account_team_fk'
  ) THEN
    ALTER TABLE access_team_memberships
      ADD CONSTRAINT access_team_memberships_account_team_fk
      FOREIGN KEY (account_id, team_id) REFERENCES access_teams(account_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_sector_memberships_account_id_accounts_id_fk'
  ) THEN
    ALTER TABLE access_sector_memberships
      ADD CONSTRAINT access_sector_memberships_account_id_accounts_id_fk
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_sector_memberships_account_user_fk'
  ) THEN
    ALTER TABLE access_sector_memberships
      ADD CONSTRAINT access_sector_memberships_account_user_fk
      FOREIGN KEY (account_id, user_id) REFERENCES users(account_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_sector_memberships_account_sector_fk'
  ) THEN
    ALTER TABLE access_sector_memberships
      ADD CONSTRAINT access_sector_memberships_account_sector_fk
      FOREIGN KEY (account_id, sector_id) REFERENCES access_sectors(account_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_user_permissions_account_id_accounts_id_fk'
  ) THEN
    ALTER TABLE access_user_permissions
      ADD CONSTRAINT access_user_permissions_account_id_accounts_id_fk
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_user_permissions_account_user_fk'
  ) THEN
    ALTER TABLE access_user_permissions
      ADD CONSTRAINT access_user_permissions_account_user_fk
      FOREIGN KEY (account_id, user_id) REFERENCES users(account_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_team_permissions_account_id_accounts_id_fk'
  ) THEN
    ALTER TABLE access_team_permissions
      ADD CONSTRAINT access_team_permissions_account_id_accounts_id_fk
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_team_permissions_account_team_fk'
  ) THEN
    ALTER TABLE access_team_permissions
      ADD CONSTRAINT access_team_permissions_account_team_fk
      FOREIGN KEY (account_id, team_id) REFERENCES access_teams(account_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_sector_permissions_account_id_accounts_id_fk'
  ) THEN
    ALTER TABLE access_sector_permissions
      ADD CONSTRAINT access_sector_permissions_account_id_accounts_id_fk
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_sector_permissions_account_sector_fk'
  ) THEN
    ALTER TABLE access_sector_permissions
      ADD CONSTRAINT access_sector_permissions_account_sector_fk
      FOREIGN KEY (account_id, sector_id) REFERENCES access_sectors(account_id, id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE access_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_sector_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_team_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_sector_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS access_teams_tenant_isolation ON access_teams;
CREATE POLICY access_teams_tenant_isolation ON access_teams
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

DROP POLICY IF EXISTS access_sectors_tenant_isolation ON access_sectors;
CREATE POLICY access_sectors_tenant_isolation ON access_sectors
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

DROP POLICY IF EXISTS access_team_memberships_tenant_isolation ON access_team_memberships;
CREATE POLICY access_team_memberships_tenant_isolation ON access_team_memberships
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

DROP POLICY IF EXISTS access_sector_memberships_tenant_isolation ON access_sector_memberships;
CREATE POLICY access_sector_memberships_tenant_isolation ON access_sector_memberships
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

DROP POLICY IF EXISTS access_user_permissions_tenant_isolation ON access_user_permissions;
CREATE POLICY access_user_permissions_tenant_isolation ON access_user_permissions
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

DROP POLICY IF EXISTS access_team_permissions_tenant_isolation ON access_team_permissions;
CREATE POLICY access_team_permissions_tenant_isolation ON access_team_permissions
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

DROP POLICY IF EXISTS access_sector_permissions_tenant_isolation ON access_sector_permissions;
CREATE POLICY access_sector_permissions_tenant_isolation ON access_sector_permissions
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
