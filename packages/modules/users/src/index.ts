import { createHash, scrypt, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId, UserSummary } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';
import type {
  UserRecord as RepositoryUserRecord,
  UsersRepository
} from './repositories/database-users.repository.js';

export interface UserRecord extends UserSummary {
  readonly passwordHash: string;
  readonly roleCodes: readonly string[];
  /** Omitted only by legacy in-memory fixtures; database materialization always sets it. */
  readonly principalKind?: 'human' | 'service';
  /** Omitted only by legacy in-memory fixtures; database materialization always sets it. */
  readonly interactiveLoginEnabled?: boolean;
}

export function isInteractiveHumanUser(user: UserRecord): boolean {
  return (
    (user.principalKind ?? 'human') === 'human' &&
    (user.interactiveLoginEnabled ?? true) === true &&
    user.status === 'active'
  );
}

export interface UsersServiceOptions {
  readonly repository?: UsersRepository;
  readonly seedUsersEnabled?: boolean;
}

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_LENGTH = 16;
const SEED_SALT = 'cvg-his-v2-seed-salt-v1';
const LEGACY_SHA256_PATTERN = /^[a-f0-9]{64}$/i;

const scryptAsync = promisify(scrypt);

/**
 * Seed users carry well-known credentials, so this must fail closed.
 *
 * An unset NODE_ENV is treated as untrusted rather than as development: a
 * deployment that simply forgets the variable would otherwise expose working
 * admin accounts with published passwords.
 */
function isSeedEnvironment(): boolean {
  const env = process.env.NODE_ENV;
  return env === 'development' || env === 'test';
}

function timingSafeEqualString(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_LENGTH);
  const key = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function comparePassword(password: string, passwordHash: string): Promise<boolean> {
  const parts = passwordHash.split(':');
  if (parts.length !== 2) {
    // Backward compatibility for legacy Drizzle seed values stored as plain SHA-256 hex.
    // Unsalted SHA-256 is not an acceptable password hash: these records should be
    // migrated to scrypt (see hashPassword) on the owner's next successful login.
    return timingSafeEqualString(createHash('sha256').update(password).digest('hex'), passwordHash);
  }
  const saltHex = parts[0];
  const hashHex = parts[1];

  if (saltHex === SEED_SALT && hashHex.startsWith('seed_')) {
    if (!isSeedEnvironment()) {
      return false;
    }
    return timingSafeEqualString(password, hashHex);
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
      roleCodes: ['admin'],
      principalKind: 'human',
      interactiveLoginEnabled: true
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
      roleCodes: ['reception'],
      principalKind: 'human',
      interactiveLoginEnabled: true
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
      roleCodes: ['auditor'],
      principalKind: 'human',
      interactiveLoginEnabled: true
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
      roleCodes: ['nurse'],
      principalKind: 'human',
      interactiveLoginEnabled: true
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
      roleCodes: ['veterinarian'],
      principalKind: 'human',
      interactiveLoginEnabled: true
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
      roleCodes: ['finance'],
      principalKind: 'human',
      interactiveLoginEnabled: true
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
      roleCodes: ['inventory'],
      principalKind: 'human',
      interactiveLoginEnabled: true
    }
  ];
}

export class UsersService {
  readonly #repository?: UsersRepository;
  readonly #users = new Map<UserId, UserRecord>();
  readonly #usersByUsername = new Map<string, UserRecord>();
  readonly #usersByAccountUsername = new Map<string, UserRecord>();
  readonly #ambiguousUsernames = new Set<string>();
  readonly #repositoryUserIds = new Set<UserId>();

