-- Onda 1 - Fase 3c: REVERT RLS para tabelas text-based migradas
-- Reverte as politicas de RLS aplicadas na migration 0008

-- ============================================================================
-- 1. REMOVER POLICIAS E DESABILITAR RLS
-- ============================================================================

DROP POLICY IF EXISTS triage_records_tenant_isolation ON triage_records;
ALTER TABLE triage_records DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS triage_record_versions_tenant_isolation ON triage_record_versions;
ALTER TABLE triage_record_versions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scheduling_queue_entries_tenant_isolation ON scheduling_queue_entries;
ALTER TABLE scheduling_queue_entries DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RESTAURAR app.rls_summary() COM LISTA DE EXCLUSAO ANTIGA
-- ============================================================================

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
