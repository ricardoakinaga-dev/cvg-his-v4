import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { getPool, runInTenantTransaction, getDatabaseTransactionScope, runWithDatabaseTransactionScope } from '@cvg-his-v2/shared-database';
import { nowIso } from '@cvg-his-v2/shared-utils';
import { getTenantContext, withTenantQuery } from '@cvg-his-v2/tenant-context';

export type CardGatewayProviderName = 'local-card' | 'pagarme-card';
export type CardTransactionStatus =
  | 'pending'
  | 'authorized_pending_capture'
  | 'captured'
  | 'not_authorized'
  | 'failed'
  | 'voided';
export type CardBillingSettlementStatus =
  | 'not_applicable'
  | 'awaiting_capture'
  | 'pending_billing'
  | 'applied'
  | 'failed';

export interface CardTransactionRecord {
  readonly transactionId: string;
  readonly provider: CardGatewayProviderName;
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly description: string;
  readonly installments: number;
  readonly status: CardTransactionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly capturedAt?: string;
  readonly captureRequestedAt?: string;
  readonly lastProviderSyncAt?: string;
  readonly providerOrderId?: string;
  readonly providerChargeId?: string;
  readonly providerAuthorizationCode?: string;
  readonly providerReferenceId?: string;
  readonly failureReason?: string;
  readonly cardHolderName?: string;
  readonly cardBrand?: string;
  readonly cardLast4?: string;
  readonly billingSettlementStatus: CardBillingSettlementStatus;
  readonly billingSettledAt?: string;
  readonly billingSettlementError?: string;
}

export interface UpdateCardTransactionStatusInput {
  readonly transactionId: string;
  readonly status: CardTransactionStatus;
  readonly updatedAt?: string;
  readonly capturedAt?: string;
  readonly lastProviderSyncAt?: string;
  readonly providerOrderId?: string;
  readonly providerChargeId?: string;
  readonly providerAuthorizationCode?: string;
  readonly providerReferenceId?: string;
  readonly failureReason?: string;
  readonly billingSettlementStatus?: CardBillingSettlementStatus;
}

export interface UpdateCardBillingSettlementInput {
  readonly transactionId: string;
  readonly billingSettlementStatus: CardBillingSettlementStatus;
  readonly updatedAt?: string;
  readonly billingSettledAt?: string;
  readonly billingSettlementError?: string;
}

export interface ListCardTransactionsFilters {
  readonly accountId?: string;
  readonly status?: CardTransactionStatus;
  readonly provider?: CardGatewayProviderName;
}

export interface CardCreationAttempt {
  readonly id: string;
  readonly fingerprint: string;
  readonly billingRecordId?: string;
  readonly providerResult?: Record<string, unknown>;
  readonly response?: Record<string, unknown>;
}

export interface CardTransactionRepository {
  reserveCreation(accountId: string, key: string, fingerprint: string, billingRecordId?: string): Promise<{ fresh: boolean; attempt: CardCreationAttempt }>;
  findCreation(accountId: string, id: string): Promise<CardCreationAttempt>;
  saveCreationResult(accountId: string, id: string, result: Record<string, unknown>): Promise<void>;
  completeCreation(accountId: string, id: string, response: Record<string, unknown>): Promise<void>;
  /** Serialize capture and atomically commit local status with its outbox event.
   * Preflight is read-only. The gateway calls the one-shot checkpoint immediately
   * before dispatch. Its marker survives rollback: ambiguous retries only reconcile.
   */
  withCaptureLock<T>(
    accountId: string,
    transactionId: string,
    operation: (claimProviderCapture: () => Promise<boolean>, beginFinalization: () => Promise<void>) => Promise<T>
  ): Promise<{ acquired: false } | { acquired: true; value: T }>;

  withCreationTransaction<T>(accountId: string, transactionId: string, operation: () => Promise<T>): Promise<T>;
  create(transaction: CardTransactionRecord): Promise<void>;
  findByTransactionId(transactionId: string): Promise<CardTransactionRecord | null>;
  updateStatus(input: UpdateCardTransactionStatusInput): Promise<CardTransactionRecord | null>;
  updateBillingSettlement(
    input: UpdateCardBillingSettlementInput
  ): Promise<CardTransactionRecord | null>;
  list(filters?: ListCardTransactionsFilters): Promise<readonly CardTransactionRecord[]>;
}

