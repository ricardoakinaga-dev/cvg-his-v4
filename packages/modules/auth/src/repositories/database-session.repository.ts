import { and, eq, isNull, sql } from 'drizzle-orm';
import { boolean, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { isInteractiveHumanUser, type UserRecord } from '@cvg-his-v2/module-users';
import { sessions } from '@cvg-his-v2/shared-database';
import type { SessionId, UserId, AccountId } from '@cvg-his-v2/shared-types';
import type {
  AuthoritativeSessionLookup,
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

  /**
   * Loads the session and the authoritative interactive user projection in a
   * single database round trip. The query intentionally keeps the same
   * fail-closed principal predicate as findById and resolveInteractiveById.
   */
  public async findByIdWithUser(
    id: SessionId,
    accountId: AccountId
  ): Promise<AuthoritativeSessionLookup | null> {
    const result = await this.#db.execute(sql`
      SELECT
        s.id AS session_id,
        s.account_id AS session_account_id,
        s.user_id AS session_user_id,
        s.auth_time AS session_auth_time,
        s.expires_at AS session_expires_at,
        s.refresh_expires_at AS session_refresh_expires_at,
        s.active AS session_active,
        s.role_codes AS session_role_codes,
        s.refresh_nonce AS session_refresh_nonce,
        s.revoked_at AS session_revoked_at,
        s.created_at AS session_created_at,
        s.updated_at AS session_updated_at,
        u.id AS user_id,
        u.account_id AS user_account_id,
        u.username AS user_username,
        u.email AS user_email,
        u.password_hash AS user_password_hash,
        u.full_name AS user_full_name,
        u.is_active AS user_is_active,
        u.principal_kind AS user_principal_kind,
        u.interactive_login_enabled AS user_interactive_login_enabled,
        u.created_at AS user_created_at,
        u.updated_at AS user_updated_at,
        COALESCE(
          (
            SELECT array_agg(r.name ORDER BY r.name)
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = u.id
          ),
          ARRAY[]::text[]
        ) AS user_role_codes
      FROM sessions s
      JOIN users u ON u.id = s.user_id AND u.account_id = s.account_id
      WHERE s.id = ${id}
        AND s.account_id = ${accountId}
        AND u.principal_kind = 'human'
        AND u.interactive_login_enabled = true
        AND u.is_active = true
      LIMIT 1
    `);

    const row = (result.rows as unknown as readonly Record<string, unknown>[])[0];
    if (!row) return null;

    const user = this.mapAuthoritativeUser(row);
    if (!isInteractiveHumanUser(user)) return null;

    return {
      session: {
        sessionId: row.session_id as SessionId,
        userId: row.session_user_id as UserId,
        accountId: row.session_account_id as AccountId,
        createdAt: toIso(row.session_created_at),
        authTime: toIso(row.session_auth_time),
        expiresAt: toIso(row.session_expires_at),
        refreshExpiresAt: toIso(row.session_refresh_expires_at),
        active: row.session_active === true,
        roleCodes: asStringArray(row.session_role_codes),
        refreshNonce: String(row.session_refresh_nonce ?? ''),
        revokedAt: row.session_revoked_at ? toIso(row.session_revoked_at) : undefined
      },
      user
    };
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

  private mapAuthoritativeUser(row: Record<string, unknown>): UserRecord {
    const email = String(row.user_email ?? '');
    return {
      id: row.user_id as UserId,
      accountId: row.user_account_id as AccountId,
      username: String(row.user_username ?? email.split('@')[0]),
      email,
      displayName: String(row.user_full_name ?? ''),
      status: row.user_is_active === true ? 'active' : 'inactive',
      createdAt: toIso(row.user_created_at),
      updatedAt: toIso(row.user_updated_at),
      passwordHash: String(row.user_password_hash ?? ''),
      roleCodes: asStringArray(row.user_role_codes),
      principalKind: row.user_principal_kind as 'human' | 'service',
      interactiveLoginEnabled: row.user_interactive_login_enabled === true
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

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function toIso(value: unknown): string {
  return new Date(value as string | number | Date).toISOString();
}
