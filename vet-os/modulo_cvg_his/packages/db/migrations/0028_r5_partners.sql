-- =====================
-- R5.1.2 — Convênios com Pet Shops
-- =====================

-- Migration: 0028_r5_partners.sql
-- Date: 2026-03-19
-- Description: Cria tabelas para sistema de convênios/parceiros (Pet Shops)

BEGIN;

-- =====================
-- Partners Table
-- =====================

CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'pet_shop', -- pet_shop, clinic, other
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  address TEXT,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0, -- 0.00 a 100.00
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user_id UUID REFERENCES users(id),
  
  CONSTRAINT partners_discount_range CHECK (discount_percent >= 0 AND discount_percent <= 100)
);

-- Indexes
CREATE INDEX idx_partners_account_id ON partners(account_id);
CREATE INDEX idx_partners_active ON partners(active);
CREATE INDEX idx_partners_type ON partners(type);

-- =====================
-- Partner Patients Table
-- =====================

CREATE TABLE partner_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Discount applied to this patient (can be different from partner default)
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  -- Additional metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user_id UUID REFERENCES users(id),
  
  CONSTRAINT partner_patients_discount_range CHECK (discount_percent >= 0 AND discount_percent <= 100),
  CONSTRAINT partner_patients_unique UNIQUE (partner_id, patient_id)
);

-- Indexes
CREATE INDEX idx_partner_patients_partner_id ON partner_patients(partner_id);
CREATE INDEX idx_partner_patients_patient_id ON partner_patients(patient_id);
CREATE INDEX idx_partner_patients_account_id ON partner_patients(account_id);

-- =====================
-- RLS Policies
-- =====================

-- Partners RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY partners_tenant_isolation ON partners
  USING (account_id = current_setting('app.current_account_id')::UUID);

CREATE POLICY partners_select ON partners
  FOR SELECT
  USING (account_id = current_setting('app.current_account_id')::UUID);

CREATE POLICY partners_insert ON partners
  FOR INSERT
  WITH CHECK (account_id = current_setting('app.current_account_id')::UUID);

CREATE POLICY partners_update ON partners
  FOR UPDATE
  USING (account_id = current_setting('app.current_account_id')::UUID);

CREATE POLICY partners_delete ON partners
  FOR DELETE
  USING (account_id = current_setting('app.current_account_id')::UUID);

-- Partner Patients RLS
ALTER TABLE partner_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY partner_patients_tenant_isolation ON partner_patients
  USING (account_id = current_setting('app.current_account_id')::UUID);

CREATE POLICY partner_patients_select ON partner_patients
  FOR SELECT
  USING (account_id = current_setting('app.current_account_id')::UUID);

CREATE POLICY partner_patients_insert ON partner_patients
  FOR INSERT
  WITH CHECK (account_id = current_setting('app.current_account_id')::UUID);

CREATE POLICY partner_patients_update ON partner_patients
  FOR UPDATE
  USING (account_id = current_setting('app.current_account_id')::UUID);

CREATE POLICY partner_patients_delete ON partner_patients
  FOR DELETE
  USING (account_id = current_setting('app.current_account_id')::UUID);

-- =====================
-- Triggers para updated_at
-- =====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER partner_patients_updated_at
  BEFORE UPDATE ON partner_patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- Grants (comentado - role pode não existir)
-- =====================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON partners TO cvg_his;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON partner_patients TO cvg_his;

COMMIT;
