-- MIG-002: additive internal fingerprints for safe Vetus source-reference replay.
-- Existing imports remain valid legacy records because the columns are nullable.

ALTER TABLE vetus_import_logs
  ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);

ALTER TABLE vetus_import_batches
  ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vetus_import_logs_request_hash_format'
  ) THEN
    ALTER TABLE vetus_import_logs
      ADD CONSTRAINT vetus_import_logs_request_hash_format
      CHECK (request_hash IS NULL OR request_hash ~ '^[0-9a-f]{64}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vetus_import_batches_request_hash_format'
  ) THEN
    ALTER TABLE vetus_import_batches
      ADD CONSTRAINT vetus_import_batches_request_hash_format
      CHECK (request_hash IS NULL OR request_hash ~ '^[0-9a-f]{64}$');
  END IF;
END $$;

COMMENT ON COLUMN vetus_import_logs.request_hash IS
  'Internal SHA-256 fingerprint of the normalized import command; NULL denotes a legacy record.';
COMMENT ON COLUMN vetus_import_batches.request_hash IS
  'Internal SHA-256 fingerprint of the normalized batch command; NULL denotes a legacy record.';
