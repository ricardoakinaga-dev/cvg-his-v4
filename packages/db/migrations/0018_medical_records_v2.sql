-- Medical records V2 schema on the canonical migration rail.
-- This aligns the active database with the runtime expected by
-- packages/modules/medical-records and packages/shared/database.

CREATE TABLE IF NOT EXISTS medical_records (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_medical_records_encounter_id
  ON medical_records (encounter_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_account_id
  ON medical_records (account_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id
  ON medical_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_status
  ON medical_records (status);

CREATE TABLE IF NOT EXISTS clinical_entries (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  medical_record_id VARCHAR(255) NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id),
  entry_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content VARCHAR(10000) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  delete_reason VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clinical_entries_medical_record_id
  ON clinical_entries (medical_record_id);
CREATE INDEX IF NOT EXISTS idx_clinical_entries_encounter_id
  ON clinical_entries (encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_entries_patient_id
  ON clinical_entries (patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_entries_entry_type
  ON clinical_entries (entry_type);
CREATE INDEX IF NOT EXISTS idx_clinical_entries_active
  ON clinical_entries (medical_record_id, deleted_at);

CREATE TABLE IF NOT EXISTS clinical_timeline (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  medical_record_id VARCHAR(255) NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  summary VARCHAR(500),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  clinical_entry_id VARCHAR(255) REFERENCES clinical_entries(id) ON DELETE SET NULL,
  attachment_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clinical_timeline_medical_record_id
  ON clinical_timeline (medical_record_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_timeline_encounter_id
  ON clinical_timeline (encounter_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS entry_revisions (
  id VARCHAR(255) PRIMARY KEY,
  entry_id VARCHAR(255) NOT NULL REFERENCES clinical_entries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content VARCHAR(10000) NOT NULL,
  author_user_id UUID NOT NULL REFERENCES users(id),
  reason VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entry_revisions_entry_id
  ON entry_revisions (entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_revisions_entry_version
  ON entry_revisions (entry_id, version DESC);
