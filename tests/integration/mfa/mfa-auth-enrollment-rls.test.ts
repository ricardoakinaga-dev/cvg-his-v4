import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { AuditService } from '@cvg-his-v2/module-audit';
import {
  AuthService,
  BruteForceProtection,
  DatabaseMfaLoginChallengeRepository
} from '@cvg-his-v2/module-auth';
import {
  DatabaseMfaRepository,
  MfaService,
  validateMasterKey
} from '@cvg-his-v2/module-mfa';
import { StaffService } from '@cvg-his-v2/module-staff';
import type { UserRecord, UsersService } from '@cvg-his-v2/module-users';
import {
  closeDatabaseClient,
  createDatabaseClient
} from '@cvg-his-v2/shared-database';
import type { UserId } from '@cvg-his-v2/shared-types';

import { generateCurrentTOTP } from '../../../packages/modules/auth/src/totp-wrapper.js';
import { TEST_DB_URL } from '../../setup/env.js';

const ACCOUNT_ID = 'a0000000-0000-4000-8000-000000000011';
const USER_ID = '10000000-0000-4000-8000-000000000011';
const MFA_ENCRYPTION_KEY = 'integration-rls-mfa-enrollment-key';

let adminPool: Pool;
let restrictedPool: Pool;
let auth: AuthService;
let databaseClient: ReturnType<typeof createDatabaseClient>;

function createUser(): UserRecord {
  const now = '2026-08-22T00:00:00.000Z';
  return {
    id: USER_ID as UserId,
    accountId: ACCOUNT_ID as never,
    username: 'rls-mfa-admin',
    email: 'rls-mfa-admin@example.com',
    displayName: 'RLS MFA Admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    passwordHash: 'not-used-by-test-double',
    roleCodes: ['admin']
  };
}

function createUsersDouble(user: UserRecord): UsersService {
  return {
    resolveByUsername: async (username: string) =>
      username === user.username ? { ...user, roleCodes: [...user.roleCodes] } : undefined,
    verifyPassword: async () => true,
    getOrThrow: (userId: UserId) => {
      if (userId !== user.id) throw new Error('User not found');
      return { ...user, roleCodes: [...user.roleCodes] };
    }
  } as unknown as UsersService;
}

beforeAll(async () => {
  validateMasterKey(MFA_ENCRYPTION_KEY);
  adminPool = new Pool({ connectionString: TEST_DB_URL, max: 1 });
  await adminPool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, '00000000-0000-0000-0000-000000000001', 'rls-mfa-enrollment', 'RLS MFA Enrollment', true)
     ON CONFLICT (id) DO NOTHING`,
    [ACCOUNT_ID]
  );
  await adminPool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
     VALUES ($1, $2, 'rls-mfa-admin', 'rls-mfa-admin@example.com', 'unused', 'RLS MFA Admin', true)
     ON CONFLICT (id) DO NOTHING`,
    [USER_ID, ACCOUNT_ID]
  );
  await adminPool.query('DELETE FROM mfa_credentials WHERE user_id = $1', [USER_ID]);

  const restrictedUrl = new URL(TEST_DB_URL);
  restrictedUrl.searchParams.set('options', '-c role=cvg_test_rls');
  const db = createDatabaseClient(restrictedUrl.toString());
  databaseClient = db;
  restrictedPool = new Pool({ connectionString: restrictedUrl.toString(), max: 1 });
  const user = createUser();
  auth = new AuthService({
    secret: 'rls-enrollment-auth-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    users: createUsersDouble(user),
    staff: new StaffService(),
    accessControl: new AccessControlService(),
    audit: new AuditService(),
    mfa: new MfaService({
      repository: new DatabaseMfaRepository(db),
      encryptionKey: MFA_ENCRYPTION_KEY
    }),
    mfaChallengeRepository: new DatabaseMfaLoginChallengeRepository(db)
  });
});

afterAll(async () => {
  await closeDatabaseClient();
  await restrictedPool.end();
  await adminPool.query('DELETE FROM mfa_credentials WHERE user_id = $1', [USER_ID]);
  await adminPool.query('DELETE FROM users WHERE id = $1', [USER_ID]);
  await adminPool.query('DELETE FROM accounts WHERE id = $1', [ACCOUNT_ID]);
  await adminPool.end();
});

