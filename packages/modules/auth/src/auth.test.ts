import assert from 'node:assert/strict';
import { expect, test } from 'vitest';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { AuditService } from '@cvg-his-v2/module-audit';
import { InMemoryMfaRepository, MfaService } from '@cvg-his-v2/module-mfa';
import { StaffService } from '@cvg-his-v2/module-staff';
import { createSeedUsers, UsersService } from '@cvg-his-v2/module-users';
import type { UsersRepository } from '@cvg-his-v2/module-users';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { getTenantContext } from '@cvg-his-v2/tenant-context';

import {
  AuthService,
  BruteForceProtection,
  InMemoryMfaLoginChallengeRepository,
  type MfaLoginChallengeRepository
} from './index.js';
import { InMemorySessionRepository } from './repositories/in-memory-session.repository.js';
import type {
  PersistedSessionRecord,
  SessionRepository
} from './repositories/session.repository.js';
import { generateCurrentTOTP } from './totp-wrapper.js';

const SEED_PASSWORD = 'seed_admin';
const ACCOUNT_ID = 'acc_cvg_demo';
type RepositoryUserRecord = NonNullable<Awaited<ReturnType<UsersRepository['findById']>>>;

function createAuthService(
  options: {
    readonly mfa?: MfaService;
    readonly sessionRepository?: SessionRepository;
    readonly secret?: string;
    readonly accessTokenTtlSeconds?: number;
    readonly refreshTokenTtlSeconds?: number;
    readonly verifierSecrets?: readonly string[];
    readonly users?: UsersService;
    readonly bruteForce?: BruteForceProtection;
    readonly mfaChallengeRepository?: MfaLoginChallengeRepository;
  } = {}
) {
  const users = options.users ?? new UsersService();
  const staff = new StaffService();
  const accessControl = new AccessControlService();
  const audit = new AuditService();

  return new AuthService({
    secret: options.secret ?? 'test-secret-key',
    verifierSecrets: options.verifierSecrets,
    accessTokenTtlSeconds: options.accessTokenTtlSeconds ?? 900,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds ?? 604800,
    users,
    staff,
    accessControl,
    audit,
    mfa: options.mfa,
    sessionRepository: options.sessionRepository,
    bruteForce: options.bruteForce,
    mfaChallengeRepository: options.mfaChallengeRepository
  });
}

function createMutableRoleUsersRepository(): {
  readonly repository: UsersRepository;
  setRoleCodes(roleCodes: readonly string[]): void;
} {
  const seedAdmin = createSeedUsers()[0];
  const repositoryUser: RepositoryUserRecord = {
    id: seedAdmin.id,
    accountId: seedAdmin.accountId,
    username: seedAdmin.username,
    email: seedAdmin.email,
    passwordHash: seedAdmin.passwordHash,
    fullName: seedAdmin.displayName,
    isActive: true,
    createdAt: seedAdmin.createdAt,
    updatedAt: seedAdmin.updatedAt
  };
  let currentRoleCodes: readonly string[] = [...seedAdmin.roleCodes];
  const repository: UsersRepository = {
    create: async () => undefined,
    update: async () => undefined,
    upgradePasswordHash: async () => false,
    findById: async (id: UserId, accountId?: AccountId) =>
      id === repositoryUser.id && (!accountId || accountId === repositoryUser.accountId)
        ? { ...repositoryUser }
        : null,
    findByUsername: async (accountId: AccountId, username: string) =>
      accountId === repositoryUser.accountId && username === repositoryUser.username
        ? { ...repositoryUser }
        : null,
    findByEmail: async (accountId: AccountId, email: string) =>
      accountId === repositoryUser.accountId && email === repositoryUser.email
        ? { ...repositoryUser }
        : null,
    findAll: async () => [{ ...repositoryUser }],
    findRoleCodesByUserId: async (id: UserId, accountId?: AccountId) =>
      id === repositoryUser.id && (!accountId || accountId === repositoryUser.accountId)
        ? [...currentRoleCodes]
        : [],
    findByAccountId: async (accountId: AccountId) =>
      accountId === repositoryUser.accountId ? [{ ...repositoryUser }] : []
  };

  return {
    repository,
    setRoleCodes: (roleCodes) => {
      currentRoleCodes = [...roleCodes];
    }
  };
}

function createUsersDouble(
  loginUser: ReturnType<typeof createSeedUsers>[number],
  currentUser = loginUser
): UsersService {
  return {
    resolveByUsername: async () => loginUser,
    verifyPassword: async () => true,
    requiresPasswordReset: () => false,
    getOrThrow: () => currentUser,
    list: () => [currentUser]
  } as unknown as UsersService;
}

test('AuthService: login with valid credentials returns session (no MFA)', async () => {
  const auth = createAuthService();

  const result = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-test-1');

  assert.ok('accessToken' in result);
  assert.ok('refreshToken' in result);
  assert.equal(result.principal.user.username, 'admin');
  assert.equal(result.principal.session.active, true);
});

test('AuthService: login with invalid credentials throws AuthenticationError', async () => {
  const auth = createAuthService();

  await assert.rejects(
    () => auth.login({ username: 'admin', password: 'wrong' }, 'corr-test-2'),
    (err) => {
      assert.ok(err instanceof AuthenticationError);
      return true;
    }
  );
});

test('AuthService: login with non-existent user throws', async () => {
  const auth = createAuthService();

  await assert.rejects(
    () => auth.login({ username: 'nonexistent', password: 'test' }, 'corr-test-3'),
    (err) => {
      assert.ok(err instanceof AuthenticationError);
      return true;
    }
  );
});

test('AuthService: login requires MFA for critical role when MFA is enabled', async () => {
  const mfa = new MfaService();
  const auth = createAuthService({ mfa });

  const result = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-test-mfa');

  assert.ok('requiresMfa' in result);
  assert.equal(result.requiresMfa, true);
  assert.equal(result.userId, 'user_admin');
  assert.deepEqual(result.mfaMethods, []);
  assert.equal(result.enrollmentRequired, true);
  assert.ok(result.challengeId);
  assert.equal((await auth.getPendingMfaEnrollmentUser(result.challengeId)).id, 'user_admin');
});

