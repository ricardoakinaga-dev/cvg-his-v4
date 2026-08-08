-- Canonical persistence and tenant integrity for inpatient progress and surgery.

CREATE UNIQUE INDEX IF NOT EXISTS idx_inpatient_stays_account_id_id_unique
  ON inpatient_stays(account_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_encounters_account_id_id_patient_id_unique
  ON encounters(account_id, id, patient_id);

CREATE TABLE inpatient_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stay_id uuid NOT NULL,
  encounter_id uuid NOT NULL,
  note text NOT NULL,
  authored_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inpatient_progress_note_chk CHECK (length(btrim(note)) > 0),
  CONSTRAINT inpatient_progress_account_stay_fk
    FOREIGN KEY (account_id, stay_id)
    REFERENCES inpatient_stays(account_id, id) ON DELETE CASCADE,
  CONSTRAINT inpatient_progress_account_encounter_fk
    FOREIGN KEY (account_id, encounter_id)
    REFERENCES encounters(account_id, id) ON DELETE CASCADE,
  CONSTRAINT inpatient_progress_account_author_fk
    FOREIGN KEY (account_id, authored_by_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_inpatient_progress_account_stay_created
  ON inpatient_progress(account_id, stay_id, created_at DESC);

ALTER TABLE inpatient_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY inpatient_progress_tenant_isolation ON inpatient_progress
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

CREATE TABLE surgery_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  encounter_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  procedure_name varchar(255) NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'requested',
  surgeon_user_id uuid,
  surgical_team jsonb,
  preparation_notes text,
  operative_notes text,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgery_cases_procedure_name_chk CHECK (length(btrim(procedure_name)) > 0),
  CONSTRAINT surgery_cases_status_chk
    CHECK (status IN ('requested', 'pre_op', 'in_progress', 'recovery', 'completed', 'cancelled')),
  CONSTRAINT surgery_cases_timeline_chk
    CHECK ((started_at IS NULL OR ended_at IS NULL OR ended_at >= started_at)),
  CONSTRAINT surgery_cases_account_encounter_fk
    FOREIGN KEY (account_id, encounter_id)
    REFERENCES encounters(account_id, id) ON DELETE CASCADE,
  CONSTRAINT surgery_cases_account_patient_fk
    FOREIGN KEY (account_id, patient_id)
    REFERENCES patients(account_id, id) ON DELETE CASCADE,
  CONSTRAINT surgery_cases_account_surgeon_fk
    FOREIGN KEY (account_id, surgeon_user_id)
    REFERENCES users(account_id, id) ON DELETE RESTRICT,
  CONSTRAINT surgery_cases_encounter_patient_fk
    FOREIGN KEY (account_id, encounter_id, patient_id)
    REFERENCES encounters(account_id, id, patient_id) ON DELETE CASCADE
);

CREATE INDEX idx_surgery_cases_account_encounter
  ON surgery_cases(account_id, encounter_id, created_at DESC);
CREATE INDEX idx_surgery_cases_account_status_scheduled
  ON surgery_cases(account_id, status, scheduled_at);

ALTER TABLE surgery_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY surgery_cases_tenant_isolation ON surgery_cases
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());
