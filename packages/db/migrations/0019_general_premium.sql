-- Migration 0019: General Premium - Owner/Patient auxiliary tables
-- Creates: owner_contacts, owner_addresses, owner_documents, owner_alerts
-- Creates: patient_alerts, patient_vaccines, patient_allergies, tags

-- ============================================
-- OWNER AUXILIARY TABLES
-- ============================================

-- Owner contacts (phones, emails with is_primary)
CREATE TABLE owner_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('phone', 'email', 'whatsapp')),
  label text,
  value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_owner_contacts_account_owner ON owner_contacts(account_id, owner_id);
CREATE INDEX idx_owner_contacts_owner ON owner_contacts(owner_id);

-- Owner addresses (complete address)
CREATE TABLE owner_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  label text,
  street text NOT NULL,
  number text,
  complement text,
  neighborhood text,
  city text NOT NULL,
  state text,
  postal_code text,
  country text DEFAULT 'Brasil',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_owner_addresses_account_owner ON owner_addresses(account_id, owner_id);
CREATE INDEX idx_owner_addresses_owner ON owner_addresses(owner_id);

-- Owner documents (cpf, cnpj, rg, etc)
CREATE TABLE owner_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('cpf', 'cnpj', 'rg', 'passaporte', 'outro')),
  value text NOT NULL,
  issuer text,
  issue_date date,
  expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_owner_documents_account_owner ON owner_documents(account_id, owner_id);
CREATE INDEX idx_owner_documents_owner ON owner_documents(owner_id);
CREATE INDEX idx_owner_documents_value ON owner_documents(value);

-- Owner alerts (general alerts for owners)
CREATE TABLE owner_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  message text,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid
);
CREATE INDEX idx_owner_alerts_account_owner ON owner_alerts(account_id, owner_id);
CREATE INDEX idx_owner_alerts_owner ON owner_alerts(owner_id);
CREATE INDEX idx_owner_alerts_active ON owner_alerts(account_id, is_active);

-- ============================================
-- PATIENT AUXILIARY TABLES
-- ============================================

-- Patient alerts (general alerts for patients - different from medication alerts)
CREATE TABLE patient_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  message text,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid
);
CREATE INDEX idx_patient_alerts_account_patient ON patient_alerts(account_id, patient_id);
CREATE INDEX idx_patient_alerts_patient ON patient_alerts(patient_id);
CREATE INDEX idx_patient_alerts_active ON patient_alerts(account_id, is_active);

-- Patient vaccines (vaccination records)
CREATE TABLE patient_vaccines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  manufacturer text,
  batch_number text,
  administration_date date NOT NULL,
  next_dose_date date,
  veterinarian_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_patient_vaccines_account_patient ON patient_vaccines(account_id, patient_id);
CREATE INDEX idx_patient_vaccines_patient ON patient_vaccines(patient_id);
CREATE INDEX idx_patient_vaccines_next_dose ON patient_vaccines(account_id, next_dose_date);

-- Patient allergies (structured allergies)
CREATE TABLE patient_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  allergen text NOT NULL,
  reaction text,
  severity text CHECK (severity IN ('mild', 'moderate', 'severe')),
  diagnosed_date date,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_patient_allergies_account_patient ON patient_allergies(account_id, patient_id);
CREATE INDEX idx_patient_allergies_patient ON patient_allergies(patient_id);

-- ============================================
-- TAGS SYSTEM
-- ============================================

-- Tags (generic tags for owners and patients)
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6B7280',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, name)
);
CREATE INDEX idx_tags_account ON tags(account_id);

-- Owner tags (many-to-many)
CREATE TABLE owner_tags (
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, tag_id)
);
CREATE INDEX idx_owner_tags_tag ON owner_tags(tag_id);

-- Patient tags (many-to-many)
CREATE TABLE patient_tags (
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, tag_id)
);
CREATE INDEX idx_patient_tags_tag ON patient_tags(tag_id);

-- ============================================
-- PATIENT EXTENSIONS
-- ============================================

-- Add new columns to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS coat_color text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS neutered boolean DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS neutered_date date;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS death_date date;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS death_cause text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_number text;

-- Add index for registration number
CREATE INDEX IF NOT EXISTS idx_patients_registration ON patients(account_id, registration_number);

-- ============================================
-- OWNER EXTENSIONS
-- ============================================

-- Add new columns to owners table
ALTER TABLE owners ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS preferred_contact_method text CHECK (preferred_contact_method IN ('phone', 'email', 'whatsapp'));
ALTER TABLE owners ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT false;

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Create update trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for all new tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['owner_contacts', 'owner_addresses', 'owner_documents', 'owner_alerts', 'patient_alerts', 'patient_vaccines', 'patient_allergies', 'tags'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END;
$$;
