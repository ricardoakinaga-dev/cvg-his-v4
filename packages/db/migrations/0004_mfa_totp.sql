-- Onda 1 - Fase 4: MFA TOTP
-- Criação da tabela mfa_credentials para armazenamento de credenciais TOTP

CREATE TABLE IF NOT EXISTS mfa_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  recovery_codes_hash JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  last_recovery_codes_regenerated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS mfa_credentials_user_id_unique ON mfa_credentials (user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_credentials_user_id ON mfa_credentials (user_id);

-- Comment para documentar que secret_encrypted deve ser criptografado antes de armazenar
COMMENT ON COLUMN mfa_credentials.secret_encrypted IS 'TOTP secret encrypted with application-level encryption';
COMMENT ON COLUMN mfa_credentials.recovery_codes_hash IS 'SHA-256 hashes of recovery codes, not plaintext';
