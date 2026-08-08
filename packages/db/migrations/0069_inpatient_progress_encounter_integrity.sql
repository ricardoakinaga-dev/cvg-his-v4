-- A progress entry must reference the encounter of its own inpatient stay.

CREATE UNIQUE INDEX idx_inpatient_stays_account_id_id_encounter_id_unique
  ON inpatient_stays(account_id, id, encounter_id);

ALTER TABLE inpatient_progress
  ADD CONSTRAINT inpatient_progress_stay_encounter_fk
  FOREIGN KEY (account_id, stay_id, encounter_id)
  REFERENCES inpatient_stays(account_id, id, encounter_id) ON DELETE CASCADE;
