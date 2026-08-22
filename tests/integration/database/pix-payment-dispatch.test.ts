import { randomUUID } from 'node:crypto';

import type { Pool as PoolType } from 'pg';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  PixPaymentDispatcher,
  type PixPaymentDispatchCheckpoint,
  type PixPaymentDispatchProvider,
  PixPaymentDispatchProviderError,
  type PixPaymentDispatchProviderInput,
  type PixPaymentDispatchProviderResult
} from '../../../apps/worker/src/jobs/pix-payment-dispatcher.js';
import {
  DatabasePixPaymentDispatchRepository,
  type PixPaymentDispatchClaim
} from '../../../apps/worker/src/pix-payment-dispatch-repository.js';
import {
  getDatabaseTransactionScope,
  getTenantTransactionContext,
  runInTenantTransaction
} from '@cvg-his-v2/shared-database';
import { getTestPool } from '../../db/db-admin.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const AMOUNT_CENTS = 12_550;
const LEASE_MS = 60_000;

interface Fixture {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly attemptId: string;
  readonly providerIdempotencyKey: string;
}

interface AttemptRow {
  readonly dispatch_attempts: number;
  readonly last_error_code: string | null;
  readonly last_error_class: string | null;
  readonly last_error_public_message: string | null;
  readonly lease_owner: string | null;
  readonly lease_token: string | null;
  readonly lease_version: string;
  readonly next_attempt_at: Date | null;
  readonly provider_transaction_id: string | null;
  readonly state: string;
}

async function createPendingAttempt(pool: PoolType): Promise<Fixture> {
  const accountId = randomUUID();
  const actorUserId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const attemptId = randomUUID();
  const billingRecordId = `pix-dispatch-billing-${randomUUID()}`;
  const providerIdempotencyKey = `cvg:pix:create:v1:${attemptId}`;
  const suffix = accountId.replaceAll('-', '');

  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'PIX dispatch account')`,
    [accountId, TENANT_ID, `pix-dispatch-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'PIX dispatch operator')`,
    [actorUserId, accountId, `pix_dispatch_${suffix}`, `pix-dispatch-${suffix}@example.com`]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'PIX dispatch owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'PIX dispatch patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (
       id, account_id, patient_id, owner_id, status, opened_by_user_id,
       closed_by_user_id, closed_at
     ) VALUES ($1, $2, $3, $4, 'closed', $5, $5, clock_timestamp())`,
    [encounterId, accountId, patientId, ownerId, actorUserId]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'open', $6, 'BRL')`,
    [billingRecordId, accountId, encounterId, patientId, ownerId, (AMOUNT_CENTS / 100).toFixed(2)]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', 'Consulta PIX', 1, $5, $5, $6)`,
    [
      `pix-dispatch-item-${randomUUID()}`,
      accountId,
      billingRecordId,
      encounterId,
      (AMOUNT_CENTS / 100).toFixed(2),
      actorUserId
    ]
  );
  await pool.query(
    `INSERT INTO encounter_payment_attempts (
       id, account_id, encounter_id, billing_record_id, requested_by_user_id,
       provider_key, amount_cents, request_key_hash, provider_idempotency_key
     ) VALUES ($1, $2, $3, $4, $5, 'local-pix', $6, $7, $8)`,
    [
      attemptId,
      accountId,
      encounterId,
      billingRecordId,
      actorUserId,
      AMOUNT_CENTS,
      randomUUID().replaceAll('-', '').padEnd(64, '0'),
      providerIdempotencyKey
    ]
  );

  return {
    accountId,
    actorUserId,
    encounterId,
    billingRecordId,
    attemptId,
    providerIdempotencyKey
  };
}

function providerResult(claim: PixPaymentDispatchClaim): PixPaymentDispatchProviderResult {
  return Object.freeze({
    providerTransactionId: `local-pix-${claim.attemptId}`,
    qrCodePayload: `000201-local-pix-${claim.attemptId}`,
    qrCodeBase64: Buffer.from(`qr:${claim.attemptId}`).toString('base64'),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString()
  });
}

