-- Migration 0021: Laboratory Premium Module
-- Creates: lab_tests, lab_orders, lab_samples, lab_results, lab_reports, lab_reference_ranges
-- Implements complete laboratory workflow: order -> sample -> result -> report

-- ============================================
-- LAB TESTS CATALOG
-- ============================================

-- Lab test categories
CREATE TABLE lab_test_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES lab_test_categories(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, name)
);
CREATE INDEX idx_lab_test_categories_account ON lab_test_categories(account_id);
CREATE INDEX idx_lab_test_categories_parent ON lab_test_categories(parent_id);

-- Lab tests catalog (exames disponíveis)
CREATE TABLE lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code text NOT NULL, -- código do exame (ex: HEM, BIOQ, etc)
  name text NOT NULL,
  category_id uuid REFERENCES lab_test_categories(id) ON DELETE SET NULL,
  description text,
  method text, -- método de análise
  specimen_type text NOT NULL DEFAULT 'blood', -- tipo de amostra (sangue, urina, etc)
  specimen_volume text, -- volume necessário
  specimen_instructions text, -- instruções de coleta
  turnaround_hours integer DEFAULT 24, -- prazo de entrega em horas
  is_active boolean NOT NULL DEFAULT true,
  requires_fasting boolean DEFAULT false,
  special_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, code)
);
CREATE INDEX idx_lab_tests_account ON lab_tests(account_id);
CREATE INDEX idx_lab_tests_category ON lab_tests(category_id);
CREATE INDEX idx_lab_tests_active ON lab_tests(account_id, is_active);
CREATE INDEX idx_lab_tests_name ON lab_tests(account_id, name);

-- Lab test panels (grupos de exames)
CREATE TABLE lab_test_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, code)
);
CREATE INDEX idx_lab_test_panels_account ON lab_test_panels(account_id);

-- Panel items (exames que compõem um painel)
CREATE TABLE lab_test_panel_items (
  panel_id uuid NOT NULL REFERENCES lab_test_panels(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (panel_id, test_id)
);
CREATE INDEX idx_lab_test_panel_items_test ON lab_test_panel_items(test_id);

-- ============================================
-- LAB REFERENCE RANGES
-- ============================================

-- Reference ranges by species and age
CREATE TABLE lab_reference_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
  species text, -- espécie (canino, felino, etc), null = todas
  gender text CHECK (gender IN ('male', 'female', 'both')),
  age_min_days integer, -- idade mínima em dias
  age_max_days integer, -- idade máxima em dias
  low_value numeric,
  high_value numeric,
  low_critical numeric,
  high_critical numeric,
  unit text,
  interpretation_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lab_reference_ranges_account ON lab_reference_ranges(account_id);
CREATE INDEX idx_lab_reference_ranges_test ON lab_reference_ranges(test_id);
CREATE INDEX idx_lab_reference_ranges_species ON lab_reference_ranges(test_id, species);

-- ============================================
-- LAB ORDERS
-- ============================================

-- Lab order status
CREATE TYPE lab_order_status AS ENUM (
  'pending',      -- aguardando coleta
  'partial',      -- coleta parcial
  'collected',    -- coletado
  'processing',   -- em processamento
  'partial_result', -- resultados parciais
  'completed',    -- concluído
  'cancelled'     -- cancelado
);

-- Lab orders (pedidos de exame)
CREATE TABLE lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  order_number text NOT NULL, -- número do pedido
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES encounters(id) ON DELETE SET NULL,
  requester_user_id uuid REFERENCES users(id) ON DELETE SET NULL, -- veterinário solicitante
  status lab_order_status NOT NULL DEFAULT 'pending',
  priority text DEFAULT 'routine' CHECK (priority IN ('stat', 'asap', 'routine', 'timed')),
  clinical_notes text, -- informações clínicas relevantes
  diagnosis text, -- diagnóstico clínico
  fasting_status text, -- jejum
  ordered_at timestamptz NOT NULL DEFAULT now(),
  collected_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, order_number)
);
CREATE INDEX idx_lab_orders_account ON lab_orders(account_id);
CREATE INDEX idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX idx_lab_orders_encounter ON lab_orders(encounter_id);
CREATE INDEX idx_lab_orders_status ON lab_orders(account_id, status);
CREATE INDEX idx_lab_orders_ordered ON lab_orders(account_id, ordered_at DESC);
CREATE INDEX idx_lab_orders_number ON lab_orders(order_number);

