-- Commit an immutable dispatch identity before contacting the card provider.
-- Raw payment credentials/request bodies are never persisted here.
CREATE TABLE card_creation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  creation_key TEXT NOT NULL,
  fingerprint CHAR(64) NOT NULL,
  billing_record_id TEXT,
  provider_result JSONB,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(account_id, creation_key)
);
CREATE INDEX card_creation_billing_idx ON card_creation_attempts(account_id,billing_record_id);
ALTER TABLE card_creation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_creation_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY card_creation_tenant_isolation ON card_creation_attempts FOR ALL
  USING(account_id = app.current_account_id()) WITH CHECK(account_id = app.current_account_id());
