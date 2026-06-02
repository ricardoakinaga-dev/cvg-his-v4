ALTER TABLE scheduling_queue_entries
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS current_sector TEXT,
  ADD COLUMN IF NOT EXISTS current_responsible_user_id TEXT,
  ADD COLUMN IF NOT EXISTS current_responsible_staff_id TEXT,
  ADD COLUMN IF NOT EXISTS next_sector TEXT,
  ADD COLUMN IF NOT EXISTS operational_status TEXT,
  ADD COLUMN IF NOT EXISTS clinical_status TEXT,
  ADD COLUMN IF NOT EXISTS billing_status TEXT,
  ADD COLUMN IF NOT EXISTS handoff_status TEXT,
  ADD COLUMN IF NOT EXISTS last_transferred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_transferred_by_user_id TEXT;

CREATE TABLE IF NOT EXISTS scheduling_queue_transfers (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  queue_entry_id TEXT NOT NULL REFERENCES scheduling_queue_entries(id) ON DELETE CASCADE,
  encounter_id TEXT,
  from_sector TEXT NOT NULL,
  to_sector TEXT NOT NULL,
  sent_by_user_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  received_by_user_id TEXT,
  received_at TIMESTAMPTZ,
  responsible_user_id TEXT,
  responsible_staff_id TEXT,
  next_sector TEXT,
  reason TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium',
  billing_record_id TEXT,
  counter_sale_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_transfers_account_sent_at
  ON scheduling_queue_transfers (account_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_transfers_queue_entry
  ON scheduling_queue_transfers (queue_entry_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_operational_sector
  ON scheduling_queue_entries (account_id, current_sector, status);

CREATE INDEX IF NOT EXISTS idx_scheduling_queue_operational_responsible
  ON scheduling_queue_entries (account_id, current_responsible_staff_id, status);

ALTER TABLE scheduling_queue_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scheduling_queue_transfers_tenant_isolation ON scheduling_queue_transfers;

CREATE POLICY scheduling_queue_transfers_tenant_isolation ON scheduling_queue_transfers
  FOR ALL
  USING (account_id = current_setting('app.current_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

COMMENT ON TABLE scheduling_queue_transfers IS
  'Historico operacional de transferencia da esteira de atendimento.';
