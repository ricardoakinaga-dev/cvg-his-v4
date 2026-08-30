-- Keep WebAuthn credentials and challenges authoritative across API replicas.
-- The full FIDO verifier remains a separate hardening slice; this migration
-- closes the shared-runtime state and tenant-isolation boundary first.

CREATE TABLE IF NOT EXISTS auth_webauthn_credentials (
  credential_id text PRIMARY KEY,
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_type varchar(16) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_used_at timestamptz,
  nickname varchar(255),
  CONSTRAINT auth_webauthn_credentials_account_fk
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT auth_webauthn_credentials_account_user_fk
    FOREIGN KEY (account_id, user_id) REFERENCES users(account_id, id) ON DELETE CASCADE,
  CONSTRAINT auth_webauthn_credentials_counter_nonnegative
    CHECK (counter >= 0),
  CONSTRAINT auth_webauthn_credentials_device_type_valid
    CHECK (device_type IN ('platform', 'cross-platform'))
);

CREATE INDEX IF NOT EXISTS idx_auth_webauthn_credentials_account_user
  ON auth_webauthn_credentials(account_id, user_id);

ALTER TABLE auth_webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_webauthn_credentials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_webauthn_credentials_tenant_isolation
  ON auth_webauthn_credentials;
CREATE POLICY auth_webauthn_credentials_tenant_isolation
  ON auth_webauthn_credentials
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE TABLE IF NOT EXISTS auth_webauthn_challenges (
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  purpose varchar(32) NOT NULL,
  challenge text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT auth_webauthn_challenges_pk
    PRIMARY KEY (account_id, user_id, purpose),
  CONSTRAINT auth_webauthn_challenges_account_fk
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT auth_webauthn_challenges_account_user_fk
    FOREIGN KEY (account_id, user_id) REFERENCES users(account_id, id) ON DELETE CASCADE,
  CONSTRAINT auth_webauthn_challenges_purpose_valid
    CHECK (purpose IN ('registration', 'authentication')),
  CONSTRAINT auth_webauthn_challenges_challenge_nonempty
    CHECK (length(challenge) > 0)
);

CREATE INDEX IF NOT EXISTS idx_auth_webauthn_challenges_expires_at
  ON auth_webauthn_challenges(expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_webauthn_challenges_account_user
  ON auth_webauthn_challenges(account_id, user_id);

ALTER TABLE auth_webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_webauthn_challenges FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_webauthn_challenges_tenant_isolation
  ON auth_webauthn_challenges;
CREATE POLICY auth_webauthn_challenges_tenant_isolation
  ON auth_webauthn_challenges
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE auth_webauthn_credentials IS
  'Tenant-scoped WebAuthn credential metadata shared by all API replicas';
COMMENT ON TABLE auth_webauthn_challenges IS
  'Tenant-scoped single-use WebAuthn registration/assertion challenges shared by all API replicas';
