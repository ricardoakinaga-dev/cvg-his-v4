-- Serialize direct authorization writes with an account-scoped writer gate and
-- the account-scoped lock already acquired by the PIX settlement worker before
-- it resolves its service actor.
-- This migration changes no settlement semantics and provisions no identity.

CREATE OR REPLACE FUNCTION app.lock_service_principal_authorization_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  old_account_id UUID;
  new_account_id UUID;
  old_writer_gate_key BIGINT;
  new_writer_gate_key BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_account_id := OLD.account_id;
  ELSIF TG_OP = 'INSERT' THEN
    new_account_id := NEW.account_id;
  ELSE
    old_account_id := OLD.account_id;
    new_account_id := NEW.account_id;
  END IF;

  IF old_account_id IS NOT NULL THEN
    old_writer_gate_key := pg_catalog.hashtextextended(
      'cvg-his-v2:service-principal-writer:' || old_account_id::text,
      0
    );
  END IF;
  IF new_account_id IS NOT NULL THEN
    new_writer_gate_key := pg_catalog.hashtextextended(
      'cvg-his-v2:service-principal-writer:' || new_account_id::text,
      0
    );
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT pg_catalog.pg_try_advisory_xact_lock(new_writer_gate_key) THEN
      RAISE EXCEPTION 'service-principal writer gate is busy; retry transaction'
        USING ERRCODE = '40001';
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new_account_id::text, 0)
    );
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT pg_catalog.pg_try_advisory_xact_lock(old_writer_gate_key) THEN
      RAISE EXCEPTION 'service-principal writer gate is busy; retry transaction'
        USING ERRCODE = '40001';
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(old_account_id::text, 0)
    );
  ELSIF old_account_id = new_account_id THEN
    IF NOT pg_catalog.pg_try_advisory_xact_lock(old_writer_gate_key) THEN
      RAISE EXCEPTION 'service-principal writer gate is busy; retry transaction'
        USING ERRCODE = '40001';
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(old_account_id::text, 0)
    );
  ELSIF old_account_id::text < new_account_id::text THEN
    IF NOT pg_catalog.pg_try_advisory_xact_lock(old_writer_gate_key) THEN
      RAISE EXCEPTION 'service-principal writer gate is busy; retry transaction'
        USING ERRCODE = '40001';
    END IF;
    IF NOT pg_catalog.pg_try_advisory_xact_lock(new_writer_gate_key) THEN
      RAISE EXCEPTION 'service-principal writer gate is busy; retry transaction'
        USING ERRCODE = '40001';
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(old_account_id::text, 0)
    );
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new_account_id::text, 0)
    );
  ELSE
    IF NOT pg_catalog.pg_try_advisory_xact_lock(new_writer_gate_key) THEN
      RAISE EXCEPTION 'service-principal writer gate is busy; retry transaction'
        USING ERRCODE = '40001';
    END IF;
    IF NOT pg_catalog.pg_try_advisory_xact_lock(old_writer_gate_key) THEN
      RAISE EXCEPTION 'service-principal writer gate is busy; retry transaction'
        USING ERRCODE = '40001';
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new_account_id::text, 0)
    );
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(old_account_id::text, 0)
    );
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

REVOKE ALL ON FUNCTION app.lock_service_principal_authorization_write() FROM PUBLIC;

DROP TRIGGER IF EXISTS users_authorization_write_lock ON users;
CREATE TRIGGER users_authorization_write_lock
  BEFORE UPDATE OF account_id, principal_kind, interactive_login_enabled, is_active
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION app.lock_service_principal_authorization_write();

DROP TRIGGER IF EXISTS account_service_principals_authorization_write_lock
  ON account_service_principals;
CREATE TRIGGER account_service_principals_authorization_write_lock
  BEFORE INSERT OR UPDATE OR DELETE
  ON account_service_principals
  FOR EACH ROW
  EXECUTE FUNCTION app.lock_service_principal_authorization_write();
