import { randomUUID } from 'node:crypto';

import { Pool, type Pool as PoolType } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { RequestEncounterPixPaymentCommand } from '../../../apps/api/src/commands/request-encounter-pix-payment.js';
import {
  assertEncounterHasNoActivePixAttempt,
  DatabaseEncounterPixPaymentAttemptRepository,
  type EncounterPixPaymentAttemptCheckpoint
} from '../../../apps/api/src/encounter-pix-payment-attempt-repository.js';
import { createTenantUnitOfWork, IdempotencyConflictError } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const AMOUNT_CENTS = 12_550;
const AMOUNT = (AMOUNT_CENTS / 100).toFixed(2);

interface Fixture {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
}

async function createFixture(
  pool: PoolType,
  overrides: {
    readonly billingStatus?: string;
    readonly encounterStatus?: 'open' | 'closed';
    readonly amount?: string;
  } = {}
): Promise<Fixture> {
  const accountId = randomUUID();
  const actorUserId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const billingRecordId = `pix-attempt-billing-${randomUUID()}`;
  const suffix = accountId.replaceAll('-', '');
  const encounterStatus = overrides.encounterStatus ?? 'closed';

  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'PIX attempt account')`,
    [accountId, TENANT_ID, `pix-attempt-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'PIX attempt operator')`,
    [actorUserId, accountId, `pix_attempt_${suffix}`, `pix-attempt-${suffix}@example.com`]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'PIX attempt owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'PIX attempt patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (
       id, account_id, patient_id, owner_id, status, opened_by_user_id,
       closed_by_user_id, closed_at
     ) VALUES (
       $1, $2, $3, $4, $5::encounter_status, $6::uuid,
       CASE WHEN $5::encounter_status = 'closed'::encounter_status THEN $6::uuid ELSE NULL END,
       CASE WHEN $5::encounter_status = 'closed'::encounter_status THEN clock_timestamp() ELSE NULL END
     )`,
    [encounterId, accountId, patientId, ownerId, encounterStatus, actorUserId]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'BRL')`,
    [
      billingRecordId,
      accountId,
      encounterId,
      patientId,
      ownerId,
      overrides.billingStatus ?? 'open',
      overrides.amount ?? AMOUNT
    ]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', 'Consulta PIX', 1, $5, $5, $6)`,
    [
      `pix-attempt-item-${randomUUID()}`,
      accountId,
      billingRecordId,
      encounterId,
      overrides.amount ?? AMOUNT,
      actorUserId
    ]
  );

  return { accountId, actorUserId, encounterId, billingRecordId };
}

function requestInput(fixture: Fixture, requestKey = `request-${randomUUID()}`) {
  return {
    accountId: fixture.accountId,
    actorUserId: fixture.actorUserId,
    encounterId: fixture.encounterId,
    providerKey: 'local-pix' as const,
    requestKey
  };
}

function executionContext(fixture: Fixture, requestKey: string) {
  return {
    accountId: fixture.accountId,
    actorUserId: fixture.actorUserId,
    correlationId: randomUUID(),
    operation: 'encounter.payment.pix.request.v1',
    idempotencyKey: requestKey
  };
}

