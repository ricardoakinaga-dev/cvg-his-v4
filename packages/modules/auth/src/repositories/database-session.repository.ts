import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { sessions } from '@cvg-his-v2/shared-database';
import type { SessionId, UserId, AccountId } from '@cvg-his-v2/shared-types';
import type {
  PersistedSessionRecord,
  SessionRepository,
  UpdateSessionParams
} from './session.repository.js';

export class DatabaseSessionRepository implements SessionRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(session: PersistedSessionRecord): Promise<void> {
    await this.#db.insert(sessions).values({
      id: session.sessionId,
      accountId: session.accountId,
      userId: session.userId,
      tokenHash: '', // Will be updated when tokens are created
      refreshTokenHash: session.refreshNonce,
      expiresAt: new Date(session.expiresAt),
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.createdAt)
    });
  }

  public async update(session: PersistedSessionRecord | UpdateSessionParams): Promise<void> {
    if ('active' in session && session.active === false) {
      await this.delete(session.sessionId);
      return;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if ('expiresAt' in session && session.expiresAt) {
      updateData.expiresAt = new Date(session.expiresAt);
    }
    if ('refreshNonce' in session && session.refreshNonce) {
      updateData.refreshTokenHash = session.refreshNonce;
    }
    await this.#db.update(sessions).set(updateData).where(eq(sessions.id, session.sessionId));
  }

  public async findById(id: SessionId): Promise<PersistedSessionRecord | null> {
    const result = await this.#db.select().from(sessions).where(eq(sessions.id, id)).limit(1);

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
      refreshExpiresAt: row.expiresAt.toISOString(),
      active: true,
      roleCodes: [],
      refreshNonce: row.refreshTokenHash ?? ''
    };
  }

  public async findByUserId(userId: string): Promise<readonly PersistedSessionRecord[]> {
    const result = await this.#db.select().from(sessions).where(eq(sessions.userId, userId));

    return result.map((row) => ({
      sessionId: row.id as SessionId,
      userId: row.userId as UserId,
      accountId: row.accountId as AccountId,
      createdAt: row.createdAt.toISOString(),
      authTime: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      refreshExpiresAt: row.expiresAt.toISOString(),
      active: true,
      roleCodes: [],
      refreshNonce: row.refreshTokenHash ?? ''
    }));
  }

  public async delete(id: SessionId): Promise<void> {
    await this.#db.delete(sessions).where(eq(sessions.id, id));
  }
}
