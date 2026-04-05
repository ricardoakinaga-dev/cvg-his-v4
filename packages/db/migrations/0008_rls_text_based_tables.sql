-- Onda 1 - Fase 3c: Row-Level Security para tabelas migradas (Fase 3b)
-- Habilita RLS em:
--   - triage_records
--   - triage_record_versions
--   - scheduling_queue_entries
--
-- Estas tabelas foram migradas de account_id text para uuid na Fase 3b
-- e agora recebem o mesmo padrão de isolamento das tabelas core.

-- ============================================================================
-- 1. TRIAGE_RECORDS
-- ============================================================================

ALTER TABLE triage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY triage_records_tenant_isolation ON triage_records
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- ============================================================================
-- 2. TRIAGE_RECORD_VERSIONS
-- ============================================================================

ALTER TABLE triage_record_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY triage_record_versions_tenant_isolation ON triage_record_versions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- ============================================================================
-- 3. SCHEDULING_QUEUE_ENTRIES
-- ============================================================================

ALTER TABLE scheduling_queue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduling_queue_entries_tenant_isolation ON scheduling_queue_entries
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- ============================================================================
-- 4. ATUALIZAR app.rls_summary() — remover tabelas da lista de exclusão
-- ============================================================================

-- As 3 tabelas agora têm RLS, então devem ser removidas da exclusão
-- e incluídas na contagem de tabelas protegidas.

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
                          'access_sector_permissions');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. COMENTÁRIOS
-- ============================================================================

COMMENT ON POLICY triage_records_tenant_isolation ON triage_records IS
  'Fase 3c: Isola registros de triagem por account';

COMMENT ON POLICY triage_record_versions_tenant_isolation ON triage_record_versions IS
  'Fase 3c: Isola histórico de triagem por account';

COMMENT ON POLICY scheduling_queue_entries_tenant_isolation ON scheduling_queue_entries IS
  'Fase 3c: Isola fila de espera por account';
