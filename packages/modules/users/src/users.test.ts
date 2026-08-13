import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { UsersService, comparePassword, createSeedUsers, hashPassword } from './index.js';
import type { UsersRepository } from './repositories/database-users.repository.js';

class InMemoryUsersRepository implements UsersRepository {
  readonly created: Array<Record<string, unknown>> = [];
  readonly updated: Array<Record<string, unknown>> = [];
  readonly #users = new Map<UserId, Record<string, unknown>>();

  constructor(
    initialUsers: Array<Record<string, unknown>> = [],
    readonly failCreates = false
  ) {
    for (const user of initialUsers) {
      this.#users.set(user.id as UserId, user);
    }
  }

  async create(user: any): Promise<void> {
    if (this.failCreates) {
      throw new Error('database unavailable');
    }
    this.created.push(user);
    this.#users.set(user.id, user);
  }

  async update(user: any): Promise<void> {
    this.updated.push(user);
    this.#users.set(user.id, user);
  }

  async findById(id: UserId): Promise<any | null> {
    return this.#users.get(id) ?? null;
  }

  async findByEmail(accountId: AccountId, email: string): Promise<any | null> {
    return (
      Array.from(this.#users.values()).find(
        (user) => user.accountId === accountId && user.email === email
      ) ?? null
    );
  }

  async findByLogin(accountSlug: string, username: string): Promise<any | null> {
    return (
      Array.from(this.#users.values()).find(
        (user) =>
          user.accountSlug === accountSlug &&
          String(user.email).split('@')[0]?.toLowerCase() === username.toLowerCase()
      ) ?? null
    );
  }

