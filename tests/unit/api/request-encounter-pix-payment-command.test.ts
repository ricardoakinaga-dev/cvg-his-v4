import { describe, expect, it, vi } from 'vitest';

import { RequestEncounterPixPaymentCommand } from '../../../apps/api/src/commands/request-encounter-pix-payment.js';
import type {
  EncounterPixPaymentAttemptRecord,
  EncounterPixPaymentAttemptRepository,
  RequestEncounterPixPaymentInput
} from '../../../apps/api/src/encounter-pix-payment-attempt-repository.js';
import { ValidationError } from '@cvg-his-v2/shared-errors';

const accountId = '00000000-0000-0000-0000-000000000001';
const actorUserId = '00000000-0000-0000-0000-000000000002';
const encounterId = '00000000-0000-0000-0000-000000000003';

const attempt: EncounterPixPaymentAttemptRecord = Object.freeze({
  id: '00000000-0000-0000-0000-000000000004',
  accountId,
  encounterId,
  billingRecordId: 'billing-1',
  requestedByUserId: actorUserId,
  paymentMethod: 'pix',
  providerKey: 'local-pix',
  state: 'pending_dispatch',
  amountCents: 12_550,
  currency: 'BRL',
  providerIdempotencyKey: 'cvg:pix:create:v1:00000000-0000-0000-0000-000000000004',
  providerTransactionId: null,
  qrCodePayload: null,
  qrCodeBase64: null,
  expiresAt: null,
  lastErrorCode: null,
  lastErrorPublicMessage: null,
  dispatchAttempts: 0,
  maxDispatchAttempts: 5,
  nextAttemptAt: null,
  version: 0,
  createdAt: '2026-08-22T12:00:00.000Z',
  updatedAt: '2026-08-22T12:00:00.000Z'
});

const validInput: RequestEncounterPixPaymentInput = Object.freeze({
  accountId,
  actorUserId,
  encounterId,
  providerKey: 'local-pix',
  requestKey: 'request-key-1'
});

function createRepository(): {
  readonly repository: EncounterPixPaymentAttemptRepository;
  readonly create: ReturnType<typeof vi.fn<EncounterPixPaymentAttemptRepository['create']>>;
} {
  const create = vi.fn<EncounterPixPaymentAttemptRepository['create']>().mockResolvedValue(attempt);
  return {
    repository: {
      create,
      findById: vi.fn<EncounterPixPaymentAttemptRepository['findById']>(),
      findActiveByEncounter: vi.fn<EncounterPixPaymentAttemptRepository['findActiveByEncounter']>()
    },
    create
  };
}

function createCommand(
  options: {
    readonly allowSyntheticProviders?: boolean;
    readonly transaction?: Readonly<{ accountId: string; actorUserId: string }>;
  } = {}
) {
  const { repository, create } = createRepository();
  const transaction =
    options.transaction === undefined ? { accountId, actorUserId } : options.transaction;
  const command = new RequestEncounterPixPaymentCommand(
    repository,
    { allowSyntheticProviders: options.allowSyntheticProviders ?? true },
    () => transaction as never
  );
  return { command, create, transaction };
}

describe('RequestEncounterPixPaymentCommand validation guards', () => {
  it('delegates a validated immutable copy inside the matching tenant transaction', async () => {
    const { command, create, transaction } = createCommand();

    await expect(command.execute(validInput)).resolves.toEqual(attempt);

    const delegated = create.mock.calls[0]?.[1];
    expect(create).toHaveBeenCalledWith(transaction, validInput);
    expect(delegated).not.toBe(validInput);
    expect(Object.isFrozen(delegated)).toBe(true);
  });

  it('accepts a prototype-less input while preserving its opaque request key', async () => {
    const { command, create } = createCommand();
    const input = Object.assign(Object.create(null) as Record<string, unknown>, validInput, {
      requestKey: '  opaque spaces stay  '
    });

    await command.execute(input as unknown as RequestEncounterPixPaymentInput);

    expect(create.mock.calls[0]?.[1].requestKey).toBe('  opaque spaces stay  ');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'request'],
    ['array', []],
    ['custom prototype', new (class PixRequest {})()],
    ['unsupported field', { ...validInput, amount: 125.5 }]
  ])('rejects a non-plain or over-posted input: %s', async (_label, input) => {
    const { command, create } = createCommand();

    await expect(command.execute(input as never)).rejects.toBeInstanceOf(ValidationError);
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ['accountId type', { ...validInput, accountId: 1 }],
    ['accountId value', { ...validInput, accountId: 'not-a-uuid' }],
    ['actorUserId type', { ...validInput, actorUserId: null }],
    ['actorUserId value', { ...validInput, actorUserId: 'not-a-uuid' }],
    ['encounterId type', { ...validInput, encounterId: false }],
    ['encounterId value', { ...validInput, encounterId: 'not-a-uuid' }],
    ['provider type', { ...validInput, providerKey: 1 }],
    ['provider value', { ...validInput, providerKey: 'external-pix' }],
    ['request key type', { ...validInput, requestKey: 1 }],
    ['empty request key', { ...validInput, requestKey: '' }],
    ['blank request key', { ...validInput, requestKey: '   ' }],
    ['oversized request key', { ...validInput, requestKey: 'x'.repeat(256) }],
    ['controlled request key', { ...validInput, requestKey: 'request\u0000key' }]
  ])('rejects invalid boundary data: %s', async (_label, input) => {
    const { command, create } = createCommand();

    await expect(command.execute(input as never)).rejects.toBeInstanceOf(ValidationError);
    expect(create).not.toHaveBeenCalled();
  });

  it('fails closed when synthetic PIX capability is not explicitly enabled', async () => {
    const { repository, create } = createRepository();
    const transactionProvider = vi.fn(() => ({ accountId, actorUserId }) as never);
    const command = new RequestEncounterPixPaymentCommand(repository, {}, transactionProvider);

    await expect(command.execute(validInput)).rejects.toMatchObject({
      code: 'SYNTHETIC_PIX_PROVIDER_DISABLED',
      statusCode: 503
    });
    expect(transactionProvider).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('fails closed outside the tenant unit of work', async () => {
    const { repository, create } = createRepository();
    const command = new RequestEncounterPixPaymentCommand(
      repository,
      { allowSyntheticProviders: true },
      () => undefined
    );

    await expect(command.execute({ ...validInput, providerKey: 'mock' })).rejects.toMatchObject({
      code: 'PIX_PAYMENT_ATTEMPT_TRANSACTION_REQUIRED',
      statusCode: 503
    });
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ['account', { accountId: '00000000-0000-0000-0000-000000000099', actorUserId }],
    ['actor', { accountId, actorUserId: '00000000-0000-0000-0000-000000000099' }]
  ])('rejects a %s mismatch with the active transaction', async (_label, transaction) => {
    const { command, create } = createCommand({ transaction });

    await expect(command.execute(validInput)).rejects.toMatchObject({
      code: 'PIX_PAYMENT_ATTEMPT_CONTEXT_MISMATCH',
      statusCode: 403
    });
    expect(create).not.toHaveBeenCalled();
  });
});
