-- Handoff clinico minimo persistente.
-- Mantem envio e ACK da recepcao duraveis, sem inbox completa e sem automacao financeira.

CREATE TABLE IF NOT EXISTS clinical_handoffs (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  queue_entry_id TEXT,
  appointment_id TEXT,
  owner_id UUID NOT NULL REFERENCES owners(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  origin_channel TEXT NOT NULL,
  from_sector TEXT NOT NULL DEFAULT 'clinic',
  to_sector TEXT NOT NULL DEFAULT 'reception',
  from_responsible_id UUID NOT NULL REFERENCES users(id),
  to_responsible_type TEXT NOT NULL DEFAULT 'sector',
  to_responsible_id TEXT,
  clinical_summary TEXT NOT NULL,
  reception_instructions TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  handoff_status TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  sent_by UUID NOT NULL REFERENCES users(id),
  sent_at TIMESTAMPTZ NOT NULL,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  acknowledge_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clinical_handoffs_origin_channel_chk CHECK (
    origin_channel IN ('reception', 'schedule', 'return')
  ),
  CONSTRAINT clinical_handoffs_sector_chk CHECK (
    from_sector = 'clinic' AND to_sector = 'reception'
  ),
  CONSTRAINT clinical_handoffs_responsible_type_chk CHECK (
    to_responsible_type IN ('sector', 'person', 'team')
  ),
  CONSTRAINT clinical_handoffs_priority_chk CHECK (
    priority IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT clinical_handoffs_status_chk CHECK (
    handoff_status IN ('ready_to_send', 'sent_to_reception', 'acknowledged_by_reception')
  ),
  CONSTRAINT clinical_handoffs_ack_status_chk CHECK (
    (
      handoff_status <> 'acknowledged_by_reception'
      AND acknowledged_by IS NULL
      AND acknowledged_at IS NULL
    )
    OR (
      handoff_status = 'acknowledged_by_reception'
      AND acknowledged_by IS NOT NULL
      AND acknowledged_at IS NOT NULL
    )
  ),
  CONSTRAINT clinical_handoffs_summary_non_empty_chk CHECK (
    length(trim(clinical_summary)) > 0
  ),
  CONSTRAINT clinical_handoffs_instructions_non_empty_chk CHECK (
    length(trim(reception_instructions)) > 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_clinical_handoffs_account_encounter
  ON clinical_handoffs (account_id, encounter_id);

CREATE INDEX IF NOT EXISTS idx_clinical_handoffs_account_status
  ON clinical_handoffs (account_id, handoff_status);

CREATE INDEX IF NOT EXISTS idx_clinical_handoffs_account_updated
  ON clinical_handoffs (account_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinical_handoffs_account_patient
  ON clinical_handoffs (account_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_clinical_handoffs_account_owner
  ON clinical_handoffs (account_id, owner_id);

ALTER TABLE clinical_handoffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinical_handoffs_tenant_isolation ON clinical_handoffs;
CREATE POLICY clinical_handoffs_tenant_isolation ON clinical_handoffs
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON TABLE clinical_handoffs IS
  'Handoff clinico minimo persistente para envio ao setor de recepcao e ACK operacional.';
