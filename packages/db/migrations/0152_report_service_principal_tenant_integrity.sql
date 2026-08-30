-- Extend the existing tenant-local service-principal mapping for scheduled
-- reports and bind report audit actors to their owning account. This migration
-- is expand-only: operators provision principals and mappings separately.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.account_service_principals'::regclass
       AND conname = 'account_service_principals_purpose_chk'
  ) THEN
    ALTER TABLE public.account_service_principals
      DROP CONSTRAINT account_service_principals_purpose_chk;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.account_service_principals'::regclass
       AND conname = 'account_service_principals_purpose_chk'
  ) THEN
    ALTER TABLE public.account_service_principals
      ADD CONSTRAINT account_service_principals_purpose_chk
      CHECK (purpose IN ('pix-settlement', 'report-execution'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.report_executions'::regclass
       AND conname = 'report_executions_account_requested_by_user_fk'
  ) THEN
    ALTER TABLE public.report_executions
      ADD CONSTRAINT report_executions_account_requested_by_user_fk
      FOREIGN KEY (account_id, requested_by_user_id)
      REFERENCES public.users (account_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.report_exports'::regclass
       AND conname = 'report_exports_account_exported_by_user_fk'
  ) THEN
    ALTER TABLE public.report_exports
      ADD CONSTRAINT report_exports_account_exported_by_user_fk
      FOREIGN KEY (account_id, exported_by_user_id)
      REFERENCES public.users (account_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.report_schedules'::regclass
       AND conname = 'report_schedules_account_created_by_user_fk'
  ) THEN
    ALTER TABLE public.report_schedules
      ADD CONSTRAINT report_schedules_account_created_by_user_fk
      FOREIGN KEY (account_id, created_by_user_id)
      REFERENCES public.users (account_id, id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

-- A composite FK proves account membership, but it cannot express the
-- purpose/active-state rule for service principals. Recheck that rule in the
-- same transaction as report persistence. FOR UPDATE makes an actor revoke
-- wait for an in-flight report insert, so the two operations have a clear
-- database ordering instead of a preflight-only TOCTOU window.
CREATE OR REPLACE FUNCTION app.assert_report_actor_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  actor_column text;
  actor_user_id uuid;
  actor_kind text;
  actor_is_active boolean;
  actor_interactive_login_enabled boolean;
  report_mapping_is_active boolean;
BEGIN
  actor_column := CASE TG_TABLE_NAME
    WHEN 'report_executions' THEN 'requested_by_user_id'
    WHEN 'report_exports' THEN 'exported_by_user_id'
    WHEN 'report_schedules' THEN 'created_by_user_id'
    ELSE NULL
  END;

  IF actor_column IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'report actor integrity trigger attached to an unsupported table';
  END IF;

  actor_user_id := (to_jsonb(NEW) ->> actor_column)::uuid;

  -- Leave missing users to the composite FK so callers receive the canonical
  -- account-membership violation. The service-state check is additive.
  SELECT principal.principal_kind,
         principal.is_active,
         principal.interactive_login_enabled
    INTO actor_kind,
         actor_is_active,
         actor_interactive_login_enabled
    FROM public.users AS principal
   WHERE principal.account_id = NEW.account_id
     AND principal.id = actor_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Lock the mapping row as well as the user row. The active unique index
  -- allows one active purpose row per account while the sort also finds an
  -- inactive historical mapping when an operator revoked the current row.
  SELECT mapping.is_active
    INTO report_mapping_is_active
    FROM public.account_service_principals AS mapping
   WHERE mapping.account_id = NEW.account_id
     AND mapping.purpose = 'report-execution'
     AND mapping.user_id = actor_user_id
   ORDER BY mapping.is_active DESC, mapping.updated_at DESC
   LIMIT 1
   FOR UPDATE;

  -- Interactive human actors are valid for user-created reports. A service
  -- actor, however, must satisfy every service-principal invariant at the
  -- same persistence boundary. An active report mapping attached to a human
  -- is also invalid and must not silently downgrade the audit actor.
  IF actor_kind = 'service'
     AND actor_is_active = TRUE
     AND actor_interactive_login_enabled = FALSE
     AND report_mapping_is_active = TRUE THEN
    RETURN NEW;
  END IF;

  IF actor_kind = 'service' OR report_mapping_is_active = TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'report actor is not an active report service principal for this account';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION app.assert_report_actor_integrity() FROM PUBLIC;

DROP TRIGGER IF EXISTS report_executions_actor_integrity_trigger ON public.report_executions;
CREATE TRIGGER report_executions_actor_integrity_trigger
  BEFORE INSERT OR UPDATE OF account_id, requested_by_user_id ON public.report_executions
  FOR EACH ROW
  EXECUTE FUNCTION app.assert_report_actor_integrity();

DROP TRIGGER IF EXISTS report_exports_actor_integrity_trigger ON public.report_exports;
CREATE TRIGGER report_exports_actor_integrity_trigger
  BEFORE INSERT OR UPDATE OF account_id, exported_by_user_id ON public.report_exports
  FOR EACH ROW
  EXECUTE FUNCTION app.assert_report_actor_integrity();

DROP TRIGGER IF EXISTS report_schedules_actor_integrity_trigger ON public.report_schedules;
CREATE TRIGGER report_schedules_actor_integrity_trigger
  BEFORE INSERT OR UPDATE OF account_id, created_by_user_id ON public.report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION app.assert_report_actor_integrity();

COMMENT ON CONSTRAINT report_executions_account_requested_by_user_fk
  ON public.report_executions IS
  'Scheduled and interactive report executions must retain an actor from the owning account';

COMMENT ON TABLE public.account_service_principals IS
  'Explicit tenant-local service-principal mappings for PIX settlement and scheduled report execution; rows are provisioned operationally, never by migration fallback';
