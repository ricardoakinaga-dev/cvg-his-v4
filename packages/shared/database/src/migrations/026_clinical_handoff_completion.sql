ALTER TABLE clinical_handoffs
  ADD COLUMN IF NOT EXISTS pending_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS returned_to_clinic_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS returned_to_clinic_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS returned_to_clinic_reason TEXT,
  ADD COLUMN IF NOT EXISTS returned_to_clinic_responsible_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sent_to_finance_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sent_to_finance_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS finance_note TEXT;

CREATE INDEX IF NOT EXISTS idx_clinical_handoffs_pending_issues
  ON clinical_handoffs USING gin (pending_issues);
