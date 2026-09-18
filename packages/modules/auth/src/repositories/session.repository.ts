import type { AccountId, SessionId, SessionSummary } from '@cvg-his-v2/shared-types';
import type { UserRecord } from '@cvg-his-v2/module-users';

/**
 * Snapshot used by the authoritative authentication path. Implementations may
 * load the session and its interactive user in one tenant-scoped query while
 * retaining the repository interface fallback for non-database adapters.
 */
export interface AuthoritativeSessionLookup {
  readonly session: PersistedSessionRecord;
  readonly user: UserRecord;
}

export interface SessionRepository {
  create(session: PersistedSessionRecord): Promise<void>;
  update(session: PersistedSessionRecord | UpdateSessionParams): Promise<void>;
  rotateRefreshNonce(params: RotateRefreshNonceParams): Promise<PersistedSessionRecord | null>;
  findById(id: SessionId): Promise<PersistedSessionRecord | null>;
  /** Optional single-round-trip session + user projection for DB-backed auth. */
  findByIdWithUser?(
    id: SessionId,
    accountId: AccountId
  ): Promise<AuthoritativeSessionLookup | null>;
  findByUserId(userId: string): Promise<readonly PersistedSessionRecord[]>;
  delete(id: SessionId): Promise<void>;
}

export interface PersistedSessionRecord extends SessionSummary {
  readonly roleCodes: readonly string[];
  readonly refreshNonce: string;
  readonly revokedAt?: string;
}

export interface UpdateSessionParams {
  readonly sessionId: SessionId;
  readonly refreshNonce?: string;
  readonly expiresAt?: string;
  readonly refreshExpiresAt?: string;
  readonly active?: boolean;
  readonly revokedAt?: string;
}

export interface RotateRefreshNonceParams {
  readonly sessionId: SessionId;
  readonly expectedRefreshNonce: string;
  readonly refreshNonce: string;
  readonly expiresAt: string;
  readonly refreshExpiresAt: string;
}
