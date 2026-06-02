ALTER TABLE clinical_handoffs
  DROP CONSTRAINT IF EXISTS clinical_handoffs_status_chk,
  DROP CONSTRAINT IF EXISTS clinical_handoffs_sector_chk,
  ADD COLUMN IF NOT EXISTS pending_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS returned_to_clinic_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS returned_to_clinic_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS returned_to_clinic_reason TEXT,
  ADD COLUMN IF NOT EXISTS returned_to_clinic_responsible_id TEXT,
  ADD COLUMN IF NOT EXISTS sent_to_finance_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS sent_to_finance_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finance_note TEXT;

ALTER TABLE clinical_handoffs
  ADD CONSTRAINT clinical_handoffs_status_chk CHECK (
    handoff_status IN (
      'ready_to_send',
      'sent_to_reception',
      'acknowledged_by_reception',
      'waiting_pending_resolution',
      'returned_to_clinic',
      'sent_to_finance'
    )
  ),
  ADD CONSTRAINT clinical_handoffs_sector_chk CHECK (
    from_sector = 'clinic' AND to_sector IN ('reception', 'finance')
  );

CREATE INDEX IF NOT EXISTS idx_clinical_handoffs_pending_issues
  ON clinical_handoffs USING gin (pending_issues);

COMMENT ON COLUMN clinical_handoffs.pending_issues IS
  'Pendencias estruturadas do handoff clinico, incluindo bloqueio financeiro e resolucao.';
