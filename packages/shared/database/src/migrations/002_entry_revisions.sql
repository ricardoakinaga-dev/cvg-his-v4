-- ENT-008: Add versioning for clinical entries
-- Created: 2026-03-26

-- Add version column to clinical_entries
ALTER TABLE clinical_entries ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create entry_revisions table for version history
CREATE TABLE IF NOT EXISTS entry_revisions (
  id VARCHAR(255) PRIMARY KEY,
  entry_id VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content VARCHAR(10000) NOT NULL,
  author_user_id VARCHAR(255) NOT NULL,
  reason VARCHAR(1000),
  created_at TIMESTAMP NOT NULL
);

-- Index for fast lookup by entry
CREATE INDEX IF NOT EXISTS idx_entry_revisions_entry_id ON entry_revisions(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_revisions_version ON entry_revisions(entry_id, version);
