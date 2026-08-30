-- LAB-002 local provider-ingress hardening.
-- Expand the legacy ledger without changing its tenant primary key. Existing
-- rows remain reportable as legacy history; new provider callbacks must carry
-- an immutable protocol fingerprint and enter human review first.

ALTER TABLE laboratory_result_imports
  ADD COLUMN IF NOT EXISTS provider_code VARCHAR(64) NOT NULL DEFAULT 'equipment-bridge',
  ADD COLUMN IF NOT EXISTS schema_version VARCHAR(32) NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS signature_key_id VARCHAR(128) NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS payload_fingerprint VARCHAR(64) NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000';

ALTER TABLE laboratory_result_imports
  ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ;

UPDATE laboratory_result_imports
   SET observed_at = imported_at
 WHERE observed_at IS NULL;

ALTER TABLE laboratory_result_imports
  ALTER COLUMN observed_at SET NOT NULL;

ALTER TABLE laboratory_result_imports
  DROP CONSTRAINT IF EXISTS laboratory_result_imports_status_check;

ALTER TABLE laboratory_result_imports
  ADD CONSTRAINT laboratory_result_imports_status_check
  CHECK (status IN ('pending_human_review', 'imported', 'failed'));

ALTER TABLE laboratory_result_imports
  DROP CONSTRAINT IF EXISTS laboratory_result_imports_provider_code_check;
ALTER TABLE laboratory_result_imports
  ADD CONSTRAINT laboratory_result_imports_provider_code_check
  CHECK (length(provider_code) BETWEEN 1 AND 64);

ALTER TABLE laboratory_result_imports
  DROP CONSTRAINT IF EXISTS laboratory_result_imports_schema_version_check;
ALTER TABLE laboratory_result_imports
  ADD CONSTRAINT laboratory_result_imports_schema_version_check
  CHECK (length(schema_version) BETWEEN 1 AND 32);

ALTER TABLE laboratory_result_imports
  DROP CONSTRAINT IF EXISTS laboratory_result_imports_signature_key_id_check;
ALTER TABLE laboratory_result_imports
  ADD CONSTRAINT laboratory_result_imports_signature_key_id_check
  CHECK (length(signature_key_id) BETWEEN 1 AND 128);

ALTER TABLE laboratory_result_imports
  DROP CONSTRAINT IF EXISTS laboratory_result_imports_payload_fingerprint_check;
ALTER TABLE laboratory_result_imports
  ADD CONSTRAINT laboratory_result_imports_payload_fingerprint_check
  CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$');

CREATE OR REPLACE FUNCTION app.guard_laboratory_provider_ingress_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app, pg_temp
AS $guard$
BEGIN
  IF NEW.account_id IS DISTINCT FROM OLD.account_id
     OR NEW.external_result_id IS DISTINCT FROM OLD.external_result_id
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.equipment_id IS DISTINCT FROM OLD.equipment_id
     OR NEW.provider_code IS DISTINCT FROM OLD.provider_code
     OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
     OR NEW.signature_key_id IS DISTINCT FROM OLD.signature_key_id
     OR NEW.payload_fingerprint IS DISTINCT FROM OLD.payload_fingerprint
     OR NEW.observed_at IS DISTINCT FROM OLD.observed_at
     OR NEW.imported_at IS DISTINCT FROM OLD.imported_at
     OR NEW.result_summary IS DISTINCT FROM OLD.result_summary THEN
    RAISE EXCEPTION 'Laboratory provider ingress facts are immutable'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$guard$;

DROP TRIGGER IF EXISTS laboratory_provider_ingress_immutability_trigger
  ON laboratory_result_imports;
CREATE TRIGGER laboratory_provider_ingress_immutability_trigger
  BEFORE UPDATE ON laboratory_result_imports
  FOR EACH ROW
  EXECUTE FUNCTION app.guard_laboratory_provider_ingress_immutability();

CREATE INDEX IF NOT EXISTS laboratory_result_imports_account_provider_time
  ON laboratory_result_imports(account_id, provider_code, imported_at DESC);

INSERT INTO permissions (key, description)
VALUES (
  'laboratory.results.write',
  'Accept authenticated laboratory provider results for human review.'
)
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;

COMMENT ON TABLE laboratory_result_imports IS
  'Tenant-scoped laboratory provider ingress ledger; external results are immutable and pending human review before clinical mutation.';
COMMENT ON COLUMN laboratory_result_imports.payload_fingerprint IS
  'SHA-256 fingerprint of the strict versioned provider payload; zero legacy values are not replayable.';
COMMENT ON COLUMN laboratory_result_imports.observed_at IS
  'Canonical UTC time reported by the provider, distinct from local receipt/import time.';
COMMENT ON FUNCTION app.guard_laboratory_provider_ingress_immutability() IS
  'Prevents provider identity and payload facts from changing after ingress; workflow fields remain mutable for human review.';
