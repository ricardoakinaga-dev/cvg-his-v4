import type { SessionId, SessionSummary } from '@cvg-his-v2/shared-types';

export interface SessionRepository {
  create(session: SessionSummary): Promise<void>;
  update(session: SessionSummary | UpdateSessionParams): Promise<void>;
  findById(id: SessionId): Promise<SessionSummary | null>;
  findByUserId(userId: string): Promise<readonly SessionSummary[]>;
  delete(id: SessionId): Promise<void>;
}

export interface CreateSessionParams {
  readonly sessionId: SessionId;
  readonly userId: string;
  readonly accountId: string;
  readonly roleCodes: readonly string[];
  readonly createdAt: string;
  readonly authTime: string;
  readonly expiresAt: string;
  readonly refreshExpiresAt: string;
  readonly active: boolean;
}

export interface UpdateSessionParams {
  readonly sessionId: SessionId;
  readonly refreshNonce?: string;
  readonly expiresAt?: string;
  readonly refreshExpiresAt?: string;
  readonly active?: boolean;
  readonly revokedAt?: string;
}
