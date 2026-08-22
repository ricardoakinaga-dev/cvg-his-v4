import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { mfaCredentials } from '@cvg-his-v2/shared-database';
import type {
  BeginMfaSetupOptions,
  MfaRecord,
  MfaRepository
} from './mfa-repository.interface.js';

const DEFAULT_SETUP_TTL_MS = 10 * 60 * 1000;

function resolveSetupTtlMs(record: MfaRecord, options?: BeginMfaSetupOptions): number {
  const recordTtlMs = record.setupExpiresAt
    ? new Date(record.setupExpiresAt).getTime() - new Date(record.createdAt).getTime()
    : Number.NaN;
  const ttlMs = options?.ttlMs ?? (Number.isFinite(recordTtlMs) ? recordTtlMs : DEFAULT_SETUP_TTL_MS);
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new Error('MFA setup TTL must be a positive integer number of milliseconds.');
  }
  return ttlMs;
}

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
      credentialId: row.id as string,
      accountId: row.accountId as string,
      userId: row.userId as string,
      secret: row.secretEncrypted,
      isActive: row.isActive,
      recoveryCodes: row.recoveryCodesHash ?? [],
      createdAt: row.createdAt.toISOString(),
      activatedAt: row.activatedAt?.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString(),
      lastTotpCounter: row.lastTotpCounter ?? undefined,
      setupExpiresAt: row.setupExpiresAt?.toISOString(),
      secretKeyVersion: row.secretKeyVersion ?? undefined,
      lastRecoveryCodesRegeneratedAt: row.lastRecoveryCodesRegeneratedAt?.toISOString()
    };
  }

  async beginSetup(record: MfaRecord, options?: BeginMfaSetupOptions): Promise<boolean> {
    const ttlMs = resolveSetupTtlMs(record, options);
    const databaseCreatedAt = sql`clock_timestamp()`;
    const databaseSetupExpiresAt = sql`clock_timestamp() + (${ttlMs} * interval '1 millisecond')`;
    const rows = await this.#db
      .insert(mfaCredentials)
      .values({
        id: record.credentialId as never,
        accountId: record.accountId as never,
        userId: record.userId as never,
        secretEncrypted: record.secret,
        isActive: false,
        recoveryCodesHash: [...record.recoveryCodes],
        createdAt: databaseCreatedAt as never,
        activatedAt: null,
        lastUsedAt: null,
        lastTotpCounter: null,
        setupExpiresAt: databaseSetupExpiresAt as never,
        secretKeyVersion: record.secretKeyVersion,
        lastRecoveryCodesRegeneratedAt: null
      })
      .onConflictDoUpdate({
        target: mfaCredentials.userId,
        set: {
          id: record.credentialId as never,
          accountId: record.accountId as never,
          secretEncrypted: record.secret,
          isActive: false,
          recoveryCodesHash: [...record.recoveryCodes],
          createdAt: databaseCreatedAt as never,
          activatedAt: null,
          lastUsedAt: null,
          lastTotpCounter: null,
          setupExpiresAt: databaseSetupExpiresAt as never,
          secretKeyVersion: record.secretKeyVersion,
          lastRecoveryCodesRegeneratedAt: null
        },
        setWhere: eq(mfaCredentials.isActive, false)
      })
      .returning({ id: mfaCredentials.id });

    return rows.length === 1;
  }

  async activateSetup(
    accountId: string,
    userId: string,
    credentialId: string,
    matchedTotpCounter: number,
    _activatedAt: string
  ): Promise<MfaRecord | undefined> {
    const rows = await this.#db
      .update(mfaCredentials)
      .set({
        isActive: true,
        activatedAt: sql`clock_timestamp()` as never,
        setupExpiresAt: null,
        lastTotpCounter: matchedTotpCounter
      })
      .where(
        and(
          eq(mfaCredentials.id, credentialId as never),
          eq(mfaCredentials.accountId, accountId as never),
          eq(mfaCredentials.userId, userId as never),
          eq(mfaCredentials.isActive, false),
          gt(mfaCredentials.setupExpiresAt, sql`clock_timestamp()`)
        )
      )
      .returning();

    const row = rows[0];
    if (!row) return undefined;
    return {
      credentialId: row.id as string,
      accountId: row.accountId as string,
      userId: row.userId as string,
      secret: row.secretEncrypted,
      isActive: row.isActive,
      recoveryCodes: row.recoveryCodesHash ?? [],
      createdAt: row.createdAt.toISOString(),
      activatedAt: row.activatedAt?.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString(),
      lastTotpCounter: row.lastTotpCounter ?? undefined,
      setupExpiresAt: row.setupExpiresAt?.toISOString(),
      secretKeyVersion: row.secretKeyVersion ?? undefined,
      lastRecoveryCodesRegeneratedAt: row.lastRecoveryCodesRegeneratedAt?.toISOString()
    };
  }

  async create(record: MfaRecord): Promise<void> {
    await this.#db.insert(mfaCredentials).values({
      id: record.credentialId as never,
      accountId: record.accountId as never,
      userId: record.userId as never,
      secretEncrypted: record.secret,
      isActive: record.isActive,
      recoveryCodesHash: [...record.recoveryCodes],
      createdAt: new Date(record.createdAt) as never,
      activatedAt: record.activatedAt ? (new Date(record.activatedAt) as never) : undefined,
      setupExpiresAt: record.setupExpiresAt
        ? (new Date(record.setupExpiresAt) as never)
        : record.isActive
          ? null
          : (new Date(record.createdAt) as never),
      secretKeyVersion: record.secretKeyVersion
    });
  }

  async update(record: MfaRecord): Promise<boolean> {
    const rows = await this.#db
      .update(mfaCredentials)
      .set({
        secretEncrypted: record.secret,
        isActive: record.isActive,
        recoveryCodesHash: [...record.recoveryCodes],
        activatedAt: record.activatedAt ? (new Date(record.activatedAt) as never) : undefined,
        secretKeyVersion: record.secretKeyVersion,
        lastRecoveryCodesRegeneratedAt: record.lastRecoveryCodesRegeneratedAt
          ? (new Date(record.lastRecoveryCodesRegeneratedAt) as never)
          : undefined
      })
      .where(
        and(
          eq(mfaCredentials.id, record.credentialId as never),
          eq(mfaCredentials.accountId, record.accountId as never),
          eq(mfaCredentials.userId, record.userId as never)
        )
      )
      .returning({ id: mfaCredentials.id });

    return rows.length === 1;
  }

  async consumeTotpCounter(
    accountId: string,
    userId: string,
    credentialId: string,
    counter: number,
    usedAt: string
  ): Promise<boolean> {
    const rows = await this.#db
      .update(mfaCredentials)
      .set({
        lastTotpCounter: counter,
        lastUsedAt: new Date(usedAt) as never
      })
      .where(
        and(
          eq(mfaCredentials.id, credentialId as never),
          eq(mfaCredentials.accountId, accountId as never),
          eq(mfaCredentials.userId, userId as never),
          eq(mfaCredentials.isActive, true),
          or(
            isNull(mfaCredentials.lastTotpCounter),
            lt(mfaCredentials.lastTotpCounter, counter)
          )
        )
      )
      .returning({ id: mfaCredentials.id });

    return rows.length === 1;
  }

  async consumeRecoveryCode(
    accountId: string,
    userId: string,
    credentialId: string,
    recoveryCodeHash: string,
    usedAt: string
  ): Promise<boolean> {
    const rows = await this.#db
      .update(mfaCredentials)
      .set({
        recoveryCodesHash: sql`${mfaCredentials.recoveryCodesHash} - ${recoveryCodeHash}`,
        lastUsedAt: new Date(usedAt) as never
      })
      .where(
        and(
          eq(mfaCredentials.id, credentialId as never),
          eq(mfaCredentials.accountId, accountId as never),
          eq(mfaCredentials.userId, userId as never),
          eq(mfaCredentials.isActive, true),
          sql`${mfaCredentials.recoveryCodesHash} @> ${JSON.stringify([recoveryCodeHash])}::jsonb`
        )
      )
      .returning({ id: mfaCredentials.id });

    return rows.length === 1;
  }

  async delete(accountId: string, userId: string, credentialId: string): Promise<boolean> {
    const rows = await this.#db
      .delete(mfaCredentials)
      .where(
        and(
          eq(mfaCredentials.id, credentialId as never),
          eq(mfaCredentials.accountId, accountId as never),
          eq(mfaCredentials.userId, userId as never)
        )
      )
      .returning({ id: mfaCredentials.id });

    return rows.length === 1;
  }
}
