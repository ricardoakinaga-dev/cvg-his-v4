-- Reject reuse of an already accepted TOTP time step across API replicas.
-- The application updates this value with one conditional UPDATE so the
-- database, rather than a process-local cache, is the replay authority.

ALTER TABLE mfa_credentials
  ADD COLUMN IF NOT EXISTS last_totp_counter integer;

ALTER TABLE mfa_credentials
  DROP CONSTRAINT IF EXISTS mfa_credentials_last_totp_counter_nonnegative;

ALTER TABLE mfa_credentials
  ADD CONSTRAINT mfa_credentials_last_totp_counter_nonnegative
  CHECK (last_totp_counter IS NULL OR last_totp_counter >= 0);

COMMENT ON COLUMN mfa_credentials.last_totp_counter IS
  'Highest TOTP time-step accepted for this credential; advanced atomically to reject replay';