test('AuthService: MFA enrollment stays inside the tenant context from the login challenge', async () => {
  const observedContexts: Array<{ operation: string; accountId: string | undefined }> = [];
  const mfa = {
    isMfaRequired: () => true,
    isMfaActive: async () => {
      observedContexts.push({
        operation: 'status',
        accountId: getTenantContext()?.accountId
      });
      return false;
    },
    initiateSetup: async () => {
      observedContexts.push({
        operation: 'initiate',
        accountId: getTenantContext()?.accountId
      });
      return {
        secret: 'TESTSECRET',
        provisioningUri: 'otpauth://totp/test',
        recoveryCodes: ['AAAA-BBBB']
      };
    },
    confirmSetup: async () => {
      observedContexts.push({
        operation: 'confirm',
        accountId: getTenantContext()?.accountId
      });
      return {
        credentialId: '00000000-0000-4000-8000-000000000010',
        accountId: ACCOUNT_ID,
        userId: 'user_admin',
        secret: 'TESTSECRET',
        isActive: true,
        recoveryCodes: ['AAAA-BBBB'],
        createdAt: new Date().toISOString()
      };
    },
    verifyLogin: async () => {
      observedContexts.push({
        operation: 'verify',
        accountId: getTenantContext()?.accountId
      });
      return true;
    }
  } as unknown as MfaService;
  const auth = createAuthService({ mfa });
  const loginResult = await auth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-enroll-login'
  );
  assert.ok('requiresMfa' in loginResult);

  const setup = await auth.beginMfaEnrollment(
    loginResult.challengeId!,
    'CVG-HIS-V2',
    'corr-enroll-start'
  );
  const session = await auth.confirmMfaEnrollment(
    loginResult.challengeId!,
    '123456',
    'corr-enroll-confirm'
  );

  assert.equal(setup.secret, 'TESTSECRET');
  assert.equal(session.principal.user.username, 'admin');
  assert.deepEqual(observedContexts, [
    { operation: 'status', accountId: ACCOUNT_ID },
    { operation: 'status', accountId: ACCOUNT_ID },
    { operation: 'initiate', accountId: ACCOUNT_ID },
    { operation: 'confirm', accountId: ACCOUNT_ID }
  ]);
});

test('AuthService: login does not require MFA for non-critical role', async () => {
  const mfa = new MfaService();
  const auth = createAuthService({ mfa });

  const result = await auth.login({ username: 'vet', password: 'seed_vet' }, 'corr-test-noncrit');

  assert.ok('accessToken' in result);
  assert.ok('refreshToken' in result);
  assert.equal(result.principal.user.username, 'vet');
});

test('AuthService: login requires MFA for a non-critical role that enrolled voluntarily', async () => {
  const mfa = new MfaService({ repository: new InMemoryMfaRepository() });
  const auth = createAuthService({ mfa });
  const setup = await mfa.initiateSetup(ACCOUNT_ID, 'user_vet', 'vet@cvg-his.local');
  await mfa.confirmSetup(ACCOUNT_ID, 'user_vet', generateCurrentTOTP(setup.secret));

  const result = await auth.login({ username: 'vet', password: 'seed_vet' }, 'corr-test-voluntary');

  assert.ok('requiresMfa' in result);
  assert.equal(result.requiresMfa, true);
  assert.deepEqual(result.mfaMethods, ['totp']);
  assert.equal(result.enrollmentRequired, false);
  assert.equal('accessToken' in result, false);
});

test('AuthService: completeMfaLogin returns session after valid TOTP', async () => {
  const mfa = new MfaService({ repository: new InMemoryMfaRepository() });
  const auth = createAuthService({ mfa });

  const loginResult = await auth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-test-mfa2'
  );
  assert.ok('requiresMfa' in loginResult);

  const setup = await mfa.initiateSetup(ACCOUNT_ID, 'user_admin', 'admin@cvg-his.local');
  const token = generateCurrentTOTP(setup.secret);
  await mfa.confirmSetup(ACCOUNT_ID, 'user_admin', token);

  const session = await auth.completeMfaLogin(
    {
      userId: 'user_admin',
      token: setup.recoveryCodes[0],
      challengeId: loginResult.challengeId!
    },
    'corr-test-mfa2-complete'
  );

  assert.ok('accessToken' in session);
  assert.equal(session.principal.user.username, 'admin');
});

test('AuthService: MFA challenge created on one instance completes on another', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const mfaChallengeRepository = new InMemoryMfaLoginChallengeRepository();
  const mfa = {
    isMfaRequired: () => true,
    isMfaActive: async () => true,
    verifyLogin: async () => true
  } as unknown as MfaService;
  const authA = createAuthService({ mfa, sessionRepository, mfaChallengeRepository });
  const authB = createAuthService({ mfa, sessionRepository, mfaChallengeRepository });

  const loginResult = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-distributed-mfa-login'
  );
  assert.ok('requiresMfa' in loginResult);

  const attempts = await Promise.allSettled([
    authB.completeMfaLogin(
      {
        userId: 'user_admin',
        token: '123456',
        challengeId: loginResult.challengeId!
      },
      'corr-distributed-mfa-complete-a'
    ),
    authB.completeMfaLogin(
      {
        userId: 'user_admin',
        token: '123456',
        challengeId: loginResult.challengeId!
      },
      'corr-distributed-mfa-complete-b'
    )
  ]);

  const completed = attempts.find((attempt) => attempt.status === 'fulfilled');
  const rejected = attempts.find((attempt) => attempt.status === 'rejected');
  assert.ok(completed && completed.status === 'fulfilled');
  assert.ok(rejected && rejected.status === 'rejected');
  assert.ok(rejected.reason instanceof AuthenticationError);
  assert.equal(completed.value.principal.user.username, 'admin');
  assert.ok('accessToken' in completed.value);
  assert.equal(mfaChallengeRepository.getIssueCount(), 1);
  assert.equal(mfaChallengeRepository.getConsumeCount(), 1);

  await assert.rejects(
    () =>
      authA.completeMfaLogin(
        {
          userId: 'user_admin',
          token: '123456',
          challengeId: loginResult.challengeId!
        },
        'corr-distributed-mfa-reuse'
      ),
    AuthenticationError
  );
});

test('AuthService: a newer password login invalidates the older MFA challenge', async () => {
  const mfaChallengeRepository = new InMemoryMfaLoginChallengeRepository();
  const mfa = {
    isMfaRequired: () => true,
    isMfaActive: async () => true,
    verifyLogin: async () => true
  } as unknown as MfaService;
  const auth = createAuthService({ mfa, mfaChallengeRepository });

  const first = await auth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-mfa-generation-first'
  );
  const second = await auth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-mfa-generation-second'
  );
  assert.ok('requiresMfa' in first);
  assert.ok('requiresMfa' in second);

  await assert.rejects(
    () =>
      auth.completeMfaLogin(
        {
          userId: 'user_admin',
          token: '123456',
          challengeId: first.challengeId!
        },
        'corr-mfa-generation-stale'
      ),
    /missing or expired/
  );
  await assert.doesNotReject(() =>
    auth.completeMfaLogin(
      {
        userId: 'user_admin',
        token: '123456',
        challengeId: second.challengeId!
      },
      'corr-mfa-generation-current'
    )
  );
});

