ALTER TABLE clinical_entries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE clinical_entries
  ADD COLUMN IF NOT EXISTS deleted_by_user_id VARCHAR(255);

ALTER TABLE clinical_entries
  ADD COLUMN IF NOT EXISTS delete_reason VARCHAR(1000);
