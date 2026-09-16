import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPool: vi.fn(),
  getTenantTransactionContext: vi.fn(),
  withTenantQueryExplicit: vi.fn(),
  query: vi.fn()
}));

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: mocks.getPool,
  getTenantTransactionContext: mocks.getTenantTransactionContext,
  IdempotencyConflictError: class MockIdempotencyConflictError extends Error {
    public constructor() {
      super('idempotency conflict');
      this.name = 'IdempotencyConflictError';
    }
  }
}));
vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQueryExplicit: mocks.withTenantQueryExplicit
}));

import {
  assertEncounterHasNoActivePixAttempt,
  DatabaseEncounterPixPaymentAttemptRepository,
  type RequestEncounterPixPaymentInput
} from '../../../apps/api/src/encounter-pix-payment-attempt-repository.js';

const accountId = '11111111-1111-4111-8111-111111111111';
const otherAccountId = '99999999-9999-4999-8999-999999999999';
const actorUserId = '22222222-2222-4222-8222-222222222222';
const otherActorUserId = '88888888-8888-4888-8888-888888888888';
const encounterId = '33333333-3333-4333-8333-333333333333';
const billingRecordId = '44444444-4444-4444-8444-444444444444';
const attemptId = '55555555-5555-4555-8555-555555555555';
const requestKey = 'request-1';
const requestKeyHash = createHash('sha256').update(requestKey, 'utf8').digest('hex');

const input: RequestEncounterPixPaymentInput = {
  accountId,
  actorUserId,
  encounterId,
  providerKey: 'local-pix',
  requestKey
};

function attemptRow(overrides: Record<string, unknown> = {}) {
  return {
    id: attemptId,
    account_id: accountId,
    encounter_id: encounterId,
    billing_record_id: billingRecordId,
    requested_by_user_id: actorUserId,
    payment_method: 'pix',
    provider_key: 'local-pix',
    state: 'pending_dispatch',
    amount_cents: '12550',
    currency: 'BRL',
    request_key_hash: requestKeyHash,
    provider_idempotency_key: `cvg:pix:create:v1:${attemptId}`,
    provider_transaction_id: null,
    qr_code_payload: null,
    qr_code_base64: null,
    expires_at: null,
    last_error_code: null,
    last_error_public_message: null,
    dispatch_attempts: 0,
    max_dispatch_attempts: 5,
    next_attempt_at: null,
    version: '1',
    created_at: '2026-09-16T12:00:00.000Z',
    updated_at: '2026-09-16T12:00:01.000Z',
    ...overrides
  };
}

const billing = {
  id: billingRecordId,
  status: 'open',
  currency: 'BRL',
  amount_cents: '12550',
  has_items: true
};

const financial = {
  financial_status: 'pending',
  total_amount: '125.50',
  paid_amount: '0.00',
  balance_due: '125.50'
};

function transaction() {
  return {
    accountId,
    actorUserId,
    client: { query: mocks.query },
    audit: { append: vi.fn().mockResolvedValue(undefined) },
    outbox: { append: vi.fn().mockResolvedValue(undefined) }
  } as never;
}

function installTenantQueryHarness(): void {
  mocks.withTenantQueryExplicit.mockImplementation(
    async (
      _pool: unknown,
      _accountId: string,
      callback: (client: { query: typeof mocks.query }) => unknown
    ) => callback({ query: mocks.query })
  );
}

function installCreateResponses(options: {
  request?: readonly unknown[];
  billing?: readonly unknown[];
  financial?: readonly unknown[];
  encounter?: readonly unknown[];
  existing?: readonly unknown[];
  inserted?: readonly unknown[];
  concurrentRequest?: readonly unknown[];
  concurrentBilling?: readonly unknown[];
} = {}): void {
  mocks.query
    .mockResolvedValueOnce({ rows: options.request ?? [] })
    .mockResolvedValueOnce({ rows: options.billing ?? [billing] });
  if ((options.billing ?? [billing]).length > 0) {
    mocks.query
      .mockResolvedValueOnce({ rows: options.financial ?? [financial] })
      .mockResolvedValueOnce({ rows: options.encounter ?? [{ status: 'closed' }] })
      .mockResolvedValueOnce({ rows: options.existing ?? [] })
      .mockResolvedValueOnce({ rows: options.inserted ?? [attemptRow()] });
    if ((options.inserted ?? [attemptRow()]).length === 0) {
      mocks.query
        .mockResolvedValueOnce({ rows: options.concurrentRequest ?? [] })
        .mockResolvedValueOnce({ rows: options.concurrentBilling ?? [] });
    }
  }
}

