import { createHash, randomUUID } from 'node:crypto';

import { Pool, type Pool as PoolType } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ConfirmedPixSettlementCommand } from '../../../apps/api/src/commands/confirmed-pix-settlement.js';
import { DatabaseConfirmedPixSettlementRepository } from '../../../apps/api/src/confirmed-pix-settlement-repository.js';
import {
  createTenantUnitOfWork,
  type JsonValue
} from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const AMOUNT_CENTS = 12_550;
const AMOUNT = AMOUNT_CENTS / 100;
const PROVIDER = 'local-pix' as const;

function inboxEventId(providerEventId: string): string {
  return createHash('sha256').update(`${PROVIDER}\0${providerEventId}`).digest('hex');
}

interface Fixture {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly billingRecordId: string;
  readonly confirmedAt: string;
  readonly encounterId: string;
  readonly providerEventId: string;
  readonly providerTransactionId: string;
  readonly transactionId: string;
}

interface OtherTenant {
  readonly accountId: string;
  readonly actorUserId: string;
}

interface SettlementRecord {
  readonly id: string;
  readonly accountId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly receivablePaymentId: string;
  readonly journalEntryId: string;
  readonly provider: typeof PROVIDER;
  readonly providerEventId: string;
  readonly transactionId: string;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly confirmedAt: string;
}

async function createFixture(pool: PoolType): Promise<Fixture> {
  const accountId = randomUUID();
  const actorUserId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const billingRecordId = `pix-billing-${randomUUID()}`;
  const transactionId = `pix_${randomUUID()}`;
  const providerTransactionId = `provider_pix_${randomUUID()}`;
  const providerEventId = `provider_event_${randomUUID()}`;
  const confirmedAt = new Date().toISOString();
  const suffix = accountId.replaceAll('-', '');

  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Confirmed PIX settlement account')`,
    [accountId, TENANT_ID, `confirmed-pix-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'Confirmed PIX settlement operator')`,
    [actorUserId, accountId, `confirmed_pix_${suffix}`, `confirmed-pix-${suffix}@example.com`]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Confirmed PIX settlement owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Confirmed PIX settlement patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (
       id, account_id, patient_id, owner_id, status, opened_by_user_id, closed_by_user_id, closed_at
     ) VALUES ($1, $2, $3, $4, 'closed', $5, $5, $6)`,
    [encounterId, accountId, patientId, ownerId, actorUserId, confirmedAt]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'open', $6, 'BRL')`,
    [billingRecordId, accountId, encounterId, patientId, ownerId, AMOUNT]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', 'Consulta PIX', 1, $5, $5, $6)`,
    [`pix-item-${randomUUID()}`, accountId, billingRecordId, encounterId, AMOUNT, actorUserId]
  );
  await pool.query(
    `INSERT INTO pix_transactions (
       transaction_id, provider, account_id, billing_record_id, amount, currency,
       description, qr_code_payload, qr_code_base64, expires_at, status,
       provider_transaction_id, provider_confirmation_id, completed_at,
       last_provider_sync_at, billing_settlement_status, cash_reconciliation_status
     ) VALUES (
       $1, $2, $3, $4, $5, 'BRL', 'Consulta PIX', 'pix-test-payload',
       'cGl4LXRlc3Q=', $6::timestamptz + interval '30 minutes', 'completed',
       $7, $8, $6, $6, 'pending', 'pending'
     )`,
    [
      transactionId,
      PROVIDER,
      accountId,
      billingRecordId,
      AMOUNT,
      confirmedAt,
      providerTransactionId,
      `confirmation_${randomUUID()}`
    ]
  );

  return {
    accountId,
    actorUserId,
    billingRecordId,
    confirmedAt,
    encounterId,
    providerEventId,
    providerTransactionId,
    transactionId
  };
}

async function createOtherTenant(pool: PoolType): Promise<OtherTenant> {
  const accountId = randomUUID();
  const actorUserId = randomUUID();
  const suffix = accountId.replaceAll('-', '');
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Other PIX account')`,
    [accountId, TENANT_ID, `other-pix-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'Other PIX operator')`,
    [actorUserId, accountId, `other_pix_${suffix}`, `other-pix-${suffix}@example.com`]
  );
  return { accountId, actorUserId };
}

