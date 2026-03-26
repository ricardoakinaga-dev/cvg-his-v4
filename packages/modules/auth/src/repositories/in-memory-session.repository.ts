import type { SessionId, SessionSummary } from '@cvg-his-v2/shared-types';
import type { SessionRepository } from './session.repository.js';

export class InMemorySessionRepository implements SessionRepository {
  readonly #sessions = new Map<SessionId, SessionSummary>();

  async create(session: SessionSummary): Promise<void> {
    this.#sessions.set(session.sessionId, session);
  }

  async update(
    session: SessionSummary | { sessionId: SessionId; active?: boolean; expiresAt?: string }
  ): Promise<void> {
    const existing = this.#sessions.get(session.sessionId);
    if (!existing) {
      throw new Error(`Session not found: ${session.sessionId}`);
    }
    this.#sessions.set(session.sessionId, { ...existing, ...session } as SessionSummary);
  }

  async findById(id: SessionId): Promise<SessionSummary | null> {
    return this.#sessions.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<readonly SessionSummary[]> {
    return Array.from(this.#sessions.values()).filter((s) => s.userId === userId);
  }

  async delete(id: SessionId): Promise<void> {
    this.#sessions.delete(id);
  }

  // Helper for testing
  clear(): void {
    this.#sessions.clear();
  }

  getAll(): readonly SessionSummary[] {
    return Array.from(this.#sessions.values());
  }
}
