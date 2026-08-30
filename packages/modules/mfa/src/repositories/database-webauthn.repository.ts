import { and, eq, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

import { webauthnCredentials, type DatabaseClient } from '@cvg-his-v2/shared-database';
import type { WebAuthnCredential, WebAuthnRepository } from '../webauthn.js';

type WebAuthnCredentialRow = typeof webauthnCredentials.$inferSelect;

function assertCounter(counter: number): void {
  if (!Number.isSafeInteger(counter) || counter < 0) {
    throw new Error('WebAuthn counter must be a non-negative safe integer');
  }
}

function generateCredentialId(): string {
  return `webauthn_${randomBytes(16).toString('hex')}`;
}

export class DatabaseWebAuthnRepository implements WebAuthnRepository {
  readonly #db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.#db = db;
  }

  async findByUserId(accountId: string, userId: string): Promise<WebAuthnCredential[]> {
    const rows = await this.#db
      .select()
      .from(webauthnCredentials)
      .where(
        and(
          eq(webauthnCredentials.accountId, accountId as never),
          eq(webauthnCredentials.userId, userId as never)
        )
      );

    return rows.map((row) => this.#toCredential(row));
  }

  async findByCredentialId(
    accountId: string,
    userId: string,
    credentialId: string
  ): Promise<WebAuthnCredential | null> {
    const rows = await this.#db
      .select()
      .from(webauthnCredentials)
      .where(
        and(
          eq(webauthnCredentials.accountId, accountId as never),
          eq(webauthnCredentials.userId, userId as never),
          eq(webauthnCredentials.credentialId, credentialId)
        )
      )
      .limit(1);

    return rows[0] ? this.#toCredential(rows[0]) : null;
  }

  async save(
    accountId: string,
    userId: string,
    data: Omit<WebAuthnCredential, 'id' | 'accountId' | 'userId'>
  ): Promise<string> {
    assertCounter(data.counter);
    const credentialId = generateCredentialId();
    const rows = await this.#db
      .insert(webauthnCredentials)
      .values({
        credentialId,
        accountId: accountId as never,
        userId: userId as never,
        publicKey: data.publicKey,
        counter: data.counter,
        deviceType: data.deviceType,
        createdAt: new Date(data.createdAt),
        lastUsedAt: data.lastUsedAt ? new Date(data.lastUsedAt) : null,
        nickname: data.nickname ?? null
      })
      .returning({ credentialId: webauthnCredentials.credentialId });

    return rows[0]?.credentialId ?? credentialId;
  }

  async updateCounter(
    accountId: string,
    userId: string,
    credentialId: string,
    expectedCounter: number,
    counter: number
  ): Promise<boolean> {
    assertCounter(expectedCounter);
    assertCounter(counter);
    if (counter <= expectedCounter) {
      return false;
    }
    const rows = await this.#db
      .update(webauthnCredentials)
      .set({
        counter,
        lastUsedAt: sql`clock_timestamp()`
      })
      .where(
        and(
          eq(webauthnCredentials.accountId, accountId as never),
          eq(webauthnCredentials.userId, userId as never),
          eq(webauthnCredentials.credentialId, credentialId),
          eq(webauthnCredentials.counter, expectedCounter)
        )
      )
      .returning({ credentialId: webauthnCredentials.credentialId });
    return rows.length > 0;
  }

  async delete(accountId: string, userId: string, credentialId: string): Promise<void> {
    await this.#db
      .delete(webauthnCredentials)
      .where(
        and(
          eq(webauthnCredentials.accountId, accountId as never),
          eq(webauthnCredentials.userId, userId as never),
          eq(webauthnCredentials.credentialId, credentialId)
        )
      );
  }

  #toCredential(row: WebAuthnCredentialRow): WebAuthnCredential {
    return {
      id: row.credentialId,
      accountId: row.accountId as string,
      userId: row.userId as string,
      publicKey: row.publicKey,
      counter: row.counter,
      deviceType: row.deviceType as WebAuthnCredential['deviceType'],
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      ...(row.nickname ? { nickname: row.nickname } : {})
    };
  }
}
