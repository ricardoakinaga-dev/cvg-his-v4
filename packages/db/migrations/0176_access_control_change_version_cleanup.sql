-- Forward-only hardening for the ACL freshness ledger. Migration 0175 is
-- already part of the release history, so cleanup semantics live here instead
-- of changing its checksum.

ALTER TABLE access_control_change_versions FORCE ROW LEVEL SECURITY;

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

  -- Account cascades delete this table before dependent-row triggers finish.
  -- Do not recreate a version row for a parent that is already gone.
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = target_account_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.access_control_change_versions (account_id, version, updated_at)
  VALUES (target_account_id, 1, clock_timestamp())
  ON CONFLICT (account_id) DO UPDATE
  SET version = public.access_control_change_versions.version + 1,
      updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION app.bump_access_control_account_version(uuid) FROM PUBLIC;
