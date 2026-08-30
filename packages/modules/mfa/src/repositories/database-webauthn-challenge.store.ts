import { and, eq, gt, isNull, sql } from 'drizzle-orm';

import { type DatabaseClient, webauthnChallenges } from '@cvg-his-v2/shared-database';
import type {
  IssueWebAuthnChallengeInput,
  WebAuthnChallengeConsumeResult,
  WebAuthnChallengeKey,
  WebAuthnChallengeStore
} from '../webauthn.js';

function assertChallengeTtl(ttlMs: number): void {
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new Error('WebAuthn challenge TTL must be a positive integer number of milliseconds');
  }
}

export class DatabaseWebAuthnChallengeStore implements WebAuthnChallengeStore {
  readonly #db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.#db = db;
  }

  async issue(input: IssueWebAuthnChallengeInput): Promise<void> {
    assertChallengeTtl(input.ttlMs);
    if (!input.challenge) {
      throw new Error('WebAuthn challenge must not be empty');
    }

    await this.#db
      .insert(webauthnChallenges)
      .values({
        accountId: input.key.accountId as never,
        userId: input.key.userId as never,
        purpose: input.key.purpose,
        challenge: input.challenge,
        expiresAt: sql`clock_timestamp() + (${input.ttlMs} * interval '1 millisecond')`,
        consumedAt: null,
        createdAt: sql`clock_timestamp()`
      })
      .onConflictDoUpdate({
        target: [
          webauthnChallenges.accountId,
          webauthnChallenges.userId,
          webauthnChallenges.purpose
        ],
        set: {
          challenge: input.challenge,
          expiresAt: sql`clock_timestamp() + (${input.ttlMs} * interval '1 millisecond')`,
          consumedAt: null,
          createdAt: sql`clock_timestamp()`
        }
      });
  }

  async consume(key: WebAuthnChallengeKey): Promise<WebAuthnChallengeConsumeResult> {
    const rows = await this.#db
      .update(webauthnChallenges)
      .set({ consumedAt: sql`clock_timestamp()` })
      .where(
        and(
          eq(webauthnChallenges.accountId, key.accountId as never),
          eq(webauthnChallenges.userId, key.userId as never),
          eq(webauthnChallenges.purpose, key.purpose),
          gt(webauthnChallenges.expiresAt, sql`clock_timestamp()`),
          isNull(webauthnChallenges.consumedAt)
        )
      )
      .returning({ challenge: webauthnChallenges.challenge });

    const challenge = rows[0]?.challenge;
    if (challenge) {
      return { ok: true, challenge };
    }

    // Missing, expired and already-consumed challenges intentionally share the
    // same result at the durable boundary to avoid revealing challenge state.
    return {
      ok: false,
      code: 'INVALID_CHALLENGE',
      message: 'No pending WebAuthn challenge'
    };
  }
}