-- Lab order items (exames solicitados no pedido)
CREATE TABLE lab_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
  panel_id uuid REFERENCES lab_test_panels(id) ON DELETE SET NULL,
  status lab_order_status NOT NULL DEFAULT 'pending',
  priority text DEFAULT 'routine' CHECK (priority IN ('stat', 'asap', 'routine', 'timed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lab_order_items_account ON lab_order_items(account_id);
CREATE INDEX idx_lab_order_items_order ON lab_order_items(order_id);
CREATE INDEX idx_lab_order_items_test ON lab_order_items(test_id);
CREATE INDEX idx_lab_order_items_status ON lab_order_items(order_id, status);

-- ============================================
-- LAB SAMPLES
-- ============================================

-- Sample status
CREATE TYPE lab_sample_status AS ENUM (
  'pending',      -- aguardando coleta
  'collected',    -- coletado
  'received',     -- recebido no laboratório
  'processing',   -- em processamento
  'rejected',     -- rejeitado
  'discarded'     -- descartado
);

-- Sample types
CREATE TYPE lab_sample_type AS ENUM (
  'blood',
  'urine',
  'feces',
  'tissue',
  'swab',
  'fluid',
  'biopsy',
  'other'
);

-- Lab samples (amostras coletadas)
CREATE TABLE lab_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sample_number text NOT NULL, -- número da amostra
  order_id uuid NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES lab_order_items(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  sample_type lab_sample_type NOT NULL DEFAULT 'blood',
  specimen_source text, -- local de coleta
  volume_collected text,
  collection_method text,
  status lab_sample_status NOT NULL DEFAULT 'pending',
  collected_at timestamptz,
  collected_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  received_at timestamptz,
  received_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, sample_number)
);
CREATE INDEX idx_lab_samples_account ON lab_samples(account_id);
CREATE INDEX idx_lab_samples_order ON lab_samples(order_id);
CREATE INDEX idx_lab_samples_patient ON lab_samples(patient_id);
CREATE INDEX idx_lab_samples_status ON lab_samples(account_id, status);
CREATE INDEX idx_lab_samples_collected ON lab_samples(collected_at DESC);
CREATE INDEX idx_lab_samples_number ON lab_samples(sample_number);

-- ============================================
-- LAB RESULTS
-- ============================================

-- Result status
CREATE TYPE lab_result_status AS ENUM (
  'pending',      -- aguardando resultado
  'preliminary',  -- resultado preliminar
  'final',        -- resultado final
  'corrected',    -- corrigido
  'cancelled'     -- cancelado
);

-- Lab results (resultados dos exames)
CREATE TABLE lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES lab_order_items(id) ON DELETE CASCADE,
  sample_id uuid REFERENCES lab_samples(id) ON DELETE SET NULL,
  test_id uuid NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  result_value text, -- valor do resultado
  result_numeric numeric, -- valor numérico para comparação
  unit text,
  reference_range text, -- faixa de referência aplicada
  reference_range_id uuid REFERENCES lab_reference_ranges(id) ON DELETE SET NULL,
  flag text CHECK (flag IN ('low', 'high', 'critical_low', 'critical_high', 'abnormal', 'normal')),
  status lab_result_status NOT NULL DEFAULT 'pending',
  notes text,
  interpretation text, -- interpretação do resultado
  performed_at timestamptz,
  performed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  verified_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lab_results_account ON lab_results(account_id);
CREATE INDEX idx_lab_results_order_item ON lab_results(order_item_id);
CREATE INDEX idx_lab_results_sample ON lab_results(sample_id);
CREATE INDEX idx_lab_results_patient ON lab_results(patient_id);
CREATE INDEX idx_lab_results_status ON lab_results(account_id, status);
CREATE INDEX idx_lab_results_flag ON lab_results(order_item_id, flag);

-- ============================================
-- LAB REPORTS (LAUDOS)
-- ============================================

-- Report status
CREATE TYPE lab_report_status AS ENUM (
  'draft',        -- rascunho
  'pending_review', -- aguardando revisão
  'finalized',    -- finalizado
  'signed',       -- assinado
  'amended'       -- retificado
);

-- Lab reports (laudos)
CREATE TABLE lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  report_number text NOT NULL, -- número do laudo
  order_id uuid NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status lab_report_status NOT NULL DEFAULT 'draft',
  conclusion text, -- conclusão/laudo
  methodology text, -- metodologia utilizada
  limitations text, -- limitações do exame
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, report_number)
);
CREATE INDEX idx_lab_reports_account ON lab_reports(account_id);
CREATE INDEX idx_lab_reports_order ON lab_reports(order_id);
CREATE INDEX idx_lab_reports_patient ON lab_reports(patient_id);
CREATE INDEX idx_lab_reports_status ON lab_reports(account_id, status);
CREATE INDEX idx_lab_reports_number ON lab_reports(report_number);

-- Report results (link between reports and results)
CREATE TABLE lab_report_results (
  report_id uuid NOT NULL REFERENCES lab_reports(id) ON DELETE CASCADE,
  result_id uuid NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, result_id)
);
CREATE INDEX idx_lab_report_results_result ON lab_report_results(result_id);

-- ============================================
-- AUDIT TRIGGERS
-- ============================================

