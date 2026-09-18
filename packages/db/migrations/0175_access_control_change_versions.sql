-- Keep cross-instance authorization freshness exact without rebuilding every
-- ACL relation on every authenticated request. The version rows are updated
-- by database triggers, so direct SQL writers and application writers share
-- the same invalidation contract.

CREATE TABLE IF NOT EXISTS access_control_account_versions (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_control_global_version (
  singleton_id boolean PRIMARY KEY DEFAULT true CHECK (singleton_id = true),
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE access_control_account_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_control_account_versions_tenant_isolation
  ON access_control_account_versions;
CREATE POLICY access_control_account_versions_tenant_isolation
  ON access_control_account_versions
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE OR REPLACE FUNCTION app.bump_access_control_account_version(target_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app, pg_temp
AS $function$
BEGIN
  IF target_account_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.access_control_account_versions (account_id, version, updated_at)
  VALUES (target_account_id, 1, clock_timestamp())
  ON CONFLICT (account_id) DO UPDATE
    SET version = access_control_account_versions.version + 1,
        updated_at = clock_timestamp();
END;
$function$;

CREATE OR REPLACE FUNCTION app.bump_access_control_global_version()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app, pg_temp
AS $function$
BEGIN
  INSERT INTO public.access_control_global_version (singleton_id, version, updated_at)
  VALUES (true, 1, clock_timestamp())
  ON CONFLICT (singleton_id) DO UPDATE
    SET version = access_control_global_version.version + 1,
        updated_at = clock_timestamp();
END;
$function$;

CREATE OR REPLACE FUNCTION app.bump_access_control_account_row_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app, pg_temp
AS $function$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    PERFORM app.bump_access_control_account_version(OLD.account_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM app.bump_access_control_account_version(NEW.account_id);
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

CREATE OR REPLACE FUNCTION app.bump_access_control_user_role_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app, pg_temp
AS $function$
DECLARE
  old_account_id uuid;
  new_account_id uuid;
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    SELECT account_id INTO old_account_id
    FROM public.users
    WHERE id = OLD.user_id;
    PERFORM app.bump_access_control_account_version(old_account_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT account_id INTO new_account_id
    FROM public.users
    WHERE id = NEW.user_id;
    PERFORM app.bump_access_control_account_version(new_account_id);
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

CREATE OR REPLACE FUNCTION app.access_control_change_token(target_account_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, app, pg_temp
AS $function$
DECLARE
  current_account_id uuid;
  account_version bigint;
  global_version bigint;
BEGIN
  current_account_id := app.current_account_id();
  IF target_account_id IS NULL OR current_account_id IS NULL OR target_account_id <> current_account_id THEN
    RAISE EXCEPTION 'access control token account does not match tenant context';
  END IF;

  SELECT version INTO account_version
  FROM public.access_control_account_versions
  WHERE account_id = target_account_id;

  SELECT version INTO global_version
  FROM public.access_control_global_version
  WHERE singleton_id = true;

  RETURN concat(COALESCE(account_version, 0), ':', COALESCE(global_version, 0));
END;
$function$;

REVOKE ALL ON TABLE access_control_account_versions, access_control_global_version FROM PUBLIC;
REVOKE ALL ON FUNCTION app.bump_access_control_account_version(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.bump_access_control_global_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.bump_access_control_account_row_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.bump_access_control_user_role_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.access_control_change_token(uuid) FROM PUBLIC;

DROP TRIGGER IF EXISTS access_teams_change_version ON access_teams;
CREATE TRIGGER access_teams_change_version
AFTER INSERT OR UPDATE OR DELETE ON access_teams
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_account_row_version();

DROP TRIGGER IF EXISTS access_sectors_change_version ON access_sectors;
CREATE TRIGGER access_sectors_change_version
AFTER INSERT OR UPDATE OR DELETE ON access_sectors
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_account_row_version();

DROP TRIGGER IF EXISTS access_team_memberships_change_version ON access_team_memberships;
CREATE TRIGGER access_team_memberships_change_version
AFTER INSERT OR UPDATE OR DELETE ON access_team_memberships
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_account_row_version();

DROP TRIGGER IF EXISTS access_sector_memberships_change_version ON access_sector_memberships;
CREATE TRIGGER access_sector_memberships_change_version
AFTER INSERT OR UPDATE OR DELETE ON access_sector_memberships
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_account_row_version();

DROP TRIGGER IF EXISTS access_user_permissions_change_version ON access_user_permissions;
CREATE TRIGGER access_user_permissions_change_version
AFTER INSERT OR UPDATE OR DELETE ON access_user_permissions
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_account_row_version();

DROP TRIGGER IF EXISTS access_team_permissions_change_version ON access_team_permissions;
CREATE TRIGGER access_team_permissions_change_version
AFTER INSERT OR UPDATE OR DELETE ON access_team_permissions
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_account_row_version();

DROP TRIGGER IF EXISTS access_sector_permissions_change_version ON access_sector_permissions;
CREATE TRIGGER access_sector_permissions_change_version
AFTER INSERT OR UPDATE OR DELETE ON access_sector_permissions
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_account_row_version();

DROP TRIGGER IF EXISTS users_access_control_change_version ON users;
CREATE TRIGGER users_access_control_change_version
AFTER INSERT OR UPDATE OF account_id, principal_kind, interactive_login_enabled, is_active OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_account_row_version();

DROP TRIGGER IF EXISTS user_roles_access_control_change_version ON user_roles;
CREATE TRIGGER user_roles_access_control_change_version
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_user_role_version();

DROP TRIGGER IF EXISTS roles_access_control_change_version ON roles;
CREATE TRIGGER roles_access_control_change_version
AFTER INSERT OR UPDATE OR DELETE ON roles
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_global_version();

DROP TRIGGER IF EXISTS permissions_access_control_change_version ON permissions;
CREATE TRIGGER permissions_access_control_change_version
AFTER INSERT OR UPDATE OR DELETE ON permissions
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_global_version();

DROP TRIGGER IF EXISTS role_permissions_access_control_change_version ON role_permissions;
CREATE TRIGGER role_permissions_access_control_change_version
AFTER INSERT OR UPDATE OR DELETE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION app.bump_access_control_global_version();
