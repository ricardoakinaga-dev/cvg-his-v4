import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { V2_ACCESS_CONTROL_PERMISSION_SEEDS, V2_ACCESS_CONTROL_ROLE_SEEDS } from '@cvg-his-v2/rbac';

import {
  DB_ACCESS_CONTROL_PERMISSION_SEEDS,
  DB_ACCESS_CONTROL_ROLE_PERMISSION_MAP
} from './access-control-seeds.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('database access catalog rail', () => {
  it('projects the shared catalog without dropping permissions or roles', () => {
    expect(DB_ACCESS_CONTROL_PERMISSION_SEEDS).toEqual(
      V2_ACCESS_CONTROL_PERMISSION_SEEDS.map(({ key, description }) => ({ key, description }))
    );
    expect(DB_ACCESS_CONTROL_ROLE_PERMISSION_MAP).toEqual(
      Object.fromEntries(
        V2_ACCESS_CONTROL_ROLE_SEEDS.map((role) => [role.name, [...role.permissionCodes]])
      )
    );
  });

  it('contains an idempotent migration for the persisted seven-profile baseline', () => {
    const migration = readFileSync(
      resolve(repositoryRoot, 'packages/db/migrations/0147_access_role_catalog_alignment.sql'),
      'utf8'
    );

    for (const permission of [
      'auth.mfa.read',
      'auth.mfa.manage',
      'flags.read',
      'flags.admin',
      'payments.manage',
      'lgpd.requests.read',
      'lgpd.requests.manage'
    ]) {
      expect(migration).toContain(`'${permission}'`);
    }
    for (const role of V2_ACCESS_CONTROL_ROLE_SEEDS.map((item) => item.name)) {
      expect(migration).toContain(`'${role}'`);
    }
    expect(migration).toContain('ON CONFLICT (key) DO UPDATE');
    expect(migration).toContain('DELETE FROM role_permissions');
  });
});
