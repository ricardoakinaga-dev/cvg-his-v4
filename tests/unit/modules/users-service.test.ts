import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import {
  UsersService,
  comparePassword,
  hashPassword
} from '../../../packages/modules/users/src/index.js';
import type { UsersRepository } from '../../../packages/modules/users/src/repositories/database-users.repository.js';

class InMemoryUsersRepository implements UsersRepository {
  readonly created: Array<Record<string, unknown>> = [];
  readonly updated: Array<Record<string, unknown>> = [];
  readonly #users = new Map<UserId, Record<string, unknown>>();

  public constructor(initialUsers: Array<Record<string, unknown>> = []) {
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

describe('UsersService coverage guard', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService({}, []);
  });

  it('creates users with modern password hashing and rejects duplicate usernames', async () => {
    const created = await service.create({
      username: 'quality_user',
      email: 'quality@cvg.local',
      password: 'StrongPass123!',
      displayName: 'Quality User',
      roleCode: 'admin'
    });

    const stored = service.getOrThrow(created.id);
    expect(await service.verifyPassword(stored, 'StrongPass123!')).toBe(true);
    expect(await service.verifyPassword(stored, 'wrong-password')).toBe(false);

    await expect(
      service.create({
        username: 'quality_user',
        email: 'duplicated@cvg.local',
        password: 'AnotherStrongPass123!'
      })
    ).rejects.toThrow('Username already exists');
  });

  it('hydrates repository users, preserves seed users and supports username lookup after hydration', async () => {
    const repository = new InMemoryUsersRepository([
      {
        id: 'user_admin' as UserId,
        accountId: 'acc_cvg_demo' as AccountId,
        email: 'seed-override@cvg.local',
        passwordHash: await hashPassword('SeedShouldNotOverride123!'),
        fullName: 'Nao Deve Sobrescrever Seed',
        isActive: false,
        roleCodes: ['admin'],
        createdAt: '2026-04-18T09:00:00.000Z',
        updatedAt: '2026-04-18T09:00:00.000Z'
      },
      {
        id: 'user_repo_1' as UserId,
        accountId: 'acc_repo' as AccountId,
        email: 'hydrated@cvg.local',
        passwordHash: await hashPassword('HydratedPass123!'),
        fullName: 'Hydrated User',
        isActive: true,
        roleCodes: ['finance'],
        createdAt: '2026-04-18T10:00:00.000Z',
        updatedAt: '2026-04-18T10:00:00.000Z'
      }
    ]);
    const hydrated = new UsersService({ repository });

    await hydrated.hydrateFromDatabase();

    expect(hydrated.findByUsername('admin')?.email).toBe('admin@cvg-his.local');
    expect(hydrated.findByUsername('hydrated')?.displayName).toBe('Hydrated User');
    expect(await hydrated.verifyPassword(hydrated.findByUsername('hydrated')!, 'HydratedPass123!')).toBe(true);
  });

  it('updates users through repository persistence and keeps runtime lookups coherent', async () => {
    const repository = new InMemoryUsersRepository();
    const repositoryBacked = new UsersService({ repository }, []);

    const created = await repositoryBacked.create({
      username: 'repo_user',
      email: 'repo@cvg.local',
      password: 'RepoPass123!'
    });
    const updated = await repositoryBacked.update(created.id, {
      displayName: 'Repositorio Atualizado',
      email: 'repo.updated@cvg.local',
      status: 'inactive'
    });

    expect(repository.created).toHaveLength(1);
    expect(repository.updated).toHaveLength(1);
    expect(updated.displayName).toBe('Repositorio Atualizado');
    expect(repositoryBacked.findByUsername('repo_user')).toBeUndefined();
    expect(repositoryBacked.list()).toEqual([
      expect.objectContaining({
        id: created.id,
        email: 'repo.updated@cvg.local',
        status: 'inactive'
      })
    ]);
  });

  it('supports modern, seed and legacy sha256 password comparison paths', async () => {
    const modernHash = await hashPassword('ModernPass123!');
    const legacyHash = createHash('sha256').update('LegacyPass123!').digest('hex');

    expect(await comparePassword('ModernPass123!', modernHash)).toBe(true);
    expect(await comparePassword('wrong', modernHash)).toBe(false);
    expect(await comparePassword('LegacyPass123!', legacyHash)).toBe(true);
    expect(await comparePassword('wrong', legacyHash)).toBe(false);
    expect(await comparePassword('seed_admin', 'cvg-his-v2-seed-salt-v1:seed_admin')).toBe(true);
    expect(await comparePassword('seed_admin', 'invalid-format')).toBe(false);
  });
});
