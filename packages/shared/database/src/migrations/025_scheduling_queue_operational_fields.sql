-- Persist operational routing metadata and transfer history for the scheduling queue

ALTER TABLE scheduling_queue_entries
  ADD COLUMN IF NOT EXISTS entry_type VARCHAR(50) NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS current_sector VARCHAR(120) NOT NULL DEFAULT 'Recepcao',
  ADD COLUMN IF NOT EXISTS current_responsible_user_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS current_responsible_staff_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS next_sector VARCHAR(120),
  ADD COLUMN IF NOT EXISTS operational_status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS clinical_status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS handoff_status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS last_transferred_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_transferred_by_user_id VARCHAR(255);

CREATE TABLE IF NOT EXISTS scheduling_queue_transfers (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  queue_entry_id VARCHAR(255) NOT NULL REFERENCES scheduling_queue_entries(id) ON DELETE CASCADE,
  encounter_id VARCHAR(255),
  from_sector VARCHAR(120) NOT NULL,
  to_sector VARCHAR(120) NOT NULL,
  sent_by_user_id VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP NOT NULL,
  received_by_user_id VARCHAR(255),
  received_at TIMESTAMP,
  responsible_user_id VARCHAR(255),
  responsible_staff_id VARCHAR(255),
  next_sector VARCHAR(120),
  reason VARCHAR(500) NOT NULL,
  urgency VARCHAR(20) NOT NULL DEFAULT 'medium',
  billing_record_id VARCHAR(255),
  counter_sale_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_account_sector_status
  ON scheduling_queue_entries (account_id, current_sector, status);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_account_responsible_status
  ON scheduling_queue_entries (account_id, current_responsible_staff_id, status);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_transfers_account_entry
  ON scheduling_queue_transfers (account_id, queue_entry_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_transfers_account_sector
  ON scheduling_queue_transfers (account_id, to_sector, sent_at);
