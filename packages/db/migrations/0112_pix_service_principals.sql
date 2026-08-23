-- Expand-only identity metadata and tenant-local service-principal mapping for
-- durable PIX settlement. Provisioning remains an explicit operational step:
-- this migration creates no user and no mapping row.

ALTER TABLE users ADD COLUMN principal_kind VARCHAR(16);
ALTER TABLE users ADD COLUMN interactive_login_enabled BOOLEAN;

UPDATE users
SET principal_kind = 'human'
WHERE principal_kind IS NULL;

UPDATE users
SET interactive_login_enabled = true
WHERE interactive_login_enabled IS NULL;

ALTER TABLE users ALTER COLUMN principal_kind SET DEFAULT 'human';
ALTER TABLE users ALTER COLUMN principal_kind SET NOT NULL;
ALTER TABLE users ALTER COLUMN interactive_login_enabled SET DEFAULT true;
ALTER TABLE users ALTER COLUMN interactive_login_enabled SET NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT users_principal_kind_chk
  CHECK (principal_kind IN ('human', 'service'));

ALTER TABLE users
  ADD CONSTRAINT users_service_principal_interactive_login_chk
  CHECK (principal_kind <> 'service' OR interactive_login_enabled = false);

ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE TABLE account_service_principals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  purpose VARCHAR(64) NOT NULL,
  user_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_service_principals_account_fk
    FOREIGN KEY (account_id)
    REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT account_service_principals_account_user_fk
    FOREIGN KEY (account_id, user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT account_service_principals_purpose_chk
    CHECK (purpose = 'pix-settlement')
);

CREATE UNIQUE INDEX account_service_principals_active_purpose_unique
  ON account_service_principals(account_id, purpose)
  WHERE is_active;

CREATE INDEX account_service_principals_account_user_idx
  ON account_service_principals(account_id, user_id);

ALTER TABLE account_service_principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_service_principals FORCE ROW LEVEL SECURITY;

CREATE POLICY account_service_principals_tenant_isolation
  ON account_service_principals
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

REVOKE ALL PRIVILEGES ON TABLE account_service_principals FROM PUBLIC;

COMMENT ON TABLE account_service_principals IS
  'Explicit tenant-local service-principal mappings; rows are provisioned operationally, never by migration fallback';
