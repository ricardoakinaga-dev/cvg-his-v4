import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { NotFoundError } from '@cvg-his-v2/shared-errors';

import {
  LEGACY_RESET_REQUIRED_PREFIX,
  UsersService,
  comparePassword,
  createSeedUsers,
  hashPassword,
  passwordResetRequired
} from './index.js';
import type { UsersRepository } from './repositories/database-users.repository.js';

class InMemoryUsersRepository implements UsersRepository {
  readonly created: Array<Record<string, unknown>> = [];
  readonly updated: Array<Record<string, unknown>> = [];
  successfulPasswordUpgrades = 0;
  roleLookups = 0;
  readonly #users = new Map<UserId, Record<string, unknown>>();

  constructor(
    initialUsers: Array<Record<string, unknown>> = [],
    readonly concurrentPasswordHash?: string
  ) {
    for (const user of initialUsers) {
      this.#users.set(user.id as UserId, user);
    }
  }

  async create(user: any): Promise<void> {
    this.created.push(user);
    this.#users.set(user.id, {
      ...user,
      roleCodes: user.roleCode ? [user.roleCode] : []
    });
  }

  async update(user: any): Promise<void> {
    this.updated.push(user);
    this.#users.set(user.id, user);
  }

  async upgradePasswordHash(input: {
    readonly userId: UserId;
    readonly accountId: AccountId;
    readonly expectedPasswordHash: string;
    readonly passwordHash: string;
  }): Promise<boolean> {
    if (this.concurrentPasswordHash) {
      const existing = this.#users.get(input.userId);
      if (existing) {
        this.#users.set(input.userId, {
          ...existing,
          passwordHash: this.concurrentPasswordHash
        });
      }
      return false;
    }
    const existing = this.#users.get(input.userId);
    if (
      !existing
      || existing.accountId !== input.accountId
      || existing.passwordHash !== input.expectedPasswordHash
    ) {
      return false;
    }
    this.#users.set(input.userId, {
      ...existing,
      passwordHash: input.passwordHash
    });
    this.successfulPasswordUpgrades += 1;
    return true;
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

  async findByUsername(accountId: AccountId, username: string): Promise<any | null> {
    return (
      Array.from(this.#users.values()).find(
        (user) => user.accountId === accountId && user.username === username
      ) ?? null
    );
  }

  async findAll(): Promise<readonly any[]> {
    return Array.from(this.#users.values());
  }

  async findRoleCodesByUserId(id: UserId): Promise<readonly string[]> {
    this.roleLookups += 1;
    const user = this.#users.get(id);
    return (user?.roleCodes as readonly string[] | undefined) ?? [];
  }

  async findByAccountId(accountId: AccountId): Promise<readonly any[]> {
    return Array.from(this.#users.values()).filter((user) => user.accountId === accountId);
  }
}

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService({}, []);
  });

  it('creates user, hashes password and verifies it successfully', async () => {
    const created = await service.create({
      accountId: 'acc_quality' as AccountId,
      username: 'quality_user',
      email: 'quality@cvg.local',
      password: 'Clinica-Segura-2026!',
      displayName: 'Quality User',
      roleCode: 'admin'
    });

    expect(created.username).toBe('quality_user');
    expect(service.list()).toHaveLength(1);

    const stored = service.getOrThrow(created.id);
    expect(stored.passwordHash).toContain(':');
    expect(await service.verifyPassword(stored, 'Clinica-Segura-2026!')).toBe(true);
    expect(await service.verifyPassword(stored, 'wrong-password')).toBe(false);
  });

  it('updates summary fields and persists through repository when available', async () => {
    const repository = new InMemoryUsersRepository();
    const repoService = new UsersService({ repository }, []);

    const created = await repoService.create({
      accountId: 'acc_repo' as AccountId,
      username: 'repo_user',
      email: 'repo@cvg.local',
      password: 'Clinica-Segura-2026!'
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

  it('rejects legacy unsalted sha256 hashes and flags them for reset (R2-SEC-01)', async () => {
    const legacyHash = createHash('sha256').update('LegacyPass123!').digest('hex');

    expect(await comparePassword('LegacyPass123!', legacyHash)).toBe(false);
    expect(await comparePassword('wrong', legacyHash)).toBe(false);
    expect(passwordResetRequired(legacyHash)).toBe(true);
    expect(passwordResetRequired(`${LEGACY_RESET_REQUIRED_PREFIX}${legacyHash}`)).toBe(true);
    expect(passwordResetRequired(await hashPassword('Clinica-Segura-2026!'))).toBe(false);
  });

  it('fails closed when a legacy password upgrade loses a concurrent compare-and-swap', async () => {
    const legacyHash = createHash('sha256').update('LegacyPass123!').digest('hex');
    const resetPasswordHash = await hashPassword('ReplacementPass456!');
    const repository = new InMemoryUsersRepository(
      [
        {
          id: 'user_legacy_race' as UserId,
          accountId: 'acc_legacy' as AccountId,
          username: 'legacy_race',
          email: 'legacy-race@cvg.local',
          passwordHash: legacyHash,
          fullName: 'Legacy Race',
          isActive: true,
          roleCodes: ['admin'],
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:00:00.000Z'
        }
      ],
      resetPasswordHash
    );
    const repoService = new UsersService({ repository }, []);
    await repoService.hydrateFromDatabase();

    const user = repoService.getOrThrow('user_legacy_race' as UserId);
    await expect(repoService.verifyPassword(user, 'LegacyPass123!')).resolves.toBe(false);
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

  it('resolves a user created by another hot instance without full rehydration', async () => {
    const repository = new InMemoryUsersRepository();
    const hotReader = new UsersService({ repository }, []);
    const writer = new UsersService({ repository }, []);

    const created = await writer.create({
      accountId: 'acc_shared' as AccountId,
      username: 'late_user',
      email: 'late-user@cvg.local',
      password: 'Clinica-Segura-2026!',
      roleCode: 'admin'
    });

    const resolved = await hotReader.resolveByUsername(
      'late_user',
      'acc_shared' as AccountId
    );

    expect(resolved?.id).toBe(created.id);
    expect(resolved?.roleCodes).toEqual(['admin']);
    expect(await hotReader.verifyPassword(resolved!, 'Clinica-Segura-2026!')).toBe(true);
  });

  it('refreshes a cached user from the repository by id', async () => {
    const repository = new InMemoryUsersRepository();
    const writer = new UsersService({ repository }, []);
    const reader = new UsersService({ repository }, []);
    const created = await writer.create({
      accountId: 'acc_shared' as AccountId,
      username: 'status_user',
      email: 'status-user@cvg.local',
      password: 'Clinica-Segura-2026!',
      roleCode: 'admin'
    });

    await reader.resolveById(created.id, 'acc_shared' as AccountId);
    await writer.update(created.id, { status: 'inactive' });

    const refreshed = await reader.resolveById(created.id, 'acc_shared' as AccountId);

    expect(refreshed?.status).toBe('inactive');
  });

  it('uses an embedded authoritative role projection without a second role lookup', async () => {
    const repository = new InMemoryUsersRepository([
      {
        id: 'user_projected_roles' as UserId,
        accountId: 'acc_projected_roles' as AccountId,
        username: 'projected_roles',
        email: 'projected-roles@cvg.local',
        passwordHash: 'hash',
        fullName: 'Projected Roles',
        isActive: true,
        roleCodes: ['admin'],
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z'
      }
    ]);
    const service = new UsersService({ repository }, []);

    const resolved = await service.resolveInteractiveById(
      'user_projected_roles' as UserId,
      'acc_projected_roles' as AccountId
    );

    expect(resolved?.roleCodes).toEqual(['admin']);
    expect(repository.roleLookups).toBe(0);
  });

  it('does not resolve an unscoped username shared by multiple accounts', async () => {
    const passwordHash = await hashPassword('SharedPass123!');
    const repository = new InMemoryUsersRepository([
      {
        id: 'user_shared_first' as UserId,
        accountId: 'acc_first' as AccountId,
        username: 'shared',
        email: 'shared-first@cvg.local',
        passwordHash,
        fullName: 'Shared First',
        isActive: true,
        roleCodes: ['admin'],
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z'
      },
      {
        id: 'user_shared_second' as UserId,
        accountId: 'acc_second' as AccountId,
        username: 'shared',
        email: 'shared-second@cvg.local',
        passwordHash,
        fullName: 'Shared Second',
        isActive: true,
        roleCodes: ['admin'],
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z'
      }
    ]);
    const hydratedService = new UsersService({ repository }, []);

    await hydratedService.hydrateFromDatabase();

    expect(hydratedService.findByUsername('shared')).toBeUndefined();
    expect(hydratedService.findByUsername('shared', 'acc_first' as AccountId)?.id).toBe(
      'user_shared_first'
    );
    expect(hydratedService.findByUsername('shared', 'acc_second' as AccountId)?.id).toBe(
      'user_shared_second'
    );
  });

  it('rejects duplicate usernames', async () => {
    await service.create({
      accountId: 'acc_first' as AccountId,
      username: 'duplicated',
      email: 'first@cvg.local',
      password: 'Clinica-Segura-2026!'
    });

    await expect(
      service.create({
        accountId: 'acc_second' as AccountId,
        username: 'duplicated',
        email: 'second@cvg.local',
        password: 'Clinica-Segura-2026!'
      })
    ).rejects.toThrow('Username already exists');
  });

  it('isolates account-scoped reads and writes', async () => {
    const first = await service.create({
      accountId: 'acc_first' as AccountId,
      username: 'first_user',
      email: 'first@cvg.local',
      password: 'Clinica-Segura-2026!'
    });
    await service.create({
      accountId: 'acc_second' as AccountId,
      username: 'second_user',
      email: 'second@cvg.local',
      password: 'Clinica-Segura-2026!'
    });

    expect(service.listForAccount('acc_first' as AccountId).map((user) => user.id)).toEqual([
      first.id
    ]);
    expect(() =>
      service.getForAccountOrThrow(first.id, 'acc_second' as AccountId)
    ).toThrow(NotFoundError);
    await expect(
      service.updateForAccount(first.id, 'acc_second' as AccountId, {
        displayName: 'Cross tenant update'
      })
    ).rejects.toThrow(NotFoundError);
  });
});