function context(fixture: Pick<Fixture, 'accountId' | 'actorUserId'>, idempotencyKey: string) {
  return {
    accountId: fixture.accountId,
    actorUserId: fixture.actorUserId,
    correlationId: randomUUID(),
    operation: 'provider.pix.confirmation.apply',
    idempotencyKey
  };
}

function input(fixture: Fixture) {
  return {
    accountId: fixture.accountId,
    actorUserId: fixture.actorUserId,
    provider: PROVIDER,
    providerEventId: fixture.providerEventId,
    transactionId: fixture.transactionId,
    billingRecordId: fixture.billingRecordId,
    amountCents: AMOUNT_CENTS,
    currency: 'BRL' as const,
    confirmedAt: fixture.confirmedAt
  };
}

async function artifactCounts(pool: PoolType, fixture: Fixture) {
  const result = await pool.query<{
    readonly audits: number;
    readonly cash_movements: number;
    readonly financial_accounts: number;
    readonly inbox_events: number;
    readonly journal_entries: number;
    readonly outbox_events: number;
    readonly payments: number;
    readonly proofs: number;
    readonly receivables: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int
          FROM encounter_non_cash_receipts
         WHERE account_id = $1 AND transaction_id = $2) AS proofs,
       (SELECT COUNT(*)::int
          FROM encounter_receivable_payments
         WHERE account_id = $1
           AND external_reference_type = 'pix_transaction'
           AND external_reference_id = $2) AS payments,
       (SELECT COUNT(*)::int
          FROM encounter_financial_accounts
         WHERE account_id = $1 AND encounter_id = $4) AS financial_accounts,
       (SELECT COUNT(*)::int
          FROM encounter_receivables
         WHERE account_id = $1 AND encounter_id = $4) AS receivables,
       (SELECT COUNT(*)::int
          FROM financial_journal_entries
         WHERE account_id = $1 AND source_type = 'encounter_non_cash_receipt') AS journal_entries,
       (SELECT COUNT(*)::int
          FROM audit_events
         WHERE account_id = $1 AND entity_type = 'encounter_non_cash_receipt') AS audits,
       (SELECT COUNT(*)::int
          FROM outbox_events
         WHERE account_id = $1 AND event_type = 'encounter.non-cash-receipt.created') AS outbox_events,
       (SELECT COUNT(*)::int
          FROM inbox_events
         WHERE account_id = $1
           AND consumer_name = 'confirmed-pix-settlement'
           AND event_id = $3) AS inbox_events,
       (SELECT COUNT(*)::int FROM cash_movements WHERE account_id = $1) AS cash_movements`,
    [
      fixture.accountId,
      fixture.transactionId,
      inboxEventId(fixture.providerEventId),
      fixture.encounterId
    ]
  );
  return result.rows[0];
}

function executeSettlement(
  pool: PoolType,
  fixture: Fixture,
  idempotencyKey: string,
  payload = input(fixture)
) {
  const unitOfWork = createTenantUnitOfWork(pool);
  const command = new ConfirmedPixSettlementCommand(
    new DatabaseConfirmedPixSettlementRepository(),
    { allowSyntheticProviders: true }
  );
  return unitOfWork.execute(
    context(fixture, idempotencyKey),
    payload,
    async () => command.execute(payload) as unknown as JsonValue
  );
}

describe('atomic confirmed PIX settlement command', () => {
  let adminPool: PoolType;
  let restrictedPool: PoolType;

  beforeAll(() => {
    const restrictedUrl = new URL(TEST_DB_URL);
    restrictedUrl.searchParams.set('options', '-c role=cvg_test_rls');
    restrictedPool = new Pool({ connectionString: restrictedUrl.toString(), max: 8 });
  });

  afterAll(async () => {
    await restrictedPool.end();
  });

  beforeEach(() => {
    adminPool = getTestPool();
  });

  it('fails closed for a synthetic provider unless the caller explicitly enables test capability', async () => {
    const fixture = await createFixture(adminPool);
    const command = new ConfirmedPixSettlementCommand(
      new DatabaseConfirmedPixSettlementRepository()
    );

    await expect(command.execute(input(fixture))).rejects.toMatchObject<AppError>({
      code: 'SYNTHETIC_PIX_PROVIDER_DISABLED',
      statusCode: 503
    });
  });

  it('installs typed lookup indexes for deferred proof rechecks', async () => {
    const result = await adminPool.query<{ readonly indexname: string }>(
      `SELECT indexname
         FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = ANY($1::text[])
        ORDER BY indexname`,
      [[
        'idx_encounter_non_cash_receipts_account_encounter',
        'idx_encounter_non_cash_receipts_account_financial',
        'idx_encounter_non_cash_receipts_account_receivable'
      ]]
    );

    expect(result.rows.map((row) => row.indexname)).toEqual([
      'idx_encounter_non_cash_receipts_account_encounter',
      'idx_encounter_non_cash_receipts_account_financial',
      'idx_encounter_non_cash_receipts_account_receivable'
    ]);
    const definition = await adminPool.query<{ readonly definition: string }>(
      `SELECT pg_get_functiondef('app.recheck_linked_encounter_non_cash_receipts()'::regprocedure)
        AS definition`
    );
    expect(definition.rows[0]?.definition).toContain('%I = $2::%s');
    expect(definition.rows[0]?.definition).not.toContain('%I::text = $2');
  });

  it('reconciles one completed PIX into billing, receivable, journal, proof, audit and outbox without cash', async () => {
    const fixture = await createFixture(adminPool);
    const idempotencyKey = randomUUID();

    const first = await executeSettlement(restrictedPool, fixture, idempotencyKey);
    const replay = await executeSettlement(restrictedPool, fixture, idempotencyKey);

    expect(first.replayed).toBe(false);
    expect(replay).toEqual({ value: first.value, replayed: true });
    expect(first.value).toMatchObject<SettlementRecord>({
      accountId: fixture.accountId,
      encounterId: fixture.encounterId,
      billingRecordId: fixture.billingRecordId,
      provider: PROVIDER,
      providerEventId: fixture.providerEventId,
      transactionId: fixture.transactionId,
      amountCents: AMOUNT_CENTS,
      currency: 'BRL',
      confirmedAt: fixture.confirmedAt
    });
    expect(await artifactCounts(adminPool, fixture)).toEqual({
      proofs: 1,
      payments: 1,
      financial_accounts: 1,
      receivables: 1,
      journal_entries: 1,
      audits: 1,
      outbox_events: 1,
      inbox_events: 1,
      cash_movements: 0
    });

    const state = await adminPool.query(
      `SELECT billing.status AS billing_status,
              financial.financial_status,
              financial.paid_amount,
              financial.balance_due,
              receivable.status AS receivable_status,
              receivable.amount_paid,
              receivable.amount_outstanding,
              pix.status AS pix_status,
              pix.billing_settlement_status,
              pix.cash_reconciliation_status,
              pix.provider_webhook_event_id,
              journal.total_debit,
              journal.total_credit,
              journal.pix_debit,
              journal.clinical_revenue_credit
         FROM encounter_non_cash_receipts AS proof
         JOIN billing_records AS billing
           ON billing.account_id = proof.account_id AND billing.id = proof.billing_record_id
         JOIN encounter_financial_accounts AS financial
           ON financial.account_id = proof.account_id AND financial.id = proof.financial_account_id
         JOIN encounter_receivables AS receivable
           ON receivable.account_id = proof.account_id AND receivable.id = proof.receivable_id
         JOIN pix_transactions AS pix
           ON pix.account_id = proof.account_id AND pix.transaction_id = proof.transaction_id
         JOIN LATERAL (
           SELECT SUM(lines.debit) AS total_debit,
                  SUM(lines.credit) AS total_credit,
                  SUM(lines.debit) FILTER (
                    WHERE lines.account_code = '1.1.02-bancos-pix'
                  ) AS pix_debit,
                  SUM(lines.credit) FILTER (
                    WHERE lines.account_code = '3.1.01-receita-clinica'
                  ) AS clinical_revenue_credit
             FROM financial_journal_lines AS lines
            WHERE lines.account_id = proof.account_id
              AND lines.entry_id = proof.journal_entry_id
         ) AS journal ON TRUE
        WHERE proof.account_id = $1 AND proof.provider_event_id = $2`,
      [fixture.accountId, fixture.providerEventId]
    );
    expect(state.rows[0]).toMatchObject({
      billing_status: 'settled',
      financial_status: 'paid',
      paid_amount: '125.50',
      balance_due: '0.00',
      receivable_status: 'settled',
      amount_paid: '125.50',
      amount_outstanding: '0.00',
      pix_status: 'completed',
      billing_settlement_status: 'applied',
      cash_reconciliation_status: 'not_applicable',
      provider_webhook_event_id: fixture.providerEventId,
      total_debit: '125.50',
      total_credit: '125.50',
      pix_debit: '125.50',
      clinical_revenue_credit: '125.50'
    });
  });

  it('serializes two workers with different request keys into one canonical provider-event settlement', async () => {
    const fixture = await createFixture(adminPool);

    const results = await Promise.all([
      executeSettlement(restrictedPool, fixture, randomUUID()),
      executeSettlement(restrictedPool, fixture, randomUUID())
    ]);

    expect(results[0]?.value).toEqual(results[1]?.value);
    expect(await artifactCounts(adminPool, fixture)).toEqual({
      proofs: 1,
      payments: 1,
      financial_accounts: 1,
      receivables: 1,
      journal_entries: 1,
      audits: 1,
      outbox_events: 1,
      inbox_events: 1,
      cash_movements: 0
    });
  });

  it('returns the canonical replay when a replacement worker uses another service user in the tenant', async () => {
    const fixture = await createFixture(adminPool);
    const replacementActorUserId = randomUUID();
    const suffix = replacementActorUserId.replaceAll('-', '');
    await adminPool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'hash', 'Replacement PIX worker')`,
      [
        replacementActorUserId,
        fixture.accountId,
        `replacement_pix_${suffix}`,
        `replacement-pix-${suffix}@example.com`
      ]
    );
    const replacementFixture = Object.freeze({
      ...fixture,
      actorUserId: replacementActorUserId
    });

    const first = await executeSettlement(restrictedPool, fixture, randomUUID());
    const replay = await executeSettlement(
      restrictedPool,
      replacementFixture,
      randomUUID()
    );

    expect(replay.value).toEqual(first.value);
    expect(replay.replayed).toBe(false);
    expect(await artifactCounts(adminPool, fixture)).toMatchObject({
      proofs: 1,
      payments: 1,
      financial_accounts: 1,
      receivables: 1,
      journal_entries: 1,
      audits: 1,
      outbox_events: 1,
      inbox_events: 1,
      cash_movements: 0
    });
  });

  it('persists the locked PIX timestamp exactly when PostgreSQL contains microseconds', async () => {
    const fixture = await createFixture(adminPool);
    const providerTimestamp = '2026-08-22T13:45:12.123456Z';
    await adminPool.query(
      `UPDATE pix_transactions
          SET completed_at = $3, last_provider_sync_at = $3
        WHERE account_id = $1 AND transaction_id = $2`,
      [fixture.accountId, fixture.transactionId, providerTimestamp]
    );

    const result = await executeSettlement(
      restrictedPool,
      fixture,
      randomUUID(),
      { ...input(fixture), confirmedAt: providerTimestamp }
    );

    expect(result.value.confirmedAt).toBe('2026-08-22T13:45:12.123Z');
    const exact = await adminPool.query<{ readonly matches: boolean }>(
      `SELECT proof.confirmed_at = pix.completed_at AS matches
         FROM encounter_non_cash_receipts AS proof
         JOIN pix_transactions AS pix
           ON pix.account_id = proof.account_id AND pix.transaction_id = proof.transaction_id
        WHERE proof.account_id = $1 AND proof.transaction_id = $2`,
      [fixture.accountId, fixture.transactionId]
    );
    expect(exact.rows[0]?.matches).toBe(true);
  });

  it('rolls every local effect back when a later stage fails', async () => {
    const fixture = await createFixture(adminPool);
    const unitOfWork = createTenantUnitOfWork(restrictedPool);
    const command = new ConfirmedPixSettlementCommand(
      new DatabaseConfirmedPixSettlementRepository(),
      { allowSyntheticProviders: true }
    );
    const payload = input(fixture);

    await expect(
      unitOfWork.execute(
        context(fixture, randomUUID()),
        payload,
        async () => {
          await command.execute(payload);
          throw new Error('injected failure after confirmed PIX settlement');
        }
      )
    ).rejects.toThrow('injected failure after confirmed PIX settlement');

    expect(await artifactCounts(adminPool, fixture)).toEqual({
      proofs: 0,
      payments: 0,
      financial_accounts: 0,
      receivables: 0,
      journal_entries: 0,
      audits: 0,
      outbox_events: 0,
      inbox_events: 0,
      cash_movements: 0
    });
    const state = await adminPool.query(
      `SELECT billing.status AS billing_status,
              pix.billing_settlement_status,
              pix.cash_reconciliation_status,
              pix.provider_webhook_event_id
         FROM billing_records AS billing
         JOIN pix_transactions AS pix
           ON pix.account_id = billing.account_id AND pix.billing_record_id = billing.id
        WHERE billing.account_id = $1 AND billing.id = $2`,
      [fixture.accountId, fixture.billingRecordId]
    );
    expect(state.rows[0]).toEqual({
      billing_status: 'open',
      billing_settlement_status: 'pending',
      cash_reconciliation_status: 'pending',
      provider_webhook_event_id: null
    });
  });

  it('rolls the whole settlement back when deferred journal consistency fails at commit', async () => {
    const fixture = await createFixture(adminPool);
    const unitOfWork = createTenantUnitOfWork(restrictedPool);
    const command = new ConfirmedPixSettlementCommand(
      new DatabaseConfirmedPixSettlementRepository(),
      { allowSyntheticProviders: true }
    );
    const payload = input(fixture);

    await expect(
      unitOfWork.execute(
        context(fixture, randomUUID()),
        payload,
        async (transaction) => {
          const created = await command.execute(payload) as unknown as SettlementRecord;
          await transaction.client.query(
            `DELETE FROM financial_journal_lines
              WHERE account_id = $1 AND entry_id = $2 AND debit > 0`,
            [fixture.accountId, created.journalEntryId]
          );
          return created as unknown as JsonValue;
        }
      )
    ).rejects.toThrow();

    expect(await artifactCounts(adminPool, fixture)).toEqual({
      proofs: 0,
      payments: 0,
      financial_accounts: 0,
      receivables: 0,
      journal_entries: 0,
      audits: 0,
      outbox_events: 0,
      inbox_events: 0,
      cash_movements: 0
    });
  });

  it('rejects divergent reuse of a processed provider event without creating a second effect', async () => {
    const fixture = await createFixture(adminPool);
    await executeSettlement(restrictedPool, fixture, randomUUID());
    const divergent = { ...input(fixture), amountCents: AMOUNT_CENTS + 1 };

    await expect(
      executeSettlement(restrictedPool, fixture, randomUUID(), divergent)
    ).rejects.toMatchObject<AppError>({
      code: 'CONFIRMED_PIX_EVENT_CONFLICT',
      statusCode: 409
    });

    expect(await artifactCounts(adminPool, fixture)).toEqual({
      proofs: 1,
      payments: 1,
      financial_accounts: 1,
      receivables: 1,
      journal_entries: 1,
      audits: 1,
      outbox_events: 1,
      inbox_events: 1,
      cash_movements: 0
    });
  });

  it('rejects an incorrect amount before any settlement artifact is created', async () => {
    const fixture = await createFixture(adminPool);
    const mismatched = { ...input(fixture), amountCents: AMOUNT_CENTS - 1 };

    await expect(
      executeSettlement(restrictedPool, fixture, randomUUID(), mismatched)
    ).rejects.toMatchObject<AppError>({
      code: 'PIX_CONFIRMATION_AMOUNT_MISMATCH',
      statusCode: 409
    });
    expect(await artifactCounts(adminPool, fixture)).toEqual({
      proofs: 0,
      payments: 0,
      financial_accounts: 0,
      receivables: 0,
      journal_entries: 0,
      audits: 0,
      outbox_events: 0,
      inbox_events: 0,
      cash_movements: 0
    });
  });

  it('rejects a provider mismatch before any settlement artifact is committed', async () => {
    const fixture = await createFixture(adminPool);
    const mismatched = { ...input(fixture), provider: 'pagarme' as const };

    await expect(
      executeSettlement(restrictedPool, fixture, randomUUID(), mismatched)
    ).rejects.toMatchObject<AppError>({
      code: 'PIX_CONFIRMATION_PROVIDER_MISMATCH',
      statusCode: 409
    });
    expect(await artifactCounts(adminPool, fixture)).toEqual({
      proofs: 0,
      payments: 0,
      financial_accounts: 0,
      receivables: 0,
      journal_entries: 0,
      audits: 0,
      outbox_events: 0,
      inbox_events: 0,
      cash_movements: 0
    });
  });

  it('rejects an already-settled billing record without creating a second financial chain', async () => {
    const fixture = await createFixture(adminPool);
    await adminPool.query(
      `UPDATE billing_records SET status = 'settled' WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, fixture.billingRecordId]
    );

    await expect(
      executeSettlement(restrictedPool, fixture, randomUUID())
    ).rejects.toMatchObject<AppError>({
      code: 'BILLING_NOT_RECEIVABLE',
      statusCode: 409
    });
    expect(await artifactCounts(adminPool, fixture)).toEqual({
      proofs: 0,
      payments: 0,
      financial_accounts: 0,
      receivables: 0,
      journal_entries: 0,
      audits: 0,
      outbox_events: 0,
      inbox_events: 0,
      cash_movements: 0
    });
  });

  it('rolls back every local write when each write checkpoint fails independently', async () => {
    const failurePoints = [
      'after_inbox_claim',
      'after_financial_account_insert',
      'after_receivable_insert',
      'after_receivable_settlement',
      'after_receivable_payment_insert',
      'after_financial_account_settlement',
      'after_billing_settlement',
      'after_pix_settlement',
      'after_journal_entry_insert',
      'after_journal_lines_insert',
      'after_proof_insert',
      'after_audit_append',
      'after_outbox_append'
    ] as const;

    for (const failurePoint of failurePoints) {
      const fixture = await createFixture(adminPool);
      const payload = input(fixture);
      const unitOfWork = createTenantUnitOfWork(restrictedPool);
      const repository = new DatabaseConfirmedPixSettlementRepository({
        onCheckpoint(checkpoint) {
          if (checkpoint === failurePoint) {
            throw new Error(`injected failure at ${failurePoint}`);
          }
        }
      });
      const command = new ConfirmedPixSettlementCommand(
        repository,
        { allowSyntheticProviders: true }
      );

      await expect(
        unitOfWork.execute(
          context(fixture, randomUUID()),
          payload,
          async () => command.execute(payload) as unknown as JsonValue
        )
      ).rejects.toThrow(`injected failure at ${failurePoint}`);
      expect(await artifactCounts(adminPool, fixture), failurePoint).toEqual({
        proofs: 0,
        payments: 0,
        financial_accounts: 0,
        receivables: 0,
        journal_entries: 0,
        audits: 0,
        outbox_events: 0,
        inbox_events: 0,
        cash_movements: 0
      });
    }
  });

  it('does not reveal or settle a PIX transaction through another tenant context', async () => {
    const fixture = await createFixture(adminPool);
    const otherTenant = await createOtherTenant(adminPool);
    const crossTenantPayload = {
      ...input(fixture),
      accountId: otherTenant.accountId,
      actorUserId: otherTenant.actorUserId
    };
    const unitOfWork = createTenantUnitOfWork(restrictedPool);
    const command = new ConfirmedPixSettlementCommand(
      new DatabaseConfirmedPixSettlementRepository(),
      { allowSyntheticProviders: true }
    );

    await expect(
      unitOfWork.execute(
        context(otherTenant, randomUUID()),
        crossTenantPayload,
        async () => command.execute(crossTenantPayload) as unknown as JsonValue
      )
    ).rejects.toMatchObject<AppError>({
      code: 'PIX_TRANSACTION_NOT_FOUND',
      statusCode: 404
    });
    expect(await artifactCounts(adminPool, fixture)).toEqual({
      proofs: 0,
      payments: 0,
      financial_accounts: 0,
      receivables: 0,
      journal_entries: 0,
      audits: 0,
      outbox_events: 0,
      inbox_events: 0,
      cash_movements: 0
    });
  });
});
