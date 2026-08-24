-- Durable NFS-e operation claims.
-- A provider call may succeed immediately before a process dies. Persisting the
-- operation identity and lease lets a retry resume safely with the same
-- provider request key instead of issuing an untracked duplicate call.

ALTER TABLE fiscal_nfse_documents
  ADD COLUMN IF NOT EXISTS operation_key TEXT,
  ADD COLUMN IF NOT EXISTS operation_kind VARCHAR(20),
  ADD COLUMN IF NOT EXISTS operation_lease_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_operation_kind VARCHAR(20),
  ADD COLUMN IF NOT EXISTS last_provider_request_key TEXT;

ALTER TABLE fiscal_nfse_documents
  DROP CONSTRAINT IF EXISTS fiscal_nfse_documents_operation_kind_chk;

ALTER TABLE fiscal_nfse_documents
  ADD CONSTRAINT fiscal_nfse_documents_operation_kind_chk
  CHECK (operation_kind IS NULL OR operation_kind IN ('issue', 'cancel'));

ALTER TABLE fiscal_nfse_documents
  DROP CONSTRAINT IF EXISTS fiscal_nfse_documents_last_operation_kind_chk;

ALTER TABLE fiscal_nfse_documents
  ADD CONSTRAINT fiscal_nfse_documents_last_operation_kind_chk
  CHECK (last_operation_kind IS NULL OR last_operation_kind IN ('issue', 'cancel'));

CREATE UNIQUE INDEX IF NOT EXISTS fiscal_nfse_documents_operation_key_uidx
  ON fiscal_nfse_documents (account_id, operation_kind, operation_key)
  WHERE operation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS fiscal_nfse_documents_operation_lease_idx
  ON fiscal_nfse_documents (account_id, operation_lease_until)
  WHERE operation_lease_until IS NOT NULL;

COMMENT ON COLUMN fiscal_nfse_documents.operation_key IS
  'Idempotency identity of the currently claimed fiscal operation.';
COMMENT ON COLUMN fiscal_nfse_documents.last_provider_request_key IS
  'Stable provider idempotency key retained for reconciliation after a crash.';
