-- An encounter owner must be the canonical owner of its patient.

ALTER TABLE encounters
  ADD CONSTRAINT encounters_account_patient_owner_fk
  FOREIGN KEY (account_id, patient_id, owner_id)
  REFERENCES patients(account_id, id, owner_id) ON DELETE CASCADE;
