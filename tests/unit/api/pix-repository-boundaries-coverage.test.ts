import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPool: vi.fn(),
  withTenantQueryExplicit: vi.fn(),
  query: vi.fn()
}));

vi.mock('@cvg-his-v2/shared-database', () => ({ getPool: mocks.getPool }));
vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQueryExplicit: mocks.withTenantQueryExplicit
}));

import {
  DatabasePixProviderEventIngressRepository,
  type PixProviderEventIngressInput
} from '../../../apps/api/src/pix-provider-event-ingress-repository.js';
import { DatabasePixProviderSettlementDlqRepository } from '../../../apps/api/src/pix-provider-settlement-dlq-repository.js';

const accountId = '11111111-1111-4111-8111-111111111111';
const attemptId = '22222222-2222-4222-8222-222222222222';
const providerTransactionId = 'provider-tx-1';
const confirmedAt = '2026-09-16T12:00:00.000Z';
const nowSeconds = Date.parse(confirmedAt) / 1_000;

function installTenantHarness(): void {
  mocks.withTenantQueryExplicit.mockImplementation(async (_pool: unknown, _account: string, callback: (client: unknown) => unknown) => callback({ query: mocks.query }));
}

function claims(overrides: Record<string, unknown> = {}) {
  return {
    type: 'pix.payment.confirmed.v1',
    accountId,
    attemptId,
    providerTransactionId,
    amountCents: 1250,
    currency: 'BRL',
    confirmedAt,
    ...overrides
  } as const;
}

function ingressInput(overrides: Partial<PixProviderEventIngressInput> = {}): PixProviderEventIngressInput {
  const payload = claims();
  return {
    rawBody: Buffer.from(JSON.stringify(payload)),
    claims: payload,
    providerEventId: 'event-1',
    correlationId: 'corr-1',
    receivedAt: confirmedAt,
    ...overrides
  };
}

beforeEach(() => {
  mocks.query.mockReset();
  mocks.withTenantQueryExplicit.mockReset();
});

describe('DatabasePixProviderSettlementDlqRepository', () => {
  it('lists account-scoped deliveries and redrives true/false outcomes', async () => {
    const row = {
      id: '33333333-3333-4333-8333-333333333333',
      event_id: '44444444-4444-4444-8444-444444444444',
      state: 'reconciliation_required',
      attempts: 2,
      max_attempts: 8,
      next_attempt_at: new Date('2026-09-16T13:00:00.000Z'),
      last_error_code: 'PIX_TIMEOUT',
      created_at: '2026-09-16T10:00:00.000Z',
      updated_at: new Date('2026-09-16T11:00:00.000Z')
    };
    installTenantHarness();
    mocks.query
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [{ redriven: true }] })
      .mockResolvedValueOnce({ rows: [{ redriven: false }] });
    const repository = new DatabasePixProviderSettlementDlqRepository({} as never);

    await expect(repository.list({ accountId: accountId as never, state: 'reconciliation_required', limit: 10 })).resolves.toEqual([{
      id: row.id,
      eventId: row.event_id,
      state: 'reconciliation_required',
      attempts: 2,
      maxAttempts: 8,
      nextAttemptAt: '2026-09-16T13:00:00.000Z',
      lastErrorCode: 'PIX_TIMEOUT',
      createdAt: '2026-09-16T10:00:00.000Z',
      updatedAt: '2026-09-16T11:00:00.000Z'
    }]);
    const redriveInput = {
      accountId,
      deliveryId: row.id,
      eventId: row.event_id,
      actorUserId: '55555555-5555-4555-8555-555555555555',
      correlationId: 'corr-1',
      reason: ' retry settlement '
    };
    await expect(repository.redrive(redriveInput)).resolves.toBe(true);
    await expect(repository.redrive({ ...redriveInput, reason: 'second try' })).resolves.toBe(false);
    expect(mocks.query).toHaveBeenCalledTimes(3);
  });

  it('rejects invalid list and redrive inputs before querying PostgreSQL', async () => {
    installTenantHarness();
    const repository = new DatabasePixProviderSettlementDlqRepository({} as never);
    const validRedrive = {
      accountId,
      deliveryId: '33333333-3333-4333-8333-333333333333',
      eventId: '44444444-4444-4444-8444-444444444444',
      actorUserId: '55555555-5555-4555-8555-555555555555',
      correlationId: 'corr',
      reason: 'retry'
    };

    await expect(repository.list({ accountId: 'bad', state: 'reconciliation_required', limit: 1 })).rejects.toThrow();
    await expect(repository.list({ accountId: accountId as never, state: 'pending' as never, limit: 1 })).rejects.toThrow();
    await expect(repository.list({ accountId: accountId as never, state: 'reconciliation_required', limit: 0 })).rejects.toThrow();
    await expect(repository.list({ accountId: accountId as never, state: 'reconciliation_required', limit: 101 })).rejects.toThrow();
    await expect(repository.redrive({ ...validRedrive, accountId: 'bad' })).rejects.toThrow();
    await expect(repository.redrive({ ...validRedrive, deliveryId: 'bad' })).rejects.toThrow();
    await expect(repository.redrive({ ...validRedrive, eventId: 'bad' })).rejects.toThrow();
    await expect(repository.redrive({ ...validRedrive, actorUserId: 'bad' })).rejects.toThrow();
    await expect(repository.redrive({ ...validRedrive, correlationId: '' })).rejects.toThrow();
    await expect(repository.redrive({ ...validRedrive, correlationId: 'x'.repeat(256) })).rejects.toThrow();
    await expect(repository.redrive({ ...validRedrive, reason: ' \u0000 ' })).rejects.toThrow();
    await expect(repository.redrive({ ...validRedrive, reason: 'x'.repeat(501) })).rejects.toThrow();
    expect(mocks.query).not.toHaveBeenCalled();
  });
});

