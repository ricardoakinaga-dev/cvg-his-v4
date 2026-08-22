import type { SessionId } from '@cvg-his-v2/shared-types';
import type {
  PersistedSessionRecord,
  RotateRefreshNonceParams,
  SessionRepository,
  UpdateSessionParams
} from './session.repository.js';

export class InMemorySessionRepository implements SessionRepository {
  readonly #sessions = new Map<SessionId, PersistedSessionRecord>();

  async create(session: PersistedSessionRecord): Promise<void> {
    this.#sessions.set(session.sessionId, session);
  }

  async update(session: PersistedSessionRecord | UpdateSessionParams): Promise<void> {
    const existing = this.#sessions.get(session.sessionId);
    if (!existing) {
      throw new Error(`Session not found: ${session.sessionId}`);
    }
    this.#sessions.set(session.sessionId, { ...existing, ...session } as PersistedSessionRecord);
  }

  async rotateRefreshNonce(
    params: RotateRefreshNonceParams
  ): Promise<PersistedSessionRecord | null> {
    const existing = this.#sessions.get(params.sessionId);
    if (
      !existing
      || !existing.active
      || existing.revokedAt
      || existing.refreshNonce !== params.expectedRefreshNonce
    ) {
      return null;
    }

    const rotated: PersistedSessionRecord = {
      ...existing,
      refreshNonce: params.refreshNonce,
      expiresAt: params.expiresAt,
      refreshExpiresAt: params.refreshExpiresAt
    };
    this.#sessions.set(params.sessionId, rotated);
    return rotated;
  }

  async findById(id: SessionId): Promise<PersistedSessionRecord | null> {
    return this.#sessions.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<readonly PersistedSessionRecord[]> {
    return Array.from(this.#sessions.values()).filter((s) => s.userId === userId);
  }

  async delete(id: SessionId): Promise<void> {
    this.#sessions.delete(id);
  }

  // Helper for testing
  clear(): void {
    this.#sessions.clear();
  }

  getAll(): readonly PersistedSessionRecord[] {
    return Array.from(this.#sessions.values());
  }
}
