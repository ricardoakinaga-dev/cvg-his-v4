-- Operator-facing PIX settlement DLQ boundary.
--
-- The API may inspect the tenant-scoped terminal queue and invoke one narrow
-- SECURITY DEFINER transition. It never receives UPDATE on the delivery table
-- and the transition appends its audit event in the same transaction.

DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvg_pix_dlq_operator') THEN
    CREATE ROLE cvg_pix_dlq_operator
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
  ALTER ROLE cvg_pix_dlq_operator
    NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
    NOINHERIT NOREPLICATION NOBYPASSRLS;
END
$role$;

DO $memberships$
DECLARE
  membership RECORD;
BEGIN
  FOR membership IN
    SELECT member.rolname
      FROM pg_auth_members AS auth_membership
      JOIN pg_roles AS member ON member.oid = auth_membership.member
      JOIN pg_roles AS capability ON capability.oid = auth_membership.roleid
     WHERE capability.rolname = 'cvg_pix_dlq_operator'
  LOOP
    EXECUTE format('REVOKE cvg_pix_dlq_operator FROM %I', membership.rolname);
  END LOOP;

  FOR membership IN
    SELECT inherited.rolname
      FROM pg_auth_members AS auth_membership
      JOIN pg_roles AS member ON member.oid = auth_membership.member
      JOIN pg_roles AS inherited ON inherited.oid = auth_membership.roleid
     WHERE member.rolname = 'cvg_pix_dlq_operator'
  LOOP
    EXECUTE format('REVOKE %I FROM cvg_pix_dlq_operator', membership.rolname);
  END LOOP;
END
$memberships$;

GRANT USAGE ON SCHEMA public, app TO cvg_pix_dlq_operator;
GRANT EXECUTE ON FUNCTION app.current_account_id(), app.has_account_context()
  TO cvg_pix_dlq_operator;
GRANT SELECT ON TABLE public.pix_provider_event_deliveries TO cvg_pix_dlq_operator;
GRANT UPDATE ON TABLE public.pix_provider_event_deliveries TO cvg_pix_dlq_operator;
GRANT SELECT (id, account_id, is_active) ON TABLE public.users TO cvg_pix_dlq_operator;
GRANT INSERT ON TABLE public.audit_events TO cvg_pix_dlq_operator;

CREATE OR REPLACE FUNCTION app.redrive_pix_provider_event_delivery(
  expected_delivery_id UUID,
  expected_event_id UUID,
  expected_actor_user_id UUID,
  expected_correlation_id TEXT,
  expected_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app
AS $function$
DECLARE
  current_account UUID := app.current_account_id();
BEGIN
  IF current_account IS NULL THEN
    RETURN FALSE;
  END IF;

  IF expected_correlation_id IS NULL
     OR length(btrim(expected_correlation_id)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'Invalid correlation id' USING ERRCODE = '22023';
  END IF;
  IF expected_reason IS NULL
     OR length(btrim(expected_reason)) NOT BETWEEN 1 AND 500
     OR expected_reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid redrive reason' USING ERRCODE = '22023';
  END IF;

  -- The authenticated actor must be an active human/service principal in the
  -- current tenant. This prevents an API caller from forging audit authorship.
  IF NOT EXISTS (
    SELECT 1
      FROM public.users AS actor
     WHERE actor.id = expected_actor_user_id
       AND actor.account_id = current_account
       AND actor.is_active
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.pix_provider_event_deliveries
     SET state = 'pending',
         attempts = 0,
         next_attempt_at = clock_timestamp(),
         lease_owner = NULL,
         lease_token = NULL,
         lease_expires_at = NULL,
         lease_version = lease_version + 1,
         last_error_code = NULL,
         last_error_class = NULL,
         applied_at = NULL,
         updated_at = clock_timestamp()
   WHERE account_id = current_account
     AND id = expected_delivery_id
     AND event_id = expected_event_id
     AND state = 'reconciliation_required';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.audit_events (
    account_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    metadata,
    correlation_id,
    occurred_at,
    reason,
    created_at
  ) VALUES (
    current_account,
    expected_actor_user_id,
    'pix_provider_event_delivery',
    expected_delivery_id::text,
    'pix_settlement_redrive',
    jsonb_build_object(
      'eventId', expected_event_id::text,
      'resetAttempts', true,
      'redriveReason', btrim(expected_reason)
    ),
    btrim(expected_correlation_id),
    clock_timestamp(),
    btrim(expected_reason),
    clock_timestamp()
  );

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION app.redrive_pix_provider_event_delivery(UUID, UUID, UUID, TEXT, TEXT)
  FROM PUBLIC;
DO $revoke_optional_installer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvg_installer') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION app.redrive_pix_provider_event_delivery(UUID, UUID, UUID, TEXT, TEXT) FROM cvg_installer';
  END IF;
END
$revoke_optional_installer$;
ALTER FUNCTION app.redrive_pix_provider_event_delivery(UUID, UUID, UUID, TEXT, TEXT)
  OWNER TO cvg_pix_dlq_operator;

DO $runtime_roles$
DECLARE
  api_role TEXT := NULLIF(current_setting('app.runtime_api_role', true), '');
  worker_role TEXT := NULLIF(current_setting('app.runtime_worker_role', true), '');
BEGIN
  IF api_role IS NOT NULL AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
    EXECUTE format(
      'REVOKE ALL ON FUNCTION app.redrive_pix_provider_event_delivery(UUID, UUID, UUID, TEXT, TEXT) FROM %I',
      api_role
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION app.redrive_pix_provider_event_delivery(UUID, UUID, UUID, TEXT, TEXT) TO %I',
      api_role
    );
    EXECUTE format(
      'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_event_deliveries FROM %I',
      api_role
    );
    EXECUTE format(
      'GRANT SELECT, INSERT ON TABLE public.pix_provider_event_deliveries TO %I',
      api_role
    );
  END IF;

  IF worker_role IS NOT NULL AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = worker_role) THEN
    EXECUTE format(
      'REVOKE ALL ON FUNCTION app.redrive_pix_provider_event_delivery(UUID, UUID, UUID, TEXT, TEXT) FROM %I',
      worker_role
    );
  END IF;
END
$runtime_roles$;

COMMENT ON FUNCTION app.redrive_pix_provider_event_delivery(UUID, UUID, UUID, TEXT, TEXT) IS
  'Atomically redrives one tenant-scoped PIX settlement delivery and appends its audit event; no financial artifacts are mutated.';
