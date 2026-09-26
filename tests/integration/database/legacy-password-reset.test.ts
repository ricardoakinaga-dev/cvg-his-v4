import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseUsersRepository } from '../../../packages/modules/users/src/repositories/database-users.repository.js';
import { UsersService, passwordResetRequired } from '../../../packages/modules/users/src/index.js';
import { createDatabaseClient } from '../../../packages/shared/database/src/index.js';
import type { AccountId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

/**
 * R2-SEC-01: migration 0180 flags unsalted SHA-256 hashes; the users service
 * refuses them and reports that a reset is required. The migration SQL is
 * re-applied here against a freshly inserted legacy row because the test
 * database already ran it during preparation.
 */
const tenantId = randomUUID();
const accountId = randomUUID() as AccountId;
const legacyUserId = randomUUID();
const modernUserId = randomUUID();
const username = `legacy-${legacyUserId.slice(0, 8)}`;
const migrationSql = readFileSync(
  resolve(import.meta.dirname, '../../../packages/db/migrations/0180_users_legacy_password_reset.sql'),
  'utf8'
);

describe('legacy password hashes are forced to reset (R2-SEC-01)', () => {
  const pool = getTestPool();

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(`INSERT INTO tenants (id, slug, name, status, activated_at) VALUES ($1, $2, 'Legacy tenant', 'active', now())`, [
      tenantId,
      `legacy-tenant-${tenantId}`
    ]);
    await pool.query(`INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, 'Legacy account')`, [
      accountId,
      tenantId,
      `legacy-account-${accountId}`
    ]);
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
       VALUES ($1, $2, $3, $4, $5, 'Legacy operator', true), ($6, $2, $7, $8, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Modern operator', true)`,
      [
        legacyUserId,
        accountId,
        username,
        `${username}@example.test`,
        createHash('sha256').update('LegacyPass123!').digest('hex'),
        modernUserId,
        `modern-${modernUserId.slice(0, 8)}`,
        `modern-${modernUserId.slice(0, 8)}@example.test`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  });

  it('rewrites unsalted SHA-256 hashes with the reset marker and leaves salted ones alone', async () => {
    await pool.query(migrationSql);
    const rows = await pool.query<{ id: string; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE account_id = $1 ORDER BY id',
      [accountId]
    );
    const legacy = rows.rows.find((row) => row.id === legacyUserId)!;
    const modern = rows.rows.find((row) => row.id === modernUserId)!;
    expect(legacy.password_hash.startsWith('legacy-sha256-reset-required:')).toBe(true);
    expect(passwordResetRequired(legacy.password_hash)).toBe(true);
    expect(modern.password_hash).toBe('cvg-his-v2-seed-salt-v1:seed_admin');
    expect(passwordResetRequired(modern.password_hash)).toBe(false);
    // Idempotent: a second run does not double-prefix.
    await pool.query(migrationSql);
    const again = await pool.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [legacyUserId]);
    expect(again.rows[0]?.password_hash).toBe(legacy.password_hash);
  });

  it('never authenticates the legacy credential again and reports the reset requirement', async () => {
    const users = new UsersService({ repository: new DatabaseUsersRepository() }, []);
    await runWithTenantContext({ tenantId, accountId, correlationId: 'legacy-password-reset-test' }, async () => {
      const user = await users.resolveByUsername(username, accountId);
      expect(user).toBeDefined();
      expect(users.requiresPasswordReset(user!)).toBe(true);
      expect(await users.verifyPassword(user!, 'LegacyPass123!')).toBe(false);
    });
  });
});
