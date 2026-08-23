import { createHash } from 'node:crypto';

import { describe, expect, test } from 'vitest';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { AuditService } from '@cvg-his-v2/module-audit';
import {
  AuthService,
  InMemoryMfaLoginChallengeRepository,
  InMemorySessionRepository
} from '@cvg-his-v2/module-auth';
import { MfaService } from '@cvg-his-v2/module-mfa';
import { StaffService } from '@cvg-his-v2/module-staff';
import { UsersService, type UsersRepository } from '@cvg-his-v2/module-users';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

const accountId = '00000000-0000-4000-8000-000000000001' as AccountId;
const userId = '00000000-0000-4000-8000-000000000002' as UserId;
const password = 'correct horse battery staple';

type MutablePrincipal = {
  principalKind: 'human' | 'service';
  interactiveLoginEnabled: boolean;
  isActive: boolean;
};

function createRepository() {
  const principal: MutablePrincipal = {
    principalKind: 'human',
    interactiveLoginEnabled: true,
    isActive: true
  };
  const row = () => ({
    id: userId,
    accountId,
    username: 'operator',
    email: 'operator@example.test',
    passwordHash: createHash('sha256').update(password).digest('hex'),
    fullName: 'Operator',
    isActive: principal.isActive,
    principalKind: principal.principalKind,
    interactiveLoginEnabled: principal.interactiveLoginEnabled,
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z'
  });
  const isInteractiveHuman = () =>
    principal.principalKind === 'human' && principal.interactiveLoginEnabled && principal.isActive;

  const repository: UsersRepository = {
    create: async () => undefined,
    update: async () => undefined,
    upgradePasswordHash: async () => true,
    findById: async (id, scopedAccountId) =>
      id === userId && (!scopedAccountId || scopedAccountId === accountId) ? row() : null,
    findByUsername: async (scopedAccountId, username) =>
      scopedAccountId === accountId && username === 'operator' ? row() : null,
    findByEmail: async (scopedAccountId, email) =>
      scopedAccountId === accountId && email === 'operator@example.test' ? row() : null,
    findAll: async () => (isInteractiveHuman() ? [row()] : []),
    findRoleCodesByUserId: async () => ['admin'],
    findByAccountId: async (scopedAccountId) =>
      scopedAccountId === accountId && isInteractiveHuman() ? [row()] : []
  };

  return { principal, repository };
}

function createAuth(users: UsersService, mfa?: MfaService, persistSessions = true) {
  return new AuthService({
    secret: 'interactive-principal-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604_800,
    users,
    staff: new StaffService(),
    accessControl: new AccessControlService(),
    audit: new AuditService(),
    mfa,
    sessionRepository: persistSessions ? new InMemorySessionRepository() : undefined,
    mfaChallengeRepository: new InMemoryMfaLoginChallengeRepository()
  });
}

describe('interactive human principal guard', () => {
  test.each([
    [{ principalKind: 'service' as const }, 'service principal'],
    [{ interactiveLoginEnabled: false }, 'interactive login disabled'],
    [{ isActive: false }, 'inactive principal']
  ])('rejects a cold-cache lookup for %s (%s)', async (changes) => {
    const { principal, repository } = createRepository();
    Object.assign(principal, changes);
    const users = new UsersService({ repository, seedUsersEnabled: false });

    await expect(users.resolveByUsername('operator', accountId)).resolves.toBeUndefined();
    await expect(users.resolveById(userId, accountId)).resolves.toMatchObject({ id: userId });
    expect(users.findByUsername('operator', accountId)).toBeUndefined();
  });

  test('evicts a warm-cache principal that loses interactive-human eligibility', async () => {
    const { principal, repository } = createRepository();
    const users = new UsersService({ repository, seedUsersEnabled: false });
    await users.hydrateFromDatabase();
    expect(users.findByUsername('operator', accountId)?.id).toBe(userId);

    principal.interactiveLoginEnabled = false;
    await users.hydrateFromDatabase();

    expect(users.findByUsername('operator', accountId)).toBeUndefined();
    expect(users.list()).toEqual([]);
  });

  test('blocks refresh and bearer synchronization after interactive login is disabled', async () => {
    const { principal, repository } = createRepository();
    const users = new UsersService({ repository, seedUsersEnabled: false });
    const auth = createAuth(users);
    const login = await auth.login(
      { username: 'operator', password, accountId },
      'corr-interactive-login'
    );
    expect('accessToken' in login).toBe(true);
    if (!('accessToken' in login)) throw new Error('Expected completed login');

    principal.interactiveLoginEnabled = false;

    await expect(
      auth.refresh({ refreshToken: login.refreshToken }, 'corr-interactive-refresh')
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      auth.synchronizeAccessToken(login.accessToken, 'corr-interactive-bearer')
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  test('refreshes principal eligibility even when sessions are process-local', async () => {
    const { principal, repository } = createRepository();
    const users = new UsersService({ repository, seedUsersEnabled: false });
    const auth = createAuth(users, undefined, false);
    const login = await auth.login(
      { username: 'operator', password, accountId },
      'corr-local-session-login'
    );
    if (!('accessToken' in login)) throw new Error('Expected completed login');

    principal.principalKind = 'service';
    principal.interactiveLoginEnabled = false;

    await expect(
      auth.refresh({ refreshToken: login.refreshToken }, 'corr-local-session-refresh')
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      auth.synchronizeAccessToken(login.accessToken, 'corr-local-session-bearer')
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  test('blocks MFA enrollment and completion after principal eligibility changes', async () => {
    const { principal, repository } = createRepository();
    const users = new UsersService({ repository, seedUsersEnabled: false });
    const auth = createAuth(users, new MfaService());
    const login = await auth.login(
      { username: 'operator', password, accountId },
      'corr-interactive-mfa-login'
    );
    expect('requiresMfa' in login).toBe(true);
    if (!('requiresMfa' in login)) throw new Error('Expected MFA challenge');

    principal.principalKind = 'service';
    principal.interactiveLoginEnabled = false;

    await expect(
      auth.beginMfaEnrollment(login.challengeId, 'CVG HIS', 'corr-interactive-mfa-enroll')
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      auth.completeMfaLogin(
        { userId, token: '000000', challengeId: login.challengeId },
        'corr-interactive-mfa-complete'
      )
    ).rejects.toBeInstanceOf(AuthenticationError);
  });
});