function toIso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function mapRow(row: Record<string, unknown>): CardTransactionRecord {
  return {
    transactionId: String(row.transaction_id),
    provider: row.provider as CardGatewayProviderName,
    accountId: String(row.account_id),
    billingRecordId: (row.billing_record_id as string | null) ?? undefined,
    amount: Number(row.amount),
    currency: row.currency as 'BRL',
    description: String(row.description),
    installments: Number(row.installments),
    status: row.status as CardTransactionStatus,
    createdAt: toIso(row.created_at) as string,
    updatedAt: toIso(row.updated_at) as string,
    capturedAt: toIso(row.captured_at),
    captureRequestedAt: toIso(row.capture_requested_at),
    lastProviderSyncAt: toIso(row.last_provider_sync_at),
    providerOrderId: (row.provider_order_id as string | null) ?? undefined,
    providerChargeId: (row.provider_charge_id as string | null) ?? undefined,
    providerAuthorizationCode: (row.provider_authorization_code as string | null) ?? undefined,
    providerReferenceId: (row.provider_reference_id as string | null) ?? undefined,
    failureReason: (row.failure_reason as string | null) ?? undefined,
    cardHolderName: (row.card_holder_name as string | null) ?? undefined,
    cardBrand: (row.card_brand as string | null) ?? undefined,
    cardLast4: (row.card_last4 as string | null) ?? undefined,
    billingSettlementStatus: row.billing_settlement_status as CardBillingSettlementStatus,
    billingSettledAt: toIso(row.billing_settled_at),
    billingSettlementError: (row.billing_settlement_error as string | null) ?? undefined
  };
}

function cloneRecord(record: CardTransactionRecord): CardTransactionRecord {
  return { ...record };
}

function recordKey(accountId: string, transactionId: string): string {
  return `${accountId}\u0000${transactionId}`;
}

