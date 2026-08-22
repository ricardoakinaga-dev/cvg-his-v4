-- Durable, one-way installation bootstrap.
--
-- The setup status must not be inferred from tenant-scoped rows: a NOBYPASSRLS
-- runtime without account context cannot see those rows.  This singleton is
-- deliberately outside RLS and is reachable only through narrowly granted
-- SECURITY DEFINER functions.

CREATE TABLE IF NOT EXISTS installation_state (
  singleton_id smallint PRIMARY KEY DEFAULT 1,
  status text NOT NULL DEFAULT 'ready',
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  admin_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  provisioned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT installation_state_singleton_chk CHECK (singleton_id = 1),
  CONSTRAINT installation_state_status_chk CHECK (status IN ('ready', 'provisioned')),
  CONSTRAINT installation_state_provisioned_at_chk CHECK (
    (status = 'ready' AND provisioned_at IS NULL)
    OR (status = 'provisioned' AND provisioned_at IS NOT NULL)
  )
);

-- Existing installations fail closed.  The default tenant and the permission
-- catalog are migration-owned, so an account or user is the durable legacy
-- evidence that installation already occurred.
INSERT INTO installation_state (
  singleton_id,
  status,
  account_id,
  admin_user_id,
  provisioned_at
)
SELECT
  1,
  CASE
    WHEN EXISTS (SELECT 1 FROM accounts) OR EXISTS (SELECT 1 FROM users)
      THEN 'provisioned'
    ELSE 'ready'
  END,
  (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1),
  (SELECT id FROM users ORDER BY created_at, id LIMIT 1),
  CASE
    WHEN EXISTS (SELECT 1 FROM accounts) OR EXISTS (SELECT 1 FROM users)
      THEN now()
    ELSE NULL
  END
ON CONFLICT (singleton_id) DO UPDATE
SET status = CASE
      WHEN installation_state.status = 'provisioned'
        OR EXISTS (SELECT 1 FROM accounts)
        OR EXISTS (SELECT 1 FROM users)
        THEN 'provisioned'
      ELSE 'ready'
    END,
    account_id = COALESCE(
      installation_state.account_id,
      (SELECT id FROM accounts ORDER BY created_at, id LIMIT 1)
    ),
    admin_user_id = COALESCE(
      installation_state.admin_user_id,
      (SELECT id FROM users ORDER BY created_at, id LIMIT 1)
    ),
    provisioned_at = CASE
      WHEN installation_state.status = 'provisioned'
        OR EXISTS (SELECT 1 FROM accounts)
        OR EXISTS (SELECT 1 FROM users)
        THEN COALESCE(installation_state.provisioned_at, now())
      ELSE NULL
    END,
    updated_at = now();

REVOKE ALL PRIVILEGES ON TABLE installation_state FROM PUBLIC;

-- Any privileged legacy path that creates global installation material after
-- this migration permanently closes setup.  Because the update participates in
-- the caller transaction, a failed insert cannot consume setup by itself.
CREATE OR REPLACE FUNCTION app.mark_installation_provisioned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'accounts' THEN
    UPDATE public.installation_state
    SET status = 'provisioned',
        account_id = COALESCE(account_id, NEW.id),
        provisioned_at = COALESCE(provisioned_at, now()),
        updated_at = now()
    WHERE singleton_id = 1;
  ELSIF TG_TABLE_NAME = 'users' THEN
    UPDATE public.installation_state
    SET status = 'provisioned',
        account_id = COALESCE(account_id, NEW.account_id),
        admin_user_id = COALESCE(admin_user_id, NEW.id),
        provisioned_at = COALESCE(provisioned_at, now()),
        updated_at = now()
    WHERE singleton_id = 1;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION app.mark_installation_provisioned() FROM PUBLIC;

DROP TRIGGER IF EXISTS installation_claimed_by_account ON accounts;
CREATE TRIGGER installation_claimed_by_account
  AFTER INSERT ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION app.mark_installation_provisioned();

DROP TRIGGER IF EXISTS installation_claimed_by_user ON users;
CREATE TRIGGER installation_claimed_by_user
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION app.mark_installation_provisioned();

