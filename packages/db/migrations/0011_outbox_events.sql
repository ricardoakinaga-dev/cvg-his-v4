-- Onda 3.6: Event Bus with Outbox Pattern
-- Tabela para garantir entrega de eventos com retry automático

CREATE TABLE IF NOT EXISTS outbox_events (
  id VARCHAR(255) PRIMARY KEY,
  correlation_id VARCHAR(255) NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON outbox_events (status);
CREATE INDEX IF NOT EXISTS idx_outbox_events_scheduled_at ON outbox_events (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation_id ON outbox_events (correlation_id);
CREATE INDEX IF NOT EXISTS idx_outbox_events_module_name ON outbox_events (module_name);

COMMENT ON TABLE outbox_events IS 'Outbox pattern table for reliable event delivery';
COMMENT ON COLUMN outbox_events.status IS 'pending, processing, completed, failed, retrying';
COMMENT ON COLUMN outbox_events.attempts IS 'Number of delivery attempts';
COMMENT ON COLUMN outbox_events.scheduled_at IS 'When the event should be processed';