  async findAll(): Promise<readonly any[]> {
    return Array.from(this.#users.values());
  }

  async findRoleCodesByUserId(id: UserId): Promise<readonly string[]> {
    const user = this.#users.get(id);
    return (user?.roleCodes as readonly string[] | undefined) ?? [];
  }

  async findByAccountId(accountId: AccountId): Promise<readonly any[]> {
    return Array.from(this.#users.values()).filter((user) => user.accountId === accountId);
  }
}

describe('UsersService', () => {
  const accountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as AccountId;
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService({}, []);
  });

  it('creates user, hashes password and verifies it successfully', async () => {
    const created = await service.create({
      accountId,
      username: 'quality_user',
      email: 'quality@cvg.local',
      password: 'StrongPass123!',
      displayName: 'Quality User',
      roleCode: 'admin'
    });

    expect(created.username).toBe('quality_user');
    expect(service.list()).toHaveLength(1);

    const stored = service.getOrThrow(created.id);
    expect(stored.passwordHash).toContain(':');
    expect(await service.verifyPassword(stored, 'StrongPass123!')).toBe(true);
    expect(await service.verifyPassword(stored, 'wrong-password')).toBe(false);
  });

  it('updates summary fields and persists through repository when available', async () => {
    const repository = new InMemoryUsersRepository();
    const repoService = new UsersService({ repository }, []);

    const created = await repoService.create({
      accountId,
      username: 'repo_user',
      email: 'repo@cvg.local',
      password: 'RepoPass123!'
    });
    const updated = await repoService.update(created.id, {
      displayName: 'Repositorio Atualizado',
      email: 'repo.updated@cvg.local',
      status: 'inactive'
    });

    expect(repository.created).toHaveLength(1);
    expect(repository.updated).toHaveLength(1);
    expect(updated.displayName).toBe('Repositorio Atualizado');
    expect(updated.email).toBe('repo.updated@cvg.local');
    expect(updated.status).toBe('inactive');
  });

  it('hashPassword and comparePassword protect modern password flow', async () => {
    const passwordHash = await hashPassword('ModernPass123!');

    expect(passwordHash.split(':')).toHaveLength(2);
    expect(await comparePassword('ModernPass123!', passwordHash)).toBe(true);
    expect(await comparePassword('another-password', passwordHash)).toBe(false);
    expect(await comparePassword('ModernPass123!', 'invalid-format')).toBe(false);
  });

  it('keeps compatibility with legacy seed passwords', async () => {
    const [seedAdmin] = createSeedUsers();

    expect(await comparePassword('seed_admin', seedAdmin.passwordHash)).toBe(true);
    expect(await comparePassword('wrong', seedAdmin.passwordHash)).toBe(false);
    expect(await new UsersService().verifyPassword(seedAdmin, 'seed_admin')).toBe(true);
  });

  it('keeps compatibility with legacy sha256 seeded passwords from Drizzle seed', async () => {
    const legacyHash = createHash('sha256').update('LegacyPass123!').digest('hex');

    expect(await comparePassword('LegacyPass123!', legacyHash)).toBe(true);
    expect(await comparePassword('wrong', legacyHash)).toBe(false);
  });

  it('hydrates repository users and supports lookup by username afterwards', async () => {
    const repository = new InMemoryUsersRepository([
      {
        id: 'user_repo_1' as UserId,
        accountId: '' as AccountId,
        email: 'hydrated@cvg.local',
        passwordHash: await hashPassword('HydratedPass123!'),
        fullName: 'Hydrated User',
        isActive: true,
        roleCodes: ['admin'],
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z'
      }
    ]);
    const hydratedService = new UsersService({ repository }, []);

    await hydratedService.hydrateFromDatabase();

    const hydrated = hydratedService.findByUsername('hydrated');
    expect(hydrated).toBeDefined();
    expect(hydrated?.email).toBe('hydrated@cvg.local');
    expect(hydrated?.roleCodes).toEqual(['admin']);
    expect(await hydratedService.verifyPassword(hydrated!, 'HydratedPass123!')).toBe(true);
  });

  it('loads the same username from the explicitly selected account without cross-account cache bleed', async () => {
    const passwordA = await hashPassword('AccountAPass123!');
    const passwordB = await hashPassword('AccountBPass123!');
    const repository = new InMemoryUsersRepository([
      {
        id: '11111111-1111-4111-8111-111111111111' as UserId,
        accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as AccountId,
        accountSlug: 'clinic-a',
        email: 'admin@clinic-a.test',
        passwordHash: passwordA,
        fullName: 'Admin A',
        isActive: true,
        roleCodes: ['admin'],
        createdAt: '2026-08-12T10:00:00.000Z',
        updatedAt: '2026-08-12T10:00:00.000Z'
      },
      {
        id: '22222222-2222-4222-8222-222222222222' as UserId,
        accountId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as AccountId,
        accountSlug: 'clinic-b',
        email: 'admin@clinic-b.test',
        passwordHash: passwordB,
        fullName: 'Admin B',
        isActive: true,
        roleCodes: ['admin'],
        createdAt: '2026-08-12T10:00:00.000Z',
        updatedAt: '2026-08-12T10:00:00.000Z'
      }
    ]);
    const scopedService = new UsersService({ repository }, []);

    const userA = await scopedService.findForLogin('clinic-a', 'admin');
    const userB = await scopedService.findForLogin('clinic-b', 'admin');

    expect(userA?.accountId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(userB?.accountId).toBe('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    expect(await scopedService.verifyPassword(userA!, 'AccountAPass123!')).toBe(true);
    expect(await scopedService.verifyPassword(userB!, 'AccountBPass123!')).toBe(true);
  });

  it('rejects duplicate usernames', async () => {
    await service.create({
      accountId,
      username: 'duplicated',
      email: 'first@cvg.local',
      password: 'FirstPass123!'
    });

    await expect(
      service.create({
        accountId,
        username: 'duplicated',
        email: 'second@cvg.local',
        password: 'SecondPass123!'
      })
    ).rejects.toThrow('Username already exists');
  });

  it('creates a UUID user in the authenticated account and isolates duplicate usernames by account', async () => {
    const accountA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as AccountId;
    const accountB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' as AccountId;

    const createdA = await service.create({
      accountId: accountA,
      username: 'shared.login',
      email: 'shared@login-a.test',
      password: 'StrongPass123!'
    } as never);
    const createdB = await service.create({
      accountId: accountB,
      username: 'shared.login',
      email: 'shared@login-b.test',
      password: 'StrongPass123!'
    } as never);

    expect(createdA.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(createdA.accountId).toBe(accountA);
    expect(createdB.accountId).toBe(accountB);
    expect(service.list(accountA)).toEqual([expect.objectContaining({ id: createdA.id })]);
    expect(service.list(accountB)).toEqual([expect.objectContaining({ id: createdB.id })]);
  });

  it('does not expose an unpersisted user in memory when repository creation fails', async () => {
    const repository = new InMemoryUsersRepository([], true);
    const repositoryBacked = new UsersService({ repository }, []);

    await expect(
      repositoryBacked.create({
        accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as AccountId,
        username: 'must_not_leak',
        email: 'must-not-leak@test.local',
        password: 'StrongPass123!'
      } as never)
    ).rejects.toThrow('database unavailable');

    expect(repositoryBacked.list()).toEqual([]);
    expect(repositoryBacked.findByUsername('must_not_leak')).toBeUndefined();
  });

  it('rejects account-mismatched reads and updates', async () => {
    const ownerAccount = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as AccountId;
    const foreignAccount = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' as AccountId;
    const created = await service.create({
      accountId: ownerAccount,
      username: 'tenant_guard',
      email: 'tenant-guard@test.local',
      password: 'StrongPass123!'
    } as never);

    expect(() => service.getForAccountOrThrow(foreignAccount, created.id)).toThrow(
      'User not found'
    );
    await expect(
      service.updateForAccount(foreignAccount, created.id, { displayName: 'Cross tenant' })
    ).rejects.toThrow('User not found');
  });
});