test('AuthService: rejects a tampered signed MFA challenge locator', async () => {
  const mfa = {
    isMfaRequired: () => true,
    isMfaActive: async () => true,
    verifyLogin: async () => true
  } as unknown as MfaService;
  const auth = createAuthService({ mfa });
  const login = await auth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-mfa-tamper-login'
  );
  assert.ok('requiresMfa' in login);
  const challenge = login.challengeId!;
  const separator = challenge.indexOf('.');
  const tamperedCharacter = challenge[separator + 2] === 'A' ? 'B' : 'A';
  const tampered = `${challenge.slice(0, separator + 2)}${tamperedCharacter}${challenge.slice(separator + 3)}`;

  await assert.rejects(
    () =>
      auth.completeMfaLogin(
        { userId: 'user_admin', token: '123456', challengeId: tampered },
        'corr-mfa-tamper-complete'
      ),
    AuthenticationError
  );
});

test('AuthService: MFA challenge keeps lockout authoritative across instances', async () => {
  const mfaChallengeRepository = new InMemoryMfaLoginChallengeRepository();
  const bruteForceA = new BruteForceProtection({
    maxAttempts: 1,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 60
  });
  const bruteForceB = new BruteForceProtection({
    maxAttempts: 1,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 60
  });
  let verificationAttempts = 0;
  const mfa = {
    isMfaRequired: () => true,
    isMfaActive: async () => true,
    verifyLogin: async () => {
      verificationAttempts += 1;
      return false;
    }
  } as unknown as MfaService;
  const authA = createAuthService({ mfa, bruteForce: bruteForceA, mfaChallengeRepository });
  const authB = createAuthService({ mfa, bruteForce: bruteForceB, mfaChallengeRepository });

  const loginResult = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-distributed-mfa-lock-login'
  );
  assert.ok('requiresMfa' in loginResult);

  await assert.rejects(
    () =>
      authB.completeMfaLogin(
        {
          userId: 'user_admin',
          token: '000000',
          challengeId: loginResult.challengeId!
        },
        'corr-distributed-mfa-lock-failure'
      ),
    /Invalid MFA code/
  );

  const retryLogin = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-distributed-mfa-lock-relogin'
  );
  assert.ok('requiresMfa' in retryLogin);

  await assert.rejects(
    () =>
      authA.completeMfaLogin(
        {
          userId: 'user_admin',
          token: '000001',
          challengeId: retryLogin.challengeId!
        },
        'corr-distributed-mfa-lock-blocked'
      ),
    /Account temporarily locked/
  );
  assert.equal(verificationAttempts, 1);
});

test('AuthService: active MFA still requires the second factor after password login', async () => {
  const mfa = {
    isMfaRequired: () => true,
    isMfaActive: async () => true,
    verifyLogin: async () => true
  } as unknown as MfaService;
  const auth = createAuthService({
    mfa,
    mfaChallengeRepository: new InMemoryMfaLoginChallengeRepository()
  });

  const result = await auth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-test-active-mfa'
  );

  assert.ok('requiresMfa' in result);
  assert.equal(result.requiresMfa, true);
  assert.deepEqual(result.mfaMethods, ['totp']);
  assert.equal(result.enrollmentRequired, false);
});

test('AuthService: MFA completion requires a preceding successful password login', async () => {
  const mfa = new MfaService();
  const auth = createAuthService({ mfa });
  const setup = await mfa.initiateSetup(ACCOUNT_ID, 'user_admin', 'admin@cvg-his.local');
  const token = generateCurrentTOTP(setup.secret);

  await assert.rejects(
    () =>
      auth.completeMfaLogin(
        { userId: 'user_admin', token, challengeId: 'missing-challenge' },
        'corr-test-no-password'
      ),
    AuthenticationError
  );
});

test('AuthService: refresh rotates tokens but keeps same session', async () => {
  const auth = createAuthService();

  const login = await auth.login({ username: 'admin', password: 'seed_admin' }, 'corr-test-4');
  assert.ok('accessToken' in login);
  const originalSessionId = login.principal.session.sessionId;
  const originalRefresh = login.refreshToken;

  const refreshed = await auth.refresh({ refreshToken: login.refreshToken }, 'corr-test-4-refresh');

  assert.equal(refreshed.principal.session.sessionId, originalSessionId);
  assert.notEqual(refreshed.refreshToken, originalRefresh);
  assert.ok(refreshed.accessToken);
});

test('AuthService: hydrateFromRepository restores persisted session cache for access and refresh', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const authA = createAuthService({ sessionRepository });
  const authB = createAuthService({ sessionRepository });

  const login = await authA.login({ username: 'admin', password: 'seed_admin' }, 'corr-test-4b');
  assert.ok('accessToken' in login);

  await authB.hydrateFromRepository(['user_admin' as never]);

  const principal = authB.authenticateAccessToken(login.accessToken);
  const refreshed = await authB.refresh(
    { refreshToken: login.refreshToken },
    'corr-test-4b-refresh'
  );

  assert.equal(principal.user.id, login.principal.user.id);
  assert.equal(refreshed.principal.session.sessionId, login.principal.session.sessionId);
  assert.notEqual(refreshed.refreshToken, login.refreshToken);
});

test('AuthService: hot instance synchronizes a newly-created session before sync verification', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const authA = createAuthService({ sessionRepository });
  const authB = createAuthService({ sessionRepository });

  const login = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-hot-session-login'
  );
  assert.ok('accessToken' in login);

  await authB.synchronizeAccessToken(login.accessToken, 'corr-hot-session-sync');
  const principal = authB.authenticateAccessToken(login.accessToken);

  assert.equal(principal.session.sessionId, login.principal.session.sessionId);
  assert.equal(principal.user.accountId, ACCOUNT_ID);
});