describe('MFA enrollment under the production RLS capability', () => {
  it('completes enrollment and login as a NOBYPASSRLS role', async () => {
    const role = await restrictedPool.query<{
      current_user: string;
      bypassrls: boolean;
    }>(
      `SELECT current_user, rolbypassrls AS bypassrls
       FROM pg_roles
       WHERE rolname = current_user`
    );
    expect(role.rows[0]).toEqual({ current_user: 'cvg_test_rls', bypassrls: false });
    const user = createUser();
    const createIndependentAuth = (bruteForce?: BruteForceProtection) =>
      new AuthService({
        secret: 'rls-enrollment-auth-secret',
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 604800,
        users: createUsersDouble(user),
        staff: new StaffService(),
        accessControl: new AccessControlService(),
        audit: new AuditService(),
        mfa: new MfaService({
          repository: new DatabaseMfaRepository(databaseClient),
          encryptionKey: MFA_ENCRYPTION_KEY
        }),
        mfaChallengeRepository: new DatabaseMfaLoginChallengeRepository(databaseClient),
        bruteForce
      });

    const login = await auth.login(
      { username: 'rls-mfa-admin', password: 'correct-password' },
      'corr-rls-enrollment-login'
    );
    expect('requiresMfa' in login).toBe(true);
    if (!('requiresMfa' in login)) throw new Error('Expected MFA challenge');

    const setup = await auth.beginMfaEnrollment(
      login.challengeId,
      'CVG-HIS-V2',
      'corr-rls-enrollment-start'
    );
    const enrollmentAttempts = await Promise.allSettled(
      [createIndependentAuth(), createIndependentAuth()].map((enrollmentAuth, index) =>
        enrollmentAuth.confirmMfaEnrollment(
          login.challengeId,
          generateCurrentTOTP(setup.secret),
          `corr-rls-enrollment-confirm-${index}`
        )
      )
    );
    expect(enrollmentAttempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(enrollmentAttempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(1);
    const enrollmentWinner = enrollmentAttempts.find(
      (attempt) => attempt.status === 'fulfilled'
    );
    if (!enrollmentWinner || enrollmentWinner.status !== 'fulfilled') {
      throw new Error('Expected one enrollment winner');
    }
    const session = enrollmentWinner.value;

    expect(session.principal.user.id).toBe(USER_ID);
    const persisted = await adminPool.query<{
      account_id: string;
      user_id: string;
      is_active: boolean;
      last_totp_counter: number | null;
    }>(
      `SELECT account_id::text, user_id::text, is_active, last_totp_counter
       FROM mfa_credentials
       WHERE user_id = $1`,
      [USER_ID]
    );
    expect(persisted.rows).toEqual([
      {
        account_id: ACCOUNT_ID,
        user_id: USER_ID,
        is_active: true,
        last_totp_counter: expect.any(Number)
      }
    ]);

    const secondLogin = await auth.login(
      { username: 'rls-mfa-admin', password: 'correct-password' },
      'corr-rls-cross-instance-login'
    );
    expect('requiresMfa' in secondLogin).toBe(true);
    if (!('requiresMfa' in secondLogin)) throw new Error('Expected MFA challenge');
    const attempts = await Promise.allSettled(
      [createIndependentAuth(), createIndependentAuth()].map((independentAuth, index) =>
        independentAuth.completeMfaLogin(
          {
            userId: USER_ID,
            token: setup.recoveryCodes[0],
            challengeId: secondLogin.challengeId
          },
          `corr-rls-cross-instance-complete-${index}`
        )
      )
    );

    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(1);
    expect(attempts.find((attempt) => attempt.status === 'fulfilled')).toMatchObject({
      value: { principal: { user: { id: USER_ID } } }
    });
    const challengeState = await adminPool.query<{ consumed: boolean; attempt_count: number }>(
      `SELECT consumed_at IS NOT NULL AS consumed, attempt_count
       FROM auth_mfa_login_challenges
       WHERE account_id = $1 AND user_id = $2`,
      [ACCOUNT_ID, USER_ID]
    );
    expect(challengeState.rows).toEqual([{ consumed: true, attempt_count: 0 }]);

    const lockoutA = createIndependentAuth(
      new BruteForceProtection({
        maxAttempts: 1,
        lockoutDurationSeconds: 60,
        trackingWindowSeconds: 900
      })
    );
    const lockoutB = createIndependentAuth(
      new BruteForceProtection({
        maxAttempts: 1,
        lockoutDurationSeconds: 60,
        trackingWindowSeconds: 900
      })
    );
    const lockoutLogin = await lockoutA.login(
      { username: 'rls-mfa-admin', password: 'correct-password' },
      'corr-rls-lockout-login'
    );
    if (!('requiresMfa' in lockoutLogin)) throw new Error('Expected MFA challenge');
    await expect(
      lockoutB.completeMfaLogin(
        {
          userId: USER_ID,
          token: 'INVALID-CODE',
          challengeId: lockoutLogin.challengeId
        },
        'corr-rls-lockout-failure'
      )
    ).rejects.toThrow('Invalid MFA code');
    const lockedState = await adminPool.query<{
      attempt_count: number;
      locked: boolean;
    }>(
      `SELECT attempt_count, locked_until > clock_timestamp() AS locked
       FROM auth_mfa_login_challenges
       WHERE account_id = $1 AND user_id = $2`,
      [ACCOUNT_ID, USER_ID]
    );
    expect(lockedState.rows).toEqual([{ attempt_count: 1, locked: true }]);

    const retryLogin = await lockoutA.login(
      { username: 'rls-mfa-admin', password: 'correct-password' },
      'corr-rls-lockout-relogin'
    );
    if (!('requiresMfa' in retryLogin)) throw new Error('Expected MFA challenge');
    const reloginLockedState = await adminPool.query<{
      attempt_count: number;
      locked: boolean;
    }>(
      `SELECT attempt_count, locked_until > clock_timestamp() AS locked
       FROM auth_mfa_login_challenges
       WHERE account_id = $1 AND user_id = $2`,
      [ACCOUNT_ID, USER_ID]
    );
    expect(reloginLockedState.rows).toEqual([{ attempt_count: 1, locked: true }]);
    await expect(
      lockoutA.completeMfaLogin(
        {
          userId: USER_ID,
          token: setup.recoveryCodes[1],
          challengeId: retryLogin.challengeId
        },
        'corr-rls-lockout-retry'
      )
    ).rejects.toThrow('Account temporarily locked');

    const rlsMetadata = await adminPool.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity
       FROM pg_class
       WHERE relname IN ('auth_mfa_login_challenges', 'mfa_credentials')
       ORDER BY relname`
    );
    expect(rlsMetadata.rows).toEqual([
      {
        relname: 'auth_mfa_login_challenges',
        relrowsecurity: true,
        relforcerowsecurity: true
      },
      { relname: 'mfa_credentials', relrowsecurity: true, relforcerowsecurity: true }
    ]);
    const policies = await adminPool.query<{ tablename: string; count: string }>(
      `SELECT tablename, count(*)::text AS count
       FROM pg_policies
       WHERE tablename IN ('auth_mfa_login_challenges', 'mfa_credentials')
       GROUP BY tablename
       ORDER BY tablename`
    );
    expect(policies.rows).toEqual([
      { tablename: 'auth_mfa_login_challenges', count: '1' },
      { tablename: 'mfa_credentials', count: '1' }
    ]);

    const restrictedClient = await restrictedPool.connect();
    try {
      await restrictedClient.query('BEGIN');
      await restrictedClient.query(
        `SELECT set_config('app.current_account_id', $1, true)`,
        ['a0000000-0000-4000-8000-000000000099']
      );
      const crossTenantRead = await restrictedClient.query(
        `SELECT user_id FROM auth_mfa_login_challenges WHERE user_id = $1`,
        [USER_ID]
      );
      expect(crossTenantRead.rowCount).toBe(0);
      const crossTenantWrite = await restrictedClient.query(
        `UPDATE auth_mfa_login_challenges
         SET consumed_at = clock_timestamp()
         WHERE user_id = $1`,
        [USER_ID]
      );
      expect(crossTenantWrite.rowCount).toBe(0);
    } finally {
      await restrictedClient.query('ROLLBACK');
      restrictedClient.release();
    }
  });
});