function createSyntheticProvider(
  options: {
    readonly transientFailures?: number;
    readonly failureClass?: 'ambiguous' | 'permanent' | 'transient' | 'untyped';
  } = {}
): {
  readonly provider: PixPaymentDispatchProvider;
  readonly requests: () => readonly PixPaymentDispatchProviderInput[];
  readonly uniqueCreations: () => number;
  readonly callsInsideTenantTransaction: () => number;
} {
  let remainingFailures = options.transientFailures ?? 0;
  let requests: readonly PixPaymentDispatchProviderInput[] = [];
  let callsInsideTenantTransaction = 0;
  const resultsByIdempotencyKey = new Map<string, PixPaymentDispatchProviderResult>();

  const provider: PixPaymentDispatchProvider = Object.freeze({
    key: 'local-pix' as const,
    async createIntent(
      input: PixPaymentDispatchProviderInput
    ): Promise<PixPaymentDispatchProviderResult> {
      requests = Object.freeze([...requests, Object.freeze({ ...input })]);
      if (getTenantTransactionContext() || getDatabaseTransactionScope()) {
        callsInsideTenantTransaction += 1;
      }
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        if (options.failureClass === 'untyped') {
          throw new Error('synthetic upstream timeout; private-provider-body=do-not-persist');
        }
        throw new PixPaymentDispatchProviderError({
          code:
            options.failureClass === 'permanent' ? 'SYNTHETIC_REJECTED' : 'SYNTHETIC_UNAVAILABLE',
          failureClass: options.failureClass ?? 'transient',
          publicMessage:
            options.failureClass === 'permanent'
              ? 'PIX request was rejected before creation'
              : 'PIX provider is temporarily unavailable'
        });
      }

      const existing = resultsByIdempotencyKey.get(input.providerIdempotencyKey);
      if (existing) return existing;
      const created = Object.freeze({
        providerTransactionId: `local-pix-${input.attemptId}`,
        qrCodePayload: `000201-local-pix-${input.attemptId}`,
        qrCodeBase64: Buffer.from(`qr:${input.attemptId}`).toString('base64'),
        expiresAt: new Date(Date.now() + 3_600_000).toISOString()
      });
      resultsByIdempotencyKey.set(input.providerIdempotencyKey, created);
      return created;
    }
  });

  return {
    provider,
    requests: () => requests,
    uniqueCreations: () => resultsByIdempotencyKey.size,
    callsInsideTenantTransaction: () => callsInsideTenantTransaction
  };
}

function createDispatcher(
  pool: PoolType,
  provider: PixPaymentDispatchProvider,
  workerId: string,
  onCheckpoint?: (checkpoint: PixPaymentDispatchCheckpoint) => void | Promise<void>
): PixPaymentDispatcher {
  return new PixPaymentDispatcher(new DatabasePixPaymentDispatchRepository(pool), provider, {
    workerId,
    environment: 'test',
    leaseMs: LEASE_MS,
    retryBaseMs: 1,
    allowSyntheticProviders: true,
    onCheckpoint
  });
}
async function readAttempt(pool: PoolType, attemptId: string): Promise<AttemptRow> {
  const result = await pool.query<AttemptRow>(
    `SELECT state, dispatch_attempts, last_error_code, last_error_class,
            last_error_public_message, next_attempt_at,
            lease_owner, lease_token::text, lease_version::text,
            provider_transaction_id
       FROM encounter_payment_attempts
      WHERE id = $1`,
    [attemptId]
  );
  return result.rows[0]!;
}

async function expireLease(pool: PoolType, attemptId: string): Promise<void> {
  await pool.query(
    `UPDATE encounter_payment_attempts
        SET lease_expires_at = now() - interval '1 second'
      WHERE id = $1`,
    [attemptId]
  );
}

