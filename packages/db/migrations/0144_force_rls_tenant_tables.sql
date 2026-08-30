-- Enforce tenant RLS for table owners as well as ordinary NOBYPASSRLS roles.
--
-- Runtime roles are already created with NOBYPASSRLS. FORCE RLS closes the
-- remaining ownership escape hatch for tenant tables when a migration-owned
-- or maintenance-owned role touches application data.
--
-- installation_state is deliberately excluded: it is a global singleton used
-- by the setup boundary before an account context exists. Its table privileges
-- remain revoked and its SECURITY DEFINER functions are the only supported
-- access path for runtime callers.

DO $force_tenant_rls$
DECLARE
  tenant_table record;
BEGIN
  FOR tenant_table IN
    SELECT c.relname
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n
        ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p')
       AND c.relname <> 'installation_state'
       AND EXISTS (
         SELECT 1
           FROM pg_catalog.pg_attribute AS a
          WHERE a.attrelid = c.oid
            AND a.attname = 'account_id'
            AND NOT a.attisdropped
       )
     ORDER BY c.relname
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',
      tenant_table.relname
    );
  END LOOP;
END
$force_tenant_rls$;

