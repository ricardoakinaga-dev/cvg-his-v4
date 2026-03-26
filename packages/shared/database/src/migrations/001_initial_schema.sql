-- CVG-HIS V2 Initial Schema Migration
-- Created: 2026-03-25

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  refresh_token_hash VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Audit events table for append-only audit trail
CREATE TABLE IF NOT EXISTS audit_events (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  actor_user_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  metadata JSONB,
  correlation_id VARCHAR(255),
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  occurred_at TIMESTAMP NOT NULL
);

-- Owners table for master registry
CREATE TABLE IF NOT EXISTS owners (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  document_type VARCHAR(20),
  document_number VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Patients table for patient registry
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  species VARCHAR(50),
  breed VARCHAR(100),
  sex VARCHAR(20),
  birth_date DATE,
  weight NUMERIC(10, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Owner-patient links table for relationships
CREATE TABLE IF NOT EXISTS owner_patient_links (
  id VARCHAR(255) PRIMARY KEY,
  owner_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  relationship VARCHAR(50),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL
);

-- Encounters table for clinical episodes
CREATE TABLE IF NOT EXISTS encounters (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  appointment_id VARCHAR(255),
  visit_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  priority VARCHAR(20),
  assigned_to_user_id VARCHAR(255),
  chief_complaint VARCHAR(1000),
  queued_at TIMESTAMP,
  triaged_at TIMESTAMP,
  in_care_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Encounter timeline table for event tracking
CREATE TABLE IF NOT EXISTS encounter_timeline (
  id VARCHAR(255) PRIMARY KEY,
  encounter_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  summary VARCHAR(500),
  actor_user_id VARCHAR(255),
  metadata JSONB,
  occurred_at TIMESTAMP NOT NULL
);

-- Medical records table for clinical documentation
CREATE TABLE IF NOT EXISTS medical_records (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Clinical entries table for medical record entries
CREATE TABLE IF NOT EXISTS clinical_entries (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  medical_record_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  author_user_id VARCHAR(255) NOT NULL,
  entry_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content VARCHAR(10000) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Clinical timeline table for clinical event tracking
CREATE TABLE IF NOT EXISTS clinical_timeline (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  medical_record_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  summary VARCHAR(500),
  actor_user_id VARCHAR(255),
  clinical_entry_id VARCHAR(255),
  attachment_id VARCHAR(255),
  occurred_at TIMESTAMP NOT NULL
);

-- Attachments table for file storage metadata
CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  linked_entity_type VARCHAR(50) NOT NULL,
  linked_entity_id VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  checksum VARCHAR(255) NOT NULL,
  size_bytes BIGINT,
  source VARCHAR(50) NOT NULL,
  uploaded_by_user_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL
);

-- Appointments table for scheduling
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  duration INTEGER,
  visit_type VARCHAR(50) NOT NULL,
  reason VARCHAR(500),
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Billing records table for financial tracking
CREATE TABLE IF NOT EXISTS billing_records (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  administrative_notes VARCHAR(2000),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Billing items table for line items
CREATE TABLE IF NOT EXISTS billing_items (
  id VARCHAR(255) PRIMARY KEY,
  billing_record_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  description VARCHAR(500) NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price_amount NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  source_entity_type VARCHAR(50),
  source_entity_id VARCHAR(255),
  created_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- Inventory items table for stock management
CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  on_hand_quantity NUMERIC(10, 2) NOT NULL,
  reorder_level NUMERIC(10, 2) NOT NULL,
  unit_cost_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Inventory consumptions table for usage tracking
CREATE TABLE IF NOT EXISTS inventory_consumptions (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  inventory_item_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost_amount NUMERIC(12, 2) NOT NULL,
  source_entity_type VARCHAR(50),
  source_entity_id VARCHAR(255),
  recorded_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- Notifications table for messaging
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL DEFAULT 'internal',
  category VARCHAR(50) NOT NULL,
  encounter_id VARCHAR(255),
  patient_id VARCHAR(255),
  recipient_role_code VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  message VARCHAR(2000) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_by_user_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP
);

-- Notification jobs table for async processing
CREATE TABLE IF NOT EXISTS notification_jobs (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL DEFAULT 'acc_cvg_demo',
  notification_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMP NOT NULL,
  processed_at TIMESTAMP
);

-- Inpatient stays table for hospitalization
CREATE TABLE IF NOT EXISTS inpatient_stays (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  unit VARCHAR(100) NOT NULL,
  ward VARCHAR(100) NOT NULL,
  bed VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  admitted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Inpatient progress table for clinical notes
CREATE TABLE IF NOT EXISTS inpatient_progress (
  id VARCHAR(255) PRIMARY KEY,
  stay_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  note VARCHAR(5000) NOT NULL,
  authored_by_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- Surgery cases table for surgical procedures
CREATE TABLE IF NOT EXISTS surgery_cases (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  procedure_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  preparation_notes VARCHAR(2000),
  operative_notes VARCHAR(5000),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Diagnostic orders table for exams
CREATE TABLE IF NOT EXISTS diagnostic_orders (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  encounter_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  exam_type VARCHAR(255) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL,
  result_summary VARCHAR(5000),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_account_id ON audit_events(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_occurred_at ON audit_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_owners_account_id ON owners(account_id);
CREATE INDEX IF NOT EXISTS idx_patients_account_id ON patients(account_id);
CREATE INDEX IF NOT EXISTS idx_patients_owner_id ON patients(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_patient_links_owner_id ON owner_patient_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_patient_links_patient_id ON owner_patient_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_account_id ON encounters(account_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status);
CREATE INDEX IF NOT EXISTS idx_encounter_timeline_encounter_id ON encounter_timeline(encounter_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_encounter_id ON medical_records(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_entries_medical_record_id ON clinical_entries(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_attachments_linked_entity ON attachments(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_appointments_account_id ON appointments(account_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_encounter_id ON billing_records(encounter_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_account_id ON inventory_items(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_inpatient_stays_encounter_id ON inpatient_stays(encounter_id);
CREATE INDEX IF NOT EXISTS idx_surgery_cases_encounter_id ON surgery_cases(encounter_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_orders_encounter_id ON diagnostic_orders(encounter_id);