beforeEach(() => {
  mocks.getPool.mockReset();
  mocks.getTenantTransactionContext.mockReset();
  mocks.withTenantQueryExplicit.mockReset();
  mocks.query.mockReset();
  mocks.getTenantTransactionContext.mockReturnValue(undefined);
  mocks.getPool.mockReturnValue({});
});

describe('assertEncounterHasNoActivePixAttempt', () => {
  it('uses the repository when no tenant transaction is active', async () => {
    const repository = {
      findActiveByEncounter: vi.fn().mockResolvedValue(null)
    };

    await expect(
      assertEncounterHasNoActivePixAttempt(repository as never, accountId, encounterId)
    ).resolves.toBeUndefined();
    expect(repository.findActiveByEncounter).toHaveBeenCalledWith(accountId, encounterId);
  });

  it('rejects an active repository attempt and validates transaction account scope', async () => {
    const repository = {
      findActiveByEncounter: vi.fn().mockResolvedValue({ id: attemptId })
    };
    await expect(
      assertEncounterHasNoActivePixAttempt(repository as never, accountId, encounterId)
    ).rejects.toMatchObject({ code: 'ENCOUNTER_PAYMENT_RESERVED', statusCode: 409 });

    const context = transaction();
    mocks.getTenantTransactionContext.mockReturnValue(context);
    await expect(
      assertEncounterHasNoActivePixAttempt(repository as never, otherAccountId, encounterId)
    ).rejects.toMatchObject({ code: 'PIX_PAYMENT_ATTEMPT_CONTEXT_MISMATCH', statusCode: 403 });
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('locks the billing row and checks both active and empty transaction results', async () => {
    const context = transaction();
    mocks.getTenantTransactionContext.mockReturnValue(context);
    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(
      assertEncounterHasNoActivePixAttempt({} as never, accountId, encounterId)
    ).resolves.toBeUndefined();

    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: attemptId }] });
    await expect(
      assertEncounterHasNoActivePixAttempt({} as never, accountId, encounterId)
    ).rejects.toMatchObject({ code: 'ENCOUNTER_PAYMENT_RESERVED', statusCode: 409 });
    expect(mocks.query).toHaveBeenCalledTimes(4);
  });
});

describe('DatabaseEncounterPixPaymentAttemptRepository reads', () => {
  it('maps nullable and dated fields and returns null for empty reads', async () => {
    installTenantQueryHarness();
    const repository = new DatabaseEncounterPixPaymentAttemptRepository();
    mocks.query.mockResolvedValueOnce({
      rows: [attemptRow({
        expires_at: new Date('2026-09-16T13:00:00.000Z'),
        next_attempt_at: '2026-09-16T13:30:00.000Z',
        provider_transaction_id: 'provider-tx'
      })]
    });
    await expect(repository.findById(accountId, attemptId)).resolves.toMatchObject({
      id: attemptId,
      amountCents: 12550,
      expiresAt: '2026-09-16T13:00:00.000Z',
      nextAttemptAt: '2026-09-16T13:30:00.000Z',
      providerTransactionId: 'provider-tx',
      version: 1
    });

    mocks.query.mockResolvedValueOnce({ rows: [] });
    await expect(repository.findActiveByEncounter(accountId, encounterId)).resolves.toBeNull();
    mocks.query.mockResolvedValueOnce({ rows: [attemptRow()] });
    await expect(repository.findLatestByEncounter(accountId, encounterId)).resolves.toMatchObject({
      accountId,
      encounterId,
      state: 'pending_dispatch'
    });
  });
});

