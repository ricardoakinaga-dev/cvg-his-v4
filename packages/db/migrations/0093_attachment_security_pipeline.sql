ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS scan_status varchar(32) NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS scan_provider varchar(100),
  ADD COLUMN IF NOT EXISTS scan_reason varchar(500),
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz;

ALTER TABLE attachments
  DROP CONSTRAINT IF EXISTS attachments_scan_status_ck;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_scan_status_ck
  CHECK (scan_status IN ('quarantined', 'available', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_attachments_scan_status
  ON attachments (account_id, scan_status, created_at DESC);
