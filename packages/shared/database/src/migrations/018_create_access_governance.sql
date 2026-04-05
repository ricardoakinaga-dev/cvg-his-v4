-- Migration 018: Enterprise organizational access governance

CREATE TABLE IF NOT EXISTS access_teams (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT access_teams_account_code_unique UNIQUE (account_id, code)
);

CREATE INDEX IF NOT EXISTS idx_access_teams_account ON access_teams(account_id);

CREATE TABLE IF NOT EXISTS access_sectors (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT access_sectors_account_code_unique UNIQUE (account_id, code)
);

CREATE INDEX IF NOT EXISTS idx_access_sectors_account ON access_sectors(account_id);

CREATE TABLE IF NOT EXISTS access_team_memberships (
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id VARCHAR(255) NOT NULL REFERENCES access_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_access_team_memberships_user ON access_team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_access_team_memberships_team ON access_team_memberships(team_id);

CREATE TABLE IF NOT EXISTS access_sector_memberships (
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sector_id VARCHAR(255) NOT NULL REFERENCES access_sectors(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, sector_id)
);

CREATE INDEX IF NOT EXISTS idx_access_sector_memberships_user ON access_sector_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_access_sector_memberships_sector ON access_sector_memberships(sector_id);

CREATE TABLE IF NOT EXISTS access_user_permissions (
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id VARCHAR(255) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE IF NOT EXISTS access_team_permissions (
  team_id VARCHAR(255) NOT NULL REFERENCES access_teams(id) ON DELETE CASCADE,
  permission_id VARCHAR(255) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, permission_id)
);

CREATE TABLE IF NOT EXISTS access_sector_permissions (
  sector_id VARCHAR(255) NOT NULL REFERENCES access_sectors(id) ON DELETE CASCADE,
  permission_id VARCHAR(255) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sector_id, permission_id)
);
