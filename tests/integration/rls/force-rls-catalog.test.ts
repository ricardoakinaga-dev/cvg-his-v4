import { describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';

describe('tenant catalog FORCE RLS contract', () => {
  it('forces RLS on every public tenant table except the setup singleton', async () => {
    const result = await getTestPool().query<{
      readonly table_name: string;
      readonly rls_enabled: boolean;
      readonly force_rls: boolean;
    }>(`
      SELECT c.relname AS table_name,
             c.relrowsecurity AS rls_enabled,
             c.relforcerowsecurity AS force_rls
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind IN ('r', 'p')
         AND c.relname <> 'installation_state'
         AND EXISTS (
           SELECT 1
             FROM pg_attribute a
            WHERE a.attrelid = c.oid
              AND a.attname = 'account_id'
              AND NOT a.attisdropped
         )
       ORDER BY c.relname
    `);

    const incomplete = result.rows.filter((row) => !row.rls_enabled || !row.force_rls);
    expect(incomplete, JSON.stringify(incomplete, null, 2)).toEqual([]);
  });

  it('keeps installation_state as the documented global setup exception', async () => {
    const result = await getTestPool().query<{
      readonly rls_enabled: boolean;
      readonly force_rls: boolean;
      readonly public_select: boolean;
    }>(`
      SELECT c.relrowsecurity AS rls_enabled,
             c.relforcerowsecurity AS force_rls,
             has_table_privilege('public', 'public.installation_state', 'SELECT') AS public_select
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = 'installation_state'
    `);

    expect(result.rows).toEqual([{ rls_enabled: false, force_rls: false, public_select: false }]);
  });
});
