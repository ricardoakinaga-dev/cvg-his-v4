import { createLogger } from '@cvg-his-v2/shared-logging';

export interface BruteForceConfig {
  readonly maxAttempts: number;
  readonly lockoutDurationSeconds: number;
  readonly trackingWindowSeconds: number;
}

interface AttemptRecord {
  readonly attempts: number[];
  readonly lockedUntil?: number;
}

export class BruteForceProtection {
  readonly #config: BruteForceConfig;
  readonly #passwordFailures = new Map<string, AttemptRecord>();
  readonly #mfaFailures = new Map<string, AttemptRecord>();
  readonly #logger = createLogger('auth-brute-force');

  constructor(config: Partial<BruteForceConfig> = {}) {
    this.#config = {
      maxAttempts: config.maxAttempts ?? 5,
      lockoutDurationSeconds: config.lockoutDurationSeconds ?? 300,
      trackingWindowSeconds: config.trackingWindowSeconds ?? 900
    };
  }

  isPasswordLocked(identifier: string): boolean {
    return this.#isLocked(this.#passwordFailures, this.#normalize(identifier));
  }

  isMfaLocked(identifier: string): boolean {
    return this.#isLocked(this.#mfaFailures, this.#normalize(identifier));
  }

  isLocked(identifier: string): boolean {
    return this.isPasswordLocked(identifier) || this.isMfaLocked(identifier);
  }

  getRemainingLockSeconds(identifier: string): number {
    const normalized = this.#normalize(identifier);
    const record = this.#passwordFailures.get(normalized) ?? this.#mfaFailures.get(normalized);
    if (!record?.lockedUntil) return 0;
    const remaining = record.lockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  recordPasswordFailure(identifier: string): number {
    const normalized = this.#normalize(identifier);
    const record = this.#getOrCreate(this.#passwordFailures, normalized);
    const now = Date.now();
    const recentAttempts = record.attempts.filter(
      (t) => now - t < this.#config.trackingWindowSeconds * 1000
    );
    const newAttempts = [...recentAttempts, now];

    let lockedUntil: number | undefined;
    if (newAttempts.length >= this.#config.maxAttempts) {
      lockedUntil = now + this.#config.lockoutDurationSeconds * 1000;
      this.#logger.warn('account locked due to repeated password failures', {
        identifier: normalized,
        attemptCount: newAttempts.length,
        lockedUntilSeconds: this.#config.lockoutDurationSeconds
      });

      if (newAttempts.length >= this.#config.maxAttempts * 2) {
        this.#logger.error('possible brute force attack detected', {
          identifier: normalized,
          attemptCount: newAttempts.length,
          threshold: this.#config.maxAttempts * 2
        });
      }
    }

    const newRecord: AttemptRecord = { attempts: newAttempts, lockedUntil };
    this.#passwordFailures.set(normalized, newRecord);
    this.#cleanup(this.#passwordFailures);
    return newAttempts.length;
  }

  recordMfaFailure(identifier: string): number {
    const normalized = this.#normalize(identifier);
    const record = this.#getOrCreate(this.#mfaFailures, normalized);
    const now = Date.now();
    const recentAttempts = record.attempts.filter(
      (t) => now - t < this.#config.trackingWindowSeconds * 1000
    );
    const newAttempts = [...recentAttempts, now];

    let lockedUntil: number | undefined;
    if (newAttempts.length >= this.#config.maxAttempts) {
      lockedUntil = now + this.#config.lockoutDurationSeconds * 1000;
      this.#logger.warn('account locked due to repeated MFA failures', {
        identifier: normalized,
        attemptCount: newAttempts.length,
        lockedUntilSeconds: this.#config.lockoutDurationSeconds
      });

      if (newAttempts.length >= this.#config.maxAttempts * 2) {
        this.#logger.error('possible brute force attack on MFA', {
          identifier: normalized,
          attemptCount: newAttempts.length,
          threshold: this.#config.maxAttempts * 2
        });
      }
    }

    const newRecord: AttemptRecord = { attempts: newAttempts, lockedUntil };
    this.#mfaFailures.set(normalized, newRecord);
    this.#cleanup(this.#mfaFailures);
    return newAttempts.length;
  }

  recordSuccess(identifier: string): void {
    const normalized = this.#normalize(identifier);
    this.#passwordFailures.delete(normalized);
    this.#mfaFailures.delete(normalized);
  }

  recordPasswordSuccess(identifier: string): void {
    const normalized = this.#normalize(identifier);
    this.#passwordFailures.delete(normalized);
  }

  recordMfaSuccess(identifier: string): void {
    const normalized = this.#normalize(identifier);
    this.#mfaFailures.delete(normalized);
  }

  getFailureCount(identifier: string): number {
    const normalized = this.#normalize(identifier);
    const record = this.#passwordFailures.get(normalized);
    if (!record) return 0;
    const now = Date.now();
    return record.attempts.filter((t) => now - t < this.#config.trackingWindowSeconds * 1000)
      .length;
  }

  getMfaFailureCount(identifier: string): number {
    const normalized = this.#normalize(identifier);
    const record = this.#mfaFailures.get(normalized);
    if (!record) return 0;
    const now = Date.now();
    return record.attempts.filter((t) => now - t < this.#config.trackingWindowSeconds * 1000)
      .length;
  }

  #normalize(identifier: string): string {
    return identifier.toLowerCase().trim();
  }

  #isLocked(map: Map<string, AttemptRecord>, normalized: string): boolean {
    const record = map.get(normalized);
    if (!record?.lockedUntil) return false;
    if (Date.now() >= record.lockedUntil) {
      map.delete(normalized);
      return false;
    }
    return true;
  }

  #getOrCreate(map: Map<string, AttemptRecord>, normalized: string): AttemptRecord {
    return map.get(normalized) ?? { attempts: [] };
  }

  #cleanup(map: Map<string, AttemptRecord>): void {
    const now = Date.now();
    for (const [key, record] of map.entries()) {
      const recent = record.attempts.filter(
        (t) => now - t < this.#config.trackingWindowSeconds * 1000
      );
      if (recent.length === 0 && !record.lockedUntil) {
        map.delete(key);
      } else if (recent.length === 0 && record.lockedUntil && now >= record.lockedUntil) {
        map.delete(key);
      }
    }
  }
}
