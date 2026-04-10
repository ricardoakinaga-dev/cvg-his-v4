-- Onda 3.5: API Key Management
-- Tabelas para gerenciamento de API Keys para parceiros e integrações

CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(16) NOT NULL,
  key_hash VARCHAR(512) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  rate_limit INTEGER NOT NULL DEFAULT 1000,
  rate_limit_window INTEGER NOT NULL DEFAULT 3600,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_account_id ON api_keys (account_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys (key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys (is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys (expires_at);

COMMENT ON TABLE api_keys IS 'API Keys para acesso de parceiros e integrações';
COMMENT ON COLUMN api_keys.key_prefix IS 'Prefixo visível da chave (primeiros 8 chars)';
COMMENT ON COLUMN api_keys.key_hash IS 'Hash SHA-256 da chave completa';
COMMENT ON COLUMN api_keys.permissions IS 'Lista de permissões granted à key';
COMMENT ON COLUMN api_keys.rate_limit IS 'Número máximo de requisições por window';
COMMENT ON COLUMN api_keys.rate_limit_window IS 'Janela de tempo em segundos';

-- Tabela para tracking de uso de API Keys
CREATE TABLE IF NOT EXISTS api_key_usage (
  id VARCHAR(255) PRIMARY KEY,
  api_key_id VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id ON api_key_usage (api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created_at ON api_key_usage (created_at);

ALTER TABLE api_key_usage
  ADD CONSTRAINT fk_api_key_usage_api_key_id
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
  ON DELETE CASCADE;

COMMENT ON TABLE api_key_usage IS 'Log de uso de API Keys para analytics e billing';

-- Tabela para rate limiting por API Key
CREATE TABLE IF NOT EXISTS api_key_rate_limits (
  api_key_id VARCHAR(255) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (api_key_id, window_start)
);

ALTER TABLE api_key_rate_limits
  ADD CONSTRAINT fk_api_key_rate_limits_api_key_id
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
  ON DELETE CASCADE;

COMMENT ON TABLE api_key_rate_limits IS 'Contador de rate limiting por API Key e janela de tempo';
