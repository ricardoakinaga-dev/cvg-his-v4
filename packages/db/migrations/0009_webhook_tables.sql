-- Onda 3.2: Webhook Tables for Event Dispatching
-- Tabelas para persistência de webhooks e deliveries

CREATE TABLE IF NOT EXISTS webhooks (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  events JSONB NOT NULL,
  secret VARCHAR(512),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhooks_account_id ON webhooks (account_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks (is_active);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id VARCHAR(255) PRIMARY KEY,
  webhook_id VARCHAR(255) NOT NULL,
  event VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries (webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries (status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries (created_at);

ALTER TABLE webhook_deliveries
  ADD CONSTRAINT fk_webhook_deliveries_webhook_id
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
  ON DELETE CASCADE;

COMMENT ON TABLE webhooks IS 'Registro de subscriptions de webhooks por conta';
COMMENT ON TABLE webhook_deliveries IS 'Log de tentativas de delivery de webhooks';