test('AuthService: synchronized authorization drops roles revoked in the user repository', async () => {
  const roleRepository = createMutableRoleUsersRepository();
  const users = new UsersService(
    { repository: roleRepository.repository, seedUsersEnabled: false },
    []
  );
  await users.hydrateFromDatabase();
  const sessionRepository = new InMemorySessionRepository();
  const auth = createAuthService({ users, sessionRepository });

  const login = await auth.login(
    { username: 'admin', password: SEED_PASSWORD, accountId: ACCOUNT_ID },
    'corr-role-revocation-login'
  );
  assert.ok('accessToken' in login);
  assert.deepEqual(login.principal.access.roleCodes, ['admin']);

  roleRepository.setRoleCodes(['reception']);
  await auth.synchronizeAccessToken(login.accessToken, 'corr-role-revocation-sync');

  const synchronized = auth.authenticateAccessToken(login.accessToken);
  assert.deepEqual(synchronized.access.roleCodes, ['reception']);
  assert.equal(synchronized.access.roleCodes.includes('admin'), false);

  const refreshed = await auth.refresh(
    { refreshToken: login.refreshToken },
    'corr-role-revocation-refresh'
  );
  assert.deepEqual(refreshed.principal.access.roleCodes, ['reception']);
  assert.equal(refreshed.principal.access.roleCodes.includes('admin'), false);
});

test('AuthService: exactly one hot instance wins concurrent refresh nonce rotation', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const authA = createAuthService({ sessionRepository });
  const authB = createAuthService({ sessionRepository });

  const login = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-concurrent-refresh-login'
  );
  assert.ok('accessToken' in login);

  const results = await Promise.allSettled([
    authA.refresh({ refreshToken: login.refreshToken }, 'corr-concurrent-refresh-a'),
    authB.refresh({ refreshToken: login.refreshToken }, 'corr-concurrent-refresh-b')
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  const rejection = results.find((result) => result.status === 'rejected');
  assert.ok(rejection && rejection.status === 'rejected');
  assert.ok(rejection.reason instanceof AuthenticationError);

  await assert.rejects(
    () => authA.refresh({ refreshToken: login.refreshToken }, 'corr-refresh-replay'),
    AuthenticationError
  );
});

test('AuthService: cross-instance logout is authoritative for access and refresh', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const authA = createAuthService({ sessionRepository });
  const authB = createAuthService({ sessionRepository });

  const login = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-cross-logout-login'
  );
  assert.ok('accessToken' in login);

  await authB.logout({ refreshToken: login.refreshToken }, 'corr-cross-logout-b');

  await assert.rejects(
    () => authA.synchronizeAccessToken(login.accessToken, 'corr-cross-logout-sync'),
    AuthenticationError
  );
  await assert.rejects(
    () => authA.refresh({ refreshToken: login.refreshToken }, 'corr-cross-logout-refresh'),
    AuthenticationError
  );
});

test('AuthService: hot instance revokes every persisted sibling session', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const authA = createAuthService({ sessionRepository });
  const authB = createAuthService({ sessionRepository });

  const first = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-hot-revoke-all-first'
  );
  const second = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-hot-revoke-all-second'
  );
  assert.ok('accessToken' in first);
  assert.ok('accessToken' in second);

  await authB.synchronizeAccessToken(second.accessToken, 'corr-hot-revoke-all-sync');
  const revoked = await authB.revokeOtherSessions(
    second.principal.session.sessionId,
    'corr-hot-revoke-all'
  );

  assert.equal(revoked, 1);
  await assert.rejects(
    () => authA.synchronizeAccessToken(first.accessToken, 'corr-hot-revoke-all-verify'),
    AuthenticationError
  );
});

test('AuthService: hot instance can revoke a persisted sibling not present in its cache', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const authA = createAuthService({ sessionRepository });
  const authB = createAuthService({ sessionRepository });

  const first = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-hot-revoke-target-first'
  );
  const second = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-hot-revoke-target-second'
  );
  assert.ok('accessToken' in first);
  assert.ok('accessToken' in second);

  await authB.synchronizeAccessToken(second.accessToken, 'corr-hot-revoke-target-sync');
  const revoked = await authB.revokeSessionForUser(
    second.principal.session.sessionId,
    first.principal.session.sessionId,
    'corr-hot-revoke-target'
  );

  assert.equal(revoked, true);
  await assert.rejects(
    () => authA.synchronizeAccessToken(first.accessToken, 'corr-hot-revoke-target-verify'),
    AuthenticationError
  );
});

test('InMemorySessionRepository: refresh nonce compare-and-swap is atomic', async () => {
  const repository = new InMemorySessionRepository();
  const sessionId = 'sess_atomic' as never;
  await repository.create({
    sessionId,
    userId: 'user_admin' as never,
    accountId: ACCOUNT_ID as never,
    createdAt: '2026-08-22T10:00:00.000Z',
    authTime: '2026-08-22T10:00:00.000Z',
    expiresAt: '2026-08-22T10:15:00.000Z',
    refreshExpiresAt: '2026-08-29T10:00:00.000Z',
    active: true,
    roleCodes: ['admin'],
    refreshNonce: 'nonce-original'
  });

  const attempts = await Promise.all([
    repository.rotateRefreshNonce({
      sessionId,
      expectedRefreshNonce: 'nonce-original',
      refreshNonce: 'nonce-a',
      expiresAt: '2026-08-22T10:20:00.000Z',
      refreshExpiresAt: '2026-08-29T10:05:00.000Z'
    }),
    repository.rotateRefreshNonce({
      sessionId,
      expectedRefreshNonce: 'nonce-original',
      refreshNonce: 'nonce-b',
      expiresAt: '2026-08-22T10:20:00.000Z',
      refreshExpiresAt: '2026-08-29T10:05:00.000Z'
    })
  ]);

  assert.equal(attempts.filter(Boolean).length, 1);
  const persisted = await repository.findById(sessionId);
  assert.ok(persisted?.refreshNonce === 'nonce-a' || persisted?.refreshNonce === 'nonce-b');
});

test('InMemorySessionRepository: deletes and clears persisted sessions', async () => {
  const repository = new InMemorySessionRepository();
  const session = {
    sessionId: 'sess_cleanup' as never,
    userId: 'user_admin' as never,
    accountId: ACCOUNT_ID as never,
    createdAt: '2026-08-22T10:00:00.000Z',
    authTime: '2026-08-22T10:00:00.000Z',
    expiresAt: '2026-08-22T10:15:00.000Z',
    refreshExpiresAt: '2026-08-29T10:00:00.000Z',
    active: true,
    roleCodes: ['admin'],
    refreshNonce: 'nonce-cleanup'
  } satisfies PersistedSessionRecord;

  await repository.create(session);
  expect(repository.getAll()).toHaveLength(1);
  await repository.delete(session.sessionId);
  expect(await repository.findById(session.sessionId)).toBeNull();

  await repository.create(session);
  repository.clear();
  expect(repository.getAll()).toEqual([]);
});

