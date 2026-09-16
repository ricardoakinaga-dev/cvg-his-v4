import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  queryMock,
  withTenantQueryMock,
  runInTenantTransactionMock,
  getDatabaseTransactionScopeMock,
  runWithDatabaseTransactionScopeMock,
  getTenantContextMock,
  poolConnectMock,
  captureClient
} = vi.hoisted(() => {
  const queryMock = vi.fn();
  const withTenantQueryMock = vi.fn(
    async (_pool: unknown, fn: (client: { query: typeof queryMock }) => Promise<unknown>) =>
      fn({ query: queryMock })
  );
  const runInTenantTransactionMock = vi.fn(
    async (_pool: unknown, _accountId: string, fn: (client: { query: typeof queryMock }) => Promise<unknown>) =>
      fn({ query: queryMock })
  );
  const getDatabaseTransactionScopeMock = vi.fn(() => undefined);
  const runWithDatabaseTransactionScopeMock = vi.fn(
    async (_scope: unknown, fn: () => Promise<unknown>) => fn()
  );
  const getTenantContextMock = vi.fn(() => ({ accountId: 'acc_card' }));
  const captureClient = {
    query: queryMock,
    on: vi.fn(),
    removeListener: vi.fn(),
    release: vi.fn()
  };
  const poolConnectMock = vi.fn(async () => captureClient);
  return {
    queryMock,
    withTenantQueryMock,
    runInTenantTransactionMock,
    getDatabaseTransactionScopeMock,
    runWithDatabaseTransactionScopeMock,
    getTenantContextMock,
    poolConnectMock,
    captureClient
  };
});

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn(() => ({ mocked: true, connect: poolConnectMock })),
  runInTenantTransaction: runInTenantTransactionMock,
  getDatabaseTransactionScope: getDatabaseTransactionScopeMock,
  runWithDatabaseTransactionScope: runWithDatabaseTransactionScopeMock
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: withTenantQueryMock,
  getTenantContext: getTenantContextMock
}));

import {
  DatabaseCardTransactionRepository,
  InMemoryCardTransactionRepository,
  type CardTransactionRecord
} from '../../../apps/api/src/card-transaction-repository.ts';

function createRecord(overrides: Partial<CardTransactionRecord> = {}): CardTransactionRecord {
  return {
    transactionId: 'card_tx_1',
    provider: 'pagarme-card',
    accountId: 'acc_card',
    billingRecordId: 'bill_1',
    amount: 180.5,
    currency: 'BRL',
    description: 'Recebimento cartão',
    installments: 3,
    status: 'pending',
    createdAt: '2026-08-23T10:00:00.000Z',
    updatedAt: '2026-08-23T10:00:00.000Z',
    providerOrderId: 'order_1',
    providerChargeId: 'charge_1',
    providerAuthorizationCode: 'auth_1',
    providerReferenceId: 'ref_1',
    cardHolderName: 'Tutor',
    cardBrand: 'visa',
    cardLast4: '4242',
    billingSettlementStatus: 'awaiting_capture',
    ...overrides
  };
}

function createDbRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    transaction_id: 'card_tx_1',
    provider: 'pagarme-card',
    account_id: 'acc_card',
    billing_record_id: 'bill_1',
    amount: '180.5',
    currency: 'BRL',
    description: 'Recebimento cartão',
    installments: 3,
    status: 'pending',
    created_at: '2026-08-23T10:00:00.000Z',
    updated_at: '2026-08-23T10:00:00.000Z',
    captured_at: null,
    last_provider_sync_at: null,
    provider_order_id: 'order_1',
    provider_charge_id: 'charge_1',
    provider_authorization_code: 'auth_1',
    provider_reference_id: 'ref_1',
    failure_reason: null,
    card_holder_name: 'Tutor',
    card_brand: 'visa',
    card_last4: '4242',
    billing_settlement_status: 'awaiting_capture',
    billing_settled_at: null,
    billing_settlement_error: null,
    ...overrides
  };
}

