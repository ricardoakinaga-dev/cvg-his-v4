import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DatabaseWebAuthnChallengeStore,
  DatabaseWebAuthnRepository
} from '../../../packages/modules/mfa/src/index.js';
import {
  closeDatabaseClient,
  createDatabaseClient,
  withTenantTransaction
} from '../../../packages/shared/database/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const tenantId = randomUUID();
const otherTenantId = randomUUID();
const accountId = randomUUID();
const otherAccountId = randomUUID();
const userId = randomUUID();
const sameAccountOtherUserId = randomUUID();
const otherUserId = randomUUID();

describe('durable WebAuthn state under tenant RLS', () => {
  const adminPool = getTestPool();
  let repository: DatabaseWebAuthnRepository;
  let secondRepository: DatabaseWebAuthnRepository;
  let challengeStore: DatabaseWebAuthnChallengeStore;
  let secondChallengeStore: DatabaseWebAuthnChallengeStore;

  beforeAll(async () => {
    await adminPool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'WebAuthn durable tenant', 'active', clock_timestamp()),
              ($3, $4, 'WebAuthn durable other tenant', 'active', clock_timestamp())`,
      [tenantId, `webauthn-${tenantId}`, otherTenantId, `webauthn-${otherTenantId}`]
    );
    await adminPool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'WebAuthn durable account', true),
              ($4, $5, $6, 'WebAuthn durable other account', true)`,
      [
        accountId,
        tenantId,
        `webauthn-account-${accountId}`,
        otherAccountId,
        otherTenantId,
        `webauthn-account-${otherAccountId}`
      ]
    );
    await adminPool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'unused', 'WebAuthn durable user'),
              ($5, $6, $7, $8, 'unused', 'WebAuthn durable same-account user'),
              ($9, $10, $11, $12, 'unused', 'WebAuthn durable other user')`,
      [
        userId,
        accountId,
        `webauthn-user-${userId}`,
        `webauthn-user-${userId}@example.test`,
        sameAccountOtherUserId,
        accountId,
        `webauthn-user-${sameAccountOtherUserId}`,
        `webauthn-user-${sameAccountOtherUserId}@example.test`,
        otherUserId,
        otherAccountId,
        `webauthn-user-${otherUserId}`,
        `webauthn-user-${otherUserId}@example.test`
      ]
    );

    const restrictedUrl = new URL(TEST_DB_URL);
    restrictedUrl.searchParams.set('options', '-c role=cvg_test_rls');
    const database = createDatabaseClient(restrictedUrl.toString());
    repository = new DatabaseWebAuthnRepository(database);
    secondRepository = new DatabaseWebAuthnRepository(database);
    challengeStore = new DatabaseWebAuthnChallengeStore(database);
    secondChallengeStore = new DatabaseWebAuthnChallengeStore(database);
  });

  afterAll(async () => {
    await adminPool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [accountId, otherAccountId]);
    await adminPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantId, otherTenantId]);
    await closeDatabaseClient();
  });

  it('survives repository-instance changes, isolates accounts and consumes challenges atomically', async () => {
    const credentialId = await withTenantTransaction(accountId, () =>
      repository.save(accountId, userId, {
        publicKey: 'durable-public-key',
        counter: 4,
        deviceType: 'platform',
        createdAt: '2026-08-29T00:00:00.000Z',
        lastUsedAt: null,
        nickname: 'Shared passkey'
      })
    );

    const afterRestart = await withTenantTransaction(accountId, () =>
      secondRepository.findByCredentialId(accountId, userId, credentialId)
    );
    expect(afterRestart).toMatchObject({
      id: credentialId,
      accountId,
      userId,
      counter: 4,
      nickname: 'Shared passkey'
    });

    const crossAccountLookup = await withTenantTransaction(otherAccountId, () =>
      secondRepository.findByCredentialId(accountId, userId, credentialId)
    );
    expect(crossAccountLookup).toBeNull();

    const crossUserLookup = await withTenantTransaction(accountId, () =>
      secondRepository.findByCredentialId(accountId, sameAccountOtherUserId, credentialId)
    );
    expect(crossUserLookup).toBeNull();

    await withTenantTransaction(otherAccountId, () =>
      secondRepository.updateCounter(otherAccountId, otherUserId, credentialId, 4, 99)
    );
    expect(
      (
        await withTenantTransaction(accountId, () =>
          secondRepository.findByCredentialId(accountId, userId, credentialId)
        )
      )?.counter
    ).toBe(4);

    expect(
      await withTenantTransaction(accountId, () =>
        secondRepository.updateCounter(accountId, userId, credentialId, 4, 4)
      )
    ).toBe(false);
    expect(
      await withTenantTransaction(accountId, () =>
        secondRepository.updateCounter(accountId, userId, credentialId, 4, 3)
      )
    ).toBe(false);

    const concurrentCounterUpdates = await Promise.all(
      [repository, secondRepository].map((store) =>
        withTenantTransaction(accountId, () =>
          store.updateCounter(accountId, userId, credentialId, 4, 5)
        )
      )
    );
    expect(concurrentCounterUpdates.filter(Boolean)).toHaveLength(1);
    expect(concurrentCounterUpdates.filter((updated) => !updated)).toHaveLength(1);
    expect(
      (
        await withTenantTransaction(accountId, () =>
          secondRepository.findByCredentialId(accountId, userId, credentialId)
        )
      )?.counter
    ).toBe(5);

    const authenticationKey = {
      accountId,
      userId,
      purpose: 'authentication' as const
    };
    const registrationKey = {
      accountId,
      userId,
      purpose: 'registration' as const
    };
    await withTenantTransaction(accountId, () =>
      challengeStore.issue({ key: authenticationKey, challenge: 'auth-challenge', ttlMs: 60_000 })
    );
    await withTenantTransaction(accountId, () =>
      challengeStore.issue({
        key: registrationKey,
        challenge: 'registration-challenge',
        ttlMs: 60_000
      })
    );

    const concurrentConsumes = await Promise.all(
      [secondChallengeStore, challengeStore].map((store) =>
        withTenantTransaction(accountId, () => store.consume(authenticationKey))
      )
    );
    expect(concurrentConsumes.filter((result) => result.ok)).toHaveLength(1);
    expect(concurrentConsumes.filter((result) => !result.ok)).toHaveLength(1);
    expect(
      await withTenantTransaction(accountId, () => secondChallengeStore.consume(authenticationKey))
    ).toMatchObject({ ok: false, code: 'INVALID_CHALLENGE' });

    expect(
      await withTenantTransaction(accountId, () => secondChallengeStore.consume(registrationKey))
    ).toEqual({ ok: true, challenge: 'registration-challenge' });

    await withTenantTransaction(accountId, () =>
      challengeStore.issue({ key: authenticationKey, challenge: 'expired-challenge', ttlMs: 1 })
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(
      await withTenantTransaction(accountId, () => secondChallengeStore.consume(authenticationKey))
    ).toMatchObject({ ok: false, code: 'INVALID_CHALLENGE' });
  });

  it('enables FORCE RLS and exposes one tenant policy per durable table', async () => {
    const metadata = await adminPool.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity
       FROM pg_class
       WHERE relname IN ('auth_webauthn_credentials', 'auth_webauthn_challenges')
       ORDER BY relname`
    );
    expect(metadata.rows).toEqual([
      {
        relname: 'auth_webauthn_challenges',
        relrowsecurity: true,
        relforcerowsecurity: true
      },
      {
        relname: 'auth_webauthn_credentials',
        relrowsecurity: true,
        relforcerowsecurity: true
      }
    ]);

    const policies = await adminPool.query<{ tablename: string; count: string }>(
      `SELECT tablename, count(*)::text AS count
       FROM pg_policies
       WHERE tablename IN ('auth_webauthn_credentials', 'auth_webauthn_challenges')
       GROUP BY tablename
       ORDER BY tablename`
    );
    expect(policies.rows).toEqual([
      { tablename: 'auth_webauthn_challenges', count: '1' },
      { tablename: 'auth_webauthn_credentials', count: '1' }
    ]);
  });
});