-- Create audit log function if not exists
CREATE OR REPLACE FUNCTION log_lab_audit() RETURNS TRIGGER AS $$
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
    COALESCE(NEW.created_by_user_id, NEW.performed_by_user_id, NEW.verified_by_user_id, 
             NEW.drafted_by_user_id, NEW.reviewed_by_user_id, NEW.signed_by_user_id,
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

-- Add audit triggers for lab tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'lab_tests', 'lab_test_categories', 'lab_test_panels', 'lab_test_panel_items',
    'lab_reference_ranges', 'lab_orders', 'lab_order_items', 'lab_samples',
    'lab_results', 'lab_reports', 'lab_report_results'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON %s', t, t);
    EXECUTE format('CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION log_lab_audit()', t, t);
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
    'lab_test_categories', 'lab_tests', 'lab_test_panels',
    'lab_reference_ranges', 'lab_orders', 'lab_order_items', 'lab_samples',
    'lab_results', 'lab_reports'
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

-- Create sequences for order/sample/report numbers per account
CREATE TABLE lab_sequences (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  order_seq integer NOT NULL DEFAULT 0,
  sample_seq integer NOT NULL DEFAULT 0,
  report_seq integer NOT NULL DEFAULT 0
);

-- Function to get next sequence number
CREATE OR REPLACE FUNCTION lab_next_order_number(p_account_id uuid) RETURNS text AS $$
DECLARE
  v_seq integer;
BEGIN
  INSERT INTO lab_sequences (account_id, order_seq) 
  VALUES (p_account_id, 1)
  ON CONFLICT (account_id) DO UPDATE SET order_seq = lab_sequences.order_seq + 1
  RETURNING order_seq INTO v_seq;
  RETURN 'LAB' || to_char(now(), 'YYYYMM') || '-' || LPAD(v_seq::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION lab_next_sample_number(p_account_id uuid) RETURNS text AS $$
DECLARE
  v_seq integer;
BEGIN
  INSERT INTO lab_sequences (account_id, sample_seq) 
  VALUES (p_account_id, 1)
  ON CONFLICT (account_id) DO UPDATE SET sample_seq = lab_sequences.sample_seq + 1
  RETURNING sample_seq INTO v_seq;
  RETURN 'SAM' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION lab_next_report_number(p_account_id uuid) RETURNS text AS $$
DECLARE
  v_seq integer;
BEGIN
  INSERT INTO lab_sequences (account_id, report_seq) 
  VALUES (p_account_id, 1)
  ON CONFLICT (account_id) DO UPDATE SET report_seq = lab_sequences.report_seq + 1
  RETURNING report_seq INTO v_seq;
  RETURN 'LAU' || to_char(now(), 'YYYY') || '-' || LPAD(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERMISSIONS
-- ============================================

-- Insert lab permissions
INSERT INTO permissions (name, description, category) VALUES
  ('laboratorio.catalogo.read', 'Visualizar catálogo de exames', 'laboratorio'),
  ('laboratorio.catalogo.create', 'Criar exames no catálogo', 'laboratorio'),
  ('laboratorio.catalogo.update', 'Editar exames no catálogo', 'laboratorio'),
  ('laboratorio.catalogo.delete', 'Excluir exames do catálogo', 'laboratorio'),
  ('laboratorio.pedidos.read', 'Visualizar pedidos de exame', 'laboratorio'),
  ('laboratorio.pedidos.create', 'Criar pedidos de exame', 'laboratorio'),
  ('laboratorio.pedidos.update', 'Editar pedidos de exame', 'laboratorio'),
  ('laboratorio.pedidos.cancel', 'Cancelar pedidos de exame', 'laboratorio'),
  ('laboratorio.coleta.read', 'Visualizar coletas', 'laboratorio'),
  ('laboratorio.coleta.create', 'Registrar coletas', 'laboratorio'),
  ('laboratorio.coleta.update', 'Editar coletas', 'laboratorio'),
  ('laboratorio.resultados.read', 'Visualizar resultados', 'laboratorio'),
  ('laboratorio.resultados.create', 'Registrar resultados', 'laboratorio'),
  ('laboratorio.resultados.update', 'Editar resultados', 'laboratorio'),
  ('laboratorio.resultados.verify', 'Verificar resultados', 'laboratorio'),
  ('laboratorio.laudos.read', 'Visualizar laudos', 'laboratorio'),
  ('laboratorio.laudos.create', 'Criar laudos', 'laboratorio'),
  ('laboratorio.laudos.update', 'Editar laudos', 'laboratorio'),
  ('laboratorio.laudos.sign', 'Assinar laudos', 'laboratorio'),
  ('laboratorio.referencia.read', 'Visualizar valores de referência', 'laboratorio'),
  ('laboratorio.referencia.create', 'Criar valores de referência', 'laboratorio'),
  ('laboratorio.referencia.update', 'Editar valores de referência', 'laboratorio'),
  ('laboratorio.referencia.delete', 'Excluir valores de referência', 'laboratorio')
ON CONFLICT (name) DO NOTHING;
