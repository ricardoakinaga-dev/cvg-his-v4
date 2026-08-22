import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PIX_PAYMENT_DISPATCH_DEFAULTS,
  bootstrapWorkerServices,
  createSyntheticPixPaymentDispatchRuntime,
  shutdownWorkerServices
} from './bootstrap.js';
import {
  LocalPixPaymentDispatchProvider,
  runPixPaymentDispatchTick
} from './jobs/local-pix-payment-dispatch-provider.js';

const accountId = '00000000-0000-0000-0000-000000000001';
const attemptId = '00000000-0000-0000-0000-000000000002';
const encounterId = '00000000-0000-0000-0000-000000000003';

test('bootstrapWorkerServices returns unhealthy when no databaseUrl provided', async () => {
  const result = await bootstrapWorkerServices({});

  assert.equal(result.databaseHealthy, false);
  assert.equal(result.databaseDetail, 'DATABASE_URL not configured');
});

test('bootstrapWorkerServices returns unhealthy when databaseUrl is empty string', async () => {
  const result = await bootstrapWorkerServices({ databaseUrl: '' });

  assert.equal(result.databaseHealthy, false);
  assert.equal(result.databaseDetail, 'DATABASE_URL not configured');
});

test('shutdownWorkerServices completes without error', async () => {
  await shutdownWorkerServices();
});

test('bootstrapWorkerServices result has correct structure when unhealthy', async () => {
  const result = await bootstrapWorkerServices({});

  assert.ok('databaseHealthy' in result);
  assert.ok('databaseDetail' in result);
  assert.equal(result.databaseHealthy, false);
});

test('bootstrapWorkerServices returns unhealthy when connection fails', async () => {
  const result = await bootstrapWorkerServices({
    databaseUrl: 'postgresql://invalid:invalid@localhost:9999/nonexistent'
  });

  assert.equal(result.databaseHealthy, false);
});

test('PIX dispatcher bootstrap requires an explicit synthetic capability', () => {
  const runtime = createSyntheticPixPaymentDispatchRuntime({
    allowSyntheticProviders: false,
    environment: 'development',
    pool: {} as never,
    workerId: 'pix-worker-test'
  });

  assert.equal(runtime, undefined);
});

test('PIX dispatcher bootstrap rejects synthetic capability in production aliases', () => {
  for (const environment of ['production', 'prod', 'PRODUCTION']) {
    assert.throws(
      () =>
        createSyntheticPixPaymentDispatchRuntime({
          allowSyntheticProviders: true,
          environment,
          pool: {} as never,
          workerId: 'pix-worker-test'
        }),
      (error: unknown) => {
        assert.equal((error as { readonly code?: string }).code, 'SYNTHETIC_PIX_PROVIDER_DISABLED');
        return true;
      }
    );
  }
});

