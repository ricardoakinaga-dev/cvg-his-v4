-- Medical records RLS hardening on the canonical migration rail.
-- Closes the tenancy gap for the V2 medical record tables introduced in 0018.

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS medical_records_tenant_isolation ON medical_records;
CREATE POLICY medical_records_tenant_isolation ON medical_records
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE clinical_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinical_entries_tenant_isolation ON clinical_entries;
CREATE POLICY clinical_entries_tenant_isolation ON clinical_entries
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE clinical_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinical_timeline_tenant_isolation ON clinical_timeline;
CREATE POLICY clinical_timeline_tenant_isolation ON clinical_timeline
  FOR ALL
  USING (account_id = app.current_account_id())
  WITH CHECK (account_id = app.current_account_id());

ALTER TABLE entry_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS entry_revisions_tenant_isolation ON entry_revisions;
CREATE POLICY entry_revisions_tenant_isolation ON entry_revisions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM clinical_entries
      WHERE clinical_entries.id = entry_revisions.entry_id
        AND clinical_entries.account_id = app.current_account_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM clinical_entries
      WHERE clinical_entries.id = entry_revisions.entry_id
        AND clinical_entries.account_id = app.current_account_id()
    )
  );

COMMENT ON POLICY medical_records_tenant_isolation ON medical_records IS
  'Isola prontuarios V2 por account no trilho canonico de banco.';

COMMENT ON POLICY clinical_entries_tenant_isolation ON clinical_entries IS
  'Isola entradas clinicas V2 por account no trilho canonico de banco.';

COMMENT ON POLICY clinical_timeline_tenant_isolation ON clinical_timeline IS
  'Isola timeline clinica V2 por account no trilho canonico de banco.';

COMMENT ON POLICY entry_revisions_tenant_isolation ON entry_revisions IS
  'Isola revisoes de entradas clinicas por account via clinical_entries.';
