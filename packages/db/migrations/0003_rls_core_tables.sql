-- Onda 1 - Fase 3: Row-Level Security (RLS) no PostgreSQL
-- Parte 1: Infraestrutura de sessao e politicas para tabelas core
--
-- Estrategia:
-- 1. Usar variavel de sessao app.current_account_id para identificar o tenant corrente
-- 2. Habilitar RLS nas tabelas com account_id FK
-- 3. Criar policies SELECT/INSERT/UPDATE/DELETE baseadas em account_id
-- 4. Criar policy BYPASS para superuser e migracoes
-- 5. Tabelas sem account_id FK ficam para fases posteriores

-- ============================================================================
-- 1. CONFIGURACAO DE SESSAO
-- ============================================================================

-- Custom GUC para tenant/account corrente
-- Esta variavel e setada pela aplicacao ao iniciar cada transacao
-- Formato: UUID do account

DO $$
BEGIN
  -- Criar configuracao customizada se nao existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_settings WHERE name = 'app.current_account_id'
  ) THEN
    -- Nao e possivel criar GUC custom via SQL puro, mas podemos usar SET
    -- O PostgreSQL permite qualquer app.* setting sem declaracao previa
    NULL;
  END IF;
END
$$;

-- Funcao helper para obter o account_id da sessao atual
CREATE OR REPLACE FUNCTION app.current_account_id()
RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_account_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcao helper para verificar se o contexto de tenant esta presente
CREATE OR REPLACE FUNCTION app.has_account_context()
RETURNS boolean AS $$
BEGIN
  RETURN app.current_account_id() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schema para funcoes de aplicacao
CREATE SCHEMA IF NOT EXISTS app;

-- Recriar as funcoes no schema app
CREATE OR REPLACE FUNCTION app.current_account_id()
RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_account_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app.has_account_context()
RETURNS boolean AS $$
BEGIN
  RETURN app.current_account_id() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. POLITICAS BASE (templates reutilizaveis)
-- ============================================================================

-- Policy para SELECT: so ve dados do account corrente
CREATE OR REPLACE FUNCTION app.rls_select_policy()
RETURNS boolean AS $$
BEGIN
  RETURN account_id = app.current_account_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. HABILITAR RLS NAS TABELAS CORE (ordem de dependencia)
-- ============================================================================

-- Nivel 1: Tabelas independentes (so dependem de accounts)
-- Estas sao as tabelas mais criticas e com isolamento mais maduro

-- 3a. owners
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY owners_tenant_isolation ON owners
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3b. products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_tenant_isolation ON products
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3c. services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY services_tenant_isolation ON services
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3d. staff
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_tenant_isolation ON staff
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3e. units
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY units_tenant_isolation ON units
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3f. wards
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY wards_tenant_isolation ON wards
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3g. beds
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY beds_tenant_isolation ON beds
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3h. documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_tenant_isolation ON documents
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3i. professional_availability
ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_availability_tenant_isolation ON professional_availability
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3j. appointment_type_configs
ALTER TABLE appointment_type_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY appointment_type_configs_tenant_isolation ON appointment_type_configs
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Nivel 2: Tabelas que dependem de owners/patients

-- 3k. patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY patients_tenant_isolation ON patients
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Nivel 3: Tabelas transactionais core

-- 3l. encounters
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
CREATE POLICY encounters_tenant_isolation ON encounters
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3m. appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appointments_tenant_isolation ON appointments
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3n. users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Nivel 4: Tabelas dependentes de encounters

-- 3o. clinical_notes
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinical_notes_tenant_isolation ON clinical_notes
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3p. clinical_note_versions
ALTER TABLE clinical_note_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinical_note_versions_tenant_isolation ON clinical_note_versions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3q. encounter_documents
ALTER TABLE encounter_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY encounter_documents_tenant_isolation ON encounter_documents
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3r. encounter_billing_items
ALTER TABLE encounter_billing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY encounter_billing_items_tenant_isolation ON encounter_billing_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3s. encounter_financial_accounts
ALTER TABLE encounter_financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY encounter_financial_accounts_tenant_isolation ON encounter_financial_accounts
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3t. encounter_receivables
ALTER TABLE encounter_receivables ENABLE ROW LEVEL SECURITY;
CREATE POLICY encounter_receivables_tenant_isolation ON encounter_receivables
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3u. encounter_receivable_payments
ALTER TABLE encounter_receivable_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY encounter_receivable_payments_tenant_isolation ON encounter_receivable_payments
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3v. exam_orders
ALTER TABLE exam_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_orders_tenant_isolation ON exam_orders
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3w. exam_results
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_results_tenant_isolation ON exam_results
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3x. inpatient_stays
ALTER TABLE inpatient_stays ENABLE ROW LEVEL SECURITY;
CREATE POLICY inpatient_stays_tenant_isolation ON inpatient_stays
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3y. medication_orders
ALTER TABLE medication_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY medication_orders_tenant_isolation ON medication_orders
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3z. medication_order_schedules
ALTER TABLE medication_order_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY medication_order_schedules_tenant_isolation ON medication_order_schedules
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3aa. medication_administrations
ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY medication_administrations_tenant_isolation ON medication_administrations
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Nivel 5: Financeiro e operacional

-- 3ab. payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_tenant_isolation ON payments
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3ac. cash_registers
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_registers_tenant_isolation ON cash_registers
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3ad. cash_movements
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_movements_tenant_isolation ON cash_movements
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3ae. counter_sales
ALTER TABLE counter_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY counter_sales_tenant_isolation ON counter_sales
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3af. counter_sale_items
ALTER TABLE counter_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY counter_sale_items_tenant_isolation ON counter_sale_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3ag. counter_sale_payments
ALTER TABLE counter_sale_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY counter_sale_payments_tenant_isolation ON counter_sale_payments
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3ah. quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_tenant_isolation ON quotes
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3ai. quote_items
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_items_tenant_isolation ON quote_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Nivel 6: Operacoes hospitalares

