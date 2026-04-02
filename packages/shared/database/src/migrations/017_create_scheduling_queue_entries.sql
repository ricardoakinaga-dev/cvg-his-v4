-- Persist scheduling operational queue entries across restarts

CREATE TABLE IF NOT EXISTS scheduling_queue_entries (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  appointment_id VARCHAR(255),
  encounter_id VARCHAR(255),
  reason VARCHAR(500) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  checked_in_at TIMESTAMP NOT NULL,
  called_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_account_checked_in
  ON scheduling_queue_entries (account_id, checked_in_at);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_account_status
  ON scheduling_queue_entries (account_id, status);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_account_priority
  ON scheduling_queue_entries (account_id, priority, checked_in_at);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_encounter
  ON scheduling_queue_entries (encounter_id);