test('AuthService: revoked session cannot be refreshed', async () => {
  const auth = createAuthService();

  const login = await auth.login({ username: 'admin', password: 'seed_admin' }, 'corr-test-5');
  assert.ok('accessToken' in login);

  await auth.logout({ refreshToken: login.refreshToken }, 'corr-test-5-logout');

  await assert.rejects(
    () => auth.refresh({ refreshToken: login.refreshToken }, 'corr-test-5-should-fail'),
    (err) => {
      assert.ok(err instanceof AuthenticationError);
      return true;
    }
  );
});

test('AuthService: listSessionsForUser returns sessions ordered newest first', async () => {
  const auth = createAuthService();

  const first = await auth.login({ username: 'admin', password: 'seed_admin' }, 'corr-list-1');
  const second = await auth.login({ username: 'admin', password: 'seed_admin' }, 'corr-list-2');
  assert.ok('accessToken' in first);
  assert.ok('accessToken' in second);

  const sessions = auth.listSessionsForUser('user_admin' as never);

  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].sessionId, second.principal.session.sessionId);
  assert.equal(sessions[1].sessionId, first.principal.session.sessionId);
});

test('AuthService: authoritative session list observes a session created by another instance', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const authA = createAuthService({ sessionRepository });
  const authB = createAuthService({ sessionRepository });

  const login = await authA.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-authoritative-session-list'
  );
  assert.ok('accessToken' in login);

  const sessions = await authB.listSessionsForUserAuthoritative(
    'user_admin' as UserId,
    'corr-authoritative-session-list-read'
  );

  assert.deepEqual(
    sessions.map((session) => session.sessionId),
    [login.principal.session.sessionId]
  );
});

test('AuthService: authoritative session list filters user and account boundaries and orders durable rows', async () => {
  const delegate = new InMemorySessionRepository();
  const sessionRepository: SessionRepository = {
    create: (session) => delegate.create(session),
    update: (session) => delegate.update(session),
    rotateRefreshNonce: (params) => delegate.rotateRefreshNonce(params),
    findById: (id) => delegate.findById(id),
    findByUserId: async () => delegate.getAll(),
    delete: (id) => delegate.delete(id)
  };
  const auth = createAuthService({ sessionRepository });
  const baseSession: PersistedSessionRecord = {
    sessionId: 'sess_oldest' as never,
    userId: 'user_admin' as UserId,
    accountId: ACCOUNT_ID as never,
    createdAt: '2026-08-30T10:00:00.000Z',
    authTime: '2026-08-30T10:00:00.000Z',
    expiresAt: '2026-08-30T10:15:00.000Z',
    refreshExpiresAt: '2026-09-06T10:00:00.000Z',
    active: true,
    roleCodes: ['admin'],
    refreshNonce: 'nonce-oldest'
  };

  await delegate.create(baseSession);
  await delegate.create({
    ...baseSession,
    sessionId: 'sess_newest' as never,
    createdAt: '2026-08-30T11:00:00.000Z',
    authTime: '2026-08-30T11:00:00.000Z',
    expiresAt: '2026-08-30T11:15:00.000Z',
    refreshExpiresAt: '2026-09-06T11:00:00.000Z',
    refreshNonce: 'nonce-newest'
  });
  await delegate.create({
    ...baseSession,
    sessionId: 'sess_tie_a' as never,
    createdAt: '2026-08-30T12:00:00.000Z',
    authTime: '2026-08-30T12:00:00.000Z',
    expiresAt: '2026-08-30T12:15:00.000Z',
    refreshExpiresAt: '2026-09-06T12:00:00.000Z',
    refreshNonce: 'nonce-tie-a'
  });
  await delegate.create({
    ...baseSession,
    sessionId: 'sess_tie_b' as never,
    createdAt: '2026-08-30T12:00:00.000Z',
    authTime: '2026-08-30T12:00:00.000Z',
    expiresAt: '2026-08-30T12:15:00.000Z',
    refreshExpiresAt: '2026-09-06T12:00:00.000Z',
    refreshNonce: 'nonce-tie-b'
  });
  await delegate.create({
    ...baseSession,
    sessionId: 'sess_other_user' as never,
    userId: 'user_other' as UserId
  });
  await delegate.create({
    ...baseSession,
    sessionId: 'sess_other_account' as never,
    accountId: 'acc_other' as never
  });

  const sessions = await auth.listSessionsForUserAuthoritative(
    'user_admin' as UserId,
    'corr-authoritative-session-list-boundaries'
  );

  assert.deepEqual(
    sessions.map((session) => session.sessionId),
    ['sess_tie_b', 'sess_tie_a', 'sess_newest', 'sess_oldest']
  );
  assert.deepEqual(Object.keys(sessions[0]).sort(), [
    'accountId',
    'active',
    'authTime',
    'createdAt',
    'expiresAt',
    'refreshExpiresAt',
    'sessionId',
    'userId'
  ]);
});

test('AuthService: authoritative session list preserves the in-memory compatibility path', async () => {
  const auth = createAuthService();
  const login = await auth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-authoritative-session-list-memory'
  );
  assert.ok('accessToken' in login);

  const sessions = await auth.listSessionsForUserAuthoritative('user_admin' as UserId);

  assert.deepEqual(
    sessions.map((session) => session.sessionId),
    [login.principal.session.sessionId]
  );
});

test('AuthService: authoritative session list fails closed when the repository is unavailable', async () => {
  const delegate = new InMemorySessionRepository();
  let readsAvailable = true;
  const sessionRepository: SessionRepository = {
    create: (session) => delegate.create(session),
    update: (session) => delegate.update(session),
    rotateRefreshNonce: (params) => delegate.rotateRefreshNonce(params),
    findById: (id) => delegate.findById(id),
    findByUserId: async (userId) => {
      if (!readsAvailable) throw new Error('session repository unavailable');
      return delegate.findByUserId(userId);
    },
    delete: (id) => delegate.delete(id)
  };
  const auth = createAuthService({ sessionRepository });
  const login = await auth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-authoritative-session-list-failure'
  );
  assert.ok('accessToken' in login);

  readsAvailable = false;
  await assert.rejects(
    () => auth.listSessionsForUserAuthoritative('user_admin' as UserId),
    /session repository unavailable/
  );
});

test('AuthService: revokeOtherSessions keeps current session active and revokes the rest', async () => {
  const auth = createAuthService();

  const first = await auth.login({ username: 'admin', password: 'seed_admin' }, 'corr-revoke-1');
  const second = await auth.login({ username: 'admin', password: 'seed_admin' }, 'corr-revoke-2');
  assert.ok('accessToken' in first);
  assert.ok('accessToken' in second);

  const revoked = await auth.revokeOtherSessions(
    second.principal.session.sessionId,
    'corr-revoke-others'
  );

  assert.equal(revoked, 1);
  assert.equal(
    auth.listSessionsForUser('user_admin' as never)[0].sessionId,
    second.principal.session.sessionId
  );
  assert.throws(
    () => auth.authenticateAccessToken(first.accessToken),
    (err) => {
      assert.ok(err instanceof AuthenticationError);
      return true;
    }
  );
  const principal = auth.authenticateAccessToken(second.accessToken);
  assert.equal(principal.session.sessionId, second.principal.session.sessionId);
});

