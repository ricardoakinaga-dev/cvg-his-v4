import { scryptSync, timingSafeEqual } from 'node:crypto';

import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId, UserSummary } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';

export interface UserRecord extends UserSummary {
  readonly passwordHash: string;
  readonly roleCodes: readonly string[];
}

const SEED_SALT = 'cvg-his-v2-seed-salt-v1';
const SEED_PASSWORD_PREFIX = 'seed_';

function hashPassword(password: string): string {
  return scryptSync(password, SEED_SALT, 64).toString('hex');
}

function comparePassword(password: string, passwordHash: string): boolean {
  const candidate = scryptSync(password, SEED_SALT, 64);
  const reference = Buffer.from(passwordHash, 'hex');
  return timingSafeEqual(candidate, reference);
}

function createSeedUsers(): UserRecord[] {
  const createdAt = '2026-03-25T00:00:00.000Z';

  return [
    {
      id: 'user_admin' as UserId,
      accountId: 'acc_cvg_demo' as never,
      username: 'admin',
      email: 'admin@cvg-his.local',
      displayName: 'Admin CVG',
      status: 'active',
      staffId: 'staff_admin' as never,
      createdAt,
      updatedAt: createdAt,
      passwordHash: hashPassword(SEED_PASSWORD_PREFIX + 'admin'),
      roleCodes: ['admin']
    },
    {
      id: 'user_reception' as UserId,
      accountId: 'acc_cvg_demo' as never,
      username: 'reception',
      email: 'reception@cvg-his.local',
      displayName: 'Recepcao Central',
      status: 'active',
      staffId: 'staff_reception' as never,
      createdAt,
      updatedAt: createdAt,
      passwordHash: hashPassword(SEED_PASSWORD_PREFIX + 'reception'),
      roleCodes: ['reception']
    },
    {
      id: 'user_auditor' as UserId,
      accountId: 'acc_cvg_demo' as never,
      username: 'auditor',
      email: 'auditor@cvg-his.local',
      displayName: 'Auditoria Interna',
      status: 'active',
      staffId: 'staff_auditor' as never,
      createdAt,
      updatedAt: createdAt,
      passwordHash: hashPassword(SEED_PASSWORD_PREFIX + 'auditor'),
      roleCodes: ['auditor']
    },
    {
      id: 'user_nurse' as UserId,
      accountId: 'acc_cvg_demo' as never,
      username: 'nurse',
      email: 'nurse@cvg-his.local',
      displayName: 'Enfermagem Inicial',
      status: 'active',
      staffId: 'staff_nurse' as never,
      createdAt,
      updatedAt: createdAt,
      passwordHash: hashPassword(SEED_PASSWORD_PREFIX + 'nurse'),
      roleCodes: ['nurse']
    },
    {
      id: 'user_vet' as UserId,
      accountId: 'acc_cvg_demo' as never,
      username: 'vet',
      email: 'vet@cvg-his.local',
      displayName: 'Veterinario Responsavel',
      status: 'active',
      staffId: 'staff_vet' as never,
      createdAt,
      updatedAt: createdAt,
      passwordHash: hashPassword(SEED_PASSWORD_PREFIX + 'vet'),
      roleCodes: ['veterinarian']
    },
    {
      id: 'user_finance' as UserId,
      accountId: 'acc_cvg_demo' as never,
      username: 'finance',
      email: 'finance@cvg-his.local',
      displayName: 'Financeiro Operacional',
      status: 'active',
      staffId: 'staff_finance' as never,
      createdAt,
      updatedAt: createdAt,
      passwordHash: hashPassword(SEED_PASSWORD_PREFIX + 'finance'),
      roleCodes: ['finance']
    },
    {
      id: 'user_inventory' as UserId,
      accountId: 'acc_cvg_demo' as never,
      username: 'inventory',
      email: 'inventory@cvg-his.local',
      displayName: 'Estoque Assistencial',
      status: 'active',
      staffId: 'staff_inventory' as never,
      createdAt,
      updatedAt: createdAt,
      passwordHash: hashPassword(SEED_PASSWORD_PREFIX + 'inventory'),
      roleCodes: ['inventory']
    }
  ];
}

export class UsersService {
  readonly #users = new Map<UserId, UserRecord>();
  readonly #usersByUsername = new Map<string, UserRecord>();

  public constructor(seedUsers: readonly UserRecord[] = createSeedUsers()) {
    for (const user of seedUsers) {
      this.#users.set(user.id, user);
      this.#usersByUsername.set(user.username, user);
    }
  }

  public list(): readonly UserSummary[] {
    return Array.from(this.#users.values()).map(stripSecrets);
  }

  public getOrThrow(userId: UserId): UserRecord {
    const user = this.#users.get(userId);
    if (!user) {
      throw new NotFoundError('User not found', { userId });
    }

    return user;
  }

  public findByUsername(username: string): UserRecord | undefined {
    return this.#usersByUsername.get(username);
  }

  public verifyPassword(user: UserRecord, password: string): boolean {
    return comparePassword(password, user.passwordHash);
  }

  public create(input: {
    readonly username: string;
    readonly email: string;
    readonly password: string;
    readonly displayName?: string;
    readonly department?: string;
    readonly roleCode?: string;
    readonly status?: 'active' | 'inactive';
  }): UserSummary {
    if (this.#usersByUsername.has(input.username)) {
      throw new Error('Username already exists');
    }
    const now = nowIso();
    const id = ('user_' + Math.random().toString(36).slice(2, 10)) as UserId;
    const user: UserRecord = {
      id,
      accountId: 'acc_cvg_demo',
      username: input.username,
      email: input.email,
      passwordHash: hashPassword(input.password),
      displayName: input.displayName || input.username,
      roleCodes: input.roleCode ? [input.roleCode] : [],
      department: input.department,
      status: input.status || 'active',
      createdAt: now,
      updatedAt: now
    };
    this.#users.set(id, user);
    this.#usersByUsername.set(user.username, user);
    return stripSecrets(user);
  }

  public update(
    userId: UserId,
    changes: {
      readonly displayName?: string;
      readonly email?: string;
      readonly status?: 'active' | 'inactive';
    }
  ): UserSummary {
    const user = this.getOrThrow(userId);
    const updated: UserRecord = {
      ...user,
      displayName: changes.displayName ?? user.displayName,
      email: changes.email ?? user.email,
      status: changes.status ?? user.status,
      updatedAt: nowIso()
    };

    this.#users.set(userId, updated);
    this.#usersByUsername.set(updated.username, updated);
    return stripSecrets(updated);
  }
}

function stripSecrets(user: UserRecord): UserSummary {
  const { passwordHash: _passwordHash, roleCodes: _roleCodes, ...summary } = user;
  return summary;
}

export { createSeedUsers, hashPassword };

export { DatabaseUsersRepository, type UsersRepository, type UserRecord } from "./repositories/database-users.repository.js";