describe('DatabaseCardTransactionRepository', () => {
  beforeEach(() => {
    queryMock.mockReset();
    withTenantQueryMock.mockReset().mockImplementation(
      async (_pool: unknown, fn: (client: { query: typeof queryMock }) => Promise<unknown>) =>
        fn({ query: queryMock })
    );
    runInTenantTransactionMock.mockReset().mockImplementation(
      async (_pool: unknown, _accountId: string, fn: (client: { query: typeof queryMock }) => Promise<unknown>) =>
        fn({ query: queryMock })
    );
    getDatabaseTransactionScopeMock.mockReset().mockReturnValue(undefined);
    runWithDatabaseTransactionScopeMock.mockReset().mockImplementation(
      async (_scope: unknown, fn: () => Promise<unknown>) => fn()
    );
    getTenantContextMock.mockReset().mockReturnValue({ accountId: 'acc_card' });
    poolConnectMock.mockReset().mockResolvedValue(captureClient);
    captureClient.on.mockReset();
    captureClient.removeListener.mockReset();
    captureClient.release.mockReset();
  });

  it('persists the complete non-sensitive card contract idempotently', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await new DatabaseCardTransactionRepository().create(createRecord());

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO card_transactions'),
      expect.arrayContaining([
        'card_tx_1',
        'pagarme-card',
        'acc_card',
        'bill_1',
        180.5,
        'BRL',
        3,
        '4242'
      ])
    );
    expect(queryMock.mock.calls[0]?.[0]).toMatch(
      /ON CONFLICT \(account_id, transaction_id\) DO NOTHING/
    );
  });

  it('maps lookups and status/settlement transitions from PostgreSQL rows', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [createDbRow()] })
      .mockResolvedValueOnce({
        rows: [createDbRow({ status: 'captured', captured_at: '2026-08-23T11:00:00.000Z' })]
      })
      .mockResolvedValueOnce({
        rows: [
          createDbRow({
            billing_settlement_status: 'applied',
            billing_settled_at: '2026-08-23T11:05:00.000Z'
          })
        ]
      });

    const repository = new DatabaseCardTransactionRepository();
    const found = await repository.findByTransactionId('card_tx_1');
    const captured = await repository.updateStatus({
      transactionId: 'card_tx_1',
      status: 'captured',
      capturedAt: '2026-08-23T11:00:00.000Z'
    });
    const settled = await repository.updateBillingSettlement({
      transactionId: 'card_tx_1',
      billingSettlementStatus: 'applied',
      billingSettledAt: '2026-08-23T11:05:00.000Z'
    });

    expect(found).toEqual(expect.objectContaining({ amount: 180.5, cardLast4: '4242' }));
    expect(captured).toEqual(expect.objectContaining({ status: 'captured' }));
    expect(settled).toEqual(expect.objectContaining({ billingSettlementStatus: 'applied' }));
  });

  it('builds parameterized tenant/status/provider filters', async () => {
    queryMock.mockResolvedValueOnce({ rows: [createDbRow()] });
    const rows = await new DatabaseCardTransactionRepository().list({
      accountId: 'acc_card',
      status: 'pending',
      provider: 'pagarme-card'
    });

    expect(rows).toHaveLength(1);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('WHERE account_id = $1 AND status = $2 AND provider = $3'),
      ['acc_card', 'pending', 'pagarme-card']
    );
  });

  it('covers reservation, journal and tenant guard contracts', async () => {
    const repository = new DatabaseCardTransactionRepository();

    getDatabaseTransactionScopeMock.mockReturnValueOnce({ accountId: 'acc_card' });
    await expect(repository.reserveCreation('acc_card', 'key', 'fingerprint')).rejects.toThrow(
      'must own its reservation transaction'
    );

    getTenantContextMock.mockReturnValueOnce({ accountId: 'other_account' });
    await expect(repository.reserveCreation('acc_card', 'key', 'fingerprint')).rejects.toThrow(
      'tenant mismatch'
    );

    getTenantContextMock.mockReturnValue({ accountId: 'acc_card' });
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'attempt_new',
            fingerprint: 'fingerprint',
            billing_record_id: null,
            provider_result: null,
            response: null
          }
        ]
      });
    const fresh = await repository.reserveCreation('acc_card', 'key', 'fingerprint', 'bill_new');
    expect(fresh).toEqual({
      fresh: true,
      attempt: { id: 'attempt_new', fingerprint: 'fingerprint' }
    });

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'attempt_existing',
            fingerprint: 'same',
            billing_record_id: 'bill_existing',
            provider_result: { status: 'pending' },
            response: { accepted: true }
          }
        ]
      });
    const replay = await repository.reserveCreation(
      'acc_card',
      'key-replay',
      'same',
      'bill_existing'
    );
    expect(replay).toEqual({
      fresh: false,
      attempt: {
        id: 'attempt_existing',
        fingerprint: 'same',
        billingRecordId: 'bill_existing',
        providerResult: { status: 'pending' },
        response: { accepted: true }
      }
    });

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'blocking' }] });
    await expect(
      repository.reserveCreation('acc_card', 'key-blocked', 'other', 'bill_existing')
    ).rejects.toThrow('CARD_CREATION_BILLING_CONFLICT');

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(repository.findCreation('acc_card', 'missing')).rejects.toThrow(
      'Card creation not found'
    );
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'attempt_found',
          fingerprint: 'found',
          billing_record_id: null,
          provider_result: { status: 'captured' },
          response: { transactionId: 'card_tx_1' }
        }
      ]
    });
    await expect(repository.findCreation('acc_card', 'attempt_found')).resolves.toEqual({
      id: 'attempt_found',
      fingerprint: 'found',
      providerResult: { status: 'captured' },
      response: { transactionId: 'card_tx_1' }
    });

    getTenantContextMock.mockReturnValue({ accountId: 'other_account' });
    await expect(repository.findCreation('acc_card', 'attempt_found')).rejects.toThrow(
      'tenant mismatch'
    );
    getTenantContextMock.mockReturnValue({ accountId: 'acc_card' });

    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    await repository.saveCreationResult('acc_card', 'attempt_found', { status: 'captured' });
    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    await expect(
      repository.saveCreationResult('acc_card', 'attempt_found', { status: 'failed' })
    ).rejects.toThrow('already saved or unavailable');

    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    await repository.completeCreation('acc_card', 'attempt_found', { status: 'complete' });
    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    await expect(
      repository.completeCreation('acc_card', 'attempt_found', { status: 'complete' })
    ).rejects.toThrow('already saved or unavailable');

    getTenantContextMock.mockReturnValue({ accountId: 'other_account' });
    await expect(repository.saveCreationResult('acc_card', 'attempt_found', {})).rejects.toThrow(
      'tenant mismatch'
    );
    getTenantContextMock.mockReturnValue({ accountId: 'other_account' });
    await expect(repository.completeCreation('acc_card', 'attempt_found', {})).rejects.toThrow(
      'tenant mismatch'
    );
  });

  it('serializes creation and capture transactions with fencing checkpoints', async () => {
    const repository = new DatabaseCardTransactionRepository();
    const operation = vi.fn(async () => 'created');
    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(repository.withCreationTransaction('acc_card', 'card_tx_1', operation)).resolves.toBe(
      'created'
    );
    expect(operation).toHaveBeenCalledOnce();

    getTenantContextMock.mockReturnValue({ accountId: 'other_account' });
    await expect(repository.withCreationTransaction('acc_card', 'card_tx_1', operation)).rejects.toThrow(
      'tenant mismatch'
    );
    getTenantContextMock.mockReturnValue({ accountId: 'acc_card' });

    getDatabaseTransactionScopeMock.mockReturnValueOnce({ accountId: 'acc_card' });
    await expect(
      repository.withCaptureLock('acc_card', 'card_tx_1', async () => 'blocked')
    ).rejects.toThrow('must own its transaction boundary');
    getTenantContextMock.mockReturnValue({ accountId: 'other_account' });
    await expect(
      repository.withCaptureLock('acc_card', 'card_tx_1', async () => 'blocked')
    ).rejects.toThrow('tenant mismatch');
    getTenantContextMock.mockReturnValue({ accountId: 'acc_card' });

    queryMock.mockResolvedValueOnce({ rows: [{ acquired: false }] });
    await expect(
      repository.withCaptureLock('acc_card', 'card_tx_1', async () => 'not-run')
    ).resolves.toEqual({ acquired: false });
    expect(captureClient.release).toHaveBeenCalledWith(undefined);

    queryMock.mockReset();
    queryMock
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: ['card_tx_1'] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ released: true }] });
    const successful = await repository.withCaptureLock(
      'acc_card',
      'card_tx_1',
      async (claimProviderCapture, beginFinalization) => {
        await beginFinalization();
        await beginFinalization();
        await expect(claimProviderCapture()).resolves.toBe(true);
        await expect(claimProviderCapture()).rejects.toThrow('checkpoint unavailable');
        return 'captured';
      }
    );
    expect(successful).toEqual({ acquired: true, value: 'captured' });

    queryMock.mockReset();
    queryMock
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ released: false }] });
    await expect(
      repository.withCaptureLock('acc_card', 'card_tx_1', async () => 'release-warning')
    ).resolves.toEqual({ acquired: true, value: 'release-warning' });
    expect(captureClient.release.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ message: 'Card capture lock release failed' })
    );

    queryMock.mockReset();
    queryMock
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ released: true }] });
    await expect(
      repository.withCaptureLock('acc_card', 'card_tx_1', async () => {
        throw 'capture failed';
      })
    ).rejects.toBe('capture failed');
  });

  it('exercises in-memory tenant, idempotency, rollback and filter semantics', async () => {
    const repository = new InMemoryCardTransactionRepository();
    getTenantContextMock.mockReturnValue(null);

    const first = await repository.reserveCreation('acc_card', 'key-memory', 'fingerprint', 'bill_memory');
    expect(first.fresh).toBe(true);
    await expect(repository.findCreation('acc_card', first.attempt.id)).resolves.toEqual(first.attempt);
    await repository.saveCreationResult('acc_card', first.attempt.id, { status: 'captured' });
    await expect(
      repository.saveCreationResult('acc_card', first.attempt.id, { status: 'failed' })
    ).rejects.toThrow('already saved');
    await repository.completeCreation('acc_card', first.attempt.id, { status: 'complete' });
    await expect(repository.findCreation('acc_card', 'missing')).rejects.toThrow('not found');

    getTenantContextMock.mockReturnValue({ accountId: 'other_account' });
    await expect(repository.reserveCreation('acc_card', 'other', 'fingerprint')).rejects.toThrow(
      'tenant mismatch'
    );
    await expect(repository.findCreation('acc_card', first.attempt.id)).rejects.toThrow('tenant mismatch');
    await expect(repository.saveCreationResult('acc_card', first.attempt.id, {})).rejects.toThrow(
      'tenant mismatch'
    );
    await expect(repository.completeCreation('acc_card', first.attempt.id, {})).rejects.toThrow(
      'tenant mismatch'
    );

    getTenantContextMock.mockReturnValue({ accountId: 'acc_card' });
    await expect(
      repository.reserveCreation('acc_card', 'another-key', 'different', 'bill_memory')
    ).rejects.toThrow('CARD_CREATION_BILLING_CONFLICT');

    const record = createRecord({ transactionId: 'memory_tx', captureRequestedAt: '2026-08-23T10:30:00.000Z' });
    await repository.create(record);
    await repository.create({ ...record, status: 'captured' });
    expect(await repository.findByTransactionId('memory_tx')).toEqual(
      expect.objectContaining({ status: 'pending', captureRequestedAt: record.captureRequestedAt })
    );
    await expect(
      repository.updateStatus({
        transactionId: 'memory_tx',
        status: 'captured',
        updatedAt: '2026-08-23T11:00:00.000Z',
        capturedAt: '2026-08-23T11:00:00.000Z',
        lastProviderSyncAt: '2026-08-23T11:01:00.000Z',
        providerOrderId: 'order_2',
        providerChargeId: 'charge_2',
        providerAuthorizationCode: 'auth_2',
        providerReferenceId: 'ref_2',
        failureReason: 'none',
        billingSettlementStatus: 'applied'
      })
    ).resolves.toEqual(
      expect.objectContaining({ status: 'captured', providerChargeId: 'charge_2' })
    );
    await expect(repository.updateStatus({ transactionId: 'missing', status: 'failed' })).resolves.toBeNull();
    await expect(
      repository.updateBillingSettlement({
        transactionId: 'memory_tx',
        billingSettlementStatus: 'failed',
        updatedAt: '2026-08-23T11:02:00.000Z',
        billingSettledAt: '2026-08-23T11:02:00.000Z',
        billingSettlementError: 'gateway'
      })
    ).resolves.toEqual(expect.objectContaining({ billingSettlementStatus: 'failed' }));
    await expect(
      repository.updateBillingSettlement({ transactionId: 'missing', billingSettlementStatus: 'applied' })
    ).resolves.toBeNull();
    await expect(repository.list({ accountId: 'acc_card', status: 'captured', provider: 'pagarme-card' })).resolves.toHaveLength(1);

    const hold = new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    const capture = repository.withCaptureLock('acc_card', 'memory_tx', async () => {
      await hold;
      return 'ok';
    });
    await expect(repository.withCaptureLock('acc_card', 'memory_tx', async () => 'duplicate')).resolves.toEqual({
      acquired: false
    });
    await expect(repository.withCreationTransaction('acc_card', 'memory_tx', async () => 'blocked')).rejects.toThrow(
      'capture is in progress'
    );
    await expect(capture).resolves.toEqual({ acquired: true, value: 'ok' });

    await expect(
      repository.withCaptureLock('acc_card', 'memory_tx', async (claimProviderCapture) => {
        await expect(claimProviderCapture()).resolves.toBe(false);
        return 'retry';
      })
    ).resolves.toEqual({ acquired: true, value: 'retry' });
    await expect(
      repository.withCreationTransaction('acc_card', 'memory_tx', async () => {
        await repository.updateStatus({ transactionId: 'memory_tx', status: 'failed' });
        throw new Error('rollback');
      })
    ).rejects.toThrow('rollback');
    await expect(repository.findByTransactionId('memory_tx')).resolves.toEqual(
      expect.objectContaining({ status: 'captured' })
    );
  });

  it('maps optional PostgreSQL fields and empty query results', async () => {
    const repository = new DatabaseCardTransactionRepository();
    const complete = createDbRow({
      captured_at: new Date('2026-08-23T11:00:00.000Z'),
      billing_settled_at: new Date('2026-08-23T11:05:00.000Z'),
      capture_requested_at: new Date('2026-08-23T10:30:00.000Z'),
      last_provider_sync_at: new Date('2026-08-23T11:01:00.000Z')
    });
    queryMock
      .mockResolvedValueOnce({ rows: [complete] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(repository.findByTransactionId('card_tx_1')).resolves.toEqual(
      expect.objectContaining({ captureRequestedAt: '2026-08-23T10:30:00.000Z' })
    );
    await expect(repository.updateStatus({ transactionId: 'missing', status: 'failed' })).resolves.toBeNull();
    await expect(
      repository.updateBillingSettlement({ transactionId: 'missing', billingSettlementStatus: 'failed' })
    ).resolves.toBeNull();
    await expect(repository.list()).resolves.toEqual([]);

    queryMock.mockResolvedValueOnce({ rows: [] });
    await repository.create(
      createRecord({
        capturedAt: '2026-08-23T11:00:00.000Z',
        billingSettledAt: '2026-08-23T11:05:00.000Z'
      })
    );
    queryMock.mockResolvedValueOnce({ rows: [complete] });
    await repository.updateStatus({
      transactionId: 'card_tx_1',
      status: 'captured',
      capturedAt: '2026-08-23T11:00:00.000Z',
      lastProviderSyncAt: '2026-08-23T11:01:00.000Z',
      providerOrderId: 'order_2',
      providerChargeId: 'charge_2',
      providerAuthorizationCode: 'auth_2',
      providerReferenceId: 'ref_2',
      failureReason: 'none',
      billingSettlementStatus: 'applied'
    });
    queryMock.mockResolvedValueOnce({ rows: [complete] });
    await repository.updateBillingSettlement({
      transactionId: 'card_tx_1',
      billingSettlementStatus: 'applied',
      billingSettledAt: '2026-08-23T11:05:00.000Z',
      billingSettlementError: 'none',
      updatedAt: '2026-08-23T11:06:00.000Z'
    });
    queryMock.mockResolvedValueOnce({ rows: [complete] });
    await repository.list();
  });

  it('maps a legacy row with every optional card field absent', async () => {
    const repository = new DatabaseCardTransactionRepository();
    queryMock.mockResolvedValueOnce({
      rows: [createDbRow({
        billing_record_id: null,
        captured_at: null,
        capture_requested_at: null,
        last_provider_sync_at: null,
        provider_order_id: null,
        provider_charge_id: null,
        provider_authorization_code: null,
        provider_reference_id: null,
        failure_reason: null,
        card_holder_name: null,
        card_brand: null,
        card_last4: null,
        billing_settled_at: null,
        billing_settlement_error: null
      })]
    });

    await expect(repository.findByTransactionId('card_tx_1')).resolves.toEqual(
      expect.objectContaining({
        billingRecordId: undefined,
        capturedAt: undefined,
        captureRequestedAt: undefined,
        lastProviderSyncAt: undefined,
        providerOrderId: undefined,
        providerChargeId: undefined,
        providerAuthorizationCode: undefined,
        providerReferenceId: undefined,
        failureReason: undefined,
        cardHolderName: undefined,
        cardBrand: undefined,
        cardLast4: undefined,
        billingSettledAt: undefined,
        billingSettlementError: undefined
      })
    );
  });

  it('writes card records with nullable fields and returns empty lookups', async () => {
    const repository = new DatabaseCardTransactionRepository();
    queryMock.mockResolvedValueOnce({ rows: [] });
    await repository.create(createRecord({
      billingRecordId: undefined,
      lastProviderSyncAt: undefined,
      providerOrderId: undefined,
      providerChargeId: undefined,
      providerAuthorizationCode: undefined,
      providerReferenceId: undefined,
      failureReason: undefined,
      cardHolderName: undefined,
      cardBrand: undefined,
      cardLast4: undefined,
      billingSettledAt: undefined,
      billingSettlementError: undefined,
      captureRequestedAt: undefined
    }));
    expect(queryMock.mock.calls[0]?.[1]).toEqual(expect.arrayContaining([
      null, null, null, null, null, null, null, null, null, null, null, null
    ]));

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(repository.findByTransactionId('missing')).resolves.toBeNull();

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{
        id: 'attempt_without_bill', fingerprint: 'fingerprint', billing_record_id: null,
        provider_result: null, response: null
      }] });
    await expect(repository.reserveCreation('acc_card', 'key-without-billing', 'fingerprint'))
      .resolves.toEqual({ fresh: true, attempt: { id: 'attempt_without_bill', fingerprint: 'fingerprint' } });

    queryMock.mockResolvedValueOnce({ rows: [] });
    await repository.create(createRecord({
      lastProviderSyncAt: '2026-08-23T11:01:00.000Z',
      captureRequestedAt: '2026-08-23T10:30:00.000Z'
    }));
  });

  it('covers unscoped and absent in-memory creation branches', async () => {
    const repository = new InMemoryCardTransactionRepository();
    getTenantContextMock.mockReturnValue(null);
    const first = await repository.reserveCreation('acc_memory', 'same-key', 'fingerprint');
    await expect(repository.reserveCreation('acc_memory', 'same-key', 'fingerprint')).resolves.toEqual(
      expect.objectContaining({ fresh: false })
    );
    await expect(repository.saveCreationResult('acc_memory', 'missing', {})).rejects.toThrow('not found');
    await expect(repository.completeCreation('acc_memory', 'missing', {})).rejects.toThrow('not found');

    await repository.create(createRecord({ accountId: 'acc_single', transactionId: 'unscoped-id' }));
    await expect(repository.findByTransactionId('unscoped-id')).resolves.toEqual(
      expect.objectContaining({ transactionId: 'unscoped-id' })
    );
    await expect(repository.withCreationTransaction('acc_memory', 'new-anchor', async () => {
      throw 'rollback-without-anchor';
    })).rejects.toBe('rollback-without-anchor');

    await expect(repository.withCaptureLock('acc_single', 'unscoped-id', async () => {
      throw new Error('rollback-with-existing-anchor');
    })).rejects.toThrow('rollback-with-existing-anchor');
    await expect(repository.withCaptureLock('acc_memory', 'missing-anchor', async () => {
      throw new Error('rollback-without-existing-anchor');
    })).rejects.toThrow('rollback-without-existing-anchor');

    const capture = await repository.withCaptureLock(
      'acc_memory', 'checkpoint-id',
      async (claimProviderCapture) => {
        await claimProviderCapture();
        await expect(claimProviderCapture()).rejects.toThrow('checkpoint already used');
        return first.attempt.id;
      }
    );
    expect(capture.acquired).toBe(true);

    await expect(repository.updateBillingSettlement({
      transactionId: 'unscoped-id', billingSettlementStatus: 'applied'
    })).resolves.toEqual(expect.objectContaining({ billingSettlementStatus: 'applied' }));
    await expect(repository.updateBillingSettlement({
      transactionId: 'unscoped-id', billingSettlementStatus: 'failed', updatedAt: '2026-08-23T12:00:00.000Z'
    })).resolves.toEqual(expect.objectContaining({ billingSettlementStatus: 'failed' }));
    await expect(repository.list()).resolves.toHaveLength(1);
    await expect(repository.list({ status: 'pending' })).resolves.toHaveLength(1);
    await expect(repository.list({ provider: 'pagarme-card' })).resolves.toHaveLength(1);
  });

  it('handles inactive database capture finalization and unlock failures', async () => {
    const repository = new DatabaseCardTransactionRepository();
    queryMock
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ released: true }] });
    await expect(repository.withCaptureLock(
      'acc_card', 'card_tx_1',
      async (claimProviderCapture, beginFinalization) => {
        await expect(claimProviderCapture()).resolves.toBe(false);
        await beginFinalization();
        return 'finalized';
      }
    )).resolves.toEqual({ acquired: true, value: 'finalized' });

    queryMock.mockReset();
    queryMock
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce('unlock transport failure');
    await expect(repository.withCaptureLock('acc_card', 'card_tx_2', async () => 'ok'))
      .resolves.toEqual({ acquired: true, value: 'ok' });

    queryMock.mockReset();
    queryMock
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('unlock error'));
    await expect(repository.withCaptureLock('acc_card', 'card_tx_3', async () => {
      throw new Error('capture operation failed');
    })).rejects.toThrow('capture operation failed');
  });

  it('keeps ambiguous unscoped transaction ids isolated in memory', async () => {
    const repository = new InMemoryCardTransactionRepository();
    getTenantContextMock.mockReturnValue(null);
    await repository.create(createRecord({ accountId: 'acc_one', transactionId: 'same-id' }));
    await repository.create(createRecord({ accountId: 'acc_two', transactionId: 'same-id' }));

    await expect(repository.findByTransactionId('same-id')).resolves.toBeNull();
    await expect(repository.updateStatus({ transactionId: 'same-id', status: 'failed' })).resolves.toBeNull();

    getTenantContextMock.mockReturnValue({ accountId: 'acc_one' });
    await expect(repository.findByTransactionId('same-id')).resolves.toEqual(
      expect.objectContaining({ accountId: 'acc_one' })
    );
    await expect(repository.updateStatus({ transactionId: 'unknown', status: 'failed' })).resolves.toBeNull();
  });
});
