-- API-key authentication starts before a tenant context exists. Keep that
-- lookup narrow, while tenant-scoping the operational usage tables.

ALTER TABLE api_key_usage
  ADD COLUMN account_id VARCHAR(255);

UPDATE api_key_usage AS usage
SET account_id = key.account_id
FROM api_keys AS key
WHERE key.id = usage.api_key_id
  AND usage.account_id IS NULL;

ALTER TABLE api_key_usage
  ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE api_key_rate_limits
  ADD COLUMN account_id VARCHAR(255);

UPDATE api_key_rate_limits AS rate_limit
SET account_id = key.account_id
FROM api_keys AS key
WHERE key.id = rate_limit.api_key_id
  AND rate_limit.account_id IS NULL;

ALTER TABLE api_key_rate_limits
  ALTER COLUMN account_id SET NOT NULL;

-- A non-login capability owns the narrow pre-context lookup. It has no
-- membership grants; callers can only reach it through explicit EXECUTE.
DO $api_key_auth_role$
DECLARE
  created_role BOOLEAN := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvg_api_key_auth') THEN
    BEGIN
      CREATE ROLE cvg_api_key_auth NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
      created_role := true;
    EXCEPTION WHEN duplicate_object THEN
      -- Another database migration can create the cluster-global role first.
      NULL;
    END;
  END IF;
  IF created_role THEN
    ALTER ROLE cvg_api_key_auth NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$api_key_auth_role$;

DO $api_key_auth_memberships$
DECLARE
  membership RECORD;
BEGIN
  FOR membership IN
    SELECT member.rolname
      FROM pg_auth_members AS auth_membership
      JOIN pg_roles AS member ON member.oid = auth_membership.member
      JOIN pg_roles AS capability ON capability.oid = auth_membership.roleid
     WHERE capability.rolname = 'cvg_api_key_auth'
  LOOP
    EXECUTE format('REVOKE cvg_api_key_auth FROM %I', membership.rolname);
  END LOOP;

  FOR membership IN
    SELECT inherited.rolname
      FROM pg_auth_members AS auth_membership
      JOIN pg_roles AS member ON member.oid = auth_membership.member
      JOIN pg_roles AS inherited ON inherited.oid = auth_membership.roleid
     WHERE member.rolname = 'cvg_api_key_auth'
  LOOP
    EXECUTE format('REVOKE %I FROM cvg_api_key_auth', membership.rolname);
  END LOOP;
END
$api_key_auth_memberships$;
GRANT USAGE ON SCHEMA public, app TO cvg_api_key_auth;
GRANT SELECT (
  id, account_id, name, key_prefix, key_hash, permissions, rate_limit,
  rate_limit_window, expires_at, last_used_at, is_active, created_by,
  created_at, updated_at
) ON TABLE api_keys TO cvg_api_key_auth;
GRANT SELECT (transaction_id, account_id) ON TABLE pix_transactions TO cvg_api_key_auth;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_account_id_id_key'
  ) THEN
    ALTER TABLE api_keys ADD CONSTRAINT api_keys_account_id_id_key UNIQUE (account_id, id);
  END IF;
END
$constraints$;

ALTER TABLE api_key_usage
  ADD CONSTRAINT api_key_usage_account_api_key_id_fkey
  FOREIGN KEY (account_id, api_key_id) REFERENCES api_keys(account_id, id)
  ON DELETE CASCADE;

ALTER TABLE api_key_rate_limits
  ADD CONSTRAINT api_key_rate_limits_account_api_key_id_fkey
  FOREIGN KEY (account_id, api_key_id) REFERENCES api_keys(account_id, id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS api_key_usage_account_api_key_created_at_idx
  ON api_key_usage (account_id, api_key_id, created_at DESC);

CREATE INDEX IF NOT EXISTS api_key_rate_limits_account_api_key_window_idx
  ON api_key_rate_limits (account_id, api_key_id, window_start DESC);

ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_key_usage_tenant_isolation ON api_key_usage;
CREATE POLICY api_key_usage_tenant_isolation ON api_key_usage
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

ALTER TABLE api_key_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_rate_limits FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_key_rate_limits_tenant_isolation ON api_key_rate_limits;
CREATE POLICY api_key_rate_limits_tenant_isolation ON api_key_rate_limits
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

DROP POLICY IF EXISTS api_keys_auth_lookup ON api_keys;
CREATE POLICY api_keys_auth_lookup ON api_keys
  FOR SELECT TO cvg_api_key_auth
  USING (true);

DROP POLICY IF EXISTS pix_transactions_auth_lookup ON pix_transactions;
CREATE POLICY pix_transactions_auth_lookup ON pix_transactions
  FOR SELECT TO cvg_api_key_auth
  USING (true);

-- This is intentionally the only pre-context API-key query. It returns at
-- most two records so the application can fail closed if exact-hash data is
-- ambiguous rather than authenticating an arbitrary matching key.
CREATE OR REPLACE FUNCTION app.resolve_active_api_key(
  expected_key_prefix TEXT,
  expected_key_hash TEXT
)
RETURNS TABLE (
  id VARCHAR,
  account_id VARCHAR,
  name VARCHAR,
  key_prefix VARCHAR,
  key_hash VARCHAR,
  permissions JSONB,
  rate_limit INTEGER,
  rate_limit_window INTEGER,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN,
  created_by VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT key.id,
         key.account_id,
         key.name,
         key.key_prefix,
         key.key_hash,
         key.permissions,
         key.rate_limit,
         key.rate_limit_window,
         key.expires_at,
         key.last_used_at,
         key.is_active,
         key.created_by,
         key.created_at,
         key.updated_at
    FROM public.api_keys AS key
   WHERE key.key_prefix = expected_key_prefix
     AND key.key_hash = expected_key_hash
     AND key.is_active
     AND (key.expires_at IS NULL OR key.expires_at > statement_timestamp())
   ORDER BY key.id
   LIMIT 2;
$$;

REVOKE ALL ON FUNCTION app.resolve_active_api_key(TEXT, TEXT) FROM PUBLIC, cvg_installer;
ALTER FUNCTION app.resolve_active_api_key(TEXT, TEXT) OWNER TO cvg_api_key_auth;

CREATE OR REPLACE FUNCTION app.is_pix_transaction_owned_by(
  expected_transaction_id TEXT,
  expected_account_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
           WHEN pix_transaction.transaction_id IS NULL THEN NULL
           ELSE pix_transaction.account_id = expected_account_id
         END
    FROM (
      SELECT transaction_id, account_id
        FROM public.pix_transactions
       WHERE transaction_id = expected_transaction_id
       LIMIT 1
    ) AS pix_transaction;
$$;

REVOKE ALL ON FUNCTION app.is_pix_transaction_owned_by(TEXT, UUID) FROM PUBLIC, cvg_installer;
ALTER FUNCTION app.is_pix_transaction_owned_by(TEXT, UUID) OWNER TO cvg_api_key_auth;
