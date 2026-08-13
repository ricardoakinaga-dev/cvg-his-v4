-- Close the remaining runtime isolation gaps for tenant-derived data.
-- The migration intentionally aborts when legacy outbox rows cannot be
-- attributed to an account; silently assigning those rows would mix tenants.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMPTZ;

UPDATE sessions
SET refresh_expires_at = expires_at
WHERE refresh_expires_at IS NULL;

ALTER TABLE sessions
  ALTER COLUMN refresh_expires_at SET NOT NULL;

ALTER TABLE outbox_events
  ADD COLUMN IF NOT EXISTS account_id UUID;

UPDATE outbox_events
SET account_id = COALESCE(
  CASE
    WHEN payload ->> 'accountId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (payload ->> 'accountId')::uuid
  END,
  CASE
    WHEN payload ->> 'account_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (payload ->> 'account_id')::uuid
  END
)
WHERE account_id IS NULL;

DO $migration$
DECLARE
  unresolved_count bigint;
BEGIN
  SELECT COUNT(*) INTO unresolved_count
  FROM outbox_events
  WHERE account_id IS NULL;

  IF unresolved_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enable tenant isolation: % outbox_events row(s) have no valid accountId/account_id in payload',
      unresolved_count;
  END IF;
END
$migration$;

ALTER TABLE outbox_events
  ALTER COLUMN account_id SET NOT NULL;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'outbox_events_account_id_accounts_id_fk'
      AND conrelid = 'outbox_events'::regclass
  ) THEN
    ALTER TABLE outbox_events
      ADD CONSTRAINT outbox_events_account_id_accounts_id_fk
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_outbox_events_account_status_scheduled
  ON outbox_events (account_id, status, scheduled_at);

-- Exact account lookup for pre-authentication. Runtime roles receive EXECUTE
-- on app functions but no direct access to the account/tenant directories.
CREATE OR REPLACE FUNCTION app.resolve_active_account_id(account_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT account.id
  FROM public.accounts AS account
  JOIN public.tenants AS tenant ON tenant.id = account.tenant_id
  WHERE lower(account.slug) = lower(btrim(account_slug))
    AND account.is_active = true
    AND tenant.status = 'active'
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION app.resolve_active_account_id(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION app.is_active_account_id(candidate_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounts AS account
    JOIN public.tenants AS tenant ON tenant.id = account.tenant_id
    WHERE account.id = candidate_account_id
      AND account.is_active = true
      AND tenant.status = 'active'
  )
$function$;

REVOKE ALL ON FUNCTION app.is_active_account_id(uuid) FROM PUBLIC;

-- Direct tenant ownership.
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outbox_events_tenant_isolation ON outbox_events;
CREATE POLICY outbox_events_tenant_isolation ON outbox_events
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

-- Tenant ownership derived through an already isolated parent.
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_key_usage_tenant_isolation ON api_key_usage;
CREATE POLICY api_key_usage_tenant_isolation ON api_key_usage
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_key_usage.api_key_id
        AND api_keys.account_id = app.current_account_id()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_key_usage.api_key_id
        AND api_keys.account_id = app.current_account_id()::text
    )
  );

ALTER TABLE api_key_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_rate_limits FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_key_rate_limits_tenant_isolation ON api_key_rate_limits;
CREATE POLICY api_key_rate_limits_tenant_isolation ON api_key_rate_limits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_key_rate_limits.api_key_id
        AND api_keys.account_id = app.current_account_id()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_key_rate_limits.api_key_id
        AND api_keys.account_id = app.current_account_id()::text
    )
  );

ALTER TABLE encounter_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_timeline FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS encounter_timeline_tenant_isolation ON encounter_timeline;
CREATE POLICY encounter_timeline_tenant_isolation ON encounter_timeline
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM encounters
      WHERE encounters.id::text = encounter_timeline.encounter_id
        AND encounters.account_id = app.current_account_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM encounters
      WHERE encounters.id::text = encounter_timeline.encounter_id
        AND encounters.account_id = app.current_account_id()
    )
  );

ALTER TABLE mfa_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_credentials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mfa_credentials_tenant_isolation ON mfa_credentials;
CREATE POLICY mfa_credentials_tenant_isolation ON mfa_credentials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = mfa_credentials.user_id
        AND users.account_id = app.current_account_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = mfa_credentials.user_id
        AND users.account_id = app.current_account_id()
    )
  );

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_tenant_isolation ON user_roles;
CREATE POLICY user_roles_tenant_isolation ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_roles.user_id
        AND users.account_id = app.current_account_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_roles.user_id
        AND users.account_id = app.current_account_id()
    )
  );

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_deliveries_tenant_isolation ON webhook_deliveries;
CREATE POLICY webhook_deliveries_tenant_isolation ON webhook_deliveries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_deliveries.webhook_id
        AND webhooks.account_id = app.current_account_id()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_deliveries.webhook_id
        AND webhooks.account_id = app.current_account_id()::text
    )
  );

-- entry_revisions already has a derived policy; force it for table owners too.
ALTER TABLE entry_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_revisions FORCE ROW LEVEL SECURITY;
