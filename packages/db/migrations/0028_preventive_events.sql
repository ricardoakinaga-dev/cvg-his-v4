-- Vetus parity: vaccines and dewormers preventive schedule.

CREATE TABLE IF NOT EXISTS preventive_events (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  client_name VARCHAR(160) NOT NULL,
  animal_name VARCHAR(160) NOT NULL,
  event_date DATE NOT NULL,
  item_type VARCHAR(32) NOT NULL DEFAULT 'vaccine',
  description VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
  observation TEXT,
  executed_at TIMESTAMPTZ,
  executed_observation TEXT,
  rescheduled_from_id VARCHAR(255) REFERENCES preventive_events(id) ON DELETE SET NULL,
  reminder_email_prepared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT preventive_events_item_type_chk CHECK (
    item_type IN ('vaccine', 'dewormer', 'other')
  ),
  CONSTRAINT preventive_events_status_chk CHECK (
    status IN ('scheduled', 'executed')
  ),
  CONSTRAINT preventive_events_observation_len_chk CHECK (
    observation IS NULL OR char_length(observation) <= 1000
  ),
  CONSTRAINT preventive_events_executed_observation_len_chk CHECK (
    executed_observation IS NULL OR char_length(executed_observation) <= 1000
  )
);

CREATE INDEX IF NOT EXISTS idx_preventive_events_account_date
  ON preventive_events (account_id, event_date);

CREATE INDEX IF NOT EXISTS idx_preventive_events_account_status
  ON preventive_events (account_id, status);

CREATE INDEX IF NOT EXISTS idx_preventive_events_account_client
  ON preventive_events (account_id, client_name);

CREATE INDEX IF NOT EXISTS idx_preventive_events_account_animal
  ON preventive_events (account_id, animal_name);

ALTER TABLE preventive_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS preventive_events_tenant_isolation ON preventive_events;
CREATE POLICY preventive_events_tenant_isolation ON preventive_events
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE preventive_events IS
  'Agenda preventiva de vacinas e vermifugos usada no fluxo de animais, avisos e baixa de aplicacoes.';
