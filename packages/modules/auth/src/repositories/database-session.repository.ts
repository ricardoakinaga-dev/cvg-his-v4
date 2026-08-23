import { and, eq, isNull, sql } from 'drizzle-orm';
import { boolean, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { sessions } from '@cvg-his-v2/shared-database';
import type { SessionId, UserId, AccountId } from '@cvg-his-v2/shared-types';
import type {
  PersistedSessionRecord,
  RotateRefreshNonceParams,
  SessionRepository,
  UpdateSessionParams
} from './session.repository.js';

const sessionUsers = pgTable('users', {
  id: uuid('id').notNull(),
  accountId: uuid('account_id').notNull(),
  isActive: boolean('is_active').notNull(),
  principalKind: varchar('principal_kind', { length: 16 }).$type<'human' | 'service'>().notNull(),
  interactiveLoginEnabled: boolean('interactive_login_enabled').notNull()
});

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
      authTime: new Date(session.authTime),
      expiresAt: new Date(session.expiresAt),
      refreshExpiresAt: new Date(session.refreshExpiresAt),
      active: session.active,
      roleCodes: [...session.roleCodes],
      refreshNonce: session.refreshNonce,
      revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.createdAt)
    });
  }

  public async update(session: PersistedSessionRecord | UpdateSessionParams): Promise<void> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if ('expiresAt' in session && session.expiresAt) {
      updateData.expiresAt = new Date(session.expiresAt);
    }
    if ('refreshNonce' in session && session.refreshNonce) {
      updateData.refreshNonce = session.refreshNonce;
    }
    if ('refreshExpiresAt' in session && session.refreshExpiresAt) {
      updateData.refreshExpiresAt = new Date(session.refreshExpiresAt);
    }
    if ('active' in session && session.active !== undefined) {
      updateData.active = session.active;
    }
    if ('revokedAt' in session && session.revokedAt) {
      updateData.revokedAt = new Date(session.revokedAt);
    }
    if ('roleCodes' in session) {
      updateData.roleCodes = [...session.roleCodes];
    }
    await this.#db.update(sessions).set(updateData).where(eq(sessions.id, session.sessionId));
  }

  public async rotateRefreshNonce(
    params: RotateRefreshNonceParams
  ): Promise<PersistedSessionRecord | null> {
    const result = await this.#db
      .update(sessions)
      .set({
        refreshNonce: params.refreshNonce,
        expiresAt: new Date(params.expiresAt),
        refreshExpiresAt: new Date(params.refreshExpiresAt),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(sessions.id, params.sessionId),
          eq(sessions.refreshNonce, params.expectedRefreshNonce),
          eq(sessions.active, true),
          isNull(sessions.revokedAt),
          this.interactiveHumanSessionPredicate()
        )
      )
      .returning();

    return result[0] ? this.mapRow(result[0]) : null;
  }

  public async findById(id: SessionId): Promise<PersistedSessionRecord | null> {
    const result = await this.#db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), this.interactiveHumanSessionPredicate()))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRow(result[0]);
  }

  public async findByUserId(userId: string): Promise<readonly PersistedSessionRecord[]> {
    const result = await this.#db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), this.interactiveHumanSessionPredicate()));

    return result.map((row) => this.mapRow(row));
  }

  private mapRow(row: typeof sessions.$inferSelect): PersistedSessionRecord {
    return {
      sessionId: row.id as SessionId,
      userId: row.userId as UserId,
      accountId: row.accountId as AccountId,
      createdAt: row.createdAt.toISOString(),
      authTime: row.authTime.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      refreshExpiresAt: row.refreshExpiresAt.toISOString(),
      active: row.active,
      roleCodes: row.roleCodes as readonly string[],
      refreshNonce: row.refreshNonce,
      revokedAt: row.revokedAt?.toISOString()
    };
  }

  private interactiveHumanSessionPredicate() {
    return sql`EXISTS (
      SELECT 1
      FROM ${sessionUsers}
      WHERE ${sessionUsers.id} = ${sessions.userId}
        AND ${sessionUsers.accountId} = ${sessions.accountId}
        AND ${sessionUsers.principalKind} = 'human'
        AND ${sessionUsers.interactiveLoginEnabled} = true
        AND ${sessionUsers.isActive} = true
    )`;
  }

  public async delete(id: SessionId): Promise<void> {
    await this.#db.delete(sessions).where(eq(sessions.id, id));
  }
}