describe('DatabasePixProviderEventIngressRepository', () => {
  it('persists a receipt and delivery, emitting both checkpoints', async () => {
    installTenantHarness();
    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const checkpoints: string[] = [];
    const repository = new DatabasePixProviderEventIngressRepository({} as never, {
      nowSeconds: () => nowSeconds,
      onCheckpoint: checkpoint => checkpoints.push(checkpoint)
    });

    const result = await repository.persist(ingressInput());
    expect(result.status).toBe('created');
    expect(result.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.deliveryId).toMatch(/^[0-9a-f-]{36}$/);
    expect(checkpoints).toEqual(['after_receipt_insert', 'after_delivery_insert']);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('SAVEPOINT pix_provider_event_insert'));
  });

  it('replays an identical receipt with an existing or newly recovered delivery', async () => {
    installTenantHarness();
    const receipt = {
      id: '66666666-6666-4666-8666-666666666666',
      body_fingerprint: '',
      claims_fingerprint: '',
      received_at: confirmedAt
    };
    const firstRepository = new DatabasePixProviderEventIngressRepository({} as never, { nowSeconds: () => nowSeconds });
    const input = ingressInput();
    const { fingerprintPixProviderWebhookBody, fingerprintPixProviderWebhookClaims } = await import('../../../apps/api/src/pix-provider-event-fingerprints.js');
    receipt.body_fingerprint = fingerprintPixProviderWebhookBody(input.rawBody);
    receipt.claims_fingerprint = fingerprintPixProviderWebhookClaims(input.claims);
    mocks.query
      .mockResolvedValueOnce({ rows: [receipt] })
      .mockResolvedValueOnce({ rows: [{ id: '77777777-7777-4777-8777-777777777777' }] });
    await expect(firstRepository.persist(input)).resolves.toEqual({
      status: 'replayed',
      eventId: receipt.id,
      deliveryId: '77777777-7777-4777-8777-777777777777'
    });

    mocks.query
      .mockResolvedValueOnce({ rows: [receipt] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(firstRepository.persist(input)).resolves.toMatchObject({ status: 'replayed', eventId: receipt.id });
  });

  it('rejects invalid authenticated input and divergent replay claims', async () => {
    installTenantHarness();
    const repository = new DatabasePixProviderEventIngressRepository({} as never, { nowSeconds: () => nowSeconds });
    await expect(repository.persist({ ...ingressInput(), rawBody: 'not-buffer' as never })).rejects.toMatchObject({
      code: 'PIX_PROVIDER_EVENT_INVALID_INPUT'
    });
    await expect(repository.persist({ ...ingressInput(), claims: claims({ amountCents: 999 }) })).rejects.toMatchObject({
      code: 'PIX_PROVIDER_EVENT_INVALID_INPUT'
    });

    const input = ingressInput();
    const { fingerprintPixProviderWebhookBody } = await import('../../../apps/api/src/pix-provider-event-fingerprints.js');
    mocks.query.mockResolvedValueOnce({ rows: [{
      id: '88888888-8888-4888-8888-888888888888',
      body_fingerprint: fingerprintPixProviderWebhookBody(input.rawBody),
      claims_fingerprint: 'different',
      received_at: confirmedAt
    }] });
    await expect(repository.persist(input)).rejects.toMatchObject({ code: 'PIX_PROVIDER_EVENT_CONFLICT' });
  });

  it('recovers unique races and maps attempt conflicts to a stable public error', async () => {
    installTenantHarness();
    const input = ingressInput({ providerEventId: 'race-event' });
    const { fingerprintPixProviderWebhookBody, fingerprintPixProviderWebhookClaims } = await import('../../../apps/api/src/pix-provider-event-fingerprints.js');
    const receipt = {
      id: '99999999-9999-4999-8999-999999999999',
      body_fingerprint: fingerprintPixProviderWebhookBody(input.rawBody),
      claims_fingerprint: fingerprintPixProviderWebhookClaims(input.claims),
      received_at: confirmedAt
    };
    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce({ code: '23505' })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [receipt] })
      .mockResolvedValueOnce({ rows: [{ id: 'delivery-race' }] });
    await expect(new DatabasePixProviderEventIngressRepository({} as never, { nowSeconds: () => nowSeconds }).persist(input)).resolves.toEqual({
      status: 'replayed', eventId: receipt.id, deliveryId: 'delivery-race'
    });

    mocks.query.mockRejectedValueOnce({ code: '23503' });
    await expect(new DatabasePixProviderEventIngressRepository({} as never, { nowSeconds: () => nowSeconds }).persist(ingressInput({ providerEventId: 'attempt-conflict' }))).rejects.toMatchObject({
      code: 'PIX_PROVIDER_ATTEMPT_CONFLICT'
    });
  });
});
