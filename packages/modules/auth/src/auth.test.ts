import assert from 'node:assert/strict';
import { test } from 'vitest';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { AuditService } from '@cvg-his-v2/module-audit';
import { MfaService } from '@cvg-his-v2/module-mfa';
import { StaffService } from '@cvg-his-v2/module-staff';
import { UsersService } from '@cvg-his-v2/module-users';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';

import { AuthService } from './index.js';
import { InMemorySessionRepository } from './repositories/in-memory-session.repository.js';
import type { SessionRepository } from './repositories/session.repository.js';
import { generateCurrentTOTP } from './totp-wrapper.js';

const SEED_PASSWORD = 'seed_admin';

function createAuthService(options: {
  readonly mfa?: MfaService;
  readonly sessionRepository?: SessionRepository;
  readonly audit?: AuditService;
  readonly secret?: string;
  readonly verifierSecrets?: readonly string[];
  readonly users?: UsersService;
} = {}) {
  const users = options.users ?? new UsersService();
  const staff = new StaffService();
  const accessControl = new AccessControlService();
  const audit = options.audit ?? new AuditService();

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

test('AuthService: failed scoped login audits the resolved account instead of a legacy fallback', async () => {
  const accountId = '11111111-1111-4111-8111-111111111111';
  const audit = new AuditService();
  const users = new UsersService({
    seedUsersEnabled: false,
    repository: {
      create: async () => undefined,
      update: async () => undefined,
      findById: async () => null,
      findByEmail: async () => null,
      findByLogin: async () => null,
      findAll: async () => [],
      findRoleCodesByUserId: async () => [],
      findByAccountId: async () => [],
      resolveAccountIdBySlug: async () => accountId as never
    }
  });
  const auth = createAuthService({ audit, users });

  await assert.rejects(
    () =>
      auth.login(
        { accountSlug: 'default', username: 'missing-user', password: 'wrong' },
        'corr-scoped-failure'
      ),
    AuthenticationError
  );

  assert.equal(audit.list()[0]?.accountId, accountId);
});

test('AuthService: normalizes scoped login identifiers without changing the password', async () => {
  const accountId = '11111111-1111-4111-8111-111111111111';
  const observed: { accountSlug?: string; username?: string; password?: string } = {};
  const users = new UsersService({
    seedUsersEnabled: false,
    repository: {
      create: async () => undefined,
      update: async () => undefined,
      findById: async () => null,
      findByEmail: async () => null,
      findByLogin: async (accountSlug, username) => {
        observed.accountSlug = accountSlug;
        observed.username = username;
        return {
          id: '22222222-2222-4222-8222-222222222222' as never,
          accountId: accountId as never,
          email: 'admin@cvg-his.local',
          passwordHash: 'not-used-by-this-test',
          fullName: 'Admin',
          isActive: true,
          createdAt: '2026-08-13T00:00:00.000Z',
          updatedAt: '2026-08-13T00:00:00.000Z'
        };
      },
      findAll: async () => [],
      findRoleCodesByUserId: async () => [],
      findByAccountId: async () => [],
      resolveAccountIdBySlug: async (accountSlug) => {
        observed.accountSlug = accountSlug;
        return accountId as never;
      }
    }
  });
  users.verifyPassword = async (user, password) => {
    observed.password = password;
    void user;
    return false;
  };
  const auth = createAuthService({ users });

  await assert.rejects(
    () =>
      auth.login(
        {
          accountSlug: '  default  ',
          username: '  Admin@CVG-HIS.local  ',
          password: '  password-with-spaces  '
        },
        'corr-normalized-login'
      ),
    AuthenticationError
  );

  assert.equal(observed.accountSlug, 'default');
  assert.equal(observed.username, 'admin@cvg-his.local');
  assert.equal(observed.password, '  password-with-spaces  ');
});

test('AuthService: login fails closed when durable session persistence fails', async () => {
  const repository: SessionRepository = {
    create: async () => {
      throw new Error('session database unavailable');
    },
    update: async () => undefined,
    findById: async () => null,
    findByUserId: async () => [],
    delete: async () => undefined
  };
  const auth = createAuthService({ sessionRepository: repository });

  await assert.rejects(
    () => auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-persistence-fail'),
    /session database unavailable/
  );
  assert.equal(auth.listSessions().length, 0);
});

test('AuthService: login removes the persisted session when durable audit persistence fails', async () => {
  const sessions = new InMemorySessionRepository();
  const audit = new AuditService({
    auditRepository: {
      create: async () => {
        throw new Error('audit database unavailable');
      },
      list: async () => [],
      findById: async () => null
    }
  });
  const auth = createAuthService({ sessionRepository: sessions, audit });

  await assert.rejects(
    () => auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-audit-fail'),
    /audit database unavailable/
  );
  assert.equal(auth.listSessions().length, 0);
  assert.equal((await sessions.findByUserId('user_admin')).length, 0);
});

test('AuthService: login requires MFA for critical role when MFA is enabled', async () => {
  const mfa = new MfaService();
  const auth = createAuthService({ mfa });

  const result = await auth.login({ username: 'admin', password: SEED_PASSWORD }, 'corr-test-mfa');

  assert.ok('requiresMfa' in result);
  assert.equal(result.requiresMfa, true);
  assert.equal(result.userId, 'user_admin');
  assert.deepEqual(result.mfaMethods, ['totp']);
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

  const setup = await mfa.initiateSetup('user_admin', 'admin@cvg-his.local');
  const token = generateCurrentTOTP(setup.secret);

  const session = await auth.completeMfaLogin(
    { userId: 'user_admin', token },
    'corr-test-mfa2-complete'
  );

  assert.ok('accessToken' in session);
  assert.equal(session.principal.user.username, 'admin');
});

test('AuthService: refresh rotates tokens but keeps same session', async () => {
  const auth = createAuthService();

  const login = await auth.login({ username: 'admin', password: 'seed_admin' }, 'corr-test-4');
  assert.ok('accessToken' in login);
  const originalSessionId = login.principal.session.sessionId;
  const originalRefresh = login.refreshToken;

  const refreshed = auth.refresh({ refreshToken: login.refreshToken }, 'corr-test-4-refresh');

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
  const refreshed = authB.refresh(
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

  auth.logout({ refreshToken: login.refreshToken }, 'corr-test-5-logout');

  assert.throws(
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

  const revoked = auth.revokeOtherSessions(second.principal.session.sessionId, 'corr-revoke-others');

  assert.equal(revoked, 1);
  assert.equal(auth.listSessionsForUser('user_admin' as never)[0].sessionId, second.principal.session.sessionId);
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

  const first = await auth.login({ username: 'admin', password: 'seed_admin' }, 'corr-revoke-target-1');
  const second = await auth.login({ username: 'admin', password: 'seed_admin' }, 'corr-revoke-target-2');
  assert.ok('accessToken' in first);
  assert.ok('accessToken' in second);

  const revoked = auth.revokeSessionForUser(
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
  const refreshed = rotatedAuth.refresh({ refreshToken: login.refreshToken }, 'corr-rotate-refresh');

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
