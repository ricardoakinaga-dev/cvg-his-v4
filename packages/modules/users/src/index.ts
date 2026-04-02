import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId, UserSummary } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';
import type { UsersRepository } from './repositories/database-users.repository.js';

export interface UserRecord extends UserSummary {
  readonly passwordHash: string;
  readonly roleCodes: readonly string[];
}

export interface UsersServiceOptions {
  readonly repository?: UsersRepository;
}

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_LENGTH = 16;
const SEED_SALT = 'cvg-his-v2-seed-salt-v1';

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_LENGTH);
  const key = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function comparePassword(password: string, passwordHash: string): Promise<boolean> {
  const parts = passwordHash.split(':');
  if (parts.length !== 2) return false;
  const saltHex = parts[0];
  const hashHex = parts[1];

  // Legacy seed format: salt is not hex, hash is not real scrypt output
  // Handle seed users with predictable passwords
  if (saltHex === SEED_SALT && hashHex.startsWith('seed_')) {
    const expectedPassword = hashHex;
    return password === expectedPassword;
  }

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const reference = Buffer.from(hashHex, 'hex');
    const candidate = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
    return timingSafeEqual(candidate, reference);
  } catch {
    return false;
  }
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
      passwordHash: 'cvg-his-v2-seed-salt-v1:seed_admin',
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
      passwordHash: 'cvg-his-v2-seed-salt-v1:seed_reception',
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
      passwordHash: 'cvg-his-v2-seed-salt-v1:seed_auditor',
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
      passwordHash: 'cvg-his-v2-seed-salt-v1:seed_nurse',
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
      passwordHash: 'cvg-his-v2-seed-salt-v1:seed_vet',
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
      passwordHash: 'cvg-his-v2-seed-salt-v1:seed_finance',
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
      passwordHash: 'cvg-his-v2-seed-salt-v1:seed_inventory',
      roleCodes: ['inventory']
    }
  ];
}

export class UsersService {
  readonly #repository?: UsersRepository;
  readonly #users = new Map<UserId, UserRecord>();
  readonly #usersByUsername = new Map<string, UserRecord>();

  public constructor(
    options?: UsersServiceOptions,
    seedUsers: readonly UserRecord[] = createSeedUsers()
  ) {
    this.#repository = options?.repository;
    for (const user of seedUsers) {
      this.#users.set(user.id, user);
      this.#usersByUsername.set(user.username, user);
    }
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(): Promise<void> {
    if (!this.#repository) return;
    const dbUsers = await this.#repository.findByAccountId('' as never);
    for (const dbUser of dbUsers) {
      if (this.#users.has(dbUser.id as UserId)) continue;
      const userRecord: UserRecord = {
        id: dbUser.id as UserId,
        accountId: dbUser.accountId,
        username: dbUser.email.split('@')[0],
        email: dbUser.email,
        displayName: dbUser.fullName,
        status: dbUser.isActive ? 'active' : 'inactive',
        staffId: '' as never,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
        passwordHash: dbUser.passwordHash,
        roleCodes: []
      };
      this.#users.set(userRecord.id, userRecord);
      this.#usersByUsername.set(userRecord.username, userRecord);
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

  public async verifyPassword(user: UserRecord, password: string): Promise<boolean> {
    return comparePassword(password, user.passwordHash);
  }

  public async create(input: {
    readonly username: string;
    readonly email: string;
    readonly password: string;
    readonly displayName?: string;
    readonly roleCode?: string;
    readonly status?: 'active' | 'inactive';
  }): Promise<UserSummary> {
    if (this.#usersByUsername.has(input.username)) {
      throw new Error('Username already exists');
    }
    const now = nowIso();
    const id = ('user_' + Math.random().toString(36).slice(2, 10)) as UserId;
    const passwordHash = await hashPassword(input.password);
    const user: UserRecord = {
      id,
      accountId: 'acc_cvg_demo' as AccountId,
      username: input.username,
      email: input.email,
      passwordHash,
      displayName: input.displayName || input.username,
      roleCodes: input.roleCode ? [input.roleCode] : [],
      status: input.status || 'active',
      createdAt: now,
      updatedAt: now
    };
    this.#users.set(id, user);
    this.#usersByUsername.set(user.username, user);

    if (this.#repository) {
      await this.#repository.create({
        id,
        accountId: user.accountId,
        email: user.email,
        passwordHash: user.passwordHash,
        fullName: user.displayName,
        isActive: user.status === 'active',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    }

    return stripSecrets(user);
  }

  public async update(
    userId: UserId,
    changes: {
      readonly displayName?: string;
      readonly email?: string;
      readonly status?: 'active' | 'inactive';
    }
  ): Promise<UserSummary> {
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

    if (this.#repository) {
      await this.#repository.update({
        id: updated.id,
        accountId: updated.accountId,
        email: updated.email,
        passwordHash: updated.passwordHash,
        fullName: updated.displayName,
        isActive: updated.status === 'active',
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      });
    }

    return stripSecrets(updated);
  }
}

function stripSecrets(user: UserRecord): UserSummary {
  const { passwordHash: _passwordHash, roleCodes: _roleCodes, ...summary } = user;
  return summary;
}

export {
  DatabaseUsersRepository,
  type UsersRepository
} from './repositories/database-users.repository.js';

export { createSeedUsers };
