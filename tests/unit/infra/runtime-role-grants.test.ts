import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { API_GLOBAL_TABLE_MUTATIONS } from '../../../packages/db/src/reconcile-runtime-roles';

const root = resolve(import.meta.dirname, '../../..');
const roleScripts = [
  'infra/postgres/init-runtime-role.sh',
  'infra/helm/cvg-his-v2/templates/postgres-runtime-role-configmap.yaml'
].map((path) => ({ path, content: readFileSync(resolve(root, path), 'utf8') }));

describe('runtime PostgreSQL role grants', () => {
  it('preserves the exact API mutations used by global repositories', () => {
    const requiredGrants = [
      "('roles', 'INSERT')",
      "('permissions', 'INSERT')",
      "('role_permissions', 'INSERT, DELETE')",
      "('user_roles', 'INSERT, DELETE')",
      "('cfop_entries', 'INSERT, UPDATE')",
      "('icms_tables', 'INSERT, UPDATE')",
      "('ipi_tables', 'INSERT, UPDATE')",
      "('pis_tables', 'INSERT, UPDATE')",
      "('cofins_tables', 'INSERT, UPDATE')",
      "('ibs_cbs_tables', 'INSERT, UPDATE')",
      "('icms_rules', 'INSERT')",
      "('nfse_layouts', 'INSERT, UPDATE')"
    ];

    expect(
      API_GLOBAL_TABLE_MUTATIONS.map(
        (grant) => `('${grant.tableName}', '${grant.privileges}')`
      )
    ).toEqual(requiredGrants);

    for (const script of roleScripts) {
      for (const grant of requiredGrants) {
        expect(script.content, `${script.path} must include ${grant}`).toContain(grant);
      }
    }
  });

  it('does not grant global mutation privileges to the worker role', () => {
    for (const script of roleScripts) {
      expect(script.content).not.toMatch(
        /GRANT (?:INSERT|UPDATE|DELETE)[^\n]*worker_user/i
      );
    }
  });
});
