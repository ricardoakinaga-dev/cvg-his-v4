-- Migration 0022: Imaging Premium Module
-- Creates: imaging_modalities, imaging_orders, imaging_studies, imaging_reports
-- Implements complete imaging workflow: order -> study -> report

-- ============================================
-- IMAGING MODALITIES CATALOG
-- ============================================

-- Imaging modalities (tipos de exame de imagem)
CREATE TABLE imaging_modalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code text NOT NULL, -- código do exame (ex: RX, US, CT, RM, etc)
  name text NOT NULL,
  category text NOT NULL DEFAULT 'radiology' CHECK (category IN ('radiology', 'ultrasound', 'ct', 'mri', 'nuclear', 'other')),
  description text,
  preparation_instructions text, -- instruções de preparo
  contrast_required boolean DEFAULT false,
  contrast_type text, -- tipo de contraste se necessário
  estimated_duration_minutes integer DEFAULT 30,
  equipment_type text, -- tipo de equipamento necessário
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, code)
);
CREATE INDEX idx_imaging_modalities_account ON imaging_modalities(account_id);
CREATE INDEX idx_imaging_modalities_active ON imaging_modalities(account_id, is_active);
CREATE INDEX idx_imaging_modalities_category ON imaging_modalities(account_id, category);

-- Imaging modality templates (modelos de laudo por modalidade)
CREATE TABLE imaging_modality_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  modality_id uuid NOT NULL REFERENCES imaging_modalities(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_content text NOT NULL, -- conteúdo do modelo de laudo
  is_default boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_imaging_modality_templates_account ON imaging_modality_templates(account_id);
CREATE INDEX idx_imaging_modality_templates_modality ON imaging_modality_templates(modality_id);

-- ============================================
-- IMAGING ORDERS
-- ============================================

-- Imaging order status
CREATE TYPE imaging_order_status AS ENUM (
  'pending',      -- aguardando agendamento
  'scheduled',    -- agendado
  'in_progress',  -- em realização
  'completed',    -- realizado
  'cancelled'     -- cancelado
);

-- Imaging order priority
CREATE TYPE imaging_order_priority AS ENUM (
  'stat',         -- urgente
  'asap',         -- o mais breve possível
  'routine',      -- rotina
  'timed'         -- agendado
);

-- Imaging orders (pedidos de exame de imagem)
CREATE TABLE imaging_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  order_number text NOT NULL, -- número do pedido
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES encounters(id) ON DELETE SET NULL,
  modality_id uuid NOT NULL REFERENCES imaging_modalities(id) ON DELETE RESTRICT,
  requester_user_id uuid REFERENCES users(id) ON DELETE SET NULL, -- veterinário solicitante
  status imaging_order_status NOT NULL DEFAULT 'pending',
  priority imaging_order_priority NOT NULL DEFAULT 'routine',
  clinical_indication text NOT NULL, -- indicação clínica
  clinical_history text, -- histórico clínico relevante
  suspected_diagnosis text, -- diagnóstico suspeito
  body_region text, -- região do corpo a ser examinada
  laterality text CHECK (laterality IN ('left', 'right', 'bilateral', 'not_applicable')),
  contrast_requested boolean DEFAULT false,
  contrast_type text,
  sedation_required boolean DEFAULT false,
  special_instructions text,
  scheduled_at timestamptz, -- data/hora agendada
  performed_at timestamptz, -- data/hora da realização
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, order_number)
);
CREATE INDEX idx_imaging_orders_account ON imaging_orders(account_id);
CREATE INDEX idx_imaging_orders_patient ON imaging_orders(patient_id);
CREATE INDEX idx_imaging_orders_encounter ON imaging_orders(encounter_id);
CREATE INDEX idx_imaging_orders_modality ON imaging_orders(modality_id);
CREATE INDEX idx_imaging_orders_status ON imaging_orders(account_id, status);
CREATE INDEX idx_imaging_orders_scheduled ON imaging_orders(account_id, scheduled_at);
CREATE INDEX idx_imaging_orders_ordered ON imaging_orders(account_id, created_at DESC);
CREATE INDEX idx_imaging_orders_number ON imaging_orders(order_number);

