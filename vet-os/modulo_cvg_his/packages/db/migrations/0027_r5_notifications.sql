-- =====================
-- R5.1.1 — Notificações
-- =====================

-- Migration: 0027_r5_notifications.sql
-- Date: 2026-03-18
-- Description: Cria tabelas para sistema de notificações (SMS/WhatsApp/Email)

BEGIN;

-- =====================
-- Enums
-- =====================

CREATE TYPE notification_channel AS ENUM (
  'sms',
  'whatsapp',
  'email',
  'push'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'queued',
  'sent',
  'delivered',
  'failed',
  'cancelled'
);

CREATE TYPE notification_type AS ENUM (
  'appointment_confirmed',
  'appointment_reminder',
  'appointment_cancelled',
  'exam_result',
  'prescription',
  'promo',
  'custom'
);

CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- =====================
-- Notification Templates
-- =====================

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  subject VARCHAR(500),
  body_html TEXT,
  body_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT notification_templates_unique UNIQUE (account_id, type, channel)
);

CREATE INDEX idx_notif_templates_account ON notification_templates(account_id);
CREATE INDEX idx_notif_templates_type ON notification_templates(account_id, type);
CREATE INDEX idx_notif_templates_channel ON notification_templates(account_id, channel);

-- =====================
-- Notifications
-- =====================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'normal',
  status notification_status NOT NULL DEFAULT 'pending',
  recipient VARCHAR(500) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(500),
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_account ON notifications(account_id);
CREATE INDEX idx_notifications_status ON notifications(account_id, status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for, status) 
  WHERE status IN ('pending', 'queued');
CREATE INDEX idx_notifications_patient ON notifications(patient_id);
CREATE INDEX idx_notifications_appointment ON notifications(appointment_id);
CREATE INDEX idx_notifications_created ON notifications(account_id, created_at);
CREATE INDEX idx_notifications_type_channel ON notifications(account_id, type, channel);

-- =====================
-- Notification Settings
-- =====================

CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- SMS
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_provider VARCHAR(50),
  sms_api_key VARCHAR(255),
  sms_from VARCHAR(50),
  
  -- WhatsApp
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_provider VARCHAR(50),
  whatsapp_api_key VARCHAR(255),
  whatsapp_from VARCHAR(50),
  
  -- Email
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  email_provider VARCHAR(50),
  email_api_key VARCHAR(255),
  email_from VARCHAR(255),
  email_from_name VARCHAR(255),
  
  -- Horário de silêncio
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start VARCHAR(5),
  quiet_hours_end VARCHAR(5),
  
  -- Retry
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_interval_minutes INTEGER NOT NULL DEFAULT 5,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT notification_settings_account_unique UNIQUE (account_id)
);

-- =====================
-- Templates Padrão
-- =====================

-- Função para criar templates padrão quando uma conta é criada
CREATE OR REPLACE FUNCTION create_default_notification_templates()
RETURNS TRIGGER AS $$
BEGIN
  -- Template: Agendamento Confirmado (SMS)
  INSERT INTO notification_templates (account_id, name, type, channel, body_text, variables, active)
  VALUES (
    NEW.id,
    'Confirmação de Agendamento',
    'appointment_confirmed',
    'sms',
    'Olá {{patient_name}}! Seu agendamento para {{appointment_date}} às {{appointment_time}} foi confirmado. {{clinic_name}}',
    '["patient_name", "appointment_date", "appointment_time", "clinic_name"]',
    true
  );
  
  -- Template: Agendamento Confirmado (WhatsApp)
  INSERT INTO notification_templates (account_id, name, type, channel, body_text, variables, active)
  VALUES (
    NEW.id,
    'Confirmação de Agendamento',
    'appointment_confirmed',
    'whatsapp',
    '🐾 *Confirmação de Agendamento*

Olá {{patient_name}}!

Seu agendamento foi confirmado:
📅 Data: {{appointment_date}}
🕐 Horário: {{appointment_time}}
📍 Local: {{clinic_name}}

Até breve!',
    '["patient_name", "appointment_date", "appointment_time", "clinic_name"]',
    true
  );
  
  -- Template: Lembrete de Consulta (SMS)
  INSERT INTO notification_templates (account_id, name, type, channel, body_text, variables, active)
  VALUES (
    NEW.id,
    'Lembrete de Consulta',
    'appointment_reminder',
    'sms',
    'Lembrete: {{patient_name}} tem consulta amanhã às {{appointment_time}}. {{clinic_name}}',
    '["patient_name", "appointment_time", "clinic_name"]',
    true
  );
  
  -- Template: Lembrete de Consulta (WhatsApp)
  INSERT INTO notification_templates (account_id, name, type, channel, body_text, variables, active)
  VALUES (
    NEW.id,
    'Lembrete de Consulta',
    'appointment_reminder',
    'whatsapp',
    '🔔 *Lembrete de Consulta*

Olá {{patient_name}}!

Lembramos que você tem consulta amanhã:
🕐 Horário: {{appointment_time}}
📍 Local: {{clinic_name}}

Não esqueça! 🐾',
    '["patient_name", "appointment_time", "clinic_name"]',
    true
  );
  
  -- Template: Resultado de Exame (Email)
  INSERT INTO notification_templates (account_id, name, type, channel, subject, body_text, variables, active)
  VALUES (
    NEW.id,
    'Resultado de Exame',
    'exam_result',
    'email',
    'Resultado de Exame Disponível - {{clinic_name}}',
    'Olá {{patient_name}},

O resultado do exame {{exam_name}} já está disponível.

Acesse o sistema para visualizar: {{exam_link}}

Atenciosamente,
{{clinic_name}}',
    '["patient_name", "exam_name", "exam_link", "clinic_name"]',
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar templates padrão
CREATE TRIGGER trigger_create_default_notification_templates
  AFTER INSERT ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_templates();

-- =====================
-- RLS (Row Level Security)
-- =====================

-- Habilitar RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY notification_templates_tenant_isolation ON notification_templates
  USING (account_id = current_setting('app.current_account_id')::UUID);

CREATE POLICY notifications_tenant_isolation ON notifications
  USING (account_id = current_setting('app.current_account_id')::UUID);

CREATE POLICY notification_settings_tenant_isolation ON notification_settings
  USING (account_id = current_setting('app.current_account_id')::UUID);

-- =====================
-- Grants
-- =====================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_templates TO cvg_his;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO cvg_his;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_settings TO cvg_his;

COMMIT;
