-- Prevent privileged runtime connections from linking encounters across accounts.

ALTER TABLE encounters
  ADD CONSTRAINT encounters_account_patient_fk
  FOREIGN KEY (account_id, patient_id)
  REFERENCES patients(account_id, id) ON DELETE CASCADE;
ALTER TABLE encounters
  ADD CONSTRAINT encounters_account_owner_fk
  FOREIGN KEY (account_id, owner_id)
  REFERENCES owners(account_id, id) ON DELETE CASCADE;
ALTER TABLE encounters
  ADD CONSTRAINT encounters_account_opened_by_fk
  FOREIGN KEY (account_id, opened_by_user_id)
  REFERENCES users(account_id, id) ON DELETE RESTRICT;
ALTER TABLE encounters
  ADD CONSTRAINT encounters_account_closed_by_fk
  FOREIGN KEY (account_id, closed_by_user_id)
  REFERENCES users(account_id, id) ON DELETE RESTRICT;