  public constructor(
    options?: UsersServiceOptions,
    seedUsers: readonly UserRecord[] = createSeedUsers()
  ) {
    this.#repository = options?.repository;
    const seedEnabled = options?.seedUsersEnabled ?? isSeedEnvironment();
    if (seedEnabled) {
      for (const user of seedUsers) {
        this.#indexUser(user);
      }
    }
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(): Promise<void> {
    if (!this.#repository) return;
    const dbUsers = await this.#repository.findAll();
    for (const userId of this.#repositoryUserIds) {
      this.#removeUser(userId);
    }
    this.#repositoryUserIds.clear();
    for (const dbUser of dbUsers) {
      const user = await this.#materializeInteractiveUser(dbUser);
      if (user) {
        this.#indexRepositoryUser(user);
      }
    }
  }

  public list(): readonly UserSummary[] {
    return Array.from(this.#users.values()).map(stripSecrets);
  }

  public listForAccount(accountId: AccountId): readonly UserSummary[] {
    return Array.from(this.#users.values())
      .filter((user) => user.accountId === accountId)
      .map(stripSecrets);
  }

  public getOrThrow(userId: UserId): UserRecord {
    const user = this.#users.get(userId);
    if (!user) {
      throw new NotFoundError('User not found', { userId });
    }
    return user;
  }

  public getForAccountOrThrow(userId: UserId, accountId: AccountId): UserRecord {
    const user = this.getOrThrow(userId);
    if (user.accountId !== accountId) {
      throw new NotFoundError('User not found', { userId });
    }
    return user;
  }

  public findByUsername(username: string, accountId?: AccountId): UserRecord | undefined {
    if (accountId) {
      const user = this.#usersByAccountUsername.get(`${accountId}:${username}`);
      return user && isInteractiveHumanUser(user) ? user : undefined;
    }
    const user = this.#ambiguousUsernames.has(username)
      ? undefined
      : this.#usersByUsername.get(username);
    return user && isInteractiveHumanUser(user) ? user : undefined;
  }

  /**
   * Resolves the current repository value and refreshes the process-local index.
   * The synchronous lookup remains available for already-synchronized request paths.
   */
  public async resolveByUsername(
    username: string,
    accountId?: AccountId
  ): Promise<UserRecord | undefined> {
    if (!this.#repository) {
      return this.findByUsername(username, accountId);
    }

    if (!accountId) {
      await this.hydrateFromDatabase();
      return this.findByUsername(username);
    }

    const repositoryUser = await this.#repository.findByUsername(accountId, username);
    if (!repositoryUser) {
      const cached = this.#usersByAccountUsername.get(`${accountId}:${username}`);
      if (cached) this.#removeUser(cached.id);
      return undefined;
    }

    const user = await this.#materializeInteractiveUser(repositoryUser);
    if (!user) {
      this.#removeUser(repositoryUser.id);
      return undefined;
    }
    this.#indexRepositoryUser(user);
    return user;
  }

  /** Refreshes a user by id so authorization never depends on a stale local object. */
  public async resolveById(userId: UserId, accountId?: AccountId): Promise<UserRecord | undefined> {
    if (!this.#repository) {
      const cached = this.#users.get(userId);
      return cached && (!accountId || cached.accountId === accountId) ? cached : undefined;
    }

    const repositoryUser = await this.#repository.findById(userId, accountId);
    if (!repositoryUser || (accountId && repositoryUser.accountId !== accountId)) {
      this.#removeUser(userId);
      return undefined;
    }

    const user = await this.#materializeUser(repositoryUser);
    this.#indexRepositoryUser(user);
    return user;
  }

  public async verifyPassword(user: UserRecord, password: string): Promise<boolean> {
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid || !LEGACY_SHA256_PATTERN.test(user.passwordHash)) {
      return isValid;
    }

    const passwordHash = await hashPassword(password);
    const updatedUser: UserRecord = {
      ...user,
      passwordHash,
      updatedAt: nowIso()
    };
    if (!this.#repository) {
      this.#indexUser(updatedUser);
      return true;
    }

    const upgraded = await this.#repository.upgradePasswordHash({
      userId: user.id,
      accountId: user.accountId,
      expectedPasswordHash: user.passwordHash,
      passwordHash
    });
    if (upgraded) {
      this.#indexUser(updatedUser);
      return true;
    }

    // A failed compare-and-swap means the credential changed after validation.
    // Re-read and verify the current hash: concurrent upgrades of the same
    // password remain valid, while a concurrent password reset fails closed.
    const repositoryUser = await this.#repository.findById(user.id, user.accountId);
    if (!repositoryUser) {
      return false;
    }
    const currentUser = await this.#materializeUser(repositoryUser);
    this.#indexUser(currentUser);
    return comparePassword(password, currentUser.passwordHash);
  }

  public async create(input: {
    readonly accountId: AccountId;
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
    const id = randomUUID() as UserId;
    const passwordHash = await hashPassword(input.password);
    const user: UserRecord = {
      id,
      accountId: input.accountId,
      username: input.username,
      email: input.email,
      passwordHash,
      displayName: input.displayName || input.username,
      roleCodes: input.roleCode ? [input.roleCode] : [],
      principalKind: 'human',
      interactiveLoginEnabled: true,
      status: input.status || 'active',
      createdAt: now,
      updatedAt: now
    };
    if (this.#repository) {
      await this.#repository.create({
        id,
        accountId: user.accountId,
        username: user.username,
        roleCode: input.roleCode,
        email: user.email,
        passwordHash: user.passwordHash,
        fullName: user.displayName,
        isActive: user.status === 'active',
        principalKind: user.principalKind,
        interactiveLoginEnabled: user.interactiveLoginEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    }

    this.#indexUser(user);

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

    if (this.#repository) {
      await this.#repository.update({
        id: updated.id,
        accountId: updated.accountId,
        username: updated.username,
        email: updated.email,
        passwordHash: updated.passwordHash,
        fullName: updated.displayName,
        isActive: updated.status === 'active',
        principalKind: updated.principalKind,
        interactiveLoginEnabled: updated.interactiveLoginEnabled,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      });
    }

    this.#indexUser(updated);

    return stripSecrets(updated);
  }

