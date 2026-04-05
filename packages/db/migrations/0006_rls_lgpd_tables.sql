-- Onda 1 - Fase 5b: Row-Level Security para tabelas LGPD
-- Protege consent_records e data_subject_requests contra acesso cross-account
--
-- Estas tabelas contem dados sensíveis de privacidade (LGPD) e devem ter
-- isolamento forte no nivel do banco, consistente com a estrategia da Fase 3.

-- ============================================================================
-- 1. CONSENT RECORDS
-- ============================================================================

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY consent_records_tenant_isolation ON consent_records
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- ============================================================================
-- 2. DATA SUBJECT REQUESTS
-- ============================================================================

ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_subject_requests_tenant_isolation ON data_subject_requests
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- ============================================================================
-- 3. ATUALIZAR RESUMO RLS
-- ============================================================================

-- A view app.rls_status ja existe e reflete automaticamente as novas tabelas.
-- A funcao app.rls_summary() precisa ser atualizada para incluir estas tabelas
-- no contador de tabelas protegidas (elas nao estao na lista de exclusao).
-- Como consent_records e data_subject_requests NAO estao na lista de exclusao,
-- elas serao automaticamente incluidas na contagem de rls_enabled.

COMMENT ON POLICY consent_records_tenant_isolation ON consent_records IS
  'Fase 5b: Isola consentimentos por account — dados LGPD sensíveis';

COMMENT ON POLICY data_subject_requests_tenant_isolation ON data_subject_requests IS
  'Fase 5b: Isola solicitacoes do titular por account — dados LGPD sensíveis';
