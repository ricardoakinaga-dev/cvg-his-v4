-- Keep authorization freshness checks cheap without weakening the cross-instance
-- revocation boundary. The previous token query rebuilt the whole global ACL
-- graph on every authenticated request. These versions are incremented in the
-- same transaction as every ACL mutation and are read through tenant RLS.

CREATE TABLE IF NOT EXISTS access_control_change_versions (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  version bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE access_control_change_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS access_control_change_versions_tenant_isolation
  ON access_control_change_versions;
CREATE POLICY access_control_change_versions_tenant_isolation
  ON access_control_change_versions
  FOR SELECT
  USING (account_id = app.current_account_id());

INSERT INTO access_control_change_versions (account_id)
SELECT id FROM accounts
ON CONFLICT (account_id) DO NOTHING;

CREATE OR REPLACE FUNCTION app.bump_access_control_account_version(target_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app
AS $$
BEGIN
  IF target_account_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.access_control_change_versions (account_id, version, updated_at)
  VALUES (target_account_id, 1, clock_timestamp())
  ON CONFLICT (account_id) DO UPDATE
  SET version = public.access_control_change_versions.version + 1,
      updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION app.bump_access_control_row_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app
AS $$
BEGIN
  IF TG_OP <> 'DELETE' THEN
    PERFORM app.bump_access_control_account_version(NEW.account_id);
  END IF;

  IF TG_OP = 'DELETE' OR OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    PERFORM app.bump_access_control_account_version(OLD.account_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.bump_access_control_user_role_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app
AS $$
DECLARE
  affected_user_id uuid;
  affected_account_id uuid;
BEGIN
  affected_user_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  SELECT account_id INTO affected_account_id
  FROM public.users
  WHERE id = affected_user_id;
  PERFORM app.bump_access_control_account_version(affected_account_id);

  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    SELECT account_id INTO affected_account_id
    FROM public.users
    WHERE id = OLD.user_id;
    PERFORM app.bump_access_control_account_version(affected_account_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.bump_access_control_global_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app
AS $$
BEGIN
  INSERT INTO public.access_control_change_versions (account_id, version, updated_at)
  SELECT id, 1, clock_timestamp()
  FROM public.accounts
  ON CONFLICT (account_id) DO NOTHING;

  UPDATE public.access_control_change_versions
  SET version = version + 1,
      updated_at = clock_timestamp();
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION app.initialize_access_control_account_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app
AS $$
BEGIN
  PERFORM app.bump_access_control_account_version(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS access_control_change_versions_accounts_insert ON accounts;
CREATE TRIGGER access_control_change_versions_accounts_insert
AFTER INSERT ON accounts
FOR EACH ROW EXECUTE FUNCTION app.initialize_access_control_account_version();

DROP TRIGGER IF EXISTS access_control_change_versions_users ON users;
CREATE TRIGGER access_control_change_versions_users
AFTER DELETE OR UPDATE OF account_id ON users
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_row_version();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'access_teams',
    'access_sectors',
    'access_team_memberships',
    'access_sector_memberships',
    'access_user_permissions',
    'access_team_permissions',
    'access_sector_permissions'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS access_control_change_versions_row ON %I', table_name);
    EXECUTE format(
      'CREATE TRIGGER access_control_change_versions_row AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_row_version()',
      table_name
    );
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS access_control_change_versions_user_roles ON user_roles;
CREATE TRIGGER access_control_change_versions_user_roles
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_user_role_version();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['roles', 'permissions', 'role_permissions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS access_control_change_versions_global ON %I', table_name);
    EXECUTE format(
      'CREATE TRIGGER access_control_change_versions_global AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION app.bump_access_control_global_version()',
      table_name
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION app.bump_access_control_account_version(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.bump_access_control_row_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.bump_access_control_user_role_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.bump_access_control_global_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.initialize_access_control_account_version() FROM PUBLIC;