export class InMemoryCardTransactionRepository implements CardTransactionRepository {
  readonly #creations = new Map<string, CardCreationAttempt>();
  async reserveCreation(accountId: string, key: string, fingerprint: string, billingRecordId?: string) {
    if (getTenantContext() && getTenantContext()?.accountId !== accountId) throw new Error('Card creation tenant mismatch');
    const mapKey = recordKey(accountId, key);
    const existing = this.#creations.get(mapKey);
    if (existing) return { fresh: false, attempt: structuredClone(existing) };
    if (billingRecordId && Array.from(this.#creations.entries()).some(([key, value]) =>
      key.startsWith(`${accountId}\u0000`) && value.billingRecordId === billingRecordId &&
      !['failed', 'not_authorized', 'voided'].includes(String(value.providerResult?.status)))) {
      throw new Error('CARD_CREATION_BILLING_CONFLICT');
    }
    const attempt: CardCreationAttempt = { id: randomUUID(), fingerprint, billingRecordId };
    this.#creations.set(mapKey, attempt);
    return { fresh: true, attempt: structuredClone(attempt) };
  }
  async findCreation(accountId: string, id: string): Promise<CardCreationAttempt> {
    if (getTenantContext() && getTenantContext()?.accountId !== accountId) throw new Error('Card creation tenant mismatch');
    const entry = Array.from(this.#creations.entries()).find(([key, value]) => key.startsWith(`${accountId}\u0000`) && value.id === id);
    if (!entry) throw new Error('Card creation not found');
    return structuredClone(entry[1]);
  }
  async saveCreationResult(accountId: string, id: string, result: Record<string, unknown>): Promise<void> {
    if (getTenantContext() && getTenantContext()?.accountId !== accountId) throw new Error('Card creation tenant mismatch');
    const entry = Array.from(this.#creations.entries()).find(([key, value]) => key.startsWith(`${accountId}\u0000`) && value.id === id);
    if (!entry) throw new Error('Card creation not found');
    if (entry[1].providerResult && entry[1].providerResult.status !== 'pending') throw new Error('Card creation result already saved or unavailable');
    this.#creations.set(entry[0], { ...entry[1], providerResult: structuredClone(result) });
  }
  async completeCreation(accountId: string, id: string, response: Record<string, unknown>): Promise<void> {
    if (getTenantContext() && getTenantContext()?.accountId !== accountId) throw new Error('Card creation tenant mismatch');
    const entry = Array.from(this.#creations.entries()).find(([key, value]) => key.startsWith(`${accountId}\u0000`) && value.id === id);
    if (!entry) throw new Error('Card creation not found');
    this.#creations.set(entry[0], { ...entry[1], response: structuredClone(response) });
  }
  readonly #records = new Map<string, CardTransactionRecord>();
  async withCreationTransaction<T>(accountId: string, transactionId: string, operation: () => Promise<T>): Promise<T> {
    // Creation finalization updates one existing anchor; journal those updates
    // rather than replacing unrelated tenant records on rollback.
    const key = recordKey(accountId, transactionId);
    if (this.#captureLocks.has(key)) throw new Error('Card capture is in progress');
    this.#captureLocks.add(key);
    const before = new Map<string, CardTransactionRecord>();
    return this.#creationRollback.run(before, async () => {
      try { return await operation(); }
      catch (error) { for (const [key, record] of before) this.#records.set(key, record); throw error; }
      finally { this.#captureLocks.delete(key); }
    });
  }
  readonly #creationRollback = new AsyncLocalStorage<Map<string, CardTransactionRecord>>();
  readonly #captureLocks = new Set<string>();
  readonly #captureRequests = new Set<string>();

  async withCaptureLock<T>(accountId: string, transactionId: string, operation: (claimProviderCapture: () => Promise<boolean>, beginFinalization: () => Promise<void>) => Promise<T>): Promise<{ acquired: false } | { acquired: true; value: T }> {
    const key = recordKey(accountId, transactionId);
    if (this.#captureLocks.has(key)) return { acquired: false };
    this.#captureLocks.add(key);
    const before = this.#records.get(key);
    let checkpointCalled = false;
    const claimProviderCapture = async () => {
      if (checkpointCalled) throw new Error('Capture dispatch checkpoint already used');
      checkpointCalled = true;
      const allowProviderCapture = !this.#captureRequests.has(key);
      this.#captureRequests.add(key);
      return allowProviderCapture;
    };
    try {
      return { acquired: true, value: await operation(claimProviderCapture, async () => {}) };
    } catch (error) {
      if (before) this.#records.set(key, before);
      else this.#records.delete(key);
      throw error;
    } finally {
      this.#captureLocks.delete(key);
    }
  }


  async create(transaction: CardTransactionRecord): Promise<void> {
    const key = recordKey(transaction.accountId, transaction.transactionId);
    if (!this.#records.has(key)) {
      this.#records.set(key, cloneRecord(transaction));
      if (transaction.captureRequestedAt) this.#captureRequests.add(key);
    }
  }

  async findByTransactionId(transactionId: string): Promise<CardTransactionRecord | null> {
    const key = this.#resolveKey(transactionId);
    const record = key ? this.#records.get(key) : undefined;
    return record ? cloneRecord(record) : null;
  }

  async updateStatus(
    input: UpdateCardTransactionStatusInput
  ): Promise<CardTransactionRecord | null> {
    const key = this.#resolveKey(input.transactionId);
    const existing = key ? this.#records.get(key) : undefined;
    if (!key || !existing) {
      return null;
    }

    const journal = this.#creationRollback.getStore();
    if (journal && !journal.has(key)) journal.set(key, existing);
    const updated: CardTransactionRecord = {
      ...existing,
      status: input.status,
      updatedAt: input.updatedAt ?? nowIso(),
      capturedAt: input.capturedAt ?? existing.capturedAt,
      lastProviderSyncAt: input.lastProviderSyncAt ?? existing.lastProviderSyncAt,
      providerOrderId: input.providerOrderId ?? existing.providerOrderId,
      providerChargeId: input.providerChargeId ?? existing.providerChargeId,
      providerAuthorizationCode:
        input.providerAuthorizationCode ?? existing.providerAuthorizationCode,
      providerReferenceId: input.providerReferenceId ?? existing.providerReferenceId,
      failureReason: input.failureReason ?? existing.failureReason,
      billingSettlementStatus: input.billingSettlementStatus ?? existing.billingSettlementStatus
    };
    this.#records.set(key, updated);
    return cloneRecord(updated);
  }

  async updateBillingSettlement(
    input: UpdateCardBillingSettlementInput
  ): Promise<CardTransactionRecord | null> {
    const key = this.#resolveKey(input.transactionId);
    const existing = key ? this.#records.get(key) : undefined;
    if (!key || !existing) {
      return null;
    }

    const updated: CardTransactionRecord = {
      ...existing,
      updatedAt: input.updatedAt ?? nowIso(),
      billingSettlementStatus: input.billingSettlementStatus,
      billingSettledAt: input.billingSettledAt,
      billingSettlementError: input.billingSettlementError
    };
    this.#records.set(key, updated);
    return cloneRecord(updated);
  }

  async list(filters?: ListCardTransactionsFilters): Promise<readonly CardTransactionRecord[]> {
    let items = Array.from(this.#records.values());
    if (filters?.accountId) {
      items = items.filter((item) => item.accountId === filters.accountId);
    }
    if (filters?.status) {
      items = items.filter((item) => item.status === filters.status);
    }
    if (filters?.provider) {
      items = items.filter((item) => item.provider === filters.provider);
    }
    return items
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((item) => cloneRecord(item));
  }

  #resolveKey(transactionId: string): string | undefined {
    const accountId = getTenantContext()?.accountId;
    if (accountId) {
      const scopedKey = recordKey(accountId, transactionId);
      return this.#records.has(scopedKey) ? scopedKey : undefined;
    }

    const matches = Array.from(this.#records.entries()).filter(
      ([, record]) => record.transactionId === transactionId
    );
    return matches.length === 1 ? matches[0]?.[0] : undefined;
  }
}

/** PostgreSQL-authoritative card transaction persistence used by API and worker runtimes. */
export class DatabaseCardTransactionRepository implements CardTransactionRepository {
  async reserveCreation(accountId: string, key: string, fingerprint: string, billingRecordId?: string) {
    if (getDatabaseTransactionScope()) throw new Error('Card creation must own its reservation transaction');
    if (getTenantContext()?.accountId !== accountId) throw new Error('Card creation tenant mismatch');
    return runInTenantTransaction(getPool(), accountId, async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [JSON.stringify(['card-creation', accountId, billingRecordId ?? key])]);
      const previous = await client.query('SELECT * FROM card_creation_attempts WHERE account_id=$1 AND creation_key=$2', [accountId, key]);
      if (previous.rows[0]) return { fresh: false, attempt: creationFromRow(previous.rows[0]) };
      if (billingRecordId) {
        const blocking = await client.query(`SELECT id FROM card_creation_attempts WHERE account_id=$1 AND billing_record_id=$2
          AND COALESCE(provider_result->>'status', 'pending') NOT IN ('failed','not_authorized','voided') LIMIT 1`, [accountId, billingRecordId]);
        if (blocking.rows.length) throw new Error('CARD_CREATION_BILLING_CONFLICT');
      }
      const inserted = await client.query(`INSERT INTO card_creation_attempts(account_id,creation_key,fingerprint,billing_record_id)
        VALUES($1,$2,$3,$4) RETURNING *`, [accountId,key,fingerprint,billingRecordId ?? null]);
      return { fresh: true, attempt: creationFromRow(inserted.rows[0]) };
    });
  }
  async findCreation(accountId: string, id: string): Promise<CardCreationAttempt> {
    if (getTenantContext() && getTenantContext()?.accountId !== accountId) throw new Error('Card creation tenant mismatch');
    return withTenantQuery(getPool(), async client => {
      const result = await client.query('SELECT * FROM card_creation_attempts WHERE account_id=$1 AND id=$2', [accountId,id]);
      if (!result.rows[0]) throw new Error('Card creation not found');
      return creationFromRow(result.rows[0]);
    });
  }
  async saveCreationResult(accountId: string, id: string, result: Record<string, unknown>): Promise<void> {
    if (getTenantContext() && getTenantContext()?.accountId !== accountId) throw new Error('Card creation tenant mismatch');
    await withTenantQuery(getPool(), async client => {
      const updated = await client.query(`UPDATE card_creation_attempts SET provider_result=$3, updated_at=clock_timestamp() WHERE account_id=$1 AND id=$2 AND (provider_result IS NULL OR provider_result->>'status' = 'pending')`, [accountId,id,JSON.stringify(result)]);
      if (updated.rowCount !== 1) throw new Error('Card creation result already saved or unavailable');
    });
  }
  async completeCreation(accountId: string, id: string, response: Record<string, unknown>): Promise<void> {
    if (getTenantContext() && getTenantContext()?.accountId !== accountId) throw new Error('Card creation tenant mismatch');
    await withTenantQuery(getPool(), async client => {
      const updated = await client.query(`UPDATE card_creation_attempts SET response=$3, updated_at=clock_timestamp() WHERE account_id=$1 AND id=$2 AND (response IS NULL OR response->>'status' = 'pending')`, [accountId,id,JSON.stringify(response)]);
      if (updated.rowCount !== 1) throw new Error('Card creation completion already saved or unavailable');
    });
  }
  async withCreationTransaction<T>(accountId: string, transactionId: string, operation: () => Promise<T>): Promise<T> {
    if (getTenantContext()?.accountId !== accountId) throw new Error('Card creation tenant mismatch');
    return runInTenantTransaction(getPool(), accountId, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [JSON.stringify(['card-capture', accountId, transactionId])]);
      return operation();
    });
  }

  async withCaptureLock<T>(accountId: string, transactionId: string, operation: (claimProviderCapture: () => Promise<boolean>, beginFinalization: () => Promise<void>) => Promise<T>): Promise<{ acquired: false } | { acquired: true; value: T }> {
    if (getDatabaseTransactionScope()) throw new Error('Card capture must own its transaction boundary');
    if (getTenantContext()?.accountId !== accountId) throw new Error('Card capture tenant mismatch');
    const pool = getPool();
    const client = await pool.connect();
    const lockKey = JSON.stringify(['card-capture', accountId, transactionId]);
    let locked = false;
    let active = false;
    let releaseError: Error | undefined;
    const onConnectionError = (error: Error) => { releaseError = error; };
    client.on('error', onConnectionError);
    try {
      const lock = await client.query('SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired', [lockKey]);
      locked = lock.rows[0]?.acquired === true;
      if (!locked) return { acquired: false };

      // Preflight runs read-only while holding the cross-instance lock. A failed
      // eligibility check must not consume the provider-dispatch marker.
      await client.query('BEGIN READ ONLY');
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
      let checkpointCalled = false;
      const claimProviderCapture = async () => {
        if (!active || checkpointCalled) throw new Error('Capture dispatch checkpoint unavailable');
        checkpointCalled = true;
        await client.query('COMMIT');
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
        const marker = await client.query(
          `UPDATE card_transactions SET capture_requested_at = clock_timestamp()
           WHERE account_id = $1 AND transaction_id = $2
             AND capture_requested_at IS NULL AND status <> 'captured'
           RETURNING transaction_id`, [accountId, transactionId]
        );
        await client.query('COMMIT');
        active = false;
        return marker.rows.length === 1;
      };
      let finalizing = false;
      const beginFinalization = async () => {
        if (finalizing) return;
        if (active) await client.query('COMMIT');
        active = false;
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
        active = true;
        finalizing = true;
      };
      active = true;
      const value = await runWithDatabaseTransactionScope(
        { accountId, pool, client, isActive: () => active },
        () => operation(claimProviderCapture, beginFinalization)
      );
      if (active) await client.query('COMMIT');
      active = false;
      return { acquired: true, value };
    } catch (error) {
      active = false;
      // A failed COMMIT may have an unknown outcome. Discard this connection;
      // durable marker + authoritative reads make a new request safe either way.
      releaseError = error instanceof Error ? error : new Error(String(error));
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      active = false;
      if (locked) {
        try {
          const unlock = await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0)) AS released', [lockKey]);
          if (unlock.rows[0]?.released !== true) releaseError = new Error('Card capture lock release failed');
        } catch (error) {
          releaseError = error instanceof Error ? error : new Error(String(error));
        }
      }
      client.release(releaseError);
      client.removeListener('error', onConnectionError);
    }
  }

  async create(transaction: CardTransactionRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO card_transactions (
           transaction_id, provider, account_id, billing_record_id, amount, currency,
           description, installments, status, created_at, updated_at, captured_at,
           last_provider_sync_at, provider_order_id, provider_charge_id,
           provider_authorization_code, provider_reference_id, failure_reason,
           card_holder_name, card_brand, card_last4, billing_settlement_status,
           billing_settled_at, billing_settlement_error, capture_requested_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
           $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
         ) ON CONFLICT (account_id, transaction_id) DO NOTHING`,
        [
          transaction.transactionId,
          transaction.provider,
          transaction.accountId,
          transaction.billingRecordId ?? null,
          transaction.amount,
          transaction.currency,
          transaction.description,
          transaction.installments,
          transaction.status,
          new Date(transaction.createdAt),
          new Date(transaction.updatedAt),
          transaction.capturedAt ? new Date(transaction.capturedAt) : null,
          transaction.lastProviderSyncAt ? new Date(transaction.lastProviderSyncAt) : null,
          transaction.providerOrderId ?? null,
          transaction.providerChargeId ?? null,
          transaction.providerAuthorizationCode ?? null,
          transaction.providerReferenceId ?? null,
          transaction.failureReason ?? null,
          transaction.cardHolderName ?? null,
          transaction.cardBrand ?? null,
          transaction.cardLast4 ?? null,
          transaction.billingSettlementStatus,
          transaction.billingSettledAt ? new Date(transaction.billingSettledAt) : null,
          transaction.billingSettlementError ?? null,
          transaction.captureRequestedAt ? new Date(transaction.captureRequestedAt) : null
        ]
      );
    });
  }

  async findByTransactionId(transactionId: string): Promise<CardTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM card_transactions WHERE transaction_id = $1 LIMIT 1',
        [transactionId]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async updateStatus(
    input: UpdateCardTransactionStatusInput
  ): Promise<CardTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE card_transactions
            SET status = $2,
                updated_at = $3,
                captured_at = COALESCE($4, captured_at),
                last_provider_sync_at = COALESCE($5, last_provider_sync_at),
                provider_order_id = COALESCE($6, provider_order_id),
                provider_charge_id = COALESCE($7, provider_charge_id),
                provider_authorization_code = COALESCE($8, provider_authorization_code),
                provider_reference_id = COALESCE($9, provider_reference_id),
                failure_reason = COALESCE($10, failure_reason),
                billing_settlement_status = COALESCE($11, billing_settlement_status)
          WHERE transaction_id = $1
          RETURNING *`,
        [
          input.transactionId,
          input.status,
          new Date(input.updatedAt ?? nowIso()),
          input.capturedAt ? new Date(input.capturedAt) : null,
          input.lastProviderSyncAt ? new Date(input.lastProviderSyncAt) : null,
          input.providerOrderId ?? null,
          input.providerChargeId ?? null,
          input.providerAuthorizationCode ?? null,
          input.providerReferenceId ?? null,
          input.failureReason ?? null,
          input.billingSettlementStatus ?? null
        ]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async updateBillingSettlement(
    input: UpdateCardBillingSettlementInput
  ): Promise<CardTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE card_transactions
            SET billing_settlement_status = $2,
                billing_settled_at = $3,
                billing_settlement_error = $4,
                updated_at = $5
          WHERE transaction_id = $1
          RETURNING *`,
        [
          input.transactionId,
          input.billingSettlementStatus,
          input.billingSettledAt ? new Date(input.billingSettledAt) : null,
          input.billingSettlementError ?? null,
          new Date(input.updatedAt ?? nowIso())
        ]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async list(filters?: ListCardTransactionsFilters): Promise<readonly CardTransactionRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const clauses: string[] = [];
      const params: unknown[] = [];
      if (filters?.accountId) {
        params.push(filters.accountId);
        clauses.push(`account_id = $${params.length}`);
      }
      if (filters?.status) {
        params.push(filters.status);
        clauses.push(`status = $${params.length}`);
      }
      if (filters?.provider) {
        params.push(filters.provider);
        clauses.push(`provider = $${params.length}`);
      }
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const result = await client.query(
        `SELECT * FROM card_transactions ${where} ORDER BY created_at DESC`,
        params
      );
      return result.rows.map((row: Record<string, unknown>) => mapRow(row));
    });
  }
}

function creationFromRow(row: Record<string, any>): CardCreationAttempt {
  return { id: row.id, fingerprint: row.fingerprint, billingRecordId: row.billing_record_id ?? undefined,
    providerResult: row.provider_result ?? undefined, response: row.response ?? undefined };
}
