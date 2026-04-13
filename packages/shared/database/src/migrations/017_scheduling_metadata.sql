ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS practitioner_staff_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS service_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS unit VARCHAR(120),
  ADD COLUMN IF NOT EXISTS specialty VARCHAR(120),
  ADD COLUMN IF NOT EXISTS resource_label VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_appointments_account_practitioner_slot
  ON appointments(account_id, practitioner_staff_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_account_service
  ON appointments(account_id, service_id);