test('AuthService: revokeSessionForUser revokes only the targeted sibling session', async () => {
  const auth = createAuthService();

  const first = await auth.login(
    { username: 'admin', password: 'seed_admin' },
    'corr-revoke-target-1'
  );
  const second = await auth.login(
    { username: 'admin', password: 'seed_admin' },
    'corr-revoke-target-2'
  );
  assert.ok('accessToken' in first);
  assert.ok('accessToken' in second);

  const revoked = await auth.revokeSessionForUser(
    second.principal.session.sessionId,
    first.principal.session.sessionId,
    'corr-revoke-target'
  );

  assert.equal(revoked, true);
  assert.throws(
    () => auth.authenticateAccessToken(first.accessToken),
    (err) => {
      assert.ok(err instanceof AuthenticationError);
      return true;
    }
  );
  const principal = auth.authenticateAccessToken(second.accessToken);
  assert.equal(principal.session.sessionId, second.principal.session.sessionId);
});

test('AuthService: session revocations persist inside the session tenant context', async () => {
  const tenantContexts: Array<string | undefined> = [];
  const delegate = new InMemorySessionRepository();
  const sessionRepository: SessionRepository = {
    create: (session) => delegate.create(session),
    update: (session) => {
      tenantContexts.push(getTenantContext()?.accountId);
      return delegate.update(session);
    },
    rotateRefreshNonce: (params) => delegate.rotateRefreshNonce(params),
    findById: (id) => delegate.findById(id),
    findByUserId: (userId) => delegate.findByUserId(userId),
    delete: (id) => delegate.delete(id)
  };
  const auth = createAuthService({ sessionRepository });

  const first = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-tenant-1');
  const second = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-tenant-2');
  const third = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-tenant-3');
  assert.ok('accessToken' in first);
  assert.ok('accessToken' in second);
  assert.ok('accessToken' in third);

  await auth.logout({ refreshToken: first.refreshToken }, 'corr-tenant-logout');
  await auth.revokeSessionForUser(
    third.principal.session.sessionId,
    second.principal.session.sessionId,
    'corr-tenant-target'
  );
  const fourth = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-tenant-4');
  assert.ok('accessToken' in fourth);
  await auth.revokeOtherSessions(fourth.principal.session.sessionId, 'corr-tenant-others');

  assert.deepEqual(tenantContexts, [ACCOUNT_ID, ACCOUNT_ID, ACCOUNT_ID]);
});

test('AuthService: previous verifier secrets allow rotated auth secret rollout without breaking sessions', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const oldAuth = createAuthService({
    secret: 'old-secret-key-which-is-long-enough-for-tests',
    sessionRepository
  });
  const rotatedAuth = createAuthService({
    secret: 'new-secret-key-which-is-long-enough-for-tests',
    verifierSecrets: ['old-secret-key-which-is-long-enough-for-tests'],
    sessionRepository
  });

  const login = await oldAuth.login({ username: 'admin', password: 'seed_admin' }, 'corr-rotate-1');
  assert.ok('accessToken' in login);

  await rotatedAuth.hydrateFromRepository(['user_admin' as never]);

  const principal = rotatedAuth.authenticateAccessToken(login.accessToken);
  const refreshed = await rotatedAuth.refresh(
    { refreshToken: login.refreshToken },
    'corr-rotate-refresh'
  );

  assert.equal(principal.user.id, 'user_admin');
  assert.notEqual(refreshed.accessToken, login.accessToken);
  assert.notEqual(refreshed.refreshToken, login.refreshToken);
});

test('AuthService: authenticateAccessToken returns principal for valid token', async () => {
  const auth = createAuthService();

  const login = await auth.login({ username: 'admin', password: 'seed_admin' }, 'corr-test-6');
  assert.ok('accessToken' in login);

  const principal = auth.authenticateAccessToken(login.accessToken);

  assert.equal(principal.user.id, login.principal.user.id);
  assert.equal(principal.session.sessionId, login.principal.session.sessionId);
});

test('AuthService: authenticateAccessToken throws for invalid token', () => {
  const auth = createAuthService();

  assert.throws(
    () => auth.authenticateAccessToken('invalid-token'),
    (err) => {
      assert.ok(err instanceof AuthenticationError);
      return true;
    }
  );
});

test('AuthService: exposes MFA configuration and rejects MFA completion when unavailable', async () => {
  const withoutMfa = createAuthService();
  assert.equal(withoutMfa.mfaService, undefined);
  await assert.rejects(
    () =>
      withoutMfa.completeMfaLogin(
        { userId: 'user_admin', token: '123456', challengeId: 'challenge' },
        'corr-mfa-not-configured'
      ),
    /MFA is not configured/
  );

  const mfa = new MfaService();
  const withMfa = createAuthService({ mfa });
  assert.equal(withMfa.mfaService, mfa);
});

test('AuthService: blocks locked passwords and rejects non-interactive principals', async () => {
  const bruteForce = new BruteForceProtection({
    maxAttempts: 1,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 60
  });
  bruteForce.recordPasswordFailure(' ADMIN ');
  const lockedAuth = createAuthService({ bruteForce });
  await assert.rejects(
    () => lockedAuth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-password-locked'),
    /Invalid username or password/
  );

  const seed = createSeedUsers()[0];
  const inactiveAuth = createAuthService({
    users: createUsersDouble({ ...seed, status: 'inactive' })
  });
  await assert.rejects(
    () => inactiveAuth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-inactive-user'),
    /Inactive users cannot sign in/
  );

  for (const [label, user] of [
    ['service-principal', { ...seed, principalKind: 'service' as const }],
    ['login-disabled', { ...seed, interactiveLoginEnabled: false }]
  ] as const) {
    const auth = createAuthService({ users: createUsersDouble(user) });
    await assert.rejects(
      () => auth.login({ username: 'admin', password: SEED_PASSWORD }, `corr-${label}`),
      /Session is not active/
    );
  }
});

