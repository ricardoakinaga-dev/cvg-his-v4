-- Vetus parity P2-03: bind preventive events to patient and owner context.

ALTER TABLE preventive_events
  ADD COLUMN IF NOT EXISTS patient_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_preventive_events_account_patient
  ON preventive_events (account_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_preventive_events_account_owner
  ON preventive_events (account_id, owner_id);
