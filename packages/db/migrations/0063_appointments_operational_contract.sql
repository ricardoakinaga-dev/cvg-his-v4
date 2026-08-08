ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'checked_in';

ALTER TABLE appointments
  ADD COLUMN visit_type varchar(16),
  ADD COLUMN reason text,
  ADD COLUMN practitioner_staff_id uuid,
  ADD COLUMN service_id uuid,
  ADD COLUMN unit varchar(120),
  ADD COLUMN specialty varchar(120),
  ADD COLUMN resource_label varchar(120),
  ALTER COLUMN professional_user_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM appointments AS appointment
    JOIN staff AS staff_record
      ON staff_record.account_id = appointment.account_id
     AND staff_record.user_id = appointment.professional_user_id
    WHERE appointment.professional_user_id IS NOT NULL
    GROUP BY appointment.id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot backfill appointments: professional user maps to multiple staff records';
  END IF;
END $$;

UPDATE appointments AS appointment
SET practitioner_staff_id = staff_record.id
FROM staff AS staff_record
WHERE appointment.professional_user_id IS NOT NULL
  AND staff_record.account_id = appointment.account_id
  AND staff_record.user_id = appointment.professional_user_id;

UPDATE appointments
SET visit_type = CASE WHEN type = 'return' THEN 'return' ELSE 'scheduled' END,
    reason = COALESCE(NULLIF(btrim(notes), ''), 'Agendamento migrado')
WHERE visit_type IS NULL OR reason IS NULL;

ALTER TABLE appointments
  ALTER COLUMN visit_type SET DEFAULT 'scheduled',
  ALTER COLUMN visit_type SET NOT NULL,
  ALTER COLUMN reason SET NOT NULL,
  ADD CONSTRAINT appointments_time_range_chk CHECK (end_at > start_at),
  ADD CONSTRAINT appointments_visit_type_chk CHECK (visit_type IN ('walk_in', 'scheduled', 'return'));

CREATE UNIQUE INDEX idx_owners_account_id_id_unique ON owners(account_id, id);
CREATE UNIQUE INDEX idx_patients_account_id_id_unique ON patients(account_id, id);
CREATE UNIQUE INDEX idx_staff_account_id_id_unique ON staff(account_id, id);
CREATE UNIQUE INDEX idx_services_account_id_id_unique ON services(account_id, id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM appointments AS appointment
    LEFT JOIN patients AS patient
      ON patient.account_id = appointment.account_id AND patient.id = appointment.patient_id
    LEFT JOIN owners AS owner_record
      ON owner_record.account_id = appointment.account_id AND owner_record.id = appointment.owner_id
    LEFT JOIN users AS professional
      ON professional.account_id = appointment.account_id
     AND professional.id = appointment.professional_user_id
    LEFT JOIN staff AS practitioner
      ON practitioner.account_id = appointment.account_id
     AND practitioner.id = appointment.practitioner_staff_id
    LEFT JOIN services AS service_record
      ON service_record.account_id = appointment.account_id
     AND service_record.id = appointment.service_id
    WHERE patient.id IS NULL
       OR owner_record.id IS NULL
       OR (appointment.professional_user_id IS NOT NULL AND professional.id IS NULL)
       OR (appointment.practitioner_staff_id IS NOT NULL AND practitioner.id IS NULL)
       OR (appointment.service_id IS NOT NULL AND service_record.id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Cannot scope appointments: cross-account or orphan relationship detected';
  END IF;
END $$;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_account_patient_fk
    FOREIGN KEY (account_id, patient_id) REFERENCES patients(account_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT appointments_account_owner_fk
    FOREIGN KEY (account_id, owner_id) REFERENCES owners(account_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT appointments_account_professional_user_fk
    FOREIGN KEY (account_id, professional_user_id) REFERENCES users(account_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT appointments_account_practitioner_staff_fk
    FOREIGN KEY (account_id, practitioner_staff_id) REFERENCES staff(account_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT appointments_account_service_fk
    FOREIGN KEY (account_id, service_id) REFERENCES services(account_id, id) ON DELETE RESTRICT;

CREATE INDEX idx_appointments_account_practitioner_start
  ON appointments(account_id, practitioner_staff_id, start_at);
CREATE INDEX idx_appointments_account_service_start
  ON appointments(account_id, service_id, start_at);
