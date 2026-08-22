-- Keep MFA login challenges authoritative across API replicas.
-- A new password-authenticated login rotates generation, so any older locator
-- immediately becomes unusable without relying on process-local memory.

CREATE TABLE IF NOT EXISTS auth_mfa_login_challenges (
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  generation uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_window_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  attempt_count smallint NOT NULL DEFAULT 0,
  max_attempts smallint NOT NULL,
  tracking_window_seconds integer NOT NULL,
  lockout_duration_seconds integer NOT NULL,
  locked_until timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT auth_mfa_login_challenges_pk PRIMARY KEY (account_id, user_id),
  CONSTRAINT auth_mfa_login_challenges_account_fk
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT auth_mfa_login_challenges_account_user_fk
    FOREIGN KEY (account_id, user_id) REFERENCES users(account_id, id) ON DELETE CASCADE,
  CONSTRAINT auth_mfa_login_challenges_attempt_count_nonnegative
    CHECK (attempt_count >= 0),
  CONSTRAINT auth_mfa_login_challenges_max_attempts_positive
    CHECK (max_attempts > 0),
  CONSTRAINT auth_mfa_login_challenges_tracking_window_positive
    CHECK (tracking_window_seconds > 0),
  CONSTRAINT auth_mfa_login_challenges_lockout_duration_positive
    CHECK (lockout_duration_seconds > 0),
  CONSTRAINT auth_mfa_login_challenges_attempt_limit
    CHECK (attempt_count <= max_attempts)
);

CREATE INDEX IF NOT EXISTS idx_auth_mfa_login_challenges_expires_at
  ON auth_mfa_login_challenges(expires_at);

ALTER TABLE auth_mfa_login_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_mfa_login_challenges FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_mfa_login_challenges_tenant_isolation
  ON auth_mfa_login_challenges;
CREATE POLICY auth_mfa_login_challenges_tenant_isolation
  ON auth_mfa_login_challenges
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE auth_mfa_login_challenges IS
  'Single-use, tenant-scoped MFA login state shared by all API replicas';
