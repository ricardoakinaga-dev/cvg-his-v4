-- Close the tenant-isolation gap introduced with persisted authentication sessions.
-- account_id is varchar in sessions, so the UUID tenant context is compared as text.

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
CREATE POLICY sessions_tenant_isolation ON sessions
  FOR ALL
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

COMMENT ON POLICY sessions_tenant_isolation ON sessions IS
  'Restricts persisted authentication sessions to the current account context';
