CREATE TABLE IF NOT EXISTS prescription_signatures (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  prescription_id varchar(255) NOT NULL REFERENCES clinical_entries(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  signed_by_user_id uuid NOT NULL REFERENCES users(id),
  signature_hash varchar(128) NOT NULL,
  signed_at timestamptz NOT NULL,
  UNIQUE (account_id, prescription_id, version)
);

CREATE INDEX IF NOT EXISTS idx_prescription_signatures_account
  ON prescription_signatures (account_id, signed_at DESC);

ALTER TABLE prescription_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_signatures FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prescription_signatures_tenant_isolation ON prescription_signatures;
CREATE POLICY prescription_signatures_tenant_isolation ON prescription_signatures
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