test('AuthService: rejects MFA challenge identity mismatches and repository reservation races', async () => {
  const mfa = {
    isMfaRequired: () => true,
    isMfaActive: async () => true,
    verifyLogin: async () => true
  } as unknown as MfaService;
  const auth = createAuthService({
    mfa,
    mfaChallengeRepository: new InMemoryMfaLoginChallengeRepository()
  });
  const login = await auth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-mfa-identity-mismatch'
  );
  assert.ok('requiresMfa' in login);

  await assert.rejects(
    () =>
      auth.completeMfaLogin(
        { userId: 'user_other', token: '123456', challengeId: login.challengeId! },
        'corr-mfa-user-mismatch'
      ),
    /missing or expired/
  );

  const seed = createSeedUsers()[0];
  const accountMismatchUser = { ...seed, accountId: 'acc_other' as never };
  const accountMismatchAuth = createAuthService({
    mfa,
    users: {
      resolveByUsername: async () => seed,
      verifyPassword: async () => true,
      requiresPasswordReset: () => false,
      getOrThrow: () => seed,
      resolveInteractiveById: async () => accountMismatchUser,
      list: () => [seed]
    } as unknown as UsersService
  });
  const accountMismatchLogin = await accountMismatchAuth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-mfa-account-mismatch'
  );
  assert.ok('requiresMfa' in accountMismatchLogin);
  await assert.rejects(
    () =>
      accountMismatchAuth.completeMfaLogin(
        {
          userId: accountMismatchLogin.userId,
          token: '123456',
          challengeId: accountMismatchLogin.challengeId!
        },
        'corr-mfa-account-mismatch-complete'
      ),
    /missing or expired/
  );

  for (const [label, attemptCount] of [
    ['not-at-limit', 1],
    ['at-limit', 5]
  ] as const) {
    const delegate = new InMemoryMfaLoginChallengeRepository();
    const repository: MfaLoginChallengeRepository = {
      issue: (input) => delegate.issue(input),
      inspect: async (key, now) => {
        const record = await delegate.inspect(key, now);
        return record ? { ...record, attemptCount } : null;
      },
      reserveAttempt: async () => null,
      consume: (key, now) => delegate.consume(key, now)
    };
    const reservationAuth = createAuthService({
      mfa,
      mfaChallengeRepository: repository
    });
    const reservationLogin = await reservationAuth.login(
      { username: 'admin', password: SEED_PASSWORD },
      `corr-mfa-reservation-${label}`
    );
    assert.ok('requiresMfa' in reservationLogin);
    await assert.rejects(
      () =>
        reservationAuth.completeMfaLogin(
          {
            userId: reservationLogin.userId,
            token: '123456',
            challengeId: reservationLogin.challengeId!
          },
          `corr-mfa-reservation-${label}-complete`
        ),
      /MFA login challenge is missing or expired|Account temporarily locked/
    );
  }
});

test('AuthService: applies MFA lockout and clears it after a successful verification', async () => {
  const bruteForce = new BruteForceProtection({
    maxAttempts: 1,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 60
  });
  const mfa = {
    isMfaRequired: () => true,
    isMfaActive: async () => true,
    verifyLogin: async () => false
  } as unknown as MfaService;
  const auth = createAuthService({ mfa, bruteForce });

  const first = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-mfa-lock-1');
  assert.ok('requiresMfa' in first);
  await assert.rejects(
    () =>
      auth.completeMfaLogin(
        { userId: first.userId, token: '000000', challengeId: first.challengeId! },
        'corr-mfa-lock-failure'
      ),
    /Invalid MFA code/
  );

  const second = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-mfa-lock-2');
  assert.ok('requiresMfa' in second);
  await assert.rejects(
    () =>
      auth.completeMfaLogin(
        { userId: second.userId, token: '000001', challengeId: second.challengeId! },
        'corr-mfa-lock-blocked'
      ),
    /Account temporarily locked/
  );

  const successfulAuth = createAuthService({
    mfa: {
      isMfaRequired: () => true,
      isMfaActive: async () => true,
      verifyLogin: async () => true
    } as unknown as MfaService,
    bruteForce: new BruteForceProtection({ maxAttempts: 2 }),
    mfaChallengeRepository: new InMemoryMfaLoginChallengeRepository()
  });
  const successfulLogin = await successfulAuth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-mfa-success-with-brute-force'
  );
  assert.ok('requiresMfa' in successfulLogin);
  const completed = await successfulAuth.completeMfaLogin(
    {
      userId: successfulLogin.userId,
      token: '123456',
      challengeId: successfulLogin.challengeId!
    },
    'corr-mfa-success-with-brute-force-complete'
  );
  assert.equal(completed.principal.user.id, 'user_admin');
});

test('AuthService: MFA enrollment and confirmation fail closed on stale or raced challenges', async () => {
  const withoutMfa = createAuthService();
  await assert.rejects(
    () => withoutMfa.beginMfaEnrollment('challenge', 'CVG-HIS-V2', 'corr-mfa-begin-missing'),
    /MFA is not configured/
  );
  await assert.rejects(
    () => withoutMfa.confirmMfaEnrollment('challenge', '123456', 'corr-mfa-confirm-missing'),
    /MFA is not configured/
  );

  const createRequiredMfa = (active: boolean): MfaService =>
    ({
      isMfaRequired: () => true,
      isMfaActive: async () => active,
      initiateSetup: async () => ({ secret: 'secret', provisioningUri: 'uri', recoveryCodes: [] }),
      confirmSetup: async () => undefined,
      verifyLogin: async () => true
    }) as unknown as MfaService;

  const missingDelegate = new InMemoryMfaLoginChallengeRepository();
  const missingRepository: MfaLoginChallengeRepository = {
    issue: (input) => missingDelegate.issue(input),
    inspect: async () => null,
    reserveAttempt: (key, now) => missingDelegate.reserveAttempt(key, now),
    consume: (key, now) => missingDelegate.consume(key, now)
  };
  const missingAuth = createAuthService({
    mfa: createRequiredMfa(false),
    mfaChallengeRepository: missingRepository
  });
  const missingLogin = await missingAuth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-mfa-begin-stale-login'
  );
  assert.ok('requiresMfa' in missingLogin);
  await assert.rejects(
    () =>
      missingAuth.beginMfaEnrollment(
        missingLogin.challengeId!,
        'CVG-HIS-V2',
        'corr-mfa-begin-stale'
      ),
    /missing or expired/
  );

  const activeAuth = createAuthService({
    mfa: createRequiredMfa(true),
    mfaChallengeRepository: new InMemoryMfaLoginChallengeRepository()
  });
  const activeLogin = await activeAuth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-mfa-begin-active-login'
  );
  assert.ok('requiresMfa' in activeLogin);
  await assert.rejects(
    () =>
      activeAuth.beginMfaEnrollment(
        activeLogin.challengeId!,
        'CVG-HIS-V2',
        'corr-mfa-begin-active'
      ),
    /MFA is already active/
  );

  const reservationDelegate = new InMemoryMfaLoginChallengeRepository();
  const reservationRepository: MfaLoginChallengeRepository = {
    issue: (input) => reservationDelegate.issue(input),
    inspect: (key, now) => reservationDelegate.inspect(key, now),
    reserveAttempt: async () => null,
    consume: (key, now) => reservationDelegate.consume(key, now)
  };
  const reservationAuth = createAuthService({
    mfa: createRequiredMfa(false),
    mfaChallengeRepository: reservationRepository
  });
  const reservationLogin = await reservationAuth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-mfa-confirm-race-login'
  );
  assert.ok('requiresMfa' in reservationLogin);
  await assert.rejects(
    () =>
      reservationAuth.confirmMfaEnrollment(
        reservationLogin.challengeId!,
        '123456',
        'corr-mfa-confirm-race'
      ),
    /missing or expired/
  );

  const consumeDelegate = new InMemoryMfaLoginChallengeRepository();
  const consumeRepository: MfaLoginChallengeRepository = {
    issue: (input) => consumeDelegate.issue(input),
    inspect: (key, now) => consumeDelegate.inspect(key, now),
    reserveAttempt: (key, now) => consumeDelegate.reserveAttempt(key, now),
    consume: async () => false
  };
  const consumeAuth = createAuthService({
    mfa: createRequiredMfa(false),
    mfaChallengeRepository: consumeRepository
  });
  const consumeLogin = await consumeAuth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-mfa-confirm-consume-login'
  );
  assert.ok('requiresMfa' in consumeLogin);
  await assert.rejects(
    () =>
      consumeAuth.confirmMfaEnrollment(
        consumeLogin.challengeId!,
        '123456',
        'corr-mfa-confirm-consume'
      ),
    /missing or expired/
  );
});

