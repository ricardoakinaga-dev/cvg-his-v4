import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery, withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type {
  AccountId,
  UserId
} from '@cvg-his-v2/shared-types';

export interface UserRecord {
  readonly id: UserId;
  readonly accountId: AccountId;
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
  findById(id: UserId): Promise<UserRecord | null>;
  findByEmail(accountId: AccountId, email: string): Promise<UserRecord | null>;
  findByLogin(accountSlug: string, username: string): Promise<UserRecord | null>;
  findAll(): Promise<readonly UserRecord[]>;
  findRoleCodesByUserId(id: UserId, accountId?: AccountId): Promise<readonly string[]>;
  findByAccountId(accountId: AccountId): Promise<readonly UserRecord[]>;
  resolveAccountIdBySlug?(accountSlug: string): Promise<AccountId | null>;
}

export class DatabaseUsersRepository implements UsersRepository {
  async resolveAccountIdBySlug(accountSlug: string): Promise<AccountId | null> {
    const result = await getPool().query<{ id: string | null }>(
      'SELECT app.resolve_active_account_id($1) AS id',
      [accountSlug]
    );
    return (result.rows[0]?.id as AccountId | null | undefined) ?? null;
  }

  async create(user: UserRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `INSERT INTO users (id, account_id, email, password_hash, full_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user.id, user.accountId, user.email, user.passwordHash, user.fullName,
         user.isActive, new Date(user.createdAt), new Date(user.updatedAt)]
      );
    });
  }

  async update(user: UserRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `UPDATE users SET email = $2, password_hash = $3, full_name = $4, is_active = $5, updated_at = $6 WHERE id = $1`,
        [user.id, user.email, user.passwordHash, user.fullName, user.isActive, new Date(user.updatedAt)]
      );
    });
  }

  async findById(id: UserId): Promise<UserRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
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

  async findByLogin(accountSlug: string, username: string): Promise<UserRecord | null> {
    const accountId = await this.resolveAccountIdBySlug(accountSlug);
    if (!accountId) return null;

    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        `SELECT *
         FROM users
         WHERE account_id = $1
           AND (lower(email) = lower($2) OR lower(split_part(email, '@', 1)) = lower($2))
         LIMIT 1`,
        [accountId, username]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findAll(): Promise<readonly UserRecord[]> {
    const result = await getPool().query('SELECT * FROM users ORDER BY full_name');
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async findRoleCodesByUserId(
    id: UserId,
    accountId?: AccountId
  ): Promise<readonly string[]> {
    const result = accountId
      ? await withTenantQueryExplicit(getPool(), accountId, (client) =>
          client.query(
            `SELECT r.name
             FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             JOIN users u ON u.id = ur.user_id
             WHERE ur.user_id = $1
             ORDER BY r.name`,
            [id]
          )
        )
      : await withTenantQuery(getPool(), (client) =>
          client.query(
            `SELECT r.name
             FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             JOIN users u ON u.id = ur.user_id
             WHERE ur.user_id = $1
             ORDER BY r.name`,
            [id]
          )
        );
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
      email: row.email as string,
      passwordHash: row.password_hash as string,
      fullName: row.full_name as string,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