async function counts(pool: PoolType, fixture: Fixture) {
  const result = await pool.query<{
    readonly attempts: number;
    readonly audits: number;
    readonly cashMovements: number;
    readonly journalEntries: number;
    readonly outboxEvents: number;
    readonly payments: number;
    readonly pixTransactions: number;
    readonly proofs: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM encounter_payment_attempts
         WHERE account_id = $1 AND billing_record_id = $2) AS attempts,
       (SELECT COUNT(*)::int FROM audit_events
         WHERE account_id = $1 AND entity_type = 'encounter_payment_attempt') AS audits,
       (SELECT COUNT(*)::int FROM outbox_events
         WHERE account_id = $1 AND event_type = 'payment.pix.dispatch.requested.v1') AS "outboxEvents",
       (SELECT COUNT(*)::int FROM pix_transactions
         WHERE account_id = $1 AND billing_record_id = $2) AS "pixTransactions",
       (SELECT COUNT(*)::int FROM encounter_receivable_payments
         WHERE account_id = $1 AND encounter_id = $3) AS payments,
       (SELECT COUNT(*)::int FROM encounter_non_cash_receipts
         WHERE account_id = $1 AND encounter_id = $3) AS proofs,
       (SELECT COUNT(*)::int FROM financial_journal_entries
         WHERE account_id = $1) AS "journalEntries",
       (SELECT COUNT(*)::int FROM cash_movements
         WHERE account_id = $1) AS "cashMovements"`,
    [fixture.accountId, fixture.billingRecordId, fixture.encounterId]
  );
  return result.rows[0]!;
}

async function waitUntilBlocked(pool: PoolType, processId: number): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await pool.query<{ readonly blocked: boolean }>(
      'SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked',
      [processId]
    );
    if (result.rows[0]?.blocked) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`PostgreSQL process ${processId} did not become lock-blocked`);
}

describe('RequestEncounterPixPaymentCommand PostgreSQL contract', () => {
  let pool: PoolType;
  let restrictedPool: PoolType;

  beforeAll(async () => {
    pool = getTestPool();
    const restrictedUrl = new URL(TEST_DB_URL);
    restrictedUrl.searchParams.set('options', '-c role=cvg_test_rls');
    restrictedPool = new Pool({ connectionString: restrictedUrl.toString(), max: 4 });
  });

  afterAll(async () => {
    await restrictedPool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE accounts CASCADE');
  });

  it('forces tenant RLS and rejects a billing record from another encounter in the same account', async () => {
    const fixture = await createFixture(pool);
    const encounter = await pool.query<{
      readonly owner_id: string;
      readonly patient_id: string;
    }>(
      `SELECT owner_id, patient_id
         FROM encounters
        WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, fixture.encounterId]
    );
    const otherEncounterId = randomUUID();
    await pool.query(
      `INSERT INTO encounters (
         id, account_id, patient_id, owner_id, status, opened_by_user_id,
         closed_by_user_id, closed_at
       ) VALUES ($1, $2, $3, $4, 'closed', $5, $5, clock_timestamp())`,
      [
        otherEncounterId,
        fixture.accountId,
        encounter.rows[0]!.patient_id,
        encounter.rows[0]!.owner_id,
        fixture.actorUserId
      ]
    );

    const rls = await pool.query<{
      readonly relforcerowsecurity: boolean;
      readonly relrowsecurity: boolean;
    }>(
      `SELECT relrowsecurity, relforcerowsecurity
         FROM pg_class
        WHERE oid = 'encounter_payment_attempts'::regclass`
    );
    expect(rls.rows[0]).toEqual({
      relforcerowsecurity: true,
      relrowsecurity: true
    });

    const attemptId = randomUUID();
    await expect(
      pool.query(
        `INSERT INTO encounter_payment_attempts (
           id, account_id, encounter_id, billing_record_id, requested_by_user_id,
           provider_key, amount_cents, request_key_hash, provider_idempotency_key
         ) VALUES ($1, $2, $3, $4, $5, 'local-pix', $6, $7, $8)`,
        [
          attemptId,
          fixture.accountId,
          otherEncounterId,
          fixture.billingRecordId,
          fixture.actorUserId,
          AMOUNT_CENTS,
          'a'.repeat(64),
          `cvg:pix:create:v1:${attemptId}`
        ]
      )
    ).rejects.toMatchObject({
      code: 'P0001',
      message: 'PIX_PAYMENT_RESERVATION_BILLING_MISMATCH'
    });
  });

  it('persists pending_dispatch, audit and outbox atomically before provider work', async () => {
    const fixture = await createFixture(pool);
    const requestKey = `request-${randomUUID()}`;
    const input = requestInput(fixture, requestKey);
    const command = new RequestEncounterPixPaymentCommand(
      new DatabaseEncounterPixPaymentAttemptRepository(),
      { allowSyntheticProviders: true }
    );
    const unitOfWork = createTenantUnitOfWork(pool);

    const result = await unitOfWork.execute(executionContext(fixture, requestKey), input, () =>
      command.execute(input)
    );

    expect(result.replayed).toBe(false);
    expect(result.value).toMatchObject({
      accountId: fixture.accountId,
      encounterId: fixture.encounterId,
      billingRecordId: fixture.billingRecordId,
      requestedByUserId: fixture.actorUserId,
      providerKey: 'local-pix',
      state: 'pending_dispatch',
      amountCents: AMOUNT_CENTS,
      currency: 'BRL'
    });
    expect(result.value.providerIdempotencyKey).toBe(`cvg:pix:create:v1:${result.value.id}`);
    expect(await counts(pool, fixture)).toEqual({
      attempts: 1,
      audits: 1,
      cashMovements: 0,
      journalEntries: 0,
      outboxEvents: 1,
      payments: 0,
      pixTransactions: 0,
      proofs: 0
    });
  });

  it('returns one canonical attempt on identical idempotent replay', async () => {
    const fixture = await createFixture(pool);
    const requestKey = `request-${randomUUID()}`;
    const input = requestInput(fixture, requestKey);
    const command = new RequestEncounterPixPaymentCommand(
      new DatabaseEncounterPixPaymentAttemptRepository(),
      { allowSyntheticProviders: true }
    );
    const unitOfWork = createTenantUnitOfWork(pool);

    const first = await unitOfWork.execute(executionContext(fixture, requestKey), input, () =>
      command.execute(input)
    );
    const replay = await unitOfWork.execute(executionContext(fixture, requestKey), input, () =>
      command.execute(input)
    );

    expect(replay.replayed).toBe(true);
    expect(replay.value).toEqual(first.value);
    expect((await counts(pool, fixture)).attempts).toBe(1);
  });

  it('returns the canonical repository replay after the reservation is released and billing changes', async () => {
    const fixture = await createFixture(pool);
    const requestKey = `request-${randomUUID()}`;
    const input = requestInput(fixture, requestKey);
    const command = new RequestEncounterPixPaymentCommand(
      new DatabaseEncounterPixPaymentAttemptRepository(),
      { allowSyntheticProviders: true }
    );
    const unitOfWork = createTenantUnitOfWork(pool);

    const first = await unitOfWork.execute(
      executionContext(fixture, `transport-${randomUUID()}`),
      input,
      () => command.execute(input)
    );
    await pool.query(
      `UPDATE encounter_payment_attempts
          SET state = 'dispatch_failed', next_attempt_at = NULL
        WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, first.value.id]
    );
    await pool.query(
      `UPDATE billing_records
          SET status = 'settled', updated_at = clock_timestamp()
        WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, fixture.billingRecordId]
    );

    const replay = await unitOfWork.execute(
      executionContext(fixture, `transport-${randomUUID()}`),
      input,
      () => command.execute(input)
    );

    expect(replay.replayed).toBe(false);
    expect(replay.value).toMatchObject({
      ...first.value,
      state: 'dispatch_failed',
      nextAttemptAt: null
    });
    expect((await counts(pool, fixture)).attempts).toBe(1);
  });

  it('reserves billing against settlement and item mutation until a safe terminal state', async () => {
    const fixture = await createFixture(pool);
    const input = requestInput(fixture);
    const command = new RequestEncounterPixPaymentCommand(
      new DatabaseEncounterPixPaymentAttemptRepository(),
      { allowSyntheticProviders: true }
    );
    const unitOfWork = createTenantUnitOfWork(pool);
    const created = await unitOfWork.execute(
      executionContext(fixture, input.requestKey),
      input,
      () => command.execute(input)
    );

    await expect(
      pool.query(
        `UPDATE billing_records
            SET active_payment_attempt_id = NULL
          WHERE account_id = $1 AND id = $2`,
        [fixture.accountId, fixture.billingRecordId]
      )
    ).rejects.toMatchObject({ code: 'P0001' });
    await expect(
      pool.query(
        `UPDATE encounters
            SET status = 'open', closed_by_user_id = NULL, closed_at = NULL
          WHERE account_id = $1 AND id = $2`,
        [fixture.accountId, fixture.encounterId]
      )
    ).rejects.toMatchObject({ code: 'P0001' });
    await expect(
      pool.query(
        `UPDATE billing_records
            SET status = 'settled', updated_at = clock_timestamp()
          WHERE account_id = $1 AND id = $2`,
        [fixture.accountId, fixture.billingRecordId]
      )
    ).rejects.toMatchObject({ code: 'P0001' });
    await expect(
      pool.query(
        `INSERT INTO billing_items (
           id, account_id, billing_record_id, encounter_id, item_type, description,
           quantity, unit_price_amount, total_amount, created_by_user_id
         ) VALUES ($1, $2, $3, $4, 'service', 'Late mutation', 1, 1, 1, $5)`,
        [
          `pix-reservation-item-${randomUUID()}`,
          fixture.accountId,
          fixture.billingRecordId,
          fixture.encounterId,
          fixture.actorUserId
        ]
      )
    ).rejects.toMatchObject({ code: 'P0001' });

    await pool.query(
      `UPDATE encounter_payment_attempts
          SET state = 'dispatch_failed', next_attempt_at = NULL
        WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, created.value.id]
    );
    const released = await pool.query(
      `UPDATE billing_records
          SET status = 'settled', updated_at = clock_timestamp()
        WHERE account_id = $1 AND id = $2
        RETURNING status`,
      [fixture.accountId, fixture.billingRecordId]
    );
    expect(released.rows[0]?.status).toBe('settled');
  });

  it('rejects a billing settlement that began before the concurrent reservation committed', async () => {
    const fixture = await createFixture(pool);
    const attemptId = randomUUID();
    const reservationClient = await pool.connect();
    const settlementClient = await pool.connect();
    let reservationOpen = false;
    try {
      await reservationClient.query('BEGIN');
      reservationOpen = true;
      await reservationClient.query(
        `INSERT INTO encounter_payment_attempts (
           id, account_id, encounter_id, billing_record_id, requested_by_user_id,
           provider_key, amount_cents, request_key_hash, provider_idempotency_key
         ) VALUES ($1, $2, $3, $4, $5, 'local-pix', $6, $7, $8)`,
        [
          attemptId,
          fixture.accountId,
          fixture.encounterId,
          fixture.billingRecordId,
          fixture.actorUserId,
          AMOUNT_CENTS,
          randomUUID().replaceAll('-', '').padEnd(64, '0'),
          `cvg:pix:create:v1:${attemptId}`
        ]
      );

      const backend = await settlementClient.query<{ readonly pid: number }>(
        'SELECT pg_backend_pid() AS pid'
      );
      const settlementOutcome = settlementClient
        .query(
          `UPDATE billing_records
            SET status = 'settled', updated_at = clock_timestamp()
          WHERE account_id = $1 AND id = $2`,
          [fixture.accountId, fixture.billingRecordId]
        )
        .then(
          (result) => ({ result, error: null }),
          (error: unknown) => ({ result: null, error })
        );

      await waitUntilBlocked(pool, backend.rows[0]!.pid);
      await reservationClient.query('COMMIT');
      reservationOpen = false;

      const outcome = await settlementOutcome;
      expect(outcome.result).toBeNull();
      expect(outcome.error).toMatchObject({
        code: 'P0001',
        message: 'BILLING_PAYMENT_RESERVED'
      });
      const billing = await pool.query<{ readonly status: string }>(
        `SELECT status
           FROM billing_records
          WHERE account_id = $1 AND id = $2`,
        [fixture.accountId, fixture.billingRecordId]
      );
      expect(billing.rows[0]?.status).toBe('open');
    } finally {
      if (reservationOpen) await reservationClient.query('ROLLBACK');
      reservationClient.release();
      settlementClient.release();
    }
  });

  it('serializes reopen behind a concurrent PIX reservation and returns a stable conflict', async () => {
    const fixture = await createFixture(pool);
    const input = requestInput(fixture);
    let releaseReservation!: () => void;
    const reservationCanCommit = new Promise<void>((resolve) => {
      releaseReservation = resolve;
    });
    let reservationLocked!: () => void;
    const reservationHasBillingLock = new Promise<void>((resolve) => {
      reservationLocked = resolve;
    });
    const repository = new DatabaseEncounterPixPaymentAttemptRepository({
      async onCheckpoint(checkpoint) {
        if (checkpoint !== 'after_attempt_insert') return;
        reservationLocked();
        await reservationCanCommit;
      }
    });
    const command = new RequestEncounterPixPaymentCommand(repository, {
      allowSyntheticProviders: true
    });
    const unitOfWork = createTenantUnitOfWork(pool);
    const reservationExecution = unitOfWork.execute(
      executionContext(fixture, input.requestKey),
      input,
      () => command.execute(input)
    );
    await reservationHasBillingLock;

    let reopenProcessId = 0;
    let signalReopenStarted!: () => void;
    const reopenStarted = new Promise<void>((resolve) => {
      signalReopenStarted = resolve;
    });
    let encounterMutated = false;
    const reopenExecution = unitOfWork.execute(
      {
        ...executionContext(fixture, `reopen-${randomUUID()}`),
        operation: 'POST /encounters/:id/reopen'
      },
      { reason: 'Correção clínica' },
      async (transaction) => {
        const backend = await transaction.client.query<{ readonly pid: number }>(
          'SELECT pg_backend_pid() AS pid'
        );
        reopenProcessId = backend.rows[0]!.pid;
        signalReopenStarted();
        await assertEncounterHasNoActivePixAttempt(
          new DatabaseEncounterPixPaymentAttemptRepository(),
          fixture.accountId,
          fixture.encounterId
        );
        encounterMutated = true;
        await transaction.client.query(
          `UPDATE encounters SET status = 'open' WHERE account_id = $1 AND id = $2`,
          [fixture.accountId, fixture.encounterId]
        );
        return null;
      }
    );
    await reopenStarted;
    await waitUntilBlocked(pool, reopenProcessId);
    releaseReservation();

    await reservationExecution;
    await expect(reopenExecution).rejects.toMatchObject<AppError>({
      code: 'ENCOUNTER_PAYMENT_RESERVED',
      statusCode: 409
    });
    expect(encounterMutated).toBe(false);
    const encounter = await pool.query<{ readonly status: string }>(
      'SELECT status FROM encounters WHERE account_id = $1 AND id = $2',
      [fixture.accountId, fixture.encounterId]
    );
    expect(encounter.rows[0]?.status).toBe('closed');
  });

  it('isolates attempt reads and writes through the NOBYPASSRLS role', async () => {
    const fixtureA = await createFixture(pool);
    const fixtureB = await createFixture(pool);
    const command = new RequestEncounterPixPaymentCommand(
      new DatabaseEncounterPixPaymentAttemptRepository(),
      { allowSyntheticProviders: true }
    );
    const unitOfWork = createTenantUnitOfWork(pool);
    const inputA = requestInput(fixtureA);
    const inputB = requestInput(fixtureB);
    const attemptA = await unitOfWork.execute(
      executionContext(fixtureA, inputA.requestKey),
      inputA,
      () => command.execute(inputA)
    );
    const attemptB = await unitOfWork.execute(
      executionContext(fixtureB, inputB.requestKey),
      inputB,
      () => command.execute(inputB)
    );
    const repository = new DatabaseEncounterPixPaymentAttemptRepository({ pool });

    await expect(repository.findById(fixtureA.accountId, attemptA.value.id)).resolves.toMatchObject(
      { id: attemptA.value.id, accountId: fixtureA.accountId }
    );
    await expect(repository.findById(fixtureA.accountId, attemptB.value.id)).resolves.toBeNull();

    const client = await restrictedPool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [
        fixtureA.accountId
      ]);
      const role = await client.query<{
        readonly current_user: string;
        readonly bypassrls: boolean;
      }>(
        `SELECT current_user, rolbypassrls AS bypassrls
           FROM pg_roles
          WHERE rolname = current_user`
      );
      const visible = await client.query<{ readonly id: string }>(
        'SELECT id::text FROM encounter_payment_attempts ORDER BY id::text'
      );
      const crossTenantUpdate = await client.query(
        `UPDATE encounter_payment_attempts
            SET updated_at = clock_timestamp()
          WHERE account_id = $1 AND id = $2`,
        [fixtureB.accountId, attemptB.value.id]
      );

      expect(role.rows[0]).toEqual({ current_user: 'cvg_test_rls', bypassrls: false });
      expect(visible.rows).toEqual([{ id: attemptA.value.id }]);
      expect(crossTenantUpdate.rowCount).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('rejects divergent reuse of the request key', async () => {
    const fixture = await createFixture(pool);
    const requestKey = `request-${randomUUID()}`;
    const input = requestInput(fixture, requestKey);
    const command = new RequestEncounterPixPaymentCommand(
      new DatabaseEncounterPixPaymentAttemptRepository(),
      { allowSyntheticProviders: true }
    );
    const unitOfWork = createTenantUnitOfWork(pool);
    await unitOfWork.execute(executionContext(fixture, requestKey), input, () =>
      command.execute(input)
    );

    await expect(
      unitOfWork.execute(
        executionContext(fixture, requestKey),
        { ...input, encounterId: randomUUID() },
        () => command.execute({ ...input, encounterId: randomUUID() })
      )
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect((await counts(pool, fixture)).attempts).toBe(1);
  });

  it.each([
    ['open encounter', { encounterStatus: 'open' as const }, 'ENCOUNTER_NOT_CLOSED'],
    ['settled billing', { billingStatus: 'settled' }, 'BILLING_NOT_RECEIVABLE'],
    ['zero billing', { amount: '0.00' }, 'BILLING_NOT_RECEIVABLE']
  ])('rejects %s without durable payment artifacts', async (_name, overrides, code) => {
    const fixture = await createFixture(pool, overrides);
    const input = requestInput(fixture);
    const command = new RequestEncounterPixPaymentCommand(
      new DatabaseEncounterPixPaymentAttemptRepository(),
      { allowSyntheticProviders: true }
    );
    const unitOfWork = createTenantUnitOfWork(pool);

    await expect(
      unitOfWork.execute(executionContext(fixture, input.requestKey), input, () =>
        command.execute(input)
      )
    ).rejects.toMatchObject({ code });
    expect((await counts(pool, fixture)).attempts).toBe(0);
  });

  it('rejects transaction context from another tenant', async () => {
    const fixture = await createFixture(pool);
    const other = await createFixture(pool);
    const input = requestInput(fixture);
    const command = new RequestEncounterPixPaymentCommand(
      new DatabaseEncounterPixPaymentAttemptRepository(),
      { allowSyntheticProviders: true }
    );
    const unitOfWork = createTenantUnitOfWork(pool);

    await expect(
      unitOfWork.execute(executionContext(other, input.requestKey), input, () =>
        command.execute(input)
      )
    ).rejects.toMatchObject({ code: 'PIX_PAYMENT_ATTEMPT_CONTEXT_MISMATCH' });
    expect((await counts(pool, fixture)).attempts).toBe(0);
  });

  it('fails closed for synthetic providers without explicit capability', async () => {
    const fixture = await createFixture(pool);
    const input = requestInput(fixture);
    const command = new RequestEncounterPixPaymentCommand(
      new DatabaseEncounterPixPaymentAttemptRepository()
    );
    const unitOfWork = createTenantUnitOfWork(pool);

    await expect(
      unitOfWork.execute(executionContext(fixture, input.requestKey), input, () =>
        command.execute(input)
      )
    ).rejects.toMatchObject({ code: 'SYNTHETIC_PIX_PROVIDER_DISABLED' });
    expect((await counts(pool, fixture)).attempts).toBe(0);
  });

  it.each<EncounterPixPaymentAttemptCheckpoint>([
    'after_attempt_insert',
    'after_audit_append',
    'after_outbox_append'
  ])('rolls back every artifact after failpoint %s', async (checkpoint) => {
    const fixture = await createFixture(pool);
    const input = requestInput(fixture);
    const command = new RequestEncounterPixPaymentCommand(
      new DatabaseEncounterPixPaymentAttemptRepository({
        onCheckpoint(current) {
          if (current === checkpoint) throw new AppError('INJECTED_FAILURE', checkpoint, 500);
        }
      }),
      { allowSyntheticProviders: true }
    );
    const unitOfWork = createTenantUnitOfWork(pool);

    await expect(
      unitOfWork.execute(executionContext(fixture, input.requestKey), input, () =>
        command.execute(input)
      )
    ).rejects.toMatchObject({ code: 'INJECTED_FAILURE' });
    expect(await counts(pool, fixture)).toEqual({
      attempts: 0,
      audits: 0,
      cashMovements: 0,
      journalEntries: 0,
      outboxEvents: 0,
      payments: 0,
      pixTransactions: 0,
      proofs: 0
    });
  });
});