test('explicit development cannot override a production process environment', () => {
  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.throws(() =>
      createSyntheticPixPaymentDispatchRuntime({
        allowSyntheticProviders: true,
        environment: 'development',
        pool: {} as never,
        workerId: 'pix-worker-test'
      })
    );
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test('PIX dispatcher bootstrap composes safe defaults with the PostgreSQL pool', () => {
  const pool = {} as never;
  const runtime = createSyntheticPixPaymentDispatchRuntime({
    allowSyntheticProviders: true,
    environment: 'development',
    pool,
    workerId: 'pix-worker-test'
  });

  assert.ok(runtime);
  assert.equal(runtime.providerKey, 'local-pix');
  assert.equal(runtime.workerId, 'pix-worker-test');
  assert.equal(runtime.leaseMs, 60_000);
  assert.equal(runtime.retryBaseMs, 1_000);
  assert.equal(runtime.providerTimeoutMs, 15_000);
  assert.deepEqual(PIX_PAYMENT_DISPATCH_DEFAULTS, {
    leaseMs: 60_000,
    retryBaseMs: 1_000,
    providerTimeoutMs: 15_000
  });
});

test('PIX dispatcher bootstrap validates explicit worker ids and derives a bounded fallback', () => {
  for (const workerId of ['', 'pix worker', 'pix-worker-\u0000', 'x'.repeat(161)]) {
    assert.throws(() =>
      createSyntheticPixPaymentDispatchRuntime({
        allowSyntheticProviders: true,
        environment: 'test',
        pool: {} as never,
        workerId
      })
    );
  }

  const runtime = createSyntheticPixPaymentDispatchRuntime({
    allowSyntheticProviders: true,
    environment: 'test',
    pool: {} as never
  });
  assert.ok(runtime);
  assert.match(runtime.workerId, /^pix-dispatch-[a-f0-9]{16}-\d+$/);
  assert.ok(Buffer.byteLength(runtime.workerId, 'utf8') <= 160);
});

test('local PIX provider keeps provider identity stable per attempt without secrets', async () => {
  const provider = new LocalPixPaymentDispatchProvider();
  const input = Object.freeze({
    accountId,
    attemptId,
    encounterId,
    billingRecordId: 'billing-1',
    amountCents: 12_550,
    currency: 'BRL' as const,
    providerIdempotencyKey: `cvg:pix:create:v1:${attemptId}`,
    attemptCreatedAt: '2026-08-22T20:00:00.000Z'
  });

  const first = await provider.createIntent(input);
  const replay = await provider.createIntent(input);

  assert.equal(provider.key, 'local-pix');
  assert.equal(provider.mode, 'synthetic');
  assert.equal(first.providerTransactionId, `local-pix-${attemptId}`);
  assert.equal(replay.providerTransactionId, first.providerTransactionId);
  assert.equal(replay.qrCodePayload, first.qrCodePayload);
  assert.equal(replay.qrCodeBase64, first.qrCodeBase64);
  assert.equal(replay.expiresAt, first.expiresAt);
  assert.ok(!JSON.stringify(first).toLowerCase().includes('secret'));
  assert.ok(Object.isFrozen(first));
});

test('local PIX provider rejects invalid idempotency and aborted work', async () => {
  const provider = new LocalPixPaymentDispatchProvider();
  const baseInput = {
    accountId,
    attemptId,
    encounterId,
    billingRecordId: 'billing-1',
    amountCents: 12_550,
    currency: 'BRL' as const,
    providerIdempotencyKey: `cvg:pix:create:v1:${attemptId}`,
    attemptCreatedAt: '2026-08-22T20:00:00.000Z'
  };

  await assert.rejects(
    provider.createIntent({ ...baseInput, providerIdempotencyKey: 'different' }),
    (error: unknown) => {
      assert.equal((error as { readonly code?: string }).code, 'SYNTHETIC_REJECTED');
      assert.equal((error as { readonly failureClass?: string }).failureClass, 'permanent');
      assert.ok(!(error as Error).message.toLowerCase().includes('idempotency'));
      return true;
    }
  );

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    provider.createIntent({ ...baseInput, signal: controller.signal }),
    (error: unknown) => {
      assert.equal((error as { readonly failureClass?: string }).failureClass, 'transient');
      return true;
    }
  );
});

test('PIX dispatch tick invokes processNext once per tenant in order', async () => {
  const calls: string[] = [];
  const results = await runPixPaymentDispatchTick(
    {
      processNext: async (currentAccountId) => {
        calls.push(currentAccountId);
        return { status: 'idle' } as const;
      }
    },
    [accountId, '00000000-0000-0000-0000-000000000099']
  );

  assert.deepEqual(calls, [accountId, '00000000-0000-0000-0000-000000000099']);
  assert.deepEqual(results, [
    { accountId, status: 'processed', result: { status: 'idle' } },
    {
      accountId: '00000000-0000-0000-0000-000000000099',
      status: 'processed',
      result: { status: 'idle' }
    }
  ]);
  assert.ok(Object.isFrozen(results));
});

test('PIX dispatch tick isolates one tenant failure and continues remaining tenants', async () => {
  const secondAccountId = '00000000-0000-0000-0000-000000000099';
  const calls: string[] = [];
  const results = await runPixPaymentDispatchTick(
    {
      processNext: async (currentAccountId) => {
        calls.push(currentAccountId);
        if (currentAccountId === accountId) throw new Error('database unavailable');
        return { status: 'idle' } as const;
      }
    },
    [accountId, secondAccountId]
  );

  assert.deepEqual(calls, [accountId, secondAccountId]);
  assert.equal(results[0]?.status, 'failed');
  assert.equal(results[0]?.accountId, accountId);
  assert.match((results[0] as { readonly error: Error }).error.message, /database unavailable/);
  assert.deepEqual(results[1], {
    accountId: secondAccountId,
    status: 'processed',
    result: { status: 'idle' }
  });
});
