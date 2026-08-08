CREATE UNIQUE INDEX idx_patients_account_id_owner_unique
  ON patients(account_id, id, owner_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM appointments AS appointment
    LEFT JOIN patients AS patient
      ON patient.account_id = appointment.account_id
     AND patient.id = appointment.patient_id
     AND patient.owner_id = appointment.owner_id
    WHERE patient.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot enforce appointment ownership: patient and owner relationship is invalid';
  END IF;
END $$;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_account_patient_owner_fk
  FOREIGN KEY (account_id, patient_id, owner_id)
  REFERENCES patients(account_id, id, owner_id)
  ON DELETE CASCADE;
