-- Onda 1 - Fase 5: LGPD Consent Pipeline
-- Criação das tabelas consent_records e data_subject_requests

-- Enums para consent_records
DO $$ BEGIN
  CREATE TYPE consent_purpose AS ENUM ('marketing', 'analytics', 'clinical', 'financial', 'operational', 'notifications');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE consent_status AS ENUM ('granted', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE consent_origin AS ENUM ('web_portal', 'api', 'mobile_app', 'in_person', 'phone', 'email', 'system_default');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de registros de consentimento
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  subject_id UUID NOT NULL,
  subject_type TEXT NOT NULL,
  purpose consent_purpose NOT NULL,
  status consent_status NOT NULL DEFAULT 'granted',
  origin consent_origin NOT NULL DEFAULT 'api',
  granted_by UUID NOT NULL REFERENCES users (id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by UUID REFERENCES users (id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_account_subject ON consent_records (account_id, subject_id, subject_type);
CREATE INDEX IF NOT EXISTS idx_consent_account_purpose_status ON consent_records (account_id, purpose, status);
CREATE INDEX IF NOT EXISTS idx_consent_subject_purpose ON consent_records (subject_id, subject_type, purpose);

COMMENT ON TABLE consent_records IS 'LGPD: Registro de consentimento por titular, finalidade e status';
COMMENT ON COLUMN consent_records.subject_id IS 'ID do titular (owner, patient, user, etc.)';
COMMENT ON COLUMN consent_records.subject_type IS 'Tipo do titular: owner, patient, user';
COMMENT ON COLUMN consent_records.purpose IS 'Finalidade do consentimento: marketing, analytics, clinical, financial, operational, notifications';
COMMENT ON COLUMN consent_records.status IS 'Status atual: granted, revoked, expired';
COMMENT ON COLUMN consent_records.origin IS 'Origem do consentimento: web_portal, api, mobile_app, in_person, phone, email, system_default';
COMMENT ON COLUMN consent_records.metadata IS 'Metadados adicionais (IP, user-agent, contexto, etc.)';

-- Enums para data_subject_requests
DO $$ BEGIN
  CREATE TYPE dsr_type AS ENUM ('data_export', 'data_deletion', 'data_anonymization', 'data_rectification', 'data_access', 'data_portability', 'consent_revocation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE dsr_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de solicitações do titular
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  subject_id UUID NOT NULL,
  subject_type TEXT NOT NULL,
  request_type dsr_type NOT NULL,
  status dsr_status NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES users (id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users (id) ON DELETE SET NULL,
  notes TEXT,
  rejection_reason TEXT,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsr_account_subject ON data_subject_requests (account_id, subject_id, subject_type);
CREATE INDEX IF NOT EXISTS idx_dsr_account_status ON data_subject_requests (account_id, status);
CREATE INDEX IF NOT EXISTS idx_dsr_account_requested_at ON data_subject_requests (account_id, requested_at);

COMMENT ON TABLE data_subject_requests IS 'LGPD: Solicitações do titular de dados (export, delete, anonymize, rectify, etc.)';
COMMENT ON COLUMN data_subject_requests.subject_id IS 'ID do titular (owner, patient, user, etc.)';
COMMENT ON COLUMN data_subject_requests.subject_type IS 'Tipo do titular: owner, patient, user';
COMMENT ON COLUMN data_subject_requests.request_type IS 'Tipo da solicitação: data_export, data_deletion, data_anonymization, data_rectification, data_access, data_portability, consent_revocation';
COMMENT ON COLUMN data_subject_requests.status IS 'Status da solicitação: pending, in_progress, completed, rejected, cancelled';
COMMENT ON COLUMN data_subject_requests.result_json IS 'Resultado processado (dados exportados, contagem de registros anonimizados, etc.)';
