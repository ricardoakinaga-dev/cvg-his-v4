-- Onda 1 - Fase 3: REVERT RLS
-- Este arquivo reverte todas as politicas de RLS aplicadas na migration 0003
-- Use apenas em caso de emergencia ou rollback planejado.
--
-- ATENCAO: Reverter RLS remove a protecao cross-tenant no nivel do banco.
-- A aplicacao deve ter fallback de filtragem por account_id em todas as queries.

-- ============================================================================
-- 1. REMOVER POLICIAS E DESABILITAR RLS
-- ============================================================================

-- Nivel 1: Tabelas independentes
DROP POLICY IF EXISTS owners_tenant_isolation ON owners;
ALTER TABLE owners DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_tenant_isolation ON products;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS services_tenant_isolation ON services;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_tenant_isolation ON staff;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS units_tenant_isolation ON units;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wards_tenant_isolation ON wards;
ALTER TABLE wards DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS beds_tenant_isolation ON beds;
ALTER TABLE beds DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_tenant_isolation ON documents;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professional_availability_tenant_isolation ON professional_availability;
ALTER TABLE professional_availability DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointment_type_configs_tenant_isolation ON appointment_type_configs;
ALTER TABLE appointment_type_configs DISABLE ROW LEVEL SECURITY;

-- Nivel 2: Tabelas dependentes de owners/patients
DROP POLICY IF EXISTS patients_tenant_isolation ON patients;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;

-- Nivel 3: Tabelas transactionais core
DROP POLICY IF EXISTS encounters_tenant_isolation ON encounters;
ALTER TABLE encounters DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointments_tenant_isolation ON appointments;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_tenant_isolation ON users;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Nivel 4: Tabelas dependentes de encounters
DROP POLICY IF EXISTS clinical_notes_tenant_isolation ON clinical_notes;
ALTER TABLE clinical_notes DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinical_note_versions_tenant_isolation ON clinical_note_versions;
ALTER TABLE clinical_note_versions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS encounter_documents_tenant_isolation ON encounter_documents;
ALTER TABLE encounter_documents DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS encounter_billing_items_tenant_isolation ON encounter_billing_items;
ALTER TABLE encounter_billing_items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS encounter_financial_accounts_tenant_isolation ON encounter_financial_accounts;
ALTER TABLE encounter_financial_accounts DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS encounter_receivables_tenant_isolation ON encounter_receivables;
ALTER TABLE encounter_receivables DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS encounter_receivable_payments_tenant_isolation ON encounter_receivable_payments;
ALTER TABLE encounter_receivable_payments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_orders_tenant_isolation ON exam_orders;
ALTER TABLE exam_orders DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_results_tenant_isolation ON exam_results;
ALTER TABLE exam_results DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inpatient_stays_tenant_isolation ON inpatient_stays;
ALTER TABLE inpatient_stays DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medication_orders_tenant_isolation ON medication_orders;
ALTER TABLE medication_orders DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medication_order_schedules_tenant_isolation ON medication_order_schedules;
ALTER TABLE medication_order_schedules DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medication_administrations_tenant_isolation ON medication_administrations;
ALTER TABLE medication_administrations DISABLE ROW LEVEL SECURITY;

-- Nivel 5: Financeiro e operacional
DROP POLICY IF EXISTS payments_tenant_isolation ON payments;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_registers_tenant_isolation ON cash_registers;
ALTER TABLE cash_registers DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_movements_tenant_isolation ON cash_movements;
ALTER TABLE cash_movements DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS counter_sales_tenant_isolation ON counter_sales;
ALTER TABLE counter_sales DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS counter_sale_items_tenant_isolation ON counter_sale_items;
ALTER TABLE counter_sale_items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS counter_sale_payments_tenant_isolation ON counter_sale_payments;
ALTER TABLE counter_sale_payments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quotes_tenant_isolation ON quotes;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_items_tenant_isolation ON quote_items;
ALTER TABLE quote_items DISABLE ROW LEVEL SECURITY;

-- Nivel 6: Operacoes hospitalares
DROP POLICY IF EXISTS alerts_tenant_isolation ON alerts;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_jobs_tenant_isolation ON notification_jobs;
ALTER TABLE notification_jobs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS protocols_tenant_isolation ON protocols;
ALTER TABLE protocols DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS protocol_versions_tenant_isolation ON protocol_versions;
ALTER TABLE protocol_versions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS protocol_snapshots_tenant_isolation ON protocol_snapshots;
ALTER TABLE protocol_snapshots DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS protocol_references_tenant_isolation ON protocol_references;
ALTER TABLE protocol_references DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shift_handovers_tenant_isolation ON shift_handovers;
ALTER TABLE shift_handovers DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shift_handover_items_tenant_isolation ON shift_handover_items;
ALTER TABLE shift_handover_items DISABLE ROW LEVEL SECURITY;

-- Nivel 7: Estoque
DROP POLICY IF EXISTS stock_items_tenant_isolation ON stock_items;
ALTER TABLE stock_items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_lots_tenant_isolation ON stock_lots;
ALTER TABLE stock_lots DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_movements_tenant_isolation ON stock_movements;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;

-- Nivel 8: Governanca de acesso
DROP POLICY IF EXISTS access_teams_tenant_isolation ON access_teams;
ALTER TABLE access_teams DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS access_sectors_tenant_isolation ON access_sectors;
ALTER TABLE access_sectors DISABLE ROW LEVEL SECURITY;

-- Audit events (nullable account_id)
DROP POLICY IF EXISTS audit_events_tenant_isolation ON audit_events;
ALTER TABLE audit_events DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. REMOVER FUNCOES E VIEWS DE AUDITORIA
-- ============================================================================

DROP VIEW IF EXISTS app.rls_status;
DROP FUNCTION IF EXISTS app.is_rls_enabled(text);
DROP FUNCTION IF EXISTS app.rls_summary();
DROP FUNCTION IF EXISTS app.current_account_id();
DROP FUNCTION IF EXISTS app.has_account_context();
DROP FUNCTION IF EXISTS app.rls_select_policy();

-- ============================================================================
-- 3. REMOVER ROLE DE BYPASS
-- ============================================================================

DROP ROLE IF EXISTS rls_bypass;