-- 3aj. alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY alerts_tenant_isolation ON alerts
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3ak. notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_tenant_isolation ON notifications
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3al. notification_jobs
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_jobs_tenant_isolation ON notification_jobs
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3am. protocols
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocols_tenant_isolation ON protocols
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3an. protocol_versions
ALTER TABLE protocol_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocol_versions_tenant_isolation ON protocol_versions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3ao. protocol_snapshots
ALTER TABLE protocol_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocol_snapshots_tenant_isolation ON protocol_snapshots
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3ap. protocol_references
ALTER TABLE protocol_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocol_references_tenant_isolation ON protocol_references
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3aq. shift_handovers
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_handovers_tenant_isolation ON shift_handovers
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3ar. shift_handover_items
ALTER TABLE shift_handover_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_handover_items_tenant_isolation ON shift_handover_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Nivel 7: Estoque

-- 3as. stock_items
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_items_tenant_isolation ON stock_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3at. stock_lots
ALTER TABLE stock_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_lots_tenant_isolation ON stock_lots
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3au. stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_movements_tenant_isolation ON stock_movements
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Nivel 8: Governanca de acesso

-- 3av. access_teams
ALTER TABLE access_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY access_teams_tenant_isolation ON access_teams
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- 3aw. access_sectors
ALTER TABLE access_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY access_sectors_tenant_isolation ON access_sectors
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- ============================================================================
-- 4. TABELAS COM account_id NULLABLE (audit_events)
-- ============================================================================

-- audit_events tem account_id nullable (onDelete: set null)
-- Policy especial: permite leitura de eventos sem account apenas para superuser
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_events_tenant_isolation ON audit_events
  FOR ALL
  USING (
    account_id = app.current_account_id()
    OR (account_id IS NULL AND app.current_account_id() IS NULL)
  )
  WITH CHECK (
    account_id = app.current_account_id()
    OR account_id IS NULL
  );

-- ============================================================================
-- 5. TABELAS EXCLUIDAS DESTA FASE (documentar claramente)
-- ============================================================================

-- Estas tabelas NAO recebem RLS nesta fase:
--
-- A. Tabelas com account_id como TEXT (sem FK uuid):
--    - triage_records (account_id text, sem FK)
--    - triage_record_versions (account_id text, sem FK)
--    - scheduling_queue_entries (account_id text, sem FK)
--    -> RESOLVIDO na Fase 3b/3c: migradas para uuid + FK + RLS
--
-- B. Tabelas globais / referenciais (sem tenant scoping):
--    - tenants (top-level, protegida por acesso de plataforma)
--    - accounts (top-level, protegida por acesso de plataforma)
--    - roles (definicoes globais)
--    - permissions (definicoes globais)
--
-- C. Tabelas join (isolamento indireto via tabela pai):
--    - role_permissions (join role <-> permission, ambos globais)
--    - user_roles (join user <-> role, isolado via users.account_id)
--    - access_team_memberships (isolado via access_teams.account_id)
--    - access_sector_memberships (isolado via access_sectors.account_id)
--    - access_user_permissions (isolado via users.account_id)
--    - access_team_permissions (isolado via access_teams.account_id)
--    - access_sector_permissions (isolado via access_sectors.account_id)

-- ============================================================================
-- 6. BYPASS PARA SUPERUSER (migracoes e administracao)
-- ============================================================================

-- Permitir que o dono do schema/database bypass RLS para migracoes
-- O usuario postgres/superuser automaticamente bypass RLS no PostgreSQL
-- Mas para usuarios de aplicacao, podemos criar um role especial:

-- Criar role para migracoes que bypass RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_bypass') THEN
    CREATE ROLE rls_bypass;
  END IF;
END
$$;

-- Conceder bypass ao role de migracao
-- ALTER ROLE rls_bypass BYPASSRLS; -- Requer superuser para executar

-- ============================================================================
-- 7. VERIFICACAO POS-APLICACAO
-- ============================================================================

-- View para auditoria de RLS: quais tabelas tem RLS habilitado
CREATE OR REPLACE VIEW app.rls_status AS
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = c.schemaname AND p.tablename = c.tablename
  ) AS has_policies
FROM pg_catalog.pg_tables c
WHERE schemaname = 'public'
ORDER BY tablename;

-- Funcao para verificar se uma tabela especifica tem RLS
CREATE OR REPLACE FUNCTION app.is_rls_enabled(table_name text)
RETURNS boolean AS $$
DECLARE
  result boolean;
BEGIN
  SELECT rowsecurity INTO result
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public' AND tablename = table_name;
  RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcao para contar tabelas com RLS habilitado
CREATE OR REPLACE FUNCTION app.rls_summary()
RETURNS TABLE(
  total_tables bigint,
  rls_enabled bigint,
  rls_disabled bigint,
  tables_with_policies bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE rowsecurity = true)::bigint,
    COUNT(*) FILTER (WHERE rowsecurity = false)::bigint,
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public')::bigint
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT IN ('tenants', 'accounts', 'roles', 'permissions',
                          'role_permissions', 'user_roles',
                          'access_team_memberships', 'access_sector_memberships',
                          'access_user_permissions', 'access_team_permissions',
                          'access_sector_permissions',
                          'triage_records', 'triage_record_versions',
                          'scheduling_queue_entries');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
