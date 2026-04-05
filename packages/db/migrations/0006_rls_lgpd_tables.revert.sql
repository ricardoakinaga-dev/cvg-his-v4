-- Onda 1 - Fase 5b: REVERT RLS para tabelas LGPD
-- Reverte as politicas de RLS aplicadas na migration 0006
-- Use apenas em caso de emergencia ou rollback planejado.
--
-- ATENCAO: Reverter RLS remove a protecao cross-tenant no nivel do banco
-- para dados sensíveis de privacidade (LGPD).

-- ============================================================================
-- 1. REMOVER POLICIAS E DESABILITAR RLS
-- ============================================================================

DROP POLICY IF EXISTS consent_records_tenant_isolation ON consent_records;
ALTER TABLE consent_records DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS data_subject_requests_tenant_isolation ON data_subject_requests;
ALTER TABLE data_subject_requests DISABLE ROW LEVEL SECURITY;
