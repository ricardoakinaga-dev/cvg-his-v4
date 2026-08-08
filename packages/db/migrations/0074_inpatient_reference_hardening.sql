-- Complete tenant-aware inpatient references without rewriting legacy occurrence IDs.

CREATE SCHEMA IF NOT EXISTS migration;
CREATE TABLE IF NOT EXISTS migration.inpatient_reference_quarantine (
  source_table text NOT NULL,
  source_id text NOT NULL,
  row_data jsonb NOT NULL,
  reason text NOT NULL,
  quarantined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_table, source_id)
);

INSERT INTO migration.inpatient_reference_quarantine (source_table, source_id, row_data, reason)
SELECT 'inpatient_occurrences', id, to_jsonb(occurrence), 'invalid legacy UUID reference'
FROM inpatient_occurrences occurrence
WHERE account_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR stay_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR encounter_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR authored_by_user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
ON CONFLICT (source_table, source_id) DO NOTHING;

DELETE FROM inpatient_occurrences
WHERE account_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR stay_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR encounter_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR authored_by_user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

INSERT INTO migration.inpatient_reference_quarantine (source_table, source_id, row_data, reason)
SELECT 'inpatient_daily_charges', id, to_jsonb(charge), 'invalid legacy UUID reference'
FROM inpatient_daily_charges charge
WHERE account_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR stay_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR encounter_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR patient_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR created_by_user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
ON CONFLICT (source_table, source_id) DO NOTHING;

DELETE FROM inpatient_daily_charges
WHERE account_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR stay_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR encounter_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR patient_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   OR created_by_user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

ALTER TABLE inpatient_stays
  DROP CONSTRAINT inpatient_stays_account_transfer_bed_fk,
  ADD CONSTRAINT inpatient_stays_account_transfer_bed_fk
    FOREIGN KEY (account_id, transfer_to_bed_id)
    REFERENCES beds(account_id, id) ON DELETE SET NULL (transfer_to_bed_id),
  ADD CONSTRAINT inpatient_stays_account_patient_fk
    FOREIGN KEY (account_id, patient_id)
    REFERENCES patients(account_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT inpatient_stays_account_discharged_by_fk
    FOREIGN KEY (account_id, discharged_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT;

DROP POLICY IF EXISTS inpatient_occurrences_tenant_isolation ON inpatient_occurrences;
ALTER TABLE inpatient_occurrences
  ALTER COLUMN account_id TYPE uuid USING account_id::uuid,
  ALTER COLUMN stay_id TYPE uuid USING stay_id::uuid,
  ALTER COLUMN encounter_id TYPE uuid USING encounter_id::uuid,
  ALTER COLUMN authored_by_user_id TYPE uuid USING authored_by_user_id::uuid,
  ADD CONSTRAINT inpatient_occurrences_account_stay_fk
    FOREIGN KEY (account_id, stay_id)
    REFERENCES inpatient_stays(account_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT inpatient_occurrences_account_encounter_fk
    FOREIGN KEY (account_id, encounter_id)
    REFERENCES encounters(account_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT inpatient_occurrences_account_author_fk
    FOREIGN KEY (account_id, authored_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT;

CREATE POLICY inpatient_occurrences_tenant_isolation ON inpatient_occurrences
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

DROP POLICY IF EXISTS inpatient_daily_charges_tenant_isolation ON inpatient_daily_charges;
ALTER TABLE inpatient_daily_charges
  ALTER COLUMN account_id TYPE uuid USING account_id::uuid,
  ALTER COLUMN stay_id TYPE uuid USING stay_id::uuid,
  ALTER COLUMN encounter_id TYPE uuid USING encounter_id::uuid,
  ALTER COLUMN patient_id TYPE uuid USING patient_id::uuid,
  ALTER COLUMN created_by_user_id TYPE uuid USING created_by_user_id::uuid,
  ADD CONSTRAINT inpatient_daily_charges_account_stay_fk
    FOREIGN KEY (account_id, stay_id)
    REFERENCES inpatient_stays(account_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT inpatient_daily_charges_account_encounter_fk
    FOREIGN KEY (account_id, encounter_id)
    REFERENCES encounters(account_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT inpatient_daily_charges_account_patient_fk
    FOREIGN KEY (account_id, patient_id)
    REFERENCES patients(account_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT inpatient_daily_charges_account_author_fk
    FOREIGN KEY (account_id, created_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT;

CREATE POLICY inpatient_daily_charges_tenant_isolation ON inpatient_daily_charges
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE OR REPLACE FUNCTION app.assert_inpatient_sector_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sector_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sectors
    WHERE id = NEW.sector_id AND account_id = NEW.account_id::text
  ) THEN
    RAISE EXCEPTION 'inpatient sector does not belong to account';
  END IF;
  IF NEW.transfer_to_sector_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sectors
    WHERE id = NEW.transfer_to_sector_id AND account_id = NEW.account_id::text
  ) THEN
    RAISE EXCEPTION 'inpatient transfer sector does not belong to account';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inpatient_stays_sector_tenant_guard ON inpatient_stays;
CREATE TRIGGER inpatient_stays_sector_tenant_guard
  BEFORE INSERT OR UPDATE OF account_id, sector_id, transfer_to_sector_id
  ON inpatient_stays
  FOR EACH ROW EXECUTE FUNCTION app.assert_inpatient_sector_tenant();
