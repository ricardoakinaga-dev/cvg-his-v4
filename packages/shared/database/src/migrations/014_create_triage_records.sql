-- Migration 014: Create triage_records table

CREATE TABLE IF NOT EXISTS triage_records (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'normal',
  chief_complaint VARCHAR(1000) NOT NULL,
  initial_notes TEXT,
  alerts_json JSONB DEFAULT '[]',
  destination VARCHAR(100),
  triaged_by VARCHAR(255) NOT NULL,
  triaged_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT triage_priority_chk CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_triage_encounter ON triage_records(encounter_id);
CREATE INDEX IF NOT EXISTS idx_triage_account ON triage_records(account_id);
CREATE INDEX IF NOT EXISTS idx_triage_priority ON triage_records(account_id, priority);
