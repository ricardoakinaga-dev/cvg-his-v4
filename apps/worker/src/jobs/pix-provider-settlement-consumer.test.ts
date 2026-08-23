import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  PixProviderEventDeliveryClaim,
  PixProviderEventDeliveryFailure,
  PixProviderEventDeliveryRepository,
  PixProviderSettlementExecution
} from './pix-provider-event-delivery-repository.js';
import {
  PixProviderSettlementConsumer,
  pixProviderSettlementBackoffSeconds
} from './pix-provider-settlement-consumer.js';

const claim: PixProviderEventDeliveryClaim = Object.freeze({
  accountId: '00000000-0000-0000-0000-000000000001',
  deliveryId: '00000000-0000-0000-0000-000000000002',
  eventId: '00000000-0000-0000-0000-000000000003',
  attempts: 1,
  maxAttempts: 8,
  leaseOwner: 'pix-settlement-worker',
  leaseToken: '00000000-0000-0000-0000-000000000004',
  leaseVersion: 1,
  leaseExpiresAt: '2026-08-22T21:00:00.000Z'
});

class FakeRepository implements PixProviderEventDeliveryRepository {
  public nextClaim: PixProviderEventDeliveryClaim | null = claim;
  public execution: PixProviderSettlementExecution = 'applied';
  public executionError: unknown;
  public failures: PixProviderEventDeliveryFailure[] = [];
  public settlementCalls = 0;

  async claimNext(): Promise<PixProviderEventDeliveryClaim | null> {
    return this.nextClaim;
  }

  async executeSettlement(
    _claim: PixProviderEventDeliveryClaim,
    execute: Parameters<PixProviderEventDeliveryRepository['executeSettlement']>[1]
  ): Promise<PixProviderSettlementExecution> {
    this.settlementCalls += 1;
    if (this.executionError) throw this.executionError;
    await execute(
      Object.freeze({
        accountId: claim.accountId,
        actorUserId: '00000000-0000-0000-0000-000000000005',
        attemptId: '00000000-0000-0000-0000-000000000006',
        provider: 'local-pix',
        providerEventId: 'evt-1',
        transactionId: '00000000-0000-0000-0000-000000000006',
        billingRecordId: 'billing-1',
        amountCents: 12_500,
        currency: 'BRL',
        confirmedAt: '2026-08-22T20:00:00.000Z'
      }),
      {} as never
    );
    return this.execution;
  }

  async completeFailure(
    _claim: PixProviderEventDeliveryClaim,
    failure: PixProviderEventDeliveryFailure
  ): Promise<'reconciliation_required' | 'retry_scheduled' | null> {
    this.failures = [...this.failures, failure];
    return failure.errorClass === 'retryable' ? 'retry_scheduled' : 'reconciliation_required';
  }
}

test('PIX settlement backoff starts at 5 seconds and caps at 900 seconds', () => {
  assert.deepEqual(
    [1, 2, 3, 8, 9, 30].map(pixProviderSettlementBackoffSeconds),
    [5, 10, 20, 640, 900, 900]
  );
});

test('consumer invokes the B1 executor once and applies the delivery', async () => {
  const repository = new FakeRepository();
  let b1Calls = 0;
  const consumer = new PixProviderSettlementConsumer(repository, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({
      execute: async () => {
        b1Calls += 1;
        return {} as never;
      }
    })
  });

  const result = await consumer.processNext(claim.accountId);

  assert.deepEqual(result, { status: 'applied', deliveryId: claim.deliveryId });
  assert.equal(repository.settlementCalls, 1);
  assert.equal(b1Calls, 1);
});

test('consumer retries only allowlisted correlation and principal failures', async () => {
  for (const code of [
    'PIX_SETTLEMENT_PRINCIPAL_NOT_FOUND',
    'PIX_SETTLEMENT_PRINCIPAL_INVALID',
    'PIX_NOT_CORRELATED'
  ]) {
    const repository = new FakeRepository();
    repository.executionError = Object.assign(new Error('safe failure'), { code });
    const consumer = new PixProviderSettlementConsumer(repository, {
      workerId: 'pix-settlement-worker',
      leaseMs: 60_000,
      createSettlementExecutor: () => ({ execute: async () => ({}) as never })
    });

    const result = await consumer.processNext(claim.accountId);

    assert.equal(result.status, 'retry_scheduled');
    assert.deepEqual(repository.failures, [
      { code, errorClass: 'retryable', retryDelaySeconds: 5 }
    ]);
  }
});

test('consumer sends divergent claims and unexpected B1 failures to reconciliation', async () => {
  for (const error of [
    Object.assign(new Error('divergent'), { code: 'PIX_SETTLEMENT_CLAIMS_DIVERGENT' }),
    Object.assign(new Error('terminal'), { code: 'PIX_SETTLEMENT_ATTEMPT_TERMINAL' }),
    new Error('unexpected internal failure')
  ]) {
    const repository = new FakeRepository();
    repository.executionError = error;
    const consumer = new PixProviderSettlementConsumer(repository, {
      workerId: 'pix-settlement-worker',
      leaseMs: 60_000,
      createSettlementExecutor: () => ({ execute: async () => ({}) as never })
    });

    const result = await consumer.processNext(claim.accountId);

    assert.equal(result.status, 'reconciliation_required');
    assert.equal(repository.failures[0]?.errorClass, 'terminal');
    assert.equal(repository.failures[0]?.retryDelaySeconds, 0);
  }
});

test('consumer does not persist failure after a stale fence', async () => {
  const repository = new FakeRepository();
  repository.execution = 'lease_lost';
  const consumer = new PixProviderSettlementConsumer(repository, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({ execute: async () => ({}) as never })
  });

  const result = await consumer.processNext(claim.accountId);

  assert.deepEqual(result, { status: 'lease_lost', deliveryId: claim.deliveryId });
  assert.deepEqual(repository.failures, []);
});

test('consumer returns idle without constructing B1 when no delivery is claimable', async () => {
  const repository = new FakeRepository();
  repository.nextClaim = null;
  let factoryCalls = 0;
  const consumer = new PixProviderSettlementConsumer(repository, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => {
      factoryCalls += 1;
      return { execute: async () => ({}) as never };
    }
  });

  assert.deepEqual(await consumer.processNext(claim.accountId), { status: 'idle' });
  assert.equal(factoryCalls, 0);
});
