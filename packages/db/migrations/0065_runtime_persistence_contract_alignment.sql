-- Align the durable clinical schema with the contracts used by the API runtime.
-- The changes are additive for legacy inpatient rows and preserve the original
-- document attachment FK used by clinical_timeline.

ALTER TYPE inpatient_stay_status ADD VALUE IF NOT EXISTS 'admitted';
ALTER TYPE inpatient_stay_status ADD VALUE IF NOT EXISTS 'stable';

ALTER TABLE inpatient_stays
  ADD COLUMN IF NOT EXISTS unit VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ward VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bed VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sector_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS discharge_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS transfer_to_unit VARCHAR(100),
  ADD COLUMN IF NOT EXISTS transfer_to_ward VARCHAR(100),
  ADD COLUMN IF NOT EXISTS transfer_to_sector_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS transfer_to_bed_id UUID;

-- Runtime admissions can be created before a canonical ward/bed catalog entry
-- exists. Human-readable placement remains mandatory at the service boundary,
-- while legacy ward_id/bed_id references stay available when known.
ALTER TABLE inpatient_stays
  ALTER COLUMN ward_id DROP NOT NULL,
  ALTER COLUMN bed_id DROP NOT NULL;

ALTER TABLE inpatient_stays
  DROP CONSTRAINT IF EXISTS inpatient_stays_sector_id_fkey;
ALTER TABLE inpatient_stays
  ADD CONSTRAINT inpatient_stays_sector_id_fkey
  FOREIGN KEY (sector_id) REFERENCES sectors(id);

ALTER TABLE inpatient_stays
  DROP CONSTRAINT IF EXISTS inpatient_stays_transfer_to_sector_id_fkey;
ALTER TABLE inpatient_stays
  ADD CONSTRAINT inpatient_stays_transfer_to_sector_id_fkey
  FOREIGN KEY (transfer_to_sector_id) REFERENCES sectors(id);

ALTER TABLE inpatient_stays
  DROP CONSTRAINT IF EXISTS inpatient_stays_transfer_to_bed_id_fkey;
ALTER TABLE inpatient_stays
  ADD CONSTRAINT inpatient_stays_transfer_to_bed_id_fkey
  FOREIGN KEY (transfer_to_bed_id) REFERENCES beds(id);

DROP TRIGGER IF EXISTS tenant_fk_inpatient_stays_sector_id ON inpatient_stays;
DROP TRIGGER IF EXISTS tenant_ref_inpatient_stays_sector_id_23645e00 ON inpatient_stays;
CREATE TRIGGER tenant_ref_inpatient_stays_sector_id_23645e00
  BEFORE INSERT OR UPDATE OF sector_id, account_id ON inpatient_stays
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_same_tenant_reference('public', 'sectors', 'sector_id');

DROP TRIGGER IF EXISTS tenant_fk_inpatient_stays_transfer_sector ON inpatient_stays;
DROP TRIGGER IF EXISTS tenant_ref_inpatient_stays_transfer_to_sec_ea413c37 ON inpatient_stays;
CREATE TRIGGER tenant_ref_inpatient_stays_transfer_to_sec_ea413c37
  BEFORE INSERT OR UPDATE OF transfer_to_sector_id, account_id ON inpatient_stays
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_same_tenant_reference(
    'public',
    'sectors',
    'transfer_to_sector_id'
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_beds_id_account
  ON beds (id, account_id);

ALTER TABLE inpatient_stays
  DROP CONSTRAINT IF EXISTS inpatient_stays_transfer_bed_account_fk;
ALTER TABLE inpatient_stays
  ADD CONSTRAINT inpatient_stays_transfer_bed_account_fk
  FOREIGN KEY (transfer_to_bed_id, account_id) REFERENCES beds(id, account_id);

DROP INDEX IF EXISTS inpatient_stays_active_bed_unique;
CREATE UNIQUE INDEX inpatient_stays_active_bed_unique
  ON inpatient_stays (bed_id)
  WHERE bed_id IS NOT NULL AND status <> 'discharged';

CREATE INDEX IF NOT EXISTS idx_inpatient_stays_account_sector_status
  ON inpatient_stays (account_id, sector_id, status);

ALTER TABLE surgery_cases
  DROP CONSTRAINT IF EXISTS surgery_cases_status_check;
ALTER TABLE surgery_cases
  ADD CONSTRAINT surgery_cases_status_check CHECK (
    status IN (
      'requested',
      'scheduled',
      'preparation',
      'pre_op',
      'in_progress',
      'recovery',
      'completed',
      'cancelled'
    )
  );

ALTER TABLE clinical_timeline
  ADD COLUMN IF NOT EXISTS runtime_attachment_id VARCHAR(255);

ALTER TABLE clinical_timeline
  DROP CONSTRAINT IF EXISTS clinical_timeline_runtime_attachment_id_fkey;
ALTER TABLE clinical_timeline
  ADD CONSTRAINT clinical_timeline_runtime_attachment_id_fkey
  FOREIGN KEY (runtime_attachment_id) REFERENCES attachments(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS tenant_fk_clinical_timeline_runtime_attachment ON clinical_timeline;
DROP TRIGGER IF EXISTS tenant_ref_clinical_timeline_runtime_attachm_0c93c17f ON clinical_timeline;
CREATE TRIGGER tenant_ref_clinical_timeline_runtime_attachm_0c93c17f
  BEFORE INSERT OR UPDATE OF runtime_attachment_id, account_id ON clinical_timeline
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_same_tenant_reference(
    'public',
    'attachments',
    'runtime_attachment_id'
  );

CREATE INDEX IF NOT EXISTS idx_clinical_timeline_runtime_attachment
  ON clinical_timeline (runtime_attachment_id)
  WHERE runtime_attachment_id IS NOT NULL;

ALTER TABLE ncm_entries
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
