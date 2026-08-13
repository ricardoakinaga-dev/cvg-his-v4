-- Align the persisted appointments table with the scheduling runtime without
-- discarding the canonical start/end/professional columns.

ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'checked_in';

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_type VARCHAR(50);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS practitioner_staff_id UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS unit VARCHAR(120);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS specialty VARCHAR(120);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS resource_label VARCHAR(120);

UPDATE appointments
SET duration = GREATEST(1, CEIL(EXTRACT(EPOCH FROM (end_at - start_at)) / 60.0)::integer)
WHERE duration IS NULL;

UPDATE appointments
SET visit_type = CASE type::text
  WHEN 'return' THEN 'return'
  ELSE 'scheduled'
END
WHERE visit_type IS NULL;

UPDATE appointments
SET reason = COALESCE(notes, 'Agendamento migrado')
WHERE reason IS NULL;

ALTER TABLE appointments ALTER COLUMN duration SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN visit_type SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN reason SET NOT NULL;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_duration_positive;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_duration_positive CHECK (duration > 0);

CREATE UNIQUE INDEX IF NOT EXISTS staff_id_account_id_unique
  ON staff (id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS services_id_account_id_unique
  ON services (id, account_id);

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_practitioner_staff_same_account_fk;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_practitioner_staff_same_account_fk
  FOREIGN KEY (practitioner_staff_id, account_id)
  REFERENCES staff (id, account_id)
  ON DELETE RESTRICT;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_service_same_account_fk;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_service_same_account_fk
  FOREIGN KEY (service_id, account_id)
  REFERENCES services (id, account_id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_appointments_account_practitioner_start
  ON appointments (account_id, practitioner_staff_id, start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_account_service_start
  ON appointments (account_id, service_id, start_at);
