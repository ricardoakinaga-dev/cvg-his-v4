import type {
  IssueMfaLoginChallengeInput,
  MfaLoginChallengeKey,
  MfaLoginChallengeRecord,
  MfaLoginChallengeRepository
} from './mfa-login-challenge.repository.js';

export class InMemoryMfaLoginChallengeRepository implements MfaLoginChallengeRepository {
  readonly #records = new Map<string, MfaLoginChallengeRecord>();
  #issueCount = 0;
  #consumeCount = 0;

  async issue(input: IssueMfaLoginChallengeInput): Promise<MfaLoginChallengeRecord> {
    const now = Date.now();
    const existing = this.#records.get(this.#recordKey(input.accountId, input.userId));
    const lockActive = existing?.lockedUntil !== undefined && existing.lockedUntil > now;
    const windowActive =
      existing?.lockedUntil === undefined &&
      existing !== undefined &&
      existing.attemptCount > 0 &&
      existing.attemptWindowStartedAt + existing.trackingWindowMs > now;
    const preserveFailures = lockActive || windowActive;
    const record: MfaLoginChallengeRecord = {
      accountId: input.accountId,
      userId: input.userId,
      generation: input.generation,
      expiresAt: now + input.ttlMs,
      attemptWindowStartedAt: preserveFailures
        ? existing!.attemptWindowStartedAt
        : now,
      attemptCount: preserveFailures ? existing!.attemptCount : 0,
      maxAttempts: preserveFailures
        ? Math.max(existing!.maxAttempts, input.maxAttempts)
        : input.maxAttempts,
      trackingWindowMs: preserveFailures
        ? existing!.trackingWindowMs
        : input.trackingWindowMs,
      lockoutDurationMs: preserveFailures
        ? existing!.lockoutDurationMs
        : input.lockoutDurationMs,
      ...(lockActive ? { lockedUntil: existing!.lockedUntil } : {})
    };
    this.#records.set(this.#recordKey(input.accountId, input.userId), record);
    this.#issueCount += 1;
    return { ...record };
  }

  async inspect(
    key: MfaLoginChallengeKey,
    now: number
  ): Promise<MfaLoginChallengeRecord | null> {
    const record = this.#findCurrent(key, now);
    return record ? { ...record } : null;
  }

  async reserveAttempt(
    key: MfaLoginChallengeKey,
    now: number
  ): Promise<MfaLoginChallengeRecord | null> {
    const record = this.#findCurrent(key, now);
    if (
      !record ||
      (record.lockedUntil !== undefined && record.lockedUntil > now) ||
      record.attemptCount >= record.maxAttempts
    ) return null;
    const attemptCount = record.attemptCount + 1;
    const updated = {
      ...record,
      attemptCount,
      ...(attemptCount >= record.maxAttempts
        ? { lockedUntil: now + record.lockoutDurationMs }
        : {})
    };
    this.#records.set(this.#recordKey(key.accountId, key.userId), updated);
    return { ...updated };
  }

  async consume(key: MfaLoginChallengeKey, now: number): Promise<boolean> {
    const record = this.#findCurrent(key, now);
    if (!record) return false;
    this.#records.set(this.#recordKey(key.accountId, key.userId), {
      ...record,
      attemptWindowStartedAt: now,
      attemptCount: 0,
      lockedUntil: undefined,
      consumedAt: now
    });
    this.#consumeCount += 1;
    return true;
  }

  getIssueCount(): number {
    return this.#issueCount;
  }

  getConsumeCount(): number {
    return this.#consumeCount;
  }

  #findCurrent(key: MfaLoginChallengeKey, now: number): MfaLoginChallengeRecord | undefined {
    const record = this.#records.get(this.#recordKey(key.accountId, key.userId));
    if (
      !record ||
      record.generation !== key.generation ||
      record.consumedAt !== undefined ||
      record.expiresAt <= now
    ) {
      return undefined;
    }
    return record;
  }

  #recordKey(accountId: string, userId: string): string {
    return `${accountId}:${userId}`;
  }
}