  public async updateForAccount(
    userId: UserId,
    accountId: AccountId,
    changes: {
      readonly displayName?: string;
      readonly email?: string;
      readonly status?: 'active' | 'inactive';
    }
  ): Promise<UserSummary> {
    this.getForAccountOrThrow(userId, accountId);
    return this.update(userId, changes);
  }

  async #materializeInteractiveUser(
    repositoryUser: RepositoryUserRecord
  ): Promise<UserRecord | undefined> {
    const principalKind = repositoryUser.principalKind ?? 'human';
    const interactiveLoginEnabled = repositoryUser.interactiveLoginEnabled ?? true;
    if (
      principalKind !== 'human' ||
      interactiveLoginEnabled !== true ||
      repositoryUser.isActive !== true
    ) {
      return undefined;
    }
    return this.#materializeUser(repositoryUser);
  }

  async #materializeUser(repositoryUser: RepositoryUserRecord): Promise<UserRecord> {
    const principalKind = repositoryUser.principalKind ?? 'human';
    const interactiveLoginEnabled = repositoryUser.interactiveLoginEnabled ?? true;
    const roleCodes = await this.#repository!.findRoleCodesByUserId(
      repositoryUser.id,
      repositoryUser.accountId
    );
    return {
      id: repositoryUser.id,
      accountId: repositoryUser.accountId,
      username: repositoryUser.username || repositoryUser.email.split('@')[0],
      email: repositoryUser.email,
      displayName: repositoryUser.fullName,
      status: repositoryUser.isActive ? 'active' : 'inactive',
      staffId: '' as never,
      createdAt: repositoryUser.createdAt,
      updatedAt: repositoryUser.updatedAt,
      passwordHash: repositoryUser.passwordHash,
      roleCodes,
      principalKind,
      interactiveLoginEnabled
    };
  }

  #indexRepositoryUser(user: UserRecord): void {
    this.#repositoryUserIds.add(user.id);
    this.#indexUser(user);
  }

  #removeUser(userId: UserId): void {
    const user = this.#users.get(userId);
    if (!user) return;
    this.#users.delete(userId);
    this.#usersByAccountUsername.delete(`${user.accountId}:${user.username}`);
    this.#repositoryUserIds.delete(userId);
    this.#rebuildUsernameIndex(user.username);
  }

  #indexUser(user: UserRecord): void {
    const previous = this.#users.get(user.id);
    if (previous) {
      this.#usersByAccountUsername.delete(`${previous.accountId}:${previous.username}`);
    }
    this.#users.set(user.id, user);
    if (isInteractiveHumanUser(user)) {
      this.#usersByAccountUsername.set(`${user.accountId}:${user.username}`, user);
    }
    if (previous && previous.username !== user.username) {
      this.#rebuildUsernameIndex(previous.username);
    }
    this.#rebuildUsernameIndex(user.username);
  }

  #rebuildUsernameIndex(username: string): void {
    const candidates = Array.from(this.#users.values()).filter(
      (candidate) => candidate.username === username && isInteractiveHumanUser(candidate)
    );
    this.#usersByUsername.delete(username);
    this.#ambiguousUsernames.delete(username);
    if (candidates.length === 1) {
      this.#usersByUsername.set(username, candidates[0]);
    } else if (candidates.length > 1) {
      this.#ambiguousUsernames.add(username);
    }
  }
}

function stripSecrets(user: UserRecord): UserSummary {
  const {
    passwordHash: _passwordHash,
    roleCodes: _roleCodes,
    principalKind: _principalKind,
    interactiveLoginEnabled: _interactiveLoginEnabled,
    ...summary
  } = user;
  return summary;
}

export {
  DatabaseUsersRepository,
  type UpgradePasswordHashInput,
  type UsersRepository
} from './repositories/database-users.repository.js';

export { createSeedUsers };
