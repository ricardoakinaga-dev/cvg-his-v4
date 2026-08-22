-- Tenant-isolate role assignment writes through the parent user.
-- Roles remain a global catalog, while a runtime may only observe or mutate
-- assignments for users in the current transaction-scoped account.

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_tenant_isolation ON user_roles;
CREATE POLICY user_roles_tenant_isolation ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = user_roles.user_id
        AND users.account_id = app.current_account_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = user_roles.user_id
        AND users.account_id = app.current_account_id()
    )
  );
