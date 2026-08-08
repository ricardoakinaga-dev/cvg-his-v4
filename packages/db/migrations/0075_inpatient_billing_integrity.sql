-- Keep legacy billing identifiers textual while enforcing the full tenant relationship.

ALTER TABLE inpatient_daily_charges
  ALTER COLUMN billing_record_id TYPE text USING billing_record_id::text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_records_account_id_id_unique
  ON billing_records(account_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS inpatient_stays_active_encounter_unique
  ON inpatient_stays(account_id, encounter_id)
  WHERE status <> 'discharged';

ALTER TABLE inpatient_daily_charges
  ADD CONSTRAINT inpatient_daily_charges_account_stay_encounter_fk
    FOREIGN KEY (account_id, stay_id, encounter_id)
    REFERENCES inpatient_stays(account_id, id, encounter_id) ON DELETE CASCADE,
  ADD CONSTRAINT inpatient_daily_charges_account_encounter_patient_fk
    FOREIGN KEY (account_id, encounter_id, patient_id)
    REFERENCES encounters(account_id, id, patient_id) ON DELETE RESTRICT,
  ADD CONSTRAINT inpatient_daily_charges_account_billing_record_fk
    FOREIGN KEY (account_id, billing_record_id)
    REFERENCES billing_records(account_id, id) ON DELETE RESTRICT;

ALTER TABLE inpatient_occurrences
  ADD CONSTRAINT inpatient_occurrences_account_stay_encounter_fk
    FOREIGN KEY (account_id, stay_id, encounter_id)
    REFERENCES inpatient_stays(account_id, id, encounter_id) ON DELETE CASCADE;
