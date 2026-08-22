-- Persist pending TOTP enrollment so setup can move between API replicas.

ALTER TABLE mfa_credentials
  ADD COLUMN IF NOT EXISTS setup_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS secret_key_version text;

-- Inactive legacy rows cannot be proven to represent a live enrollment. Mark
-- them expired instead of silently accepting them after this migration.
UPDATE mfa_credentials
SET setup_expires_at = created_at
WHERE is_active = false
  AND setup_expires_at IS NULL;

ALTER TABLE mfa_credentials
  DROP CONSTRAINT IF EXISTS mfa_credentials_setup_state_valid;

ALTER TABLE mfa_credentials
  ADD CONSTRAINT mfa_credentials_setup_state_valid
  CHECK (
    (is_active = true AND setup_expires_at IS NULL)
    OR
    (is_active = false AND setup_expires_at IS NOT NULL)
  );

ALTER TABLE mfa_credentials FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN mfa_credentials.setup_expires_at IS
  'Expiry for an inactive pending enrollment; NULL only after atomic activation';
COMMENT ON COLUMN mfa_credentials.secret_key_version IS
  'Application encryption-key version used for the encrypted TOTP secret';
