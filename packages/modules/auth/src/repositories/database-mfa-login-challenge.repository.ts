import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import {
  mfaLoginChallenges,
  type DatabaseClient
} from '@cvg-his-v2/shared-database';
import type {
  IssueMfaLoginChallengeInput,
  MfaLoginChallengeKey,
  MfaLoginChallengeRecord,
  MfaLoginChallengeRepository
} from './mfa-login-challenge.repository.js';

type ChallengeRow = typeof mfaLoginChallenges.$inferSelect;

export class DatabaseMfaLoginChallengeRepository implements MfaLoginChallengeRepository {
  readonly #db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.#db = db;
  }

  async issue(input: IssueMfaLoginChallengeInput): Promise<MfaLoginChallengeRecord> {
    const trackingWindowSeconds = Math.max(1, Math.ceil(input.trackingWindowMs / 1000));
    const lockoutDurationSeconds = Math.max(1, Math.ceil(input.lockoutDurationMs / 1000));
    const preserveFailures = sql`(
      ${mfaLoginChallenges.lockedUntil} > clock_timestamp()
      OR (
        ${mfaLoginChallenges.lockedUntil} IS NULL
        AND ${mfaLoginChallenges.attemptCount} > 0
        AND ${mfaLoginChallenges.attemptWindowStartedAt}
          + (${mfaLoginChallenges.trackingWindowSeconds} * interval '1 second')
          > clock_timestamp()
      )
    )`;
    const rows = await this.#db
      .insert(mfaLoginChallenges)
      .values({
        accountId: input.accountId as never,
        userId: input.userId as never,
        generation: input.generation as never,
        expiresAt: sql`clock_timestamp() + (${input.ttlMs} * interval '1 millisecond')`,
        attemptWindowStartedAt: sql`clock_timestamp()`,
        attemptCount: 0,
        maxAttempts: input.maxAttempts,
        trackingWindowSeconds,
        lockoutDurationSeconds,
        lockedUntil: null,
        consumedAt: null,
        createdAt: sql`clock_timestamp()`,
        updatedAt: sql`clock_timestamp()`
      })
      .onConflictDoUpdate({
        target: [mfaLoginChallenges.accountId, mfaLoginChallenges.userId],
        set: {
          generation: input.generation as never,
          expiresAt: sql`clock_timestamp() + (${input.ttlMs} * interval '1 millisecond')`,
          attemptWindowStartedAt: sql`CASE
            WHEN ${preserveFailures} THEN ${mfaLoginChallenges.attemptWindowStartedAt}
            ELSE clock_timestamp()
          END`,
          attemptCount: sql`CASE
            WHEN ${preserveFailures} THEN ${mfaLoginChallenges.attemptCount}
            ELSE 0
          END`,
          maxAttempts: sql`CASE
            WHEN ${preserveFailures}
              THEN GREATEST(${mfaLoginChallenges.maxAttempts}, ${input.maxAttempts})
            ELSE ${input.maxAttempts}
          END`,
          trackingWindowSeconds: sql`CASE
            WHEN ${preserveFailures} THEN ${mfaLoginChallenges.trackingWindowSeconds}
            ELSE ${trackingWindowSeconds}
          END`,
          lockoutDurationSeconds: sql`CASE
            WHEN ${preserveFailures} THEN ${mfaLoginChallenges.lockoutDurationSeconds}
            ELSE ${lockoutDurationSeconds}
          END`,
          lockedUntil: sql`CASE
            WHEN ${mfaLoginChallenges.lockedUntil} > clock_timestamp()
              THEN ${mfaLoginChallenges.lockedUntil}
            ELSE NULL
          END`,
          consumedAt: null,
          updatedAt: sql`clock_timestamp()`
        }
      })
      .returning();

    return this.#toRecord(rows[0]!);
  }

  async inspect(
    key: MfaLoginChallengeKey,
    _now: number
  ): Promise<MfaLoginChallengeRecord | null> {
    const rows = await this.#db
      .select()
      .from(mfaLoginChallenges)
      .where(and(...this.#activeConditions(key)))
      .limit(1);

    return rows[0] ? this.#toRecord(rows[0]) : null;
  }

  async reserveAttempt(
    key: MfaLoginChallengeKey,
    now: number
  ): Promise<MfaLoginChallengeRecord | null> {
    const rows = await this.#db
      .update(mfaLoginChallenges)
      .set({
        attemptCount: sql`${mfaLoginChallenges.attemptCount} + 1`,
        lockedUntil: sql`CASE
          WHEN ${mfaLoginChallenges.attemptCount} + 1 >= ${mfaLoginChallenges.maxAttempts}
            THEN clock_timestamp()
              + (${mfaLoginChallenges.lockoutDurationSeconds} * interval '1 second')
          ELSE ${mfaLoginChallenges.lockedUntil}
        END`,
        updatedAt: sql`clock_timestamp()`
      })
      .where(
        and(
          ...this.#activeConditions(key),
          or(
            isNull(mfaLoginChallenges.lockedUntil),
            sql`${mfaLoginChallenges.lockedUntil} <= clock_timestamp()`
          ),
          lt(mfaLoginChallenges.attemptCount, mfaLoginChallenges.maxAttempts)
        )
      )
      .returning();

    return rows[0] ? this.#toRecord(rows[0]) : null;
  }

  async consume(key: MfaLoginChallengeKey, _now: number): Promise<boolean> {
    const rows = await this.#db
      .update(mfaLoginChallenges)
      .set({
        attemptWindowStartedAt: sql`clock_timestamp()`,
        attemptCount: 0,
        lockedUntil: null,
        consumedAt: sql`clock_timestamp()`,
        updatedAt: sql`clock_timestamp()`
      })
      .where(and(...this.#activeConditions(key)))
      .returning({ generation: mfaLoginChallenges.generation });

    return rows.length === 1;
  }

  #activeConditions(key: MfaLoginChallengeKey) {
    return [
      eq(mfaLoginChallenges.accountId, key.accountId as never),
      eq(mfaLoginChallenges.userId, key.userId as never),
      eq(mfaLoginChallenges.generation, key.generation as never),
      gt(mfaLoginChallenges.expiresAt, sql`clock_timestamp()`),
      isNull(mfaLoginChallenges.consumedAt)
    ] as const;
  }

  #toRecord(row: ChallengeRow): MfaLoginChallengeRecord {
    return {
      accountId: row.accountId as string,
      userId: row.userId as string,
      generation: row.generation as string,
      expiresAt: row.expiresAt.getTime(),
      attemptWindowStartedAt: row.attemptWindowStartedAt.getTime(),
      attemptCount: row.attemptCount,
      maxAttempts: row.maxAttempts,
      trackingWindowMs: row.trackingWindowSeconds * 1000,
      lockoutDurationMs: row.lockoutDurationSeconds * 1000,
      ...(row.lockedUntil ? { lockedUntil: row.lockedUntil.getTime() } : {}),
      ...(row.consumedAt ? { consumedAt: row.consumedAt.getTime() } : {})
    };
  }
}
