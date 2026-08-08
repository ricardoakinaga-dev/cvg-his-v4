import assert from 'node:assert/strict';
import { test } from 'vitest';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { AuditService } from '@cvg-his-v2/module-audit';
import { MfaService } from '@cvg-his-v2/module-mfa';
import { StaffService } from '@cvg-his-v2/module-staff';
import { UsersService } from '@cvg-his-v2/module-users';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import { getTenantContext } from '@cvg-his-v2/tenant-context';

import { AuthService } from './index.js';
import { InMemorySessionRepository } from './repositories/in-memory-session.repository.js';
import type { SessionRepository } from './repositories/session.repository.js';
import { generateCurrentTOTP } from './totp-wrapper.js';

const SEED_PASSWORD = 'seed_admin';
const ACCOUNT_ID = 'acc_cvg_demo';

function createAuthService(
  options: {
    readonly mfa?: MfaService;
    readonly sessionRepository?: SessionRepository;
    readonly secret?: string;
    readonly verifierSecrets?: readonly string[];
  } = {}
) {
  const users = new UsersService();
  const staff = new StaffService();
  const accessControl = new AccessControlService();
  const audit = new AuditService();

  return new AuthService({
    secret: options.secret ?? 'test-secret-key',
    verifierSecrets: options.verifierSecrets,
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    users,
    staff,
    accessControl,
    audit,
    mfa: options.mfa,
    sessionRepository: options.sessionRepository
  });
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
  assert.equal(auth.getPendingMfaEnrollmentUser(result.challengeId).id, 'user_admin');
});

test('AuthService: login does not require MFA for non-critical role', async () => {
  const mfa = new MfaService();
  const auth = createAuthService({ mfa });

  const result = await auth.login({ username: 'vet', password: 'seed_vet' }, 'corr-test-noncrit');

  assert.ok('accessToken' in result);
  assert.ok('refreshToken' in result);
  assert.equal(result.principal.user.username, 'vet');
});

test('AuthService: completeMfaLogin returns session after valid TOTP', async () => {
  const mfa = new MfaService();
  const auth = createAuthService({ mfa });

  const loginResult = await auth.login(
    { username: 'admin', password: SEED_PASSWORD },
    'corr-test-mfa2'
  );
  assert.ok('requiresMfa' in loginResult);

  const setup = await mfa.initiateSetup(ACCOUNT_ID, 'user_admin', 'admin@cvg-his.local');
  const token = generateCurrentTOTP(setup.secret);

  const session = await auth.completeMfaLogin(
    { userId: 'user_admin', token, challengeId: loginResult.challengeId! },
    'corr-test-mfa2-complete'
  );

  assert.ok('accessToken' in session);
  assert.equal(session.principal.user.username, 'admin');
});

test('AuthService: active MFA still requires the second factor after password login', async () => {
  const mfa = {
    isMfaRequired: () => true,
    isMfaActive: async () => true,
    verifyLogin: async () => true
  } as unknown as MfaService;
  const auth = createAuthService({ mfa });

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