-- ============================================
-- IMAGING STUDIES
-- ============================================

-- Imaging study status
CREATE TYPE imaging_study_status AS ENUM (
  'pending',      -- aguardando
  'in_progress',  -- em andamento
  'completed',    -- concluído
  'cancelled'     -- cancelado
);

-- Imaging studies (realizações de exames)
CREATE TABLE imaging_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  study_number text NOT NULL, -- número do estudo
  order_id uuid NOT NULL REFERENCES imaging_orders(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  modality_id uuid NOT NULL REFERENCES imaging_modalities(id) ON DELETE RESTRICT,
  status imaging_study_status NOT NULL DEFAULT 'pending',
  study_datetime timestamptz NOT NULL DEFAULT now(),
  study_duration_minutes integer,
  body_region text,
  laterality text CHECK (laterality IN ('left', 'right', 'bilateral', 'not_applicable')),
  contrast_administered boolean DEFAULT false,
  contrast_type text,
  contrast_volume_ml numeric,
  sedation_administered boolean DEFAULT false,
  sedation_details text,
  equipment_used text,
  acquisition_parameters jsonb, -- parâmetros de aquisição (kVp, mAs, etc)
  number_of_images integer DEFAULT 0,
  study_notes text,
  performed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  technician_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, study_number)
);
CREATE INDEX idx_imaging_studies_account ON imaging_studies(account_id);
CREATE INDEX idx_imaging_studies_order ON imaging_studies(order_id);
CREATE INDEX idx_imaging_studies_patient ON imaging_studies(patient_id);
CREATE INDEX idx_imaging_studies_modality ON imaging_studies(modality_id);
CREATE INDEX idx_imaging_studies_status ON imaging_studies(account_id, status);
CREATE INDEX idx_imaging_studies_datetime ON imaging_studies(study_datetime DESC);
CREATE INDEX idx_imaging_studies_number ON imaging_studies(study_number);

-- Study document attachments (link studies to documents)
CREATE TABLE imaging_study_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  study_id uuid NOT NULL REFERENCES imaging_studies(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  attachment_type text NOT NULL DEFAULT 'image' CHECK (attachment_type IN ('image', 'video', 'dicom', 'report', 'other')),
  display_order integer DEFAULT 0,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(study_id, document_id)
);
CREATE INDEX idx_imaging_study_documents_account ON imaging_study_documents(account_id);
CREATE INDEX idx_imaging_study_documents_study ON imaging_study_documents(study_id);
CREATE INDEX idx_imaging_study_documents_document ON imaging_study_documents(document_id);

-- ============================================
-- IMAGING REPORTS (LAUDOS)
-- ============================================

-- Imaging report status
CREATE TYPE imaging_report_status AS ENUM (
  'draft',          -- rascunho
  'pending_review', -- aguardando revisão
  'finalized',      -- finalizado
  'signed',         -- assinado
  'amended'         -- retificado
);

-- Imaging reports (laudos)
CREATE TABLE imaging_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  report_number text NOT NULL, -- número do laudo
  order_id uuid NOT NULL REFERENCES imaging_orders(id) ON DELETE CASCADE,
  study_id uuid REFERENCES imaging_studies(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  modality_id uuid NOT NULL REFERENCES imaging_modalities(id) ON DELETE RESTRICT,
  status imaging_report_status NOT NULL DEFAULT 'draft',
  technique text, -- técnica utilizada
  findings text, -- achados
  impression text, -- impressão diagnóstica
  conclusion text, -- conclusão
  recommendations text, -- recomendações
  limitations text, -- limitações do exame
  comparison text, -- comparação com exames anteriores
  template_id uuid REFERENCES imaging_modality_templates(id) ON DELETE SET NULL,
  notes text,
  drafted_at timestamptz,
  drafted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  finalized_at timestamptz,
  finalized_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  signed_at timestamptz,
  signed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  signature_hash text, -- hash da assinatura digital (MVP: simples)
  amended_at timestamptz,
  amended_reason text,
  amended_from_report_id uuid REFERENCES imaging_reports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, report_number)
);
CREATE INDEX idx_imaging_reports_account ON imaging_reports(account_id);
CREATE INDEX idx_imaging_reports_order ON imaging_reports(order_id);
CREATE INDEX idx_imaging_reports_study ON imaging_reports(study_id);
CREATE INDEX idx_imaging_reports_patient ON imaging_reports(patient_id);
CREATE INDEX idx_imaging_reports_modality ON imaging_reports(modality_id);
CREATE INDEX idx_imaging_reports_status ON imaging_reports(account_id, status);
CREATE INDEX idx_imaging_reports_number ON imaging_reports(report_number);
CREATE INDEX idx_imaging_reports_signed ON imaging_reports(signed_at DESC);

