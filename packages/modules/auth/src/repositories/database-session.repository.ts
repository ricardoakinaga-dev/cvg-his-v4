import { eq } from 'drizzle-orm';
import { getPool, type DatabaseClient } from '@cvg-his-v2/shared-database';
import { sessions } from '@cvg-his-v2/shared-database';
import { withTenantQuery, withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { SessionId, UserId, AccountId } from '@cvg-his-v2/shared-types';
import type {
  PersistedSessionRecord,
  SessionRepository,
  UpdateSessionParams
} from './session.repository.js';

export class DatabaseSessionRepository implements SessionRepository {
  readonly #db: DatabaseClient;
  readonly #tenantExecutor: <T>(
    accountId: string | undefined,
    operation: () => Promise<T>
  ) => Promise<T>;

  public constructor(
    db: DatabaseClient,
    options: {
      readonly tenantExecutor?: <T>(
        accountId: string | undefined,
        operation: () => Promise<T>
      ) => Promise<T>;
    } = {}
  ) {
    this.#db = db;
    this.#tenantExecutor =
      options.tenantExecutor ??
      (<T>(accountId: string | undefined, operation: () => Promise<T>) =>
        accountId
          ? withTenantQueryExplicit(getPool(), accountId, () => operation())
          : withTenantQuery(getPool(), () => operation()));
  }

  public async create(session: PersistedSessionRecord): Promise<void> {
    await this.#tenantExecutor(session.accountId, async () => {
      await this.#db.insert(sessions).values({
        id: session.sessionId,
        accountId: session.accountId,
        userId: session.userId,
        tokenHash: '', // Will be updated when tokens are created
        refreshTokenHash: session.refreshNonce,
        expiresAt: new Date(session.expiresAt),
        refreshExpiresAt: new Date(session.refreshExpiresAt),
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.createdAt)
      });
    });
  }

  public async update(session: PersistedSessionRecord | UpdateSessionParams): Promise<void> {
    if ('active' in session && session.active === false) {
      await this.delete(
        session.sessionId,
        'accountId' in session ? session.accountId : undefined
      );
      return;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      ...('expiresAt' in session && session.expiresAt
        ? { expiresAt: new Date(session.expiresAt) }
        : {}),
      ...('refreshExpiresAt' in session && session.refreshExpiresAt
        ? { refreshExpiresAt: new Date(session.refreshExpiresAt) }
        : {}),
      ...('refreshNonce' in session && session.refreshNonce
        ? { refreshTokenHash: session.refreshNonce }
        : {})
    };
    const accountId = 'accountId' in session ? session.accountId : undefined;
    await this.#tenantExecutor(accountId, async () => {
      await this.#db.update(sessions).set(updateData).where(eq(sessions.id, session.sessionId));
    });
  }

  public async findById(id: SessionId): Promise<PersistedSessionRecord | null> {
    const result = await this.#tenantExecutor(undefined, () =>
      this.#db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    );

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      sessionId: row.id as SessionId,
      userId: row.userId as UserId,
      accountId: row.accountId as AccountId,
      createdAt: row.createdAt.toISOString(),
      authTime: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      refreshExpiresAt: row.refreshExpiresAt.toISOString(),
      active: true,
      roleCodes: [],
      refreshNonce: row.refreshTokenHash ?? ''
    };
  }

  public async findByUserId(
    userId: string,
    accountId?: string
  ): Promise<readonly PersistedSessionRecord[]> {
    const result = await this.#tenantExecutor(accountId, () =>
      this.#db.select().from(sessions).where(eq(sessions.userId, userId))
    );

    return result.map((row) => ({
      sessionId: row.id as SessionId,
      userId: row.userId as UserId,
      accountId: row.accountId as AccountId,
      createdAt: row.createdAt.toISOString(),
      authTime: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      refreshExpiresAt: row.refreshExpiresAt.toISOString(),
      active: true,
      roleCodes: [],
      refreshNonce: row.refreshTokenHash ?? ''
    }));
  }

  public async delete(id: SessionId, accountId?: string): Promise<void> {
    await this.#tenantExecutor(accountId, async () => {
      await this.#db.delete(sessions).where(eq(sessions.id, id));
    });
  }
}
