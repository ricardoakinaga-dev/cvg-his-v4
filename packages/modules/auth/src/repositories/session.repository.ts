import type { SessionId, SessionSummary } from '@cvg-his-v2/shared-types';

export interface SessionRepository {
  create(session: PersistedSessionRecord): Promise<void>;
  update(session: PersistedSessionRecord | UpdateSessionParams): Promise<void>;
  findById(id: SessionId): Promise<PersistedSessionRecord | null>;
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
