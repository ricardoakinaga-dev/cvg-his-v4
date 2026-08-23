import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  PixProviderEventDeliveryClaim,
  PixProviderEventDeliveryClaimNextResult,
  PixProviderEventDeliveryFailure,
  PixProviderEventDeliveryRepository,
  PixProviderSettlementExecution
} from './pix-provider-event-delivery-repository.js';
import {
  PixProviderSettlementConsumer,
  type PixProviderSettlementTelemetryEvent,
  pixProviderSettlementBackoffSeconds
} from './pix-provider-settlement-consumer.js';
import {
  getWorkerMetricsText,
  pixProviderSettlementReconciliationRequired,
  pixProviderSettlementReconciliationRequiredTotal,
  setPixProviderSettlementReconciliationRequired
} from '../worker-metrics.js';

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

  async redrive(): Promise<boolean> {
    return true;
  }
}

class PromotionAwareFakeRepository extends FakeRepository {
  public reconciliationRequiredPromotions = 0;

  async claimNextWithPromotion(): Promise<PixProviderEventDeliveryClaimNextResult> {
    return Object.freeze({
      claim: this.nextClaim,
      reconciliationRequiredPromotions: this.reconciliationRequiredPromotions
    });
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

test('consumer retries explicit transient PostgreSQL and transport failures', async () => {
  for (const error of [
    Object.assign(new Error('serialization failure'), { code: '40001' }),
    Object.assign(new Error('deadlock'), { code: '40P01' }),
    Object.assign(new Error('connection reset'), { code: 'ECONNRESET' }),
    Object.assign(new Error('provider unavailable'), {
      cause: Object.assign(new Error('temporary DNS failure'), { code: 'EAI_AGAIN' })
    })
  ]) {
    const repository = new FakeRepository();
    repository.executionError = error;
    const consumer = new PixProviderSettlementConsumer(repository, {
      workerId: 'pix-settlement-worker',
      leaseMs: 60_000,
      createSettlementExecutor: () => ({ execute: async () => ({}) as never })
    });

    const result = await consumer.processNext(claim.accountId);

    assert.equal(result.status, 'retry_scheduled');
    assert.equal(repository.failures[0]?.errorClass, 'retryable');
    assert.equal(repository.failures[0]?.retryDelaySeconds, 5);
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

test('consumer emits a sanitized terminal DLQ event after the fenced reconciliation transition', async () => {
  const repository = new FakeRepository();
  repository.executionError = Object.assign(new Error('provider secret: do not log'), {
    code: 'PIX_SETTLEMENT_CLAIMS_DIVERGENT'
  });
  const events: PixProviderSettlementTelemetryEvent[] = [];
  const consumer = new PixProviderSettlementConsumer(repository, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({ execute: async () => ({}) as never }),
    telemetry: {
      record(event) {
        events.push(event);
      }
    }
  });

  const result = await consumer.processNext(claim.accountId);

  assert.deepEqual(result, {
    status: 'reconciliation_required',
    deliveryId: claim.deliveryId,
    failureCode: 'PIX_SETTLEMENT_CLAIMS_DIVERGENT',
    failureClass: 'terminal'
  });
  assert.deepEqual(events, [
    {
      name: 'pix_provider_settlement.delivery_outcome',
      outcome: 'reconciliation_required',
      failureClass: 'terminal',
      failureCode: 'PIX_SETTLEMENT_CLAIMS_DIVERGENT',
      attempts: claim.attempts,
      maxAttempts: claim.maxAttempts
    }
  ]);
  assert.equal(JSON.stringify(events).includes('provider secret'), false);
});

test('consumer replaces unrecognized failure codes before returning or emitting operational telemetry', async () => {
  const repository = new FakeRepository();
  repository.executionError = Object.assign(new Error('provider secret: do not log'), {
    code: 'PIX_SETTLEMENT_INTERNAL_DETAIL'
  });
  const events: PixProviderSettlementTelemetryEvent[] = [];
  const consumer = new PixProviderSettlementConsumer(repository, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({ execute: async () => ({}) as never }),
    telemetry: { record: (event) => events.push(event) }
  });

  const result = await consumer.processNext(claim.accountId);

  assert.deepEqual(result, {
    status: 'reconciliation_required',
    deliveryId: claim.deliveryId,
    failureCode: 'PIX_SETTLEMENT_UNEXPECTED',
    failureClass: 'terminal'
  });
  assert.equal(events[0]?.failureCode, 'PIX_SETTLEMENT_UNEXPECTED');
  assert.equal(JSON.stringify(events).includes('INTERNAL_DETAIL'), false);
});

test('consumer records retry, applied, lease-lost and idle outcomes without treating telemetry failures as settlement failures', async () => {
  const events: PixProviderSettlementTelemetryEvent[] = [];
  const telemetry = {
    record(event: PixProviderSettlementTelemetryEvent): void {
      events.push(event);
      if (event.outcome === 'applied') throw new Error('telemetry unavailable');
    }
  };

  const applied = new FakeRepository();
  const appliedConsumer = new PixProviderSettlementConsumer(applied, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({ execute: async () => ({}) as never }),
    telemetry
  });
  assert.deepEqual(await appliedConsumer.processNext(claim.accountId), {
    status: 'applied',
    deliveryId: claim.deliveryId
  });

  const retry = new FakeRepository();
  retry.executionError = Object.assign(new Error('safe'), { code: 'ECONNRESET' });
  const retryConsumer = new PixProviderSettlementConsumer(retry, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({ execute: async () => ({}) as never }),
    telemetry
  });
  assert.deepEqual(await retryConsumer.processNext(claim.accountId), {
    status: 'retry_scheduled',
    deliveryId: claim.deliveryId,
    failureCode: 'ECONNRESET',
    failureClass: 'retryable'
  });

  const leaseLost = new FakeRepository();
  leaseLost.execution = 'lease_lost';
  const leaseLostConsumer = new PixProviderSettlementConsumer(leaseLost, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({ execute: async () => ({}) as never }),
    telemetry
  });
  assert.deepEqual(await leaseLostConsumer.processNext(claim.accountId), {
    status: 'lease_lost',
    deliveryId: claim.deliveryId
  });

  const idle = new FakeRepository();
  idle.nextClaim = null;
  const idleConsumer = new PixProviderSettlementConsumer(idle, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({ execute: async () => ({}) as never }),
    telemetry
  });
  assert.deepEqual(await idleConsumer.processNext(claim.accountId), { status: 'idle' });
  assert.deepEqual(
    events.map(({ outcome, failureClass, failureCode }) => ({
      outcome,
      failureClass,
      failureCode
    })),
    [
      { outcome: 'applied', failureClass: undefined, failureCode: undefined },
      { outcome: 'retry_scheduled', failureClass: 'retryable', failureCode: 'ECONNRESET' },
      { outcome: 'lease_lost', failureClass: undefined, failureCode: undefined },
      { outcome: 'idle', failureClass: undefined, failureCode: undefined }
    ]
  );
});

