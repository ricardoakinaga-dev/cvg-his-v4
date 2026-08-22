export interface MfaLoginChallengeRecord {
  readonly accountId: string;
  readonly userId: string;
  readonly generation: string;
  readonly expiresAt: number;
  readonly attemptWindowStartedAt: number;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly trackingWindowMs: number;
  readonly lockoutDurationMs: number;
  readonly lockedUntil?: number;
  readonly consumedAt?: number;
}

export interface IssueMfaLoginChallengeInput {
  readonly accountId: string;
  readonly userId: string;
  readonly generation: string;
  readonly ttlMs: number;
  readonly maxAttempts: number;
  readonly trackingWindowMs: number;
  readonly lockoutDurationMs: number;
}

export interface MfaLoginChallengeKey {
  readonly accountId: string;
  readonly userId: string;
  readonly generation: string;
}

export interface MfaLoginChallengeRepository {
  issue(input: IssueMfaLoginChallengeInput): Promise<MfaLoginChallengeRecord>;
  inspect(key: MfaLoginChallengeKey, now: number): Promise<MfaLoginChallengeRecord | null>;
  reserveAttempt(key: MfaLoginChallengeKey, now: number): Promise<MfaLoginChallengeRecord | null>;
  consume(key: MfaLoginChallengeKey, now: number): Promise<boolean>;
}
