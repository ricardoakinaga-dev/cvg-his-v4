-- PR-FF-04: Feature Flags Schema and Persistence
-- Creates canonical storage for feature flags with overrides support

-- 1. Feature flags main table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  key VARCHAR(128) NOT NULL,
  owner VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  default_value JSONB NOT NULL DEFAULT 'false'::jsonb,
  enabled JSONB NOT NULL DEFAULT 'true'::jsonb,
  scopes JSONB NOT NULL DEFAULT '["environment"]',
  expires_at TIMESTAMPTZ,
  audit_required JSONB NOT NULL DEFAULT 'false'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_account_flag_key UNIQUE (account_id, key)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_account_key ON feature_flags (account_id, key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_account_enabled ON feature_flags (account_id, enabled);

-- 2. Feature flag overrides table (per-environment, per-account, per-user)
CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  environment VARCHAR(32),
  account_id_override UUID,
  user_id UUID,
  percentage JSONB,
  allowed_users JSONB NOT NULL DEFAULT '[]',
  enabled JSONB NOT NULL DEFAULT 'true'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flag_overrides_flag_env ON feature_flag_overrides (flag_id, environment);
CREATE INDEX IF NOT EXISTS idx_flag_overrides_flag_account ON feature_flag_overrides (flag_id, account_id_override);
CREATE INDEX IF NOT EXISTS idx_flag_overrides_flag_user ON feature_flag_overrides (flag_id, user_id);
