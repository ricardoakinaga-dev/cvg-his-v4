-- Bloco 1 - Auditoria: alinhar schema operacional ao contrato do modulo

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

UPDATE audit_events
SET occurred_at = created_at
WHERE occurred_at IS NULL;

ALTER TABLE audit_events
  ALTER COLUMN occurred_at SET NOT NULL,
  ALTER COLUMN occurred_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS audit_events_occurred_at_idx ON audit_events (occurred_at);
CREATE INDEX IF NOT EXISTS audit_events_correlation_id_idx ON audit_events (correlation_id);

COMMENT ON COLUMN audit_events.metadata IS 'Resumo e metadados operacionais do evento de auditoria';
COMMENT ON COLUMN audit_events.correlation_id IS 'Correlation ID para rastreabilidade ponta a ponta';
COMMENT ON COLUMN audit_events.occurred_at IS 'Timestamp funcional do evento de auditoria';
