import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery, withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type {
  AccountId,
  UserId
} from '@cvg-his-v2/shared-types';

export interface UserRecord {
  readonly id: UserId;
  readonly accountId: AccountId;
  readonly username?: string;
  readonly roleCode?: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly fullName: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UsersRepository {
  create(user: UserRecord): Promise<void>;
  update(user: UserRecord): Promise<void>;
  upgradePasswordHash(input: UpgradePasswordHashInput): Promise<boolean>;
  findById(id: UserId, accountId?: AccountId): Promise<UserRecord | null>;
  findByUsername(accountId: AccountId, username: string): Promise<UserRecord | null>;
  findByEmail(accountId: AccountId, email: string): Promise<UserRecord | null>;
  findAll(): Promise<readonly UserRecord[]>;
  findRoleCodesByUserId(id: UserId, accountId?: AccountId): Promise<readonly string[]>;
  findByAccountId(accountId: AccountId): Promise<readonly UserRecord[]>;
}

export interface UpgradePasswordHashInput {
  readonly userId: UserId;
  readonly accountId: AccountId;
  readonly expectedPasswordHash: string;
  readonly passwordHash: string;
}

export class DatabaseUsersRepository implements UsersRepository {
  async create(user: UserRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      let roleId: string | undefined;
      if (user.roleCode) {
        const role = await client.query<{ id: string }>('SELECT id FROM roles WHERE name = $1', [
          user.roleCode
        ]);
        roleId = role.rows[0]?.id;
        if (!roleId) {
          throw new Error(`Role not found: ${user.roleCode}`);
        }
      }
      await client.query(
        `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [user.id, user.accountId, user.username, user.email, user.passwordHash, user.fullName,
         user.isActive, new Date(user.createdAt), new Date(user.updatedAt)]
      );
      if (roleId) {
        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [
          user.id,
          roleId
        ]);
      }
    });
  }

  async update(user: UserRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `UPDATE users SET username = $3, email = $4, password_hash = $5, full_name = $6, is_active = $7, updated_at = $8
         WHERE id = $1 AND account_id = $2`,
        [
          user.id,
          user.accountId,
          user.username,
          user.email,
          user.passwordHash,
          user.fullName,
          user.isActive,
          new Date(user.updatedAt)
        ]
      );
    });
  }

  async upgradePasswordHash(input: UpgradePasswordHashInput): Promise<boolean> {
    return withTenantQueryExplicit(getPool(), input.accountId, async (client) => {
      const result = await client.query(
        `UPDATE users
         SET password_hash = $4, updated_at = NOW()
         WHERE id = $1 AND account_id = $2 AND password_hash = $3
         RETURNING id`,
        [
          input.userId,
          input.accountId,
          input.expectedPasswordHash,
          input.passwordHash
        ]
      );
      return result.rowCount === 1;
    });
  }

  async findById(id: UserId, accountId?: AccountId): Promise<UserRecord | null> {
    const query = async (client: { query: typeof getPool.prototype.query }) => {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    };
    return accountId
      ? withTenantQueryExplicit(getPool(), accountId, query)
      : withTenantQuery(getPool(), query);
  }

  async findByUsername(accountId: AccountId, username: string): Promise<UserRecord | null> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        'SELECT * FROM users WHERE account_id = $1 AND username = $2 LIMIT 1',
        [accountId, username]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findByEmail(accountId: AccountId, email: string): Promise<UserRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM users WHERE account_id = $1 AND email = $2', [accountId, email]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findAll(): Promise<readonly UserRecord[]> {
    const accounts = await getPool().query<{ id: string }>('SELECT id::text FROM accounts');
    const users = await Promise.all(
      accounts.rows.map(({ id }) =>
        withTenantQueryExplicit(getPool(), id, async (client) => {
          const result = await client.query('SELECT * FROM users ORDER BY full_name');
          return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
        })
      )
    );
    return users.flat();
  }

  async findRoleCodesByUserId(
    id: UserId,
    accountId?: AccountId
  ): Promise<readonly string[]> {
    const query = async (client: { query: typeof getPool.prototype.query }) =>
      client.query(
        `SELECT r.name
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         JOIN users u ON u.id = ur.user_id
         WHERE ur.user_id = $1 AND ($2::uuid IS NULL OR u.account_id = $2)
         ORDER BY r.name`,
        [id, accountId ?? null]
      );
    const result = accountId
      ? await withTenantQueryExplicit(getPool(), accountId, query)
      : await query(getPool());
    return result.rows.map((row: Record<string, unknown>) => row.name as string);
  }

  async findByAccountId(accountId: AccountId): Promise<readonly UserRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM users WHERE account_id = $1 ORDER BY full_name', [accountId]);
      return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    });
  }

  private mapRow(row: Record<string, unknown>): UserRecord {
    return {
      id: row.id as UserId,
      accountId: row.account_id as AccountId,
      username: row.username as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      fullName: row.full_name as string,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
