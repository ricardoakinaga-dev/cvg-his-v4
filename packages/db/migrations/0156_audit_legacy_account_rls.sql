-- Make historical NULL-account audit rows visible only to their exact tenant
-- when the legacy account identity is retained in metadata. The prior policy
-- intentionally hid every NULL-account row under tenant context, which made
-- durable operational coverage undercount legacy evidence for NOBYPASSRLS
-- runtime roles.

DROP POLICY IF EXISTS audit_events_tenant_isolation ON audit_events;
DROP POLICY IF EXISTS audit_events_tenant_insert_isolation ON audit_events;
DROP POLICY IF EXISTS audit_events_tenant_update_isolation ON audit_events;
DROP POLICY IF EXISTS audit_events_tenant_delete_isolation ON audit_events;

-- Historical NULL-account rows are a read-only compatibility surface. They
-- may be read only when their retained legacy account identity matches the
-- active tenant context. Ordinary tenant-owned rows keep the existing
-- account_id equality semantics for all writes.
CREATE POLICY audit_events_tenant_isolation ON audit_events
  FOR SELECT
  USING (
    account_id = app.current_account_id()
    OR (
      account_id IS NULL
      AND metadata->>'legacyAccountId' = app.current_account_id()::text
    )
  );

CREATE POLICY audit_events_tenant_insert_isolation ON audit_events
  FOR INSERT
  WITH CHECK (
    account_id IS NOT NULL
    AND account_id = app.current_account_id()
  );

CREATE POLICY audit_events_tenant_update_isolation ON audit_events
  FOR UPDATE
  USING (
    account_id IS NOT NULL
    AND account_id = app.current_account_id()
  )
  WITH CHECK (
    account_id IS NOT NULL
    AND account_id = app.current_account_id()
  );

CREATE POLICY audit_events_tenant_delete_isolation ON audit_events
  FOR DELETE
  USING (
    account_id IS NOT NULL
    AND account_id = app.current_account_id()
  );
