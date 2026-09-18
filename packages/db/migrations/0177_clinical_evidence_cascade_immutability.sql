-- Protect evidence even when a parent DELETE reaches it through an FK action.
-- PostgreSQL runs referential actions as the table owner, so current_user and
-- pg_trigger_depth cannot identify or authorize the initiating application.
CREATE OR REPLACE FUNCTION app.guard_clinical_evidence_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $guard$
DECLARE
  requested_role text := current_setting('role', true);
  actor_name name;
  maintenance_allowed boolean;
BEGIN
  -- "role" is PostgreSQL's protected SET ROLE setting, not an application GUC.
  -- A login cannot name an unauthorized role using SET ROLE or set_config.
  actor_name := CASE
    WHEN requested_role IS NULL OR requested_role = 'none' THEN session_user
    ELSE requested_role::name
  END;
  SELECT actor.rolsuper OR actor.oid = evidence.relowner
    INTO maintenance_allowed
    FROM pg_roles actor
    CROSS JOIN pg_class evidence
   WHERE actor.rolname = actor_name AND evidence.oid = TG_RELID;
  IF maintenance_allowed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Clinical evidence is append-only for runtime roles'
      USING ERRCODE = '42501', CONSTRAINT = 'clinical_evidence_append_only';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'TRUNCATE' THEN RETURN NULL; END IF;
  RETURN NEW;
END;
$guard$;

CREATE TRIGGER clinical_timeline_immutable_rows
  BEFORE UPDATE OR DELETE ON clinical_timeline
  FOR EACH ROW EXECUTE FUNCTION app.guard_clinical_evidence_immutability();
CREATE TRIGGER clinical_timeline_immutable_truncate
  BEFORE TRUNCATE ON clinical_timeline
  FOR EACH STATEMENT EXECUTE FUNCTION app.guard_clinical_evidence_immutability();
CREATE TRIGGER encounter_timeline_immutable_rows
  BEFORE UPDATE OR DELETE ON encounter_timeline
  FOR EACH ROW EXECUTE FUNCTION app.guard_clinical_evidence_immutability();
CREATE TRIGGER encounter_timeline_immutable_truncate
  BEFORE TRUNCATE ON encounter_timeline
  FOR EACH STATEMENT EXECUTE FUNCTION app.guard_clinical_evidence_immutability();
CREATE TRIGGER audit_events_immutable_rows
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION app.guard_clinical_evidence_immutability();
CREATE TRIGGER audit_events_immutable_truncate
  BEFORE TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION app.guard_clinical_evidence_immutability();

COMMENT ON FUNCTION app.guard_clinical_evidence_immutability() IS
  'Rejects direct and referential-action mutations by the initiating runtime role; permits explicit table-owner or superuser maintenance.';
