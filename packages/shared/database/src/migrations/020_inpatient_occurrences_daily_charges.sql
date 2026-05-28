CREATE TABLE IF NOT EXISTS inpatient_occurrences (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  stay_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(5000) NOT NULL,
  authored_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inpatient_occurrences_stay_created
  ON inpatient_occurrences(stay_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inpatient_occurrences_account_severity
  ON inpatient_occurrences(account_id, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS inpatient_daily_charges (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  stay_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL,
  charge_date VARCHAR(10) NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  unit_amount NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  billing_record_id VARCHAR(255),
  created_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inpatient_daily_charges_stay_status
  ON inpatient_daily_charges(stay_id, status, charge_date);

CREATE INDEX IF NOT EXISTS idx_inpatient_daily_charges_account_status
  ON inpatient_daily_charges(account_id, status, charge_date);
