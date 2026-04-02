import { beforeEach, describe, expect, it } from 'vitest';

import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { UsersService, comparePassword, createSeedUsers, hashPassword } from './index.js';
import type { UsersRepository } from './repositories/database-users.repository.js';

class InMemoryUsersRepository implements UsersRepository {
  readonly created: Array<Record<string, unknown>> = [];
  readonly updated: Array<Record<string, unknown>> = [];
  readonly #users = new Map<UserId, Record<string, unknown>>();

  constructor(initialUsers: Array<Record<string, unknown>> = []) {
    for (const user of initialUsers) {
      this.#users.set(user.id as UserId, user);
    }
  }

  async create(user: any): Promise<void> {
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

  it('hydrates repository users and supports lookup by username afterwards', async () => {
    const repository = new InMemoryUsersRepository([
      {
        id: 'user_repo_1' as UserId,
        accountId: '' as AccountId,
        email: 'hydrated@cvg.local',
        passwordHash: await hashPassword('HydratedPass123!'),
        fullName: 'Hydrated User',
        isActive: true,
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z'
      }
    ]);
    const hydratedService = new UsersService({ repository }, []);

    await hydratedService.hydrateFromDatabase();

    const hydrated = hydratedService.findByUsername('hydrated');
    expect(hydrated).toBeDefined();
    expect(hydrated?.email).toBe('hydrated@cvg.local');
    expect(await hydratedService.verifyPassword(hydrated!, 'HydratedPass123!')).toBe(true);
  });

  it('rejects duplicate usernames', async () => {
    await service.create({
      username: 'duplicated',
      email: 'first@cvg.local',
      password: 'FirstPass123!'
    });

    await expect(
      service.create({
        username: 'duplicated',
        email: 'second@cvg.local',
        password: 'SecondPass123!'
      })
    ).rejects.toThrow('Username already exists');
  });
});
