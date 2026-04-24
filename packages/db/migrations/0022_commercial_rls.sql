-- Vetus commercial hardening: RLS and legacy catalog identifiers.

ALTER TABLE price_table_items
  ALTER COLUMN item_id TYPE VARCHAR(255) USING item_id::text;

ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS loyalty_programs_tenant_isolation ON loyalty_programs;
CREATE POLICY loyalty_programs_tenant_isolation ON loyalty_programs
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS loyalty_points_tenant_isolation ON loyalty_points;
CREATE POLICY loyalty_points_tenant_isolation ON loyalty_points
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS loyalty_redemptions_tenant_isolation ON loyalty_redemptions;
CREATE POLICY loyalty_redemptions_tenant_isolation ON loyalty_redemptions
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE price_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_tables_tenant_isolation ON price_tables;
CREATE POLICY price_tables_tenant_isolation ON price_tables
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE price_table_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_table_items_tenant_isolation ON price_table_items;
CREATE POLICY price_table_items_tenant_isolation ON price_table_items
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE pos_sync_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pos_sync_jobs_tenant_isolation ON pos_sync_jobs;
CREATE POLICY pos_sync_jobs_tenant_isolation ON pos_sync_jobs
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

COMMENT ON POLICY loyalty_programs_tenant_isolation ON loyalty_programs IS
  'Isolates Vetus loyalty programs by account.';

COMMENT ON POLICY loyalty_points_tenant_isolation ON loyalty_points IS
  'Isolates Vetus loyalty point movements by account.';

COMMENT ON POLICY loyalty_redemptions_tenant_isolation ON loyalty_redemptions IS
  'Isolates Vetus loyalty redemptions by account.';

COMMENT ON POLICY price_tables_tenant_isolation ON price_tables IS
  'Isolates Vetus price tables by account.';

COMMENT ON POLICY price_table_items_tenant_isolation ON price_table_items IS
  'Isolates Vetus price table items by account.';

COMMENT ON POLICY pos_sync_jobs_tenant_isolation ON pos_sync_jobs IS
  'Isolates Vetus POS synchronization jobs by account.';
