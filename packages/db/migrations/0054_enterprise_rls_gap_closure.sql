-- F3-02: close enterprise RLS coverage gaps detected by static migration validation.

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_keys_tenant_isolation ON api_keys;
CREATE POLICY api_keys_tenant_isolation ON api_keys
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhooks_tenant_isolation ON webhooks;
CREATE POLICY webhooks_tenant_isolation ON webhooks
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feature_flags_tenant_isolation ON feature_flags;
CREATE POLICY feature_flags_tenant_isolation ON feature_flags
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feature_flag_overrides_tenant_isolation ON feature_flag_overrides;
CREATE POLICY feature_flag_overrides_tenant_isolation ON feature_flag_overrides
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attachments_tenant_isolation ON attachments;
CREATE POLICY attachments_tenant_isolation ON attachments
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

ALTER TABLE inpatient_occurrences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inpatient_occurrences_tenant_isolation ON inpatient_occurrences;
CREATE POLICY inpatient_occurrences_tenant_isolation ON inpatient_occurrences
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);

ALTER TABLE inpatient_daily_charges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inpatient_daily_charges_tenant_isolation ON inpatient_daily_charges;
CREATE POLICY inpatient_daily_charges_tenant_isolation ON inpatient_daily_charges
  USING (account_id = app.current_account_id()::text)
  WITH CHECK (account_id = app.current_account_id()::text);
