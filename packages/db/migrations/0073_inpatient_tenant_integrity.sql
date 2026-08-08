-- Prevent inpatient references from crossing account boundaries.

CREATE UNIQUE INDEX IF NOT EXISTS idx_beds_account_id_id_unique
  ON beds(account_id, id);

ALTER TABLE inpatient_stays
  DROP CONSTRAINT inpatient_stays_transfer_bed_fk,
  ADD CONSTRAINT inpatient_stays_account_encounter_patient_fk
    FOREIGN KEY (account_id, encounter_id, patient_id)
    REFERENCES encounters(account_id, id, patient_id) ON DELETE RESTRICT,
  ADD CONSTRAINT inpatient_stays_account_owner_fk
    FOREIGN KEY (account_id, owner_id)
    REFERENCES owners(account_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT inpatient_stays_account_admitted_by_fk
    FOREIGN KEY (account_id, admitted_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT inpatient_stays_account_bed_fk
    FOREIGN KEY (account_id, bed_id)
    REFERENCES beds(account_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT inpatient_stays_account_transfer_bed_fk
    FOREIGN KEY (account_id, transfer_to_bed_id)
    REFERENCES beds(account_id, id) ON DELETE SET NULL;