-- Report document attachments (link reports to documents)
CREATE TABLE imaging_report_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES imaging_reports(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  attachment_type text NOT NULL DEFAULT 'attachment' CHECK (attachment_type IN ('image', 'video', 'dicom', 'attachment', 'other')),
  display_order integer DEFAULT 0,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id, document_id)
);
CREATE INDEX idx_imaging_report_documents_account ON imaging_report_documents(account_id);
CREATE INDEX idx_imaging_report_documents_report ON imaging_report_documents(report_id);
CREATE INDEX idx_imaging_report_documents_document ON imaging_report_documents(document_id);

-- ============================================
-- IMAGING SCHEDULE SLOTS
-- ============================================

-- Schedule slots for imaging appointments
CREATE TABLE imaging_schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  modality_id uuid REFERENCES imaging_modalities(id) ON DELETE SET NULL,
  slot_date date NOT NULL,
  slot_start_time time NOT NULL,
  slot_end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  order_id uuid REFERENCES imaging_orders(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_imaging_schedule_slots_account ON imaging_schedule_slots(account_id);
CREATE INDEX idx_imaging_schedule_slots_modality ON imaging_schedule_slots(modality_id);
CREATE INDEX idx_imaging_schedule_slots_date ON imaging_schedule_slots(account_id, slot_date);
CREATE INDEX idx_imaging_schedule_slots_available ON imaging_schedule_slots(account_id, slot_date, is_available);

-- ============================================
-- AUDIT TRIGGERS
-- ============================================

-- Create audit log function if not exists
CREATE OR REPLACE FUNCTION log_imaging_audit() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_events (
    account_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.account_id, OLD.account_id),
    COALESCE(NEW.created_by_user_id, NEW.performed_by_user_id, NEW.drafted_by_user_id, 
             NEW.reviewed_by_user_id, NEW.signed_by_user_id,
             OLD.created_by_user_id, current_setting('app.current_user_id', true)::uuid),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers for imaging tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'imaging_modalities', 'imaging_modality_templates',
    'imaging_orders', 'imaging_studies', 'imaging_study_documents',
    'imaging_reports', 'imaging_report_documents', 'imaging_schedule_slots'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON %s', t, t);
    EXECUTE format('CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION log_imaging_audit()', t, t);
  END LOOP;
END;
$$;

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Add triggers for updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'imaging_modalities', 'imaging_modality_templates',
    'imaging_orders', 'imaging_studies', 'imaging_reports',
    'imaging_schedule_slots'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END;
$$;

-- ============================================
-- SEQUENCE FOR ORDER NUMBERS
-- ============================================

-- Create sequences for order/study/report numbers per account
CREATE TABLE imaging_sequences (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  order_seq integer NOT NULL DEFAULT 0,
  study_seq integer NOT NULL DEFAULT 0,
  report_seq integer NOT NULL DEFAULT 0
);

-- Function to get next sequence number
CREATE OR REPLACE FUNCTION imaging_next_order_number(p_account_id uuid) RETURNS text AS $$
DECLARE
  v_seq integer;
BEGIN
  INSERT INTO imaging_sequences (account_id, order_seq) 
  VALUES (p_account_id, 1)
  ON CONFLICT (account_id) DO UPDATE SET order_seq = imaging_sequences.order_seq + 1
  RETURNING order_seq INTO v_seq;
  RETURN 'IMG' || to_char(now(), 'YYYYMM') || '-' || LPAD(v_seq::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION imaging_next_study_number(p_account_id uuid) RETURNS text AS $$
DECLARE
  v_seq integer;
BEGIN
  INSERT INTO imaging_sequences (account_id, study_seq) 
  VALUES (p_account_id, 1)
  ON CONFLICT (account_id) DO UPDATE SET study_seq = imaging_sequences.study_seq + 1
  RETURNING study_seq INTO v_seq;
  RETURN 'STD' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION imaging_next_report_number(p_account_id uuid) RETURNS text AS $$
DECLARE
  v_seq integer;
BEGIN
  INSERT INTO imaging_sequences (account_id, report_seq) 
  VALUES (p_account_id, 1)
  ON CONFLICT (account_id) DO UPDATE SET report_seq = imaging_sequences.report_seq + 1
  RETURNING report_seq INTO v_seq;
  RETURN 'LAU' || to_char(now(), 'YYYY') || '-' || LPAD(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERMISSIONS
-- ============================================

-- Insert imaging permissions
INSERT INTO permissions (name, description, category) VALUES
  -- Modalities catalog
  ('imagem.modalidades.read', 'Visualizar modalidades de imagem', 'imagem'),
  ('imagem.modalidades.create', 'Criar modalidades de imagem', 'imagem'),
  ('imagem.modalidades.update', 'Editar modalidades de imagem', 'imagem'),
  ('imagem.modalidades.delete', 'Excluir modalidades de imagem', 'imagem'),
  -- Templates
  ('imagem.templates.read', 'Visualizar modelos de laudo', 'imagem'),
  ('imagem.templates.create', 'Criar modelos de laudo', 'imagem'),
  ('imagem.templates.update', 'Editar modelos de laudo', 'imagem'),
  ('imagem.templates.delete', 'Excluir modelos de laudo', 'imagem'),
  -- Orders
  ('imagem.pedidos.read', 'Visualizar pedidos de imagem', 'imagem'),
  ('imagem.pedidos.create', 'Criar pedidos de imagem', 'imagem'),
  ('imagem.pedidos.update', 'Editar pedidos de imagem', 'imagem'),
  ('imagem.pedidos.cancel', 'Cancelar pedidos de imagem', 'imagem'),
  ('imagem.pedidos.schedule', 'Agendar pedidos de imagem', 'imagem'),
  -- Studies
  ('imagem.estudos.read', 'Visualizar estudos de imagem', 'imagem'),
  ('imagem.estudos.create', 'Criar estudos de imagem', 'imagem'),
  ('imagem.estudos.update', 'Editar estudos de imagem', 'imagem'),
  ('imagem.estudos.attach', 'Anexar documentos a estudos', 'imagem'),
  -- Reports
  ('imagem.laudos.read', 'Visualizar laudos de imagem', 'imagem'),
  ('imagem.laudos.create', 'Criar laudos de imagem', 'imagem'),
  ('imagem.laudos.update', 'Editar laudos de imagem', 'imagem'),
  ('imagem.laudos.finalize', 'Finalizar laudos de imagem', 'imagem'),
  ('imagem.laudos.sign', 'Assinar laudos de imagem', 'imagem'),
  -- Schedule
  ('imagem.agenda.read', 'Visualizar agenda de imagem', 'imagem'),
  ('imagem.agenda.manage', 'Gerenciar agenda de imagem', 'imagem')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS TO DEFAULT ROLES
-- ============================================

-- Grant imaging permissions to admin role (if exists)
DO $$
DECLARE
  admin_role_id uuid;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;
  IF admin_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT admin_role_id, id FROM permissions WHERE category = 'imagem'
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Grant basic imaging read permissions to veterinarian role (if exists)
DO $$
DECLARE
  vet_role_id uuid;
BEGIN
  SELECT id INTO vet_role_id FROM roles WHERE name = 'veterinario' LIMIT 1;
  IF vet_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT vet_role_id, id FROM permissions 
    WHERE category = 'imagem' AND name LIKE '%.read'
    ON CONFLICT DO NOTHING;
    
    -- Also grant create permissions for orders
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT vet_role_id, id FROM permissions 
    WHERE name IN ('imagem.pedidos.create', 'imagem.pedidos.update', 'imagem.laudos.create', 'imagem.laudos.update')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
