import { and, eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { mfaCredentials } from '@cvg-his-v2/shared-database';
import type { MfaRecord, MfaRepository } from './mfa-repository.interface.js';

export class DatabaseMfaRepository implements MfaRepository {
  readonly #db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.#db = db;
  }

  async findByUserId(accountId: string, userId: string): Promise<MfaRecord | undefined> {
    const rows = await this.#db
      .select()
      .from(mfaCredentials)
      .where(
        and(
          eq(mfaCredentials.accountId, accountId as never),
          eq(mfaCredentials.userId, userId as never)
        )
      )
      .limit(1);

    if (rows.length === 0) return undefined;

    const row = rows[0];
    return {
      accountId: row.accountId as string,
      userId: row.userId as string,
      secret: row.secretEncrypted,
      isActive: row.isActive,
      recoveryCodes: row.recoveryCodesHash ?? [],
      createdAt: row.createdAt.toISOString(),
      activatedAt: row.activatedAt?.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString(),
      lastRecoveryCodesRegeneratedAt: row.lastRecoveryCodesRegeneratedAt?.toISOString()
    };
  }

  async create(record: MfaRecord): Promise<void> {
    await this.#db.insert(mfaCredentials).values({
      accountId: record.accountId as never,
      userId: record.userId as never,
      secretEncrypted: record.secret,
      isActive: record.isActive,
      recoveryCodesHash: [...record.recoveryCodes],
      createdAt: new Date(record.createdAt) as never,
      activatedAt: record.activatedAt ? (new Date(record.activatedAt) as never) : undefined
    });
  }

  async update(record: MfaRecord): Promise<void> {
    await this.#db
      .update(mfaCredentials)
      .set({
        secretEncrypted: record.secret,
        isActive: record.isActive,
        recoveryCodesHash: [...record.recoveryCodes],
        activatedAt: record.activatedAt ? (new Date(record.activatedAt) as never) : undefined,
        lastUsedAt: record.lastUsedAt ? (new Date(record.lastUsedAt) as never) : undefined,
        lastRecoveryCodesRegeneratedAt: record.lastRecoveryCodesRegeneratedAt
          ? (new Date(record.lastRecoveryCodesRegeneratedAt) as never)
          : undefined
      })
      .where(
        and(
          eq(mfaCredentials.accountId, record.accountId as never),
          eq(mfaCredentials.userId, record.userId as never)
        )
      );
  }

  async delete(accountId: string, userId: string): Promise<void> {
    await this.#db
      .delete(mfaCredentials)
      .where(
        and(
          eq(mfaCredentials.accountId, accountId as never),
          eq(mfaCredentials.userId, userId as never)
        )
      );
  }
}
