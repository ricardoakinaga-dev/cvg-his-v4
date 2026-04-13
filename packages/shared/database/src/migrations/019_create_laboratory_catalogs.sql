CREATE TABLE IF NOT EXISTS laboratory_equipment (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  serial_number VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  last_calibration_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS laboratory_equipment_account_id_idx
  ON laboratory_equipment (account_id);

CREATE TABLE IF NOT EXISTS laboratory_report_types (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS laboratory_report_types_account_id_idx
  ON laboratory_report_types (account_id);

CREATE TABLE IF NOT EXISTS laboratory_reference_values (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  parameter VARCHAR(255) NOT NULL,
  exam_type VARCHAR(50) NOT NULL,
  min_value NUMERIC(12, 3) NOT NULL,
  max_value NUMERIC(12, 3) NOT NULL,
  unit VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS laboratory_reference_values_account_id_idx
  ON laboratory_reference_values (account_id);

CREATE INDEX IF NOT EXISTS laboratory_reference_values_exam_type_idx
  ON laboratory_reference_values (exam_type);