describe('DatabaseEncounterPixPaymentAttemptRepository.create', () => {
  it('creates the reservation, audit and outbox and emits all checkpoints', async () => {
    const checkpoints: string[] = [];
    const tx = transaction();
    const repository = new DatabaseEncounterPixPaymentAttemptRepository({
      onCheckpoint: checkpoint => checkpoints.push(checkpoint)
    });
    installCreateResponses();

    await expect(repository.create(tx, input)).resolves.toMatchObject({
      id: attemptId,
      accountId,
      encounterId,
      billingRecordId,
      providerKey: 'local-pix',
      amountCents: 12550,
      currency: 'BRL'
    });
    expect(checkpoints).toEqual([
      'after_attempt_insert',
      'after_audit_append',
      'after_outbox_append'
    ]);
    expect(tx.audit.append).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'encounter_payment_attempt',
      entityId: attemptId
    }));
    expect(tx.outbox.append).toHaveBeenCalledWith(expect.objectContaining({
      moduleName: 'payments',
      eventType: 'payment.pix.dispatch.requested.v1'
    }));
  });

  it('accepts the default options and rejects a context mismatch before querying', async () => {
    const repository = new DatabaseEncounterPixPaymentAttemptRepository();
    await expect(repository.create(transaction(), { ...input, actorUserId: otherActorUserId })).rejects.toMatchObject({
      code: 'PIX_PAYMENT_ATTEMPT_CONTEXT_MISMATCH',
      statusCode: 403
    });
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('returns canonical request replays and rejects divergent idempotency claims', async () => {
    const repository = new DatabaseEncounterPixPaymentAttemptRepository();
    installCreateResponses({ request: [attemptRow()] });
    await expect(repository.create(transaction(), input)).resolves.toMatchObject({ id: attemptId });

    mocks.query.mockReset();
    installCreateResponses({ request: [attemptRow({ requested_by_user_id: otherActorUserId })] });
    await expect(repository.create(transaction(), input)).rejects.toThrow('idempotency conflict');
  });

  it('resolves a canonical billing replay and rejects an occupied billing record', async () => {
    const repository = new DatabaseEncounterPixPaymentAttemptRepository();
    installCreateResponses({ existing: [attemptRow()] });
    await expect(repository.create(transaction(), input)).resolves.toMatchObject({ id: attemptId });

    mocks.query.mockReset();
    installCreateResponses({ existing: [attemptRow({ request_key_hash: 'different-hash' })] });
    await expect(repository.create(transaction(), input)).rejects.toMatchObject({
      code: 'PIX_PAYMENT_ATTEMPT_ALREADY_EXISTS',
      statusCode: 409
    });
  });

  it.each([
    ['status', { status: 'settled' }],
    ['currency', { currency: 'USD' }],
    ['non-integer amount', { amount_cents: '12550.5' }],
    ['non-positive amount', { amount_cents: '0' }],
    ['missing financial account', undefined],
    ['financial status', undefined],
    ['non-finite total', undefined],
    ['non-positive total', undefined],
    ['total mismatch', undefined],
    ['paid amount', undefined],
    ['balance mismatch', undefined]
  ])('rejects a billing that fails the full unpaid BRL proof: %s', async (label, override) => {
    const repository = new DatabaseEncounterPixPaymentAttemptRepository();
    const financialOverride =
      label === 'missing financial account'
        ? []
        : [{
            ...financial,
            ...(label === 'financial status' ? { financial_status: 'paid' } : {}),
            ...(label === 'non-finite total' ? { total_amount: 'NaN' } : {}),
            ...(label === 'non-positive total' ? { total_amount: '0' } : {}),
            ...(label === 'total mismatch' ? { total_amount: '120.00' } : {}),
            ...(label === 'paid amount' ? { paid_amount: '1.00' } : {}),
            ...(label === 'balance mismatch' ? { balance_due: '120.00' } : {})
          }];
    installCreateResponses({
      billing: [{ ...billing, ...(override ?? {}) }],
      financial: financialOverride
    });
    await expect(repository.create(transaction(), input)).rejects.toMatchObject({
      code: 'BILLING_NOT_RECEIVABLE',
      statusCode: 409
    });
  });

  it('rejects missing billing, missing items and an encounter that is not closed', async () => {
    const repository = new DatabaseEncounterPixPaymentAttemptRepository();
    installCreateResponses({ billing: [] });
    await expect(repository.create(transaction(), input)).rejects.toMatchObject({
      code: 'BILLING_RECORD_NOT_FOUND',
      statusCode: 404
    });

    mocks.query.mockReset();
    installCreateResponses({ billing: [{ ...billing, has_items: false }] });
    await expect(repository.create(transaction(), input)).rejects.toMatchObject({
      code: 'BILLING_ITEMS_REQUIRED',
      statusCode: 409
    });

    mocks.query.mockReset();
    installCreateResponses({ encounter: [{ status: 'open' }] });
    await expect(repository.create(transaction(), input)).rejects.toMatchObject({
      code: 'ENCOUNTER_NOT_CLOSED',
      statusCode: 409
    });
  });

  it('recovers concurrent inserts by request hash or billing and reports a persistence conflict', async () => {
    const repository = new DatabaseEncounterPixPaymentAttemptRepository();
    installCreateResponses({
      inserted: [],
      concurrentRequest: [attemptRow()]
    });
    await expect(repository.create(transaction(), input)).resolves.toMatchObject({ id: attemptId });

    mocks.query.mockReset();
    installCreateResponses({
      inserted: [],
      concurrentBilling: [attemptRow({ request_key_hash: 'other' })]
    });
    await expect(repository.create(transaction(), input)).rejects.toMatchObject({
      code: 'PIX_PAYMENT_ATTEMPT_ALREADY_EXISTS',
      statusCode: 409
    });

    mocks.query.mockReset();
    installCreateResponses({ inserted: [] });
    await expect(repository.create(transaction(), input)).rejects.toMatchObject({
      code: 'PIX_PAYMENT_ATTEMPT_PERSISTENCE_CONFLICT',
      statusCode: 409
    });
  });
});