test('AuthService: exposes authoritative session readers and access-token logout behavior', async () => {
  const auth = createAuthService();
  const login = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-session-readers');
  assert.ok('accessToken' in login);

  const session = await auth.getSession(login.accessToken);
  const context = await auth.getAuthoritativeSessionContext(login.accessToken);
  const verifiedTokenContext = auth.getVerifiedAccessTokenContext(login.accessToken);
  assert.equal(session.sessionId, login.principal.session.sessionId);
  assert.deepEqual(context, session);
  assert.deepEqual(verifiedTokenContext, {
    accountId: login.principal.user.accountId,
    userId: login.principal.user.id
  });
  assert.equal(auth.listSessions().length, 1);
  await auth.hydrateFromRepository();

  await assert.rejects(() => auth.logout({}, 'corr-logout-without-token'), /token is required/);

  const bruteForce = new BruteForceProtection({ maxAttempts: 2 });
  const accessLogoutAuth = createAuthService({ bruteForce });
  const accessLogin = await accessLogoutAuth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-access-logout-login'
  );
  assert.ok('accessToken' in accessLogin);
  await accessLogoutAuth.logout({ accessToken: accessLogin.accessToken }, 'corr-access-logout');
  await assert.rejects(
    () => accessLogoutAuth.synchronizeAccessToken(accessLogin.accessToken, 'corr-access-logout-check'),
    /Session is not active/
  );
});

test('AuthService: rejects invalid session-revocation targets and returns false for inactive targets', async () => {
  const auth = createAuthService();
  const first = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-revoke-boundary-first');
  const second = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-revoke-boundary-second');
  assert.ok('accessToken' in first);
  assert.ok('accessToken' in second);

  await assert.rejects(
    () =>
      auth.revokeSessionForUser(
        second.principal.session.sessionId,
        'missing-session' as never,
        'corr-revoke-missing'
      ),
    /Session not found/
  );
  await assert.rejects(
    () =>
      auth.revokeSessionForUser(
        second.principal.session.sessionId,
        second.principal.session.sessionId,
        'corr-revoke-self'
      ),
    /cannot revoke itself/
  );

  await auth.logout({ refreshToken: first.refreshToken }, 'corr-revoke-inactive-logout');
  assert.equal(
    await auth.revokeSessionForUser(
      second.principal.session.sessionId,
      first.principal.session.sessionId,
      'corr-revoke-inactive'
    ),
    false
  );
});

test('AuthService: rejects malformed, signed-but-wrong, expired, and unknown access tokens', async () => {
  const auth = createAuthService();
  assert.throws(() => auth.authenticateAccessToken('malformed-token'), /Malformed token/);

  const login = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-token-errors');
  assert.ok('accessToken' in login);
  assert.throws(
    () => auth.authenticateAccessToken(`${login.accessToken}tampered`),
    /Invalid token signature/
  );
  await assert.rejects(
    () => auth.refresh({ refreshToken: login.accessToken }, 'corr-token-wrong-type'),
    /Unexpected token type/
  );

  const otherAuth = createAuthService();
  assert.throws(
    () => otherAuth.authenticateAccessToken(login.accessToken),
    /Session not found/
  );

  const expiredAuth = createAuthService({ accessTokenTtlSeconds: -1 });
  const expiredLogin = await expiredAuth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-token-expired-login'
  );
  assert.ok('accessToken' in expiredLogin);
  assert.throws(
    () => expiredAuth.authenticateAccessToken(expiredLogin.accessToken),
    /Token expired/
  );
});

test('AuthService: a legacy password hash is refused with PASSWORD_RESET_REQUIRED and audited (R2-SEC-01)', async () => {
  const [seedAdmin] = createSeedUsers();
  const legacyUser = { ...seedAdmin, passwordHash: 'legacy-sha256-reset-required:' + 'a'.repeat(64) };
  const users = {
    resolveByUsername: async () => legacyUser,
    verifyPassword: async () => {
      throw new Error('verifyPassword must not run for a legacy hash');
    },
    requiresPasswordReset: () => true,
    getOrThrow: () => legacyUser,
    list: () => [legacyUser]
  } as unknown as UsersService;
  const audit = new AuditService();
  const auth = new AuthService({
    secret: 'test-secret-key',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    users,
    staff: new StaffService(),
    accessControl: new AccessControlService(),
    audit
  });
  await assert.rejects(
    () => auth.login({ username: legacyUser.username, password: 'whatever-it-was' }, 'corr-legacy'),
    (error: unknown) =>
      (error as { code?: string }).code === 'PASSWORD_RESET_REQUIRED' && (error as { statusCode?: number }).statusCode === 403
  );
  assert.ok(audit.list().some((entry) => entry.action === 'login_blocked_password_reset_required'));
});