test('default PIX settlement telemetry exports bounded Prometheus DLQ counters without tenant labels', async () => {
  const repository = new FakeRepository();
  repository.executionError = Object.assign(new Error('safe terminal'), {
    code: 'PIX_SETTLEMENT_CLAIMS_DIVERGENT'
  });
  const consumer = new PixProviderSettlementConsumer(repository, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({ execute: async () => ({}) as never })
  });

  await consumer.processNext(claim.accountId);

  const metrics = await getWorkerMetricsText();
  assert.match(
    metrics,
    /worker_pix_provider_settlement_deliveries_total\{outcome="reconciliation_required",failure_class="terminal"\} [1-9][0-9]*/
  );
  assert.match(
    metrics,
    /worker_pix_provider_settlement_reconciliation_required_total\{failure_class="terminal"\} [1-9][0-9]*/
  );
  assert.equal(
    metrics.includes('00000000-0000-0000-0000-000000000001'),
    false,
    'tenant identifiers must not appear in PIX settlement metric labels'
  );
});

test('worker exposes a current unlabeled durable PIX settlement DLQ gauge', async () => {
  setPixProviderSettlementReconciliationRequired(3);
  const metrics = await getWorkerMetricsText();
  assert.match(metrics, /worker_pix_provider_settlement_reconciliation_required 3/);
  assert.equal(
    metrics.includes('00000000-0000-0000-0000-000000000001'),
    false,
    'tenant identifiers must not appear in PIX settlement metric labels'
  );
  assert.equal(
    (await pixProviderSettlementReconciliationRequired.get()).values[0]?.value,
    3
  );
  setPixProviderSettlementReconciliationRequired(0);
});

test('worker rejects an invalid current PIX settlement DLQ gauge value', () => {
  assert.throws(
    () => setPixProviderSettlementReconciliationRequired(-1),
    /backlog must be a non-negative safe integer/
  );
  assert.throws(
    () => setPixProviderSettlementReconciliationRequired(Number.POSITIVE_INFINITY),
    /backlog must be a non-negative safe integer/
  );
});

test('consumer observes exhausted-claim terminal promotions even when no delivery is claimable', async () => {
  const repository = new PromotionAwareFakeRepository();
  repository.nextClaim = null;
  repository.reconciliationRequiredPromotions = 2;
  const events: PixProviderSettlementTelemetryEvent[] = [];
  const before = await pixProviderSettlementReconciliationRequiredTotal.get();
  const beforeTerminal =
    before.values.find((sample) => sample.labels.failure_class === 'terminal')?.value ?? 0;
  const consumer = new PixProviderSettlementConsumer(repository, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({ execute: async () => ({}) as never }),
    telemetry: { record: (event) => events.push(event) }
  });

  const result = await consumer.processNext(claim.accountId);

  assert.deepEqual(result, { status: 'idle', reconciliationRequiredPromotions: 2 });
  assert.deepEqual(events, [
    {
      name: 'pix_provider_settlement.delivery_outcome',
      outcome: 'reconciliation_required',
      failureClass: 'terminal',
      failureCode: 'PIX_SETTLEMENT_ATTEMPTS_EXHAUSTED',
      reconciliationRequiredPromotions: 2,
      promotionSource: 'attempts_exhausted'
    },
    {
      name: 'pix_provider_settlement.delivery_outcome',
      outcome: 'idle',
      reconciliationRequiredPromotions: 2
    }
  ]);
  const after = await pixProviderSettlementReconciliationRequiredTotal.get();
  const afterTerminal =
    after.values.find((sample) => sample.labels.failure_class === 'terminal')?.value ?? 0;
  assert.equal(afterTerminal - beforeTerminal, 2);
});

test('consumer rejects an invalid promotion count from an optional repository extension', async () => {
  const repository = new PromotionAwareFakeRepository();
  repository.nextClaim = null;
  repository.reconciliationRequiredPromotions = Number.NaN;
  const consumer = new PixProviderSettlementConsumer(repository, {
    workerId: 'pix-settlement-worker',
    leaseMs: 60_000,
    createSettlementExecutor: () => ({ execute: async () => ({}) as never })
  });

  await assert.rejects(
    consumer.processNext(claim.accountId),
    /reconciliation promotion count is invalid/
  );
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