describe('synthetic PIX payment dispatcher PostgreSQL contract', () => {
  let pool: PoolType;

  beforeAll(() => {
    pool = getTestPool();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE accounts CASCADE');
  });

  it('lets two workers race while granting the pending attempt to exactly one', async () => {
    const fixture = await createPendingAttempt(pool);
    const repositoryA = new DatabasePixPaymentDispatchRepository(pool);
    const repositoryB = new DatabasePixPaymentDispatchRepository(pool);

    const claims = await Promise.all([
      repositoryA.claimNext({
        accountId: fixture.accountId,
        leaseOwner: 'pix-worker-a',
        leaseMs: LEASE_MS
      }),
      repositoryB.claimNext({
        accountId: fixture.accountId,
        leaseOwner: 'pix-worker-b',
        leaseMs: LEASE_MS
      })
    ]);
    const acquired = claims.filter((claim): claim is PixPaymentDispatchClaim => claim !== null);

    expect(acquired).toHaveLength(1);
    expect(acquired[0]).toMatchObject({
      accountId: fixture.accountId,
      attemptId: fixture.attemptId,
      dispatchAttempt: 1,
      leaseVersion: 1,
      providerIdempotencyKey: fixture.providerIdempotencyKey
    });
    expect(acquired[0]!.leaseToken).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('does not allow takeover before expiry and issues a new fencing token after expiry', async () => {
    const fixture = await createPendingAttempt(pool);
    const repository = new DatabasePixPaymentDispatchRepository(pool);
    const claimA = await repository.claimNext({
      accountId: fixture.accountId,
      leaseOwner: 'pix-worker-a',
      leaseMs: LEASE_MS
    });

    const beforeExpiry = await repository.claimNext({
      accountId: fixture.accountId,
      leaseOwner: 'pix-worker-b',
      leaseMs: LEASE_MS
    });
    expect(beforeExpiry).toBeNull();

    await expireLease(pool, fixture.attemptId);
    const claimB = await repository.claimNext({
      accountId: fixture.accountId,
      leaseOwner: 'pix-worker-b',
      leaseMs: LEASE_MS
    });

    expect(claimA).not.toBeNull();
    expect(claimB).not.toBeNull();
    expect(claimB!.attemptId).toBe(claimA!.attemptId);
    expect(claimB!.leaseToken).not.toBe(claimA!.leaseToken);
    expect(claimB!.leaseVersion).toBeGreaterThan(claimA!.leaseVersion);
    expect(claimB!.providerIdempotencyKey).toBe(claimA!.providerIdempotencyKey);
  });

  it('rejects stale completion after takeover and accepts only the active fence', async () => {
    const fixture = await createPendingAttempt(pool);
    const repository = new DatabasePixPaymentDispatchRepository(pool);
    const claimA = await repository.claimNext({
      accountId: fixture.accountId,
      leaseOwner: 'pix-worker-a',
      leaseMs: LEASE_MS
    });
    expect(claimA).not.toBeNull();
    await expireLease(pool, fixture.attemptId);
    const claimB = await repository.claimNext({
      accountId: fixture.accountId,
      leaseOwner: 'pix-worker-b',
      leaseMs: LEASE_MS
    });
    expect(claimB).not.toBeNull();

    await expect(repository.completeSuccess(claimA!, providerResult(claimA!))).resolves.toBe(false);
    expect(await readAttempt(pool, fixture.attemptId)).toMatchObject({
      state: 'pending_dispatch',
      lease_owner: 'pix-worker-b',
      lease_token: claimB!.leaseToken,
      provider_transaction_id: null
    });
    const prematureTransaction = await pool.query(
      'SELECT transaction_id FROM pix_transactions WHERE payment_attempt_id = $1',
      [fixture.attemptId]
    );
    expect(prematureTransaction.rowCount).toBe(0);

    await expect(repository.completeSuccess(claimB!, providerResult(claimB!))).resolves.toBe(true);
    expect(await readAttempt(pool, fixture.attemptId)).toMatchObject({
      state: 'awaiting_confirmation',
      lease_owner: null,
      lease_token: null,
      provider_transaction_id: `local-pix-${fixture.attemptId}`
    });
  });

  it('calls the provider only after claim commit and reuses the stable provider key', async () => {
    const fixture = await createPendingAttempt(pool);
    const synthetic = createSyntheticProvider();
    const dispatcher = createDispatcher(pool, synthetic.provider, 'pix-worker-success');

    const result = await dispatcher.processNext(fixture.accountId);

    expect(result).toMatchObject({ status: 'dispatched', attemptId: fixture.attemptId });
    expect(synthetic.callsInsideTenantTransaction()).toBe(0);
    expect(synthetic.requests()).toHaveLength(1);
    expect(synthetic.requests()[0]).toMatchObject({
      accountId: fixture.accountId,
      attemptId: fixture.attemptId,
      billingRecordId: fixture.billingRecordId,
      amountCents: AMOUNT_CENTS,
      currency: 'BRL',
      providerIdempotencyKey: fixture.providerIdempotencyKey
    });

    const persisted = await pool.query<{
      readonly attempt_state: string;
      readonly billing_status: string;
      readonly billing_settlement_status: string;
      readonly cash_reconciliation_status: string;
      readonly payment_attempt_id: string;
      readonly transaction_count: number;
    }>(
      `SELECT attempt.state AS attempt_state,
              billing.status AS billing_status,
              transaction.billing_settlement_status,
              transaction.cash_reconciliation_status,
              transaction.payment_attempt_id,
              COUNT(*) OVER ()::int AS transaction_count
         FROM encounter_payment_attempts AS attempt
         JOIN billing_records AS billing
           ON billing.account_id = attempt.account_id
          AND billing.id = attempt.billing_record_id
         JOIN pix_transactions AS transaction
           ON transaction.account_id = attempt.account_id
          AND transaction.payment_attempt_id = attempt.id
        WHERE attempt.id = $1`,
      [fixture.attemptId]
    );
    expect(persisted.rows).toEqual([
      {
        attempt_state: 'awaiting_confirmation',
        billing_status: 'open',
        billing_settlement_status: 'awaiting_payment',
        cash_reconciliation_status: 'pending',
        payment_attempt_id: fixture.attemptId,
        transaction_count: 1
      }
    ]);
  });

  it('fails closed before claim when the synthetic provider capability is absent', async () => {
    const fixture = await createPendingAttempt(pool);
    const synthetic = createSyntheticProvider();
    const dispatcher = new PixPaymentDispatcher(
      new DatabasePixPaymentDispatchRepository(pool),
      synthetic.provider,
      {
        workerId: 'pix-worker-production-default',
        leaseMs: LEASE_MS,
        retryBaseMs: 1
      }
    );

    await expect(dispatcher.processNext(fixture.accountId)).rejects.toMatchObject({
      code: 'SYNTHETIC_PIX_PROVIDER_DISABLED'
    });
    expect(synthetic.requests()).toHaveLength(0);
    expect(await readAttempt(pool, fixture.attemptId)).toMatchObject({
      dispatch_attempts: 0,
      lease_owner: null,
      state: 'pending_dispatch'
    });
  });

  it('rejects an ambient database transaction before claim or provider work', async () => {
    const fixture = await createPendingAttempt(pool);
    const synthetic = createSyntheticProvider();
    const dispatcher = createDispatcher(pool, synthetic.provider, 'pix-worker-nested');

    await expect(
      runInTenantTransaction(pool, fixture.accountId, async () =>
        dispatcher.processNext(fixture.accountId)
      )
    ).rejects.toMatchObject({ code: 'PIX_PROVIDER_CALLED_INSIDE_TRANSACTION' });
    expect(synthetic.requests()).toHaveLength(0);
    expect(await readAttempt(pool, fixture.attemptId)).toMatchObject({
      dispatch_attempts: 0,
      lease_owner: null,
      state: 'pending_dispatch'
    });
  });

  it('survives a crash after claim without calling the provider or allowing early takeover', async () => {
    const fixture = await createPendingAttempt(pool);
    const synthetic = createSyntheticProvider();
    const crashAfterClaim = createDispatcher(
      pool,
      synthetic.provider,
      'pix-worker-before-provider',
      (checkpoint) => {
        if (checkpoint === 'after_claim_commit') throw new Error('injected crash after claim');
      }
    );

    await expect(crashAfterClaim.processNext(fixture.accountId)).rejects.toThrow(
      'injected crash after claim'
    );
    expect(synthetic.requests()).toHaveLength(0);
    expect(await readAttempt(pool, fixture.attemptId)).toMatchObject({
      state: 'pending_dispatch',
      dispatch_attempts: 1,
      lease_owner: 'pix-worker-before-provider'
    });

    const earlyTakeover = createDispatcher(pool, synthetic.provider, 'pix-worker-early-takeover');
    await expect(earlyTakeover.processNext(fixture.accountId)).resolves.toEqual({ status: 'idle' });
    expect(synthetic.requests()).toHaveLength(0);
  });

  it('deduplicates provider success when the process crashes before persistence and retries after expiry', async () => {
    const fixture = await createPendingAttempt(pool);
    const synthetic = createSyntheticProvider();
    const crashBeforePersist = createDispatcher(
      pool,
      synthetic.provider,
      'pix-worker-crash-before-persist',
      (checkpoint) => {
        if (checkpoint === 'after_provider_success') {
          throw new Error('injected crash before provider result persistence');
        }
      }
    );

    await expect(crashBeforePersist.processNext(fixture.accountId)).rejects.toThrow(
      'injected crash before provider result persistence'
    );
    expect(synthetic.requests()).toHaveLength(1);
    expect(synthetic.uniqueCreations()).toBe(1);
    expect((await readAttempt(pool, fixture.attemptId)).state).toBe('pending_dispatch');

    const beforeExpiry = createDispatcher(pool, synthetic.provider, 'pix-worker-too-early');
    await expect(beforeExpiry.processNext(fixture.accountId)).resolves.toEqual({ status: 'idle' });
    expect(synthetic.requests()).toHaveLength(1);

    await expireLease(pool, fixture.attemptId);
    const recovery = createDispatcher(pool, synthetic.provider, 'pix-worker-recovery');
    await expect(recovery.processNext(fixture.accountId)).resolves.toMatchObject({
      status: 'dispatched',
      attemptId: fixture.attemptId
    });

    expect(synthetic.requests()).toHaveLength(2);
    expect(synthetic.uniqueCreations()).toBe(1);
    expect(synthetic.requests().map((request) => request.providerIdempotencyKey)).toEqual([
      fixture.providerIdempotencyKey,
      fixture.providerIdempotencyKey
    ]);
    const transactions = await pool.query<{
      readonly count: number;
      readonly provider_transaction_id: string;
    }>(
      `SELECT COUNT(*)::int AS count, MIN(provider_transaction_id) AS provider_transaction_id
         FROM pix_transactions
        WHERE payment_attempt_id = $1`,
      [fixture.attemptId]
    );
    expect(transactions.rows[0]).toEqual({
      count: 1,
      provider_transaction_id: `local-pix-${fixture.attemptId}`
    });
  });

  it('schedules a transient provider failure without settling billing or creating financial effects', async () => {
    const fixture = await createPendingAttempt(pool);
    const synthetic = createSyntheticProvider({ transientFailures: 1 });
    const dispatcher = createDispatcher(pool, synthetic.provider, 'pix-worker-transient');

    await expect(dispatcher.processNext(fixture.accountId)).resolves.toMatchObject({
      status: 'retry_scheduled',
      attemptId: fixture.attemptId
    });

    expect(await readAttempt(pool, fixture.attemptId)).toMatchObject({
      state: 'pending_dispatch',
      dispatch_attempts: 1,
      last_error_code: 'SYNTHETIC_UNAVAILABLE',
      last_error_class: 'transient',
      last_error_public_message: 'PIX provider is temporarily unavailable',
      lease_owner: null,
      lease_token: null,
      provider_transaction_id: null
    });
    const effects = await pool.query<{
      readonly billing_status: string;
      readonly cash_movements: number;
      readonly journal_entries: number;
      readonly payments: number;
      readonly pix_transactions: number;
      readonly proofs: number;
    }>(
      `SELECT
         (SELECT status FROM billing_records WHERE account_id = $1 AND id = $2) AS billing_status,
         (SELECT COUNT(*)::int FROM pix_transactions
           WHERE account_id = $1 AND payment_attempt_id = $3) AS pix_transactions,
         (SELECT COUNT(*)::int FROM encounter_receivable_payments
           WHERE account_id = $1 AND encounter_id = $4) AS payments,
         (SELECT COUNT(*)::int FROM encounter_non_cash_receipts
           WHERE account_id = $1 AND encounter_id = $4) AS proofs,
         (SELECT COUNT(*)::int FROM financial_journal_entries
           WHERE account_id = $1) AS journal_entries,
         (SELECT COUNT(*)::int FROM cash_movements
           WHERE account_id = $1) AS cash_movements`,
      [fixture.accountId, fixture.billingRecordId, fixture.attemptId, fixture.encounterId]
    );
    expect(effects.rows[0]).toEqual({
      billing_status: 'open',
      cash_movements: 0,
      journal_entries: 0,
      payments: 0,
      pix_transactions: 0,
      proofs: 0
    });
  });

  it('canonicalizes adapter-controlled error codes and messages before persistence', async () => {
    const fixture = await createPendingAttempt(pool);
    const untrustedErrorProvider: PixPaymentDispatchProvider = Object.freeze({
      key: 'local-pix',
      async createIntent() {
        throw new PixPaymentDispatchProviderError({
          code: 'TOKEN_ABC123',
          failureClass: 'transient',
          publicMessage: 'CPF 12345678900 private-provider-body=do-not-persist'
        });
      }
    });
    const dispatcher = createDispatcher(pool, untrustedErrorProvider, 'pix-worker-untrusted-error');

    await expect(dispatcher.processNext(fixture.accountId)).resolves.toMatchObject({
      status: 'retry_scheduled',
      attemptId: fixture.attemptId
    });
    const attempt = await readAttempt(pool, fixture.attemptId);
    expect(attempt).toMatchObject({
      last_error_code: 'PIX_PROVIDER_TEMPORARY_UNAVAILABLE',
      last_error_class: 'transient',
      last_error_public_message: 'PIX provider is temporarily unavailable'
    });
    expect(JSON.stringify(attempt)).not.toContain('TOKEN_ABC123');
    expect(JSON.stringify(attempt)).not.toContain('12345678900');
    expect(JSON.stringify(attempt)).not.toContain('private-provider-body');
  });

  it('routes an untyped ambiguous provider outcome to reconciliation without persisting its body', async () => {
    const fixture = await createPendingAttempt(pool);
    const synthetic = createSyntheticProvider({
      transientFailures: 1,
      failureClass: 'untyped'
    });
    const dispatcher = createDispatcher(pool, synthetic.provider, 'pix-worker-ambiguous');

    await expect(dispatcher.processNext(fixture.accountId)).resolves.toMatchObject({
      status: 'reconciliation_required',
      attemptId: fixture.attemptId
    });
    const attempt = await readAttempt(pool, fixture.attemptId);
    expect(attempt).toMatchObject({
      state: 'reconciliation_required',
      last_error_code: 'PIX_PROVIDER_OUTCOME_AMBIGUOUS',
      last_error_class: 'ambiguous',
      lease_owner: null,
      lease_token: null,
      next_attempt_at: null,
      provider_transaction_id: null
    });
    expect(attempt.last_error_public_message).not.toContain('private-provider-body');
  });

  it('aborts a provider that exceeds its deadline and requires reconciliation without financial effects', async () => {
    const fixture = await createPendingAttempt(pool);
    let observedSignal: AbortSignal | undefined;
    const hangingProvider: PixPaymentDispatchProvider = Object.freeze({
      key: 'local-pix',
      async createIntent(input) {
        observedSignal = input.signal;
        return new Promise<PixPaymentDispatchProviderResult>(() => {});
      }
    });
    const dispatcher = new PixPaymentDispatcher(
      new DatabasePixPaymentDispatchRepository(pool),
      hangingProvider,
      {
        workerId: 'pix-worker-deadline',
        leaseMs: 5_100,
        retryBaseMs: 1,
        allowSyntheticProviders: true,
        environment: 'test'
      }
    );

    await expect(dispatcher.processNext(fixture.accountId)).resolves.toEqual({
      status: 'reconciliation_required',
      attemptId: fixture.attemptId
    });
    expect(observedSignal?.aborted).toBe(true);
    expect(await readAttempt(pool, fixture.attemptId)).toMatchObject({
      state: 'reconciliation_required',
      last_error_code: 'PIX_PROVIDER_OUTCOME_AMBIGUOUS',
      last_error_class: 'ambiguous',
      lease_owner: null,
      lease_token: null,
      provider_transaction_id: null
    });
    const effects = await pool.query<{
      readonly billing_status: string;
      readonly pix_transactions: number;
    }>(
      `SELECT
         (SELECT status FROM billing_records WHERE account_id = $1 AND id = $2) AS billing_status,
         (SELECT COUNT(*)::int FROM pix_transactions
           WHERE account_id = $1 AND payment_attempt_id = $3) AS pix_transactions`,
      [fixture.accountId, fixture.billingRecordId, fixture.attemptId]
    );
    expect(effects.rows[0]).toEqual({ billing_status: 'open', pix_transactions: 0 });
  });

  it('treats malformed provider output as ambiguous and persists none of it', async () => {
    const fixture = await createPendingAttempt(pool);
    const malformedProvider: PixPaymentDispatchProvider = Object.freeze({
      key: 'local-pix',
      async createIntent() {
        return {
          providerTransactionId: `malformed-${fixture.attemptId}`,
          qrCodePayload: '',
          qrCodeBase64: 'not-base64',
          expiresAt: 'not-a-date',
          privateProviderBody: 'do-not-persist'
        } as never;
      }
    });
    const dispatcher = createDispatcher(pool, malformedProvider, 'pix-worker-malformed');

    await expect(dispatcher.processNext(fixture.accountId)).resolves.toMatchObject({
      status: 'reconciliation_required',
      attemptId: fixture.attemptId
    });
    const attempt = await readAttempt(pool, fixture.attemptId);
    expect(attempt).toMatchObject({
      state: 'reconciliation_required',
      provider_transaction_id: null
    });
    expect(JSON.stringify(attempt)).not.toContain('do-not-persist');
    const transactions = await pool.query(
      'SELECT transaction_id FROM pix_transactions WHERE payment_attempt_id = $1',
      [fixture.attemptId]
    );
    expect(transactions.rowCount).toBe(0);
  });

  it('moves a proven permanent rejection to dispatch_failed without financial effects', async () => {
    const fixture = await createPendingAttempt(pool);
    const synthetic = createSyntheticProvider({
      transientFailures: 1,
      failureClass: 'permanent'
    });
    const dispatcher = createDispatcher(pool, synthetic.provider, 'pix-worker-rejected');

    await expect(dispatcher.processNext(fixture.accountId)).resolves.toMatchObject({
      status: 'dispatch_failed',
      attemptId: fixture.attemptId
    });
    expect(await readAttempt(pool, fixture.attemptId)).toMatchObject({
      state: 'dispatch_failed',
      last_error_code: 'SYNTHETIC_REJECTED',
      last_error_class: 'permanent',
      lease_owner: null,
      provider_transaction_id: null
    });
  });

  it('escalates exhausted safe retries to reconciliation_required', async () => {
    const fixture = await createPendingAttempt(pool);
    await pool.query(
      'UPDATE encounter_payment_attempts SET max_dispatch_attempts = 1 WHERE id = $1',
      [fixture.attemptId]
    );
    const synthetic = createSyntheticProvider({ transientFailures: 1 });
    const dispatcher = createDispatcher(pool, synthetic.provider, 'pix-worker-exhausted');
    await expect(dispatcher.processNext(fixture.accountId)).resolves.toMatchObject({
      status: 'reconciliation_required',
      attemptId: fixture.attemptId
    });
    expect(await readAttempt(pool, fixture.attemptId)).toMatchObject({
      state: 'reconciliation_required',
      dispatch_attempts: 1,
      last_error_code: 'PIX_DISPATCH_ATTEMPTS_EXHAUSTED',
      last_error_class: 'ambiguous',
      last_error_public_message: 'The PIX provider outcome requires reconciliation',
      lease_owner: null,
      next_attempt_at: null
    });
  });
  it('sweeps exhausted active attempts without waiting on the reserved billing lock', async () => {
    const fixture = await createPendingAttempt(pool);
    await pool.query(
      `UPDATE encounter_payment_attempts
          SET dispatch_attempts = 1, max_dispatch_attempts = 1, next_attempt_at = NULL
        WHERE id = $1`,
      [fixture.attemptId]
    );
    const lockClient = await pool.connect();
    await lockClient.query('BEGIN');
    await lockClient.query(
      'SELECT 1 FROM billing_records WHERE account_id = $1 AND id = $2 FOR UPDATE',
      [fixture.accountId, fixture.billingRecordId]
    );
    const sweep = new DatabasePixPaymentDispatchRepository(pool).claimNext({
      accountId: fixture.accountId,
      leaseOwner: 'pix-worker-sweep-lock-order',
      leaseMs: LEASE_MS,
      providerKey: 'local-pix'
    });
    try {
      await expect(
        Promise.race([
          sweep,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('sweep waited on billing')), 2_000)
          )
        ])
      ).resolves.toBeNull();
    } finally {
      await lockClient.query('ROLLBACK');
      lockClient.release();
      await sweep.catch(() => undefined);
    }
    expect(await readAttempt(pool, fixture.attemptId)).toMatchObject({
      state: 'reconciliation_required'
    });
  });
});
