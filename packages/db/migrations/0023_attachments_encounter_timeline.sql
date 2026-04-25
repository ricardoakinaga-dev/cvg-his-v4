-- Runtime support tables still consumed from packages/shared/database.
-- Keeps the canonical packages/db migration rail aligned with the API repositories.

CREATE TABLE IF NOT EXISTS encounter_timeline (
  id VARCHAR(255) PRIMARY KEY,
  encounter_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  summary VARCHAR(500),
  actor_user_id VARCHAR(255),
  metadata JSONB,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_encounter_timeline_encounter_id
  ON encounter_timeline (encounter_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  linked_entity_type VARCHAR(50) NOT NULL,
  linked_entity_id VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  checksum VARCHAR(255) NOT NULL,
  size_bytes BIGINT,
  source VARCHAR(50) NOT NULL,
  uploaded_by_user_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_linked_entity
  ON attachments (linked_entity_type, linked_entity_id);

CREATE INDEX IF NOT EXISTS idx_attachments_account_id
  ON attachments (account_id);