CREATE OR REPLACE FUNCTION app.is_initial_setup_required()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT COALESCE(
    (
      SELECT state.status = 'ready'
      FROM public.installation_state AS state
      WHERE state.singleton_id = 1
    ),
    false
  );
$function$;

REVOKE ALL ON FUNCTION app.is_initial_setup_required() FROM PUBLIC;

CREATE OR REPLACE FUNCTION app.provision_initial_installation(
  p_tenant_name text,
  p_account_slug text,
  p_account_name text,
  p_unit_code text,
  p_unit_name text,
  p_admin_username text,
  p_admin_email text,
  p_admin_password_hash text,
  p_admin_full_name text,
  p_role_catalog jsonb,
  p_permission_catalog jsonb,
  p_role_permission_map jsonb,
  p_correlation_id text
)
RETURNS TABLE (account_id uuid, user_id uuid, clinic_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_expected_roles constant text[] := ARRAY[
    'admin',
    'auditor',
    'finance',
    'inventory',
    'nurse',
    'reception',
    'veterinarian'
  ];
  v_actual_roles text[];
  v_actual_mapping_roles text[];
  v_status text;
  v_tenant_id uuid;
  v_account_id uuid;
  v_unit_id uuid;
  v_user_id uuid;
  v_permission_count integer;
BEGIN
  -- Validate scalar values at the privileged boundary before taking the lock.
  IF p_tenant_name IS NULL OR length(btrim(p_tenant_name)) NOT BETWEEN 1 AND 255
    OR p_account_name IS NULL OR length(btrim(p_account_name)) NOT BETWEEN 1 AND 255
    OR p_unit_name IS NULL OR length(btrim(p_unit_name)) NOT BETWEEN 1 AND 255
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid installation name';
  END IF;

  IF p_account_slug IS NULL
    OR length(p_account_slug) NOT BETWEEN 1 AND 64
    OR p_account_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid account slug';
  END IF;

  IF p_unit_code IS NULL
    OR length(p_unit_code) NOT BETWEEN 1 AND 64
    OR p_unit_code !~ '^[a-z0-9][a-z0-9_-]*$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid unit code';
  END IF;

  IF p_admin_username IS NULL
    OR length(p_admin_username) NOT BETWEEN 3 AND 128
    OR p_admin_username !~ '^[A-Za-z0-9._-]+$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid administrator username';
  END IF;

  IF p_admin_email IS NULL
    OR length(p_admin_email) NOT BETWEEN 3 AND 320
    OR p_admin_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid administrator email';
  END IF;

  IF p_admin_full_name IS NULL OR length(btrim(p_admin_full_name)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid administrator name';
  END IF;

  -- The supported password representation is the current 16-byte-salt / 64-byte
  -- scrypt key encoding.  Legacy unsalted hashes are never accepted by setup.
  IF p_admin_password_hash IS NULL
    OR p_admin_password_hash !~ '^[0-9a-f]{32}:[0-9a-f]{128}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid administrator password hash';
  END IF;

  IF p_correlation_id IS NULL OR length(btrim(p_correlation_id)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid correlation id';
  END IF;

  -- Validate the complete caller-supplied access-control graph before writing.
  IF p_role_catalog IS NULL OR jsonb_typeof(p_role_catalog) <> 'array'
    OR jsonb_array_length(p_role_catalog) <> cardinality(v_expected_roles)
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid role catalog';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_role_catalog) AS entry(item)
    WHERE jsonb_typeof(item) <> 'object'
      OR NOT item ? 'name'
      OR jsonb_typeof(item -> 'name') <> 'string'
      OR item - ARRAY['name', 'description'] <> '{}'::jsonb
      OR (item ? 'description' AND jsonb_typeof(item -> 'description') NOT IN ('string', 'null'))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid role catalog entry';
  END IF;

  SELECT array_agg(role_name ORDER BY role_name)
  INTO v_actual_roles
  FROM (
    SELECT entry ->> 'name' AS role_name
    FROM jsonb_array_elements(p_role_catalog) AS roles(entry)
  ) AS catalog;

  IF v_actual_roles IS DISTINCT FROM v_expected_roles
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_role_catalog) AS roles(entry)
      WHERE length(entry ->> 'name') NOT BETWEEN 1 AND 64
        OR entry ->> 'name' !~ '^[a-z][a-z0-9_-]*$'
        OR length(COALESCE(entry ->> 'description', '')) > 500
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'incomplete role catalog';
  END IF;

  IF p_permission_catalog IS NULL OR jsonb_typeof(p_permission_catalog) <> 'array'
    OR jsonb_array_length(p_permission_catalog) NOT BETWEEN 1 AND 512
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid permission catalog';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_permission_catalog) AS entry(item)
    WHERE jsonb_typeof(item) <> 'object'
      OR NOT item ? 'key'
      OR jsonb_typeof(item -> 'key') <> 'string'
      OR item - ARRAY['key', 'description'] <> '{}'::jsonb
      OR (item ? 'description' AND jsonb_typeof(item -> 'description') NOT IN ('string', 'null'))
      OR length(item ->> 'key') NOT BETWEEN 3 AND 100
      OR item ->> 'key' !~ '^[a-z][a-z0-9_-]*([.][a-z][a-z0-9_-]*)+$'
      OR length(COALESCE(item ->> 'description', '')) > 1000
  ) OR EXISTS (
    SELECT permission_key
    FROM (
      SELECT entry ->> 'key' AS permission_key
      FROM jsonb_array_elements(p_permission_catalog) AS permissions(entry)
    ) AS catalog
    GROUP BY permission_key
    HAVING count(*) <> 1
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid permission catalog entry';
  END IF;

  SELECT jsonb_array_length(p_permission_catalog) INTO v_permission_count;

  IF p_role_permission_map IS NULL OR jsonb_typeof(p_role_permission_map) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid role permission map';
  END IF;

  SELECT array_agg(role_name ORDER BY role_name)
  INTO v_actual_mapping_roles
  FROM jsonb_object_keys(p_role_permission_map) AS mapping(role_name);

  IF v_actual_mapping_roles IS DISTINCT FROM v_expected_roles
    OR EXISTS (
      SELECT 1
      FROM jsonb_each(p_role_permission_map) AS mapping(role_name, permission_keys)
      WHERE jsonb_typeof(permission_keys) <> 'array'
        OR jsonb_array_length(permission_keys) = 0
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'incomplete role permission map';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each(p_role_permission_map) AS mapping(role_name, permission_keys)
    CROSS JOIN LATERAL jsonb_array_elements(permission_keys) AS permission(item)
    WHERE jsonb_typeof(item) <> 'string'
  ) OR EXISTS (
    SELECT role_name, permission_key
    FROM jsonb_each(p_role_permission_map) AS mapping(role_name, permission_keys)
    CROSS JOIN LATERAL jsonb_array_elements_text(permission_keys) AS permission(permission_key)
    GROUP BY role_name, permission_key
    HAVING count(*) <> 1
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_each(p_role_permission_map) AS mapping(role_name, permission_keys)
    CROSS JOIN LATERAL jsonb_array_elements_text(permission_keys) AS permission(permission_key)
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_permission_catalog) AS catalog(entry)
      WHERE entry ->> 'key' = permission.permission_key
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid role permission reference';
  END IF;

  IF jsonb_array_length(p_role_permission_map -> 'admin') <> v_permission_count
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_permission_catalog) AS catalog(entry)
      WHERE NOT (p_role_permission_map -> 'admin') ? (entry ->> 'key')
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'admin role must include every permission';
  END IF;

  PERFORM pg_advisory_xact_lock(2145183024);

  SELECT state.status
  INTO v_status
  FROM public.installation_state AS state
  WHERE state.singleton_id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'CVG02', MESSAGE = 'installation state inconsistent';
  END IF;

  IF v_status <> 'ready' THEN
    RAISE EXCEPTION USING ERRCODE = 'CVG01', MESSAGE = 'installation already provisioned';
  END IF;

  -- No auto-repair: unexpected global material is an operator recovery case.
  IF EXISTS (SELECT 1 FROM public.accounts)
    OR EXISTS (SELECT 1 FROM public.users)
    OR EXISTS (SELECT 1 FROM public.roles)
    OR EXISTS (
      SELECT 1
      FROM public.tenants
      WHERE id <> '00000000-0000-0000-0000-000000000001'::uuid
         OR slug <> 'default'
    )
    OR EXISTS (
      SELECT 1
      FROM public.permissions AS persisted
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_permission_catalog) AS catalog(entry)
        WHERE entry ->> 'key' = persisted.key
      )
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'CVG02', MESSAGE = 'installation state inconsistent';
  END IF;

  INSERT INTO public.tenants (id, slug, name, status, activated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'default',
    btrim(p_tenant_name),
    'active',
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      status = 'active',
      activated_at = COALESCE(public.tenants.activated_at, EXCLUDED.activated_at),
      updated_at = now()
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.accounts (tenant_id, slug, name)
  VALUES (v_tenant_id, p_account_slug, btrim(p_account_name))
  RETURNING id INTO v_account_id;

  PERFORM set_config('app.current_account_id', v_account_id::text, true);

  INSERT INTO public.units (account_id, code, name)
  VALUES (v_account_id, p_unit_code, btrim(p_unit_name))
  RETURNING id INTO v_unit_id;

  INSERT INTO public.roles (name, description)
  SELECT entry ->> 'name', NULLIF(btrim(entry ->> 'description'), '')
  FROM jsonb_array_elements(p_role_catalog) AS roles(entry)
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

  INSERT INTO public.permissions (key, description)
  SELECT entry ->> 'key', NULLIF(btrim(entry ->> 'description'), '')
  FROM jsonb_array_elements(p_permission_catalog) AS permissions(entry)
  ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_record.id, permission_record.id
  FROM jsonb_each(p_role_permission_map) AS mapping(role_name, permission_keys)
  CROSS JOIN LATERAL jsonb_array_elements_text(permission_keys) AS mapped(permission_key)
  JOIN public.roles AS role_record ON role_record.name = mapping.role_name
  JOIN public.permissions AS permission_record ON permission_record.key = mapped.permission_key
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  INSERT INTO public.users (
    account_id,
    unit_id,
    username,
    email,
    password_hash,
    full_name,
    is_active
  )
  VALUES (
    v_account_id,
    v_unit_id,
    p_admin_username,
    lower(p_admin_email),
    p_admin_password_hash,
    btrim(p_admin_full_name),
    true
  )
  RETURNING id INTO v_user_id;

  INSERT INTO public.user_roles (user_id, role_id)
  SELECT v_user_id, role_record.id
  FROM public.roles AS role_record
  WHERE role_record.name = 'admin';

  UPDATE public.installation_state
  SET status = 'provisioned',
      account_id = v_account_id,
      admin_user_id = v_user_id,
      provisioned_at = COALESCE(provisioned_at, now()),
      updated_at = now()
  WHERE singleton_id = 1;

  INSERT INTO public.audit_events (
    account_id,
    actor_user_id,
    actor_role,
    actor_roles,
    entity_type,
    entity_id,
    action,
    after_json,
    metadata,
    correlation_id,
    occurred_at
  )
  VALUES (
    v_account_id,
    v_user_id,
    'admin',
    '["admin"]'::jsonb,
    'installation',
    v_account_id::text,
    'installation_provisioned',
    jsonb_build_object(
      'accountId', v_account_id,
      'adminUserId', v_user_id,
      'clinicSlug', p_account_slug
    ),
    jsonb_build_object('riskLevel', 'high', 'source', 'initial_setup'),
    p_correlation_id,
    now()
  );

  RETURN QUERY SELECT v_account_id, v_user_id, p_account_slug;
END;
$function$;

REVOKE ALL ON FUNCTION app.provision_initial_installation(
  text, text, text, text, text, text, text, text, text,
  jsonb, jsonb, jsonb, text
) FROM PUBLIC;

-- The stable NOLOGIN capability role is created by the runtime-role init
-- scripts before migrations.  Conditional grants keep developer databases and
-- migration-only environments usable without weakening PUBLIC.
DO $grant$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvg_installer') THEN
    GRANT USAGE ON SCHEMA app TO cvg_installer;
    GRANT EXECUTE ON FUNCTION app.is_initial_setup_required() TO cvg_installer;
    GRANT EXECUTE ON FUNCTION app.provision_initial_installation(
      text, text, text, text, text, text, text, text, text,
      jsonb, jsonb, jsonb, text
    ) TO cvg_installer;
  END IF;
END;
$grant$;
