import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getTableConfig } from 'drizzle-orm/pg-core';

import { accountServicePrincipals } from '../../../packages/db/src/schema/account_service_principals.ts';
import { users } from '../../../packages/db/src/schema/users.ts';

describe('PIX service principal Drizzle schema', () => {
  it('keeps explicit human and interactive-login backfills in the expand-only migration', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'packages/db/migrations/0112_pix_service_principals.sql'),
      'utf8'
    );

    expect(migration).toContain("SET principal_kind = 'human'");
    expect(migration).toContain('SET interactive_login_enabled = true');
    expect(migration).not.toMatch(/INSERT\s+INTO\s+(users|account_service_principals)/i);
  });

  it('models the principal discriminator and interactive-login defaults on users', () => {
    const config = getTableConfig(users);
    const principalKind = config.columns.find((column) => column.name === 'principal_kind');
    const interactiveLoginEnabled = config.columns.find(
      (column) => column.name === 'interactive_login_enabled'
    );

    expect(principalKind).toMatchObject({ notNull: true, hasDefault: true, default: 'human' });
    expect(interactiveLoginEnabled).toMatchObject({
      notNull: true,
      hasDefault: true,
      default: true
    });
    expect(config.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        'users_principal_kind_chk',
        'users_service_principal_interactive_login_chk'
      ])
    );
  });

  it('models tenant-local mappings, their active uniqueness, allowlist, and timestamps', () => {
    const config = getTableConfig(accountServicePrincipals);
    const byName = new Map(config.columns.map((column) => [column.name, column]));

    expect([...byName.keys()]).toEqual(
      expect.arrayContaining([
        'id',
        'account_id',
        'purpose',
        'user_id',
        'is_active',
        'created_at',
        'updated_at'
      ])
    );
    expect(byName.get('purpose')).toMatchObject({ notNull: true });
    expect(byName.get('is_active')).toMatchObject({ notNull: true, default: true });
    expect(config.foreignKeys.map((foreignKey) => foreignKey.getName())).toEqual(
      expect.arrayContaining([
        'account_service_principals_account_fk',
        'account_service_principals_account_user_fk'
      ])
    );
    expect(config.indexes.map((index) => index.config.name)).toContain(
      'account_service_principals_active_purpose_unique'
    );
    expect(config.checks.map((constraint) => constraint.name)).toContain(
      'account_service_principals_purpose_chk'
    );
  });
});
