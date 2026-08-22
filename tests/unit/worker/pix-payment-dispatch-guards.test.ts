import { beforeEach, describe, expect, it, vi } from 'vitest';
const databaseMocks = vi.hoisted(() => ({
  getDatabaseTransactionScope: vi.fn(),
  getTenantTransactionContext: vi.fn(),
  runInTenantTransaction: vi.fn()
}));
vi.mock('@cvg-his-v2/shared-database', () => databaseMocks);
import {
  PixPaymentDispatcher,
  PixPaymentDispatchConfigurationError,
  PixPaymentDispatchProviderError,
  type PixPaymentDispatchProvider,
  type PixPaymentDispatcherOptions
} from '../../../apps/worker/src/jobs/pix-payment-dispatcher.js';
import {
  DatabasePixPaymentDispatchRepository,
  type PixPaymentDispatchClaim,
  type PixPaymentDispatchFailure,
  type PixPaymentDispatchRepository,
  type PixPaymentDispatchSuccess
} from '../../../apps/worker/src/pix-payment-dispatch-repository.js';

const accountId = '00000000-0000-0000-0000-000000000001';
const attemptId = '00000000-0000-0000-0000-000000000002';
const encounterId = '00000000-0000-0000-0000-000000000003';
const leaseToken = '00000000-0000-0000-0000-000000000004';
const claim: PixPaymentDispatchClaim = Object.freeze({
  accountId,
  attemptId,
  encounterId,
  billingRecordId: 'billing-1',
  providerKey: 'provider-a',
  amountCents: 12_550,
  currency: 'BRL',
  providerIdempotencyKey: `cvg:pix:create:v1:${attemptId}`,
  createdAt: '2026-08-22T12:00:00.000Z',
  dispatchAttempt: 1,
  maxDispatchAttempts: 5,
  leaseOwner: 'worker-1',
  leaseToken,
  leaseVersion: 1,
  leaseExpiresAt: '2026-08-22T13:00:00.000Z'
});

function validSuccess(
  overrides: Partial<PixPaymentDispatchSuccess> = {}
): PixPaymentDispatchSuccess {
  return Object.freeze({
    providerTransactionId: 'provider-transaction-1',
    qrCodePayload: '000201-pix-payload',
    qrCodeBase64: Buffer.from('qr-code').toString('base64'),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides
  });
}

function createRepositoryMock(overrides: Partial<PixPaymentDispatchRepository> = {}) {
  const claimNext = vi.fn<PixPaymentDispatchRepository['claimNext']>().mockResolvedValue(claim);
  const completeSuccess = vi
    .fn<PixPaymentDispatchRepository['completeSuccess']>()
    .mockResolvedValue(true);
  const completeFailure = vi
    .fn<PixPaymentDispatchRepository['completeFailure']>()
    .mockResolvedValue('reconciliation_required');
  return {
    repository: {
      claimNext,
      completeSuccess,
      completeFailure,
      ...overrides
    } satisfies PixPaymentDispatchRepository,
    claimNext,
    completeSuccess,
    completeFailure
  };
}

function externalProvider(
  createIntent: PixPaymentDispatchProvider['createIntent'] = vi.fn(async () => validSuccess()),
  overrides: Partial<PixPaymentDispatchProvider> = {}
): PixPaymentDispatchProvider {
  return Object.freeze({
    key: 'provider-a',
    mode: 'external',
    createIntent,
    ...overrides
  });
}

function dispatcherOptions(
  overrides: Partial<PixPaymentDispatcherOptions> = {}
): PixPaymentDispatcherOptions {
  return {
    workerId: 'worker-1',
    leaseMs: 60_000,
    retryBaseMs: 100,
    providerTimeoutMs: 1_000,
    ...overrides
  };
}
describe('PixPaymentDispatcher guards and outcomes', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    databaseMocks.getTenantTransactionContext.mockReset().mockReturnValue(undefined);
    databaseMocks.getDatabaseTransactionScope.mockReset().mockReturnValue(undefined);
    databaseMocks.runInTenantTransaction.mockReset();
  });
  it.each([
    ['empty worker id', { workerId: '' }],
    ['controlled worker id', { workerId: 'worker\u0000id' }],
    ['oversized UTF-8 worker id', { workerId: 'ç'.repeat(81) }],
    ['zero lease', { leaseMs: 0 }],
    ['unsafe lease', { leaseMs: Number.MAX_SAFE_INTEGER + 1 }],
    ['oversized lease', { leaseMs: 3_600_001 }],
    ['one-millisecond lease', { leaseMs: 1 }],
    ['lease without persistence budget', { leaseMs: 5_000, providerTimeoutMs: undefined }],
    ['zero retry base', { retryBaseMs: 0 }],
    ['zero provider timeout', { providerTimeoutMs: 0 }],
    ['provider timeout equal to lease', { providerTimeoutMs: 60_000 }],
    ['provider timeout without persistence budget', { leaseMs: 6_000, providerTimeoutMs: 1_001 }],
    ['empty environment', { environment: '' }],
    ['controlled environment', { environment: 'dev\u0000local' }],
    ['oversized environment', { environment: 'x'.repeat(33) }]
  ])('rejects invalid dispatcher options: %s', (_label, overrides) => {
    expect(
      () =>
        new PixPaymentDispatcher(
          createRepositoryMock().repository,
          externalProvider(),
          dispatcherOptions(overrides)
        )
    ).toThrow();
  });
  it.each([
    ['empty', ''],
    ['controlled', 'provider\u0000a'],
    ['oversized UTF-8', 'ç'.repeat(17)]
  ])('rejects a %s provider key', (_label, key) => {
    expect(
      () =>
        new PixPaymentDispatcher(
          createRepositoryMock().repository,
          externalProvider(undefined, { key }),
          dispatcherOptions()
        )
    ).toThrow();
  });
  it('rejects an invalid account before claiming', async () => {
    const { repository, claimNext } = createRepositoryMock();
    const dispatcher = new PixPaymentDispatcher(
      repository,
      externalProvider(),
      dispatcherOptions()
    );

    await expect(dispatcher.processNext('invalid')).rejects.toThrow(
      'PIX dispatch account id must be a valid UUID'
    );
    expect(claimNext).not.toHaveBeenCalled();
  });
  it('requires an explicit provider mode for an unknown provider', async () => {
    const { repository, claimNext } = createRepositoryMock();
    const provider = externalProvider(undefined, { mode: undefined });
    const dispatcher = new PixPaymentDispatcher(repository, provider, dispatcherOptions());

    await expect(dispatcher.processNext(accountId)).rejects.toMatchObject({
      code: 'PIX_PROVIDER_MODE_REQUIRED'
    });
    expect(claimNext).not.toHaveBeenCalled();
  });
  it.each([
    ['local-pix', 'production', 'test'],
    ['mock', 'PROD', 'test'],
    ['mock-provider', 'production', 'test'],
    ['synthetic-provider', 'PROD', 'test'],
    ['synthetic-provider', 'development', 'production']
  ])(
    'blocks synthetic key %s in production environment %s',
    async (key, environment, processEnvironment) => {
      vi.stubEnv('NODE_ENV', processEnvironment);
      const { repository, claimNext } = createRepositoryMock();
      const dispatcher = new PixPaymentDispatcher(
        repository,
        externalProvider(undefined, { key, mode: undefined }),
        dispatcherOptions({ allowSyntheticProviders: true, environment })
      );

      await expect(dispatcher.processNext(accountId)).rejects.toMatchObject({
        code: 'SYNTHETIC_PIX_PROVIDER_DISABLED'
      });
      expect(claimNext).not.toHaveBeenCalled();
    }
  );
  it('blocks an explicitly synthetic provider without the capability', async () => {
    const { repository } = createRepositoryMock();
    const dispatcher = new PixPaymentDispatcher(
      repository,
      externalProvider(undefined, { key: 'sandbox', mode: 'synthetic' }),
      dispatcherOptions({ environment: 'development' })
    );

    await expect(dispatcher.processNext(accountId)).rejects.toBeInstanceOf(
      PixPaymentDispatchConfigurationError
    );
  });
  it('allows an explicitly enabled synthetic provider in a non-production environment', async () => {
    const { repository, claimNext } = createRepositoryMock({
      claimNext: vi.fn(async () => null)
    });
    const dispatcher = new PixPaymentDispatcher(
      repository,
      externalProvider(undefined, { key: 'sandbox', mode: 'synthetic' }),
      dispatcherOptions({ allowSyntheticProviders: true, environment: 'Development' })
    );

    await expect(dispatcher.processNext(accountId)).resolves.toEqual({ status: 'idle' });
    expect(claimNext).not.toHaveBeenCalled();
    expect(repository.claimNext).toHaveBeenCalledOnce();
  });
  it.each(['tenant', 'database'])(
    'forbids provider dispatch in an ambient %s transaction',
    async (scope) => {
      const { repository, claimNext } = createRepositoryMock();
      if (scope === 'tenant') databaseMocks.getTenantTransactionContext.mockReturnValue({});
      else databaseMocks.getDatabaseTransactionScope.mockReturnValue({});
      const dispatcher = new PixPaymentDispatcher(
        repository,
        externalProvider(),
        dispatcherOptions()
      );

      await expect(dispatcher.processNext(accountId)).rejects.toMatchObject({
        code: 'PIX_PROVIDER_CALLED_INSIDE_TRANSACTION'
      });
      expect(claimNext).not.toHaveBeenCalled();
    }
  );
  it('returns idle when no eligible claim exists', async () => {
    const claimNext = vi.fn(async () => null);
    const { repository } = createRepositoryMock({ claimNext });
    const dispatcher = new PixPaymentDispatcher(
      repository,
      externalProvider(),
      dispatcherOptions()
    );

    await expect(dispatcher.processNext(accountId)).resolves.toEqual({ status: 'idle' });
  });
  it('persists a provider mismatch without calling the configured provider', async () => {
    const createIntent = vi
      .fn<PixPaymentDispatchProvider['createIntent']>()
      .mockResolvedValue(validSuccess());
    const { repository, completeFailure } = createRepositoryMock();
    completeFailure.mockResolvedValue('dispatch_failed');
    const dispatcher = new PixPaymentDispatcher(
      repository,
      externalProvider(createIntent, { key: 'provider-b' }),
      dispatcherOptions()
    );

    await expect(dispatcher.processNext(accountId)).resolves.toEqual({
      status: 'dispatch_failed',
      attemptId
    });
    expect(createIntent).not.toHaveBeenCalled();
    expect(completeFailure).toHaveBeenCalledWith(claim, {
      code: 'PIX_PROVIDER_CONFIGURATION_MISMATCH',
      failureClass: 'permanent',
      publicMessage: 'The PIX provider configuration is unavailable',
      retryDelayMs: 0
    });
  });

  it.each([
    ['persisted', true, 'dispatched'],
    ['fence lost', false, 'lease_lost']
  ] as const)('maps successful dispatch when %s', async (_label, persisted, expectedStatus) => {
    const checkpoints: string[] = [];
    const createIntent = vi
      .fn<PixPaymentDispatchProvider['createIntent']>()
      .mockResolvedValue(validSuccess());
    const { repository, completeSuccess } = createRepositoryMock();
    completeSuccess.mockResolvedValue(persisted);
    const dispatcher = new PixPaymentDispatcher(
      repository,
      externalProvider(createIntent),
      dispatcherOptions({
        onCheckpoint: (checkpoint) => {
          checkpoints.push(checkpoint);
        }
      })
    );

    await expect(dispatcher.processNext(accountId)).resolves.toEqual({
      status: expectedStatus,
      attemptId
    });
    expect(createIntent.mock.calls[0]?.[0]).toMatchObject({
      accountId,
      attemptId,
      encounterId,
      billingRecordId: 'billing-1',
      amountCents: 12_550,
      currency: 'BRL',
      providerIdempotencyKey: `cvg:pix:create:v1:${attemptId}`,
      attemptCreatedAt: claim.createdAt,
      signal: expect.any(AbortSignal)
    });
    expect(Object.isFrozen(createIntent.mock.calls[0]?.[0])).toBe(true);
    expect(checkpoints).toEqual(['after_claim_commit', 'after_provider_success']);
  });

  it.each([
    [
      'transient trusted',
      'SYNTHETIC_UNAVAILABLE',
      'transient',
      'SYNTHETIC_UNAVAILABLE',
      'retry_scheduled'
    ],
    [
      'transient untrusted',
      'TOKEN_ABC123',
      'transient',
      'PIX_PROVIDER_TEMPORARY_UNAVAILABLE',
      'retry_scheduled'
    ],
    [
      'permanent trusted',
      'SYNTHETIC_REJECTED',
      'permanent',
      'SYNTHETIC_REJECTED',
      'dispatch_failed'
    ],
    [
      'permanent untrusted',
      'PRIVATE_REJECTION',
      'permanent',
      'PIX_PROVIDER_REQUEST_REJECTED',
      'dispatch_failed'
    ],
    [
      'ambiguous',
      'PRIVATE_TIMEOUT',
      'ambiguous',
      'PIX_PROVIDER_OUTCOME_AMBIGUOUS',
      'reconciliation_required'
    ]
  ] as const)(
    'normalizes a typed provider failure: %s',
    async (_label, sourceCode, failureClass, expectedCode, status) => {
      const providerError = new PixPaymentDispatchProviderError({
        code: sourceCode,
        failureClass,
        publicMessage: 'private provider body with customer data'
      });
      const createIntent = vi.fn(async () => {
        throw providerError;
      });
      const { repository, completeFailure } = createRepositoryMock();
      completeFailure.mockResolvedValue(status);
      const dispatcher = new PixPaymentDispatcher(
        repository,
        externalProvider(createIntent),
        dispatcherOptions({ retryBaseMs: 10 })
      );

      await expect(dispatcher.processNext(accountId)).resolves.toEqual({ status, attemptId });
      expect(completeFailure).toHaveBeenCalledWith(
        claim,
        expect.objectContaining({
          code: expectedCode,
          failureClass,
          publicMessage:
            failureClass === 'transient'
              ? 'PIX provider is temporarily unavailable'
              : failureClass === 'permanent'
                ? 'PIX request was rejected before creation'
                : 'The PIX provider outcome requires reconciliation',
          retryDelayMs: 10
        })
      );
    }
  );

  it('bounds exponential retry delay and maps a missing failure fence to lease_lost', async () => {
    const exhaustedClaim = Object.freeze({ ...claim, dispatchAttempt: 30 });
    const claimNext = vi.fn(async () => exhaustedClaim);
    const completeFailure = vi.fn(async () => null);
    const createIntent = vi.fn(async () => {
      throw new PixPaymentDispatchProviderError({
        code: 'SYNTHETIC_UNAVAILABLE',
        failureClass: 'transient',
        publicMessage: 'temporary'
      });
    });
    const { repository } = createRepositoryMock({ claimNext, completeFailure });
    const dispatcher = new PixPaymentDispatcher(
      repository,
      externalProvider(createIntent),
      dispatcherOptions({ retryBaseMs: 3_600_000 })
    );

    await expect(dispatcher.processNext(accountId)).resolves.toEqual({
      status: 'lease_lost',
      attemptId
    });
    expect(completeFailure).toHaveBeenCalledWith(
      exhaustedClaim,
      expect.objectContaining({
        retryDelayMs: 86_400_000
      })
    );
  });

  it('treats untyped and malformed provider outcomes as ambiguous', async () => {
    const completeFailure = vi.fn(async () => 'reconciliation_required' as const);
    const untypedProvider = externalProvider(
      vi.fn(async () => {
        throw new Error('secret upstream response');
      })
    );
    const malformedProvider = externalProvider(
      vi.fn(
        async () =>
          ({
            providerTransactionId: 'provider-1'
          }) as never
      )
    );

    for (const provider of [untypedProvider, malformedProvider]) {
      const { repository } = createRepositoryMock({ completeFailure });
      const dispatcher = new PixPaymentDispatcher(repository, provider, dispatcherOptions());
      await expect(dispatcher.processNext(accountId)).resolves.toEqual({
        status: 'reconciliation_required',
        attemptId
      });
    }
    expect(completeFailure).toHaveBeenCalledTimes(2);
    const expectedFailure = {
      code: 'PIX_PROVIDER_OUTCOME_AMBIGUOUS',
      failureClass: 'ambiguous',
      publicMessage: 'The PIX provider outcome requires reconciliation',
      retryDelayMs: 0
    } as const;
    expect(completeFailure).toHaveBeenNthCalledWith(1, claim, expectedFailure);
    expect(completeFailure).toHaveBeenNthCalledWith(2, claim, expectedFailure);
  });

  it('times out with the lease-derived default, aborts, and persists reconciliation', async () => {
    let signal: AbortSignal | undefined;
    const abortError = new PixPaymentDispatchProviderError({
      code: 'PIX_PROVIDER_TEMPORARY_UNAVAILABLE',
      failureClass: 'transient',
      publicMessage: 'Temporary provider failure'
    });
    const createIntent = vi.fn(async (input) => {
      signal = input.signal;
      return new Promise<PixPaymentDispatchSuccess>((_resolve, reject) => {
        input.signal?.addEventListener('abort', () => reject(abortError), { once: true });
      });
    });
    const { repository, completeFailure } = createRepositoryMock();
    const dispatcher = new PixPaymentDispatcher(
      repository,
      externalProvider(createIntent),
      dispatcherOptions({ leaseMs: 5_001, providerTimeoutMs: undefined })
    );

    await expect(dispatcher.processNext(accountId)).resolves.toEqual({
      status: 'reconciliation_required',
      attemptId
    });
    expect(signal?.aborted).toBe(true);
    expect(completeFailure).toHaveBeenCalledWith(
      claim,
      expect.objectContaining({
        failureClass: 'ambiguous'
      })
    );
  });

  it('moves a provider success to reconciliation when durable persistence throws', async () => {
    const { repository, completeFailure } = createRepositoryMock({
      completeSuccess: vi.fn(async () => {
        throw new Error('database unavailable');
      })
    });
    const dispatcher = new PixPaymentDispatcher(
      repository,
      externalProvider(),
      dispatcherOptions()
    );

    await expect(dispatcher.processNext(accountId)).resolves.toEqual({
      status: 'reconciliation_required',
      attemptId
    });
    expect(completeFailure).toHaveBeenCalledWith(claim, {
      code: 'PIX_PROVIDER_SUCCESS_PERSISTENCE_FAILED',
      failureClass: 'ambiguous',
      publicMessage: 'The PIX provider outcome requires reconciliation',
      retryDelayMs: 0
    });
  });
});

describe('DatabasePixPaymentDispatchRepository unit guards', () => {
  const query = vi.fn();
  const repository = new DatabasePixPaymentDispatchRepository({} as never);
  beforeEach(() => {
    query.mockReset();
    databaseMocks.runInTenantTransaction
      .mockReset()
      .mockImplementation(
        async (_pool: unknown, _account: string, work: (client: unknown) => Promise<unknown>) =>
          work({ query })
      );
  });

  it.each([
    ['invalid account', { accountId: 'invalid', leaseOwner: 'worker', leaseMs: 100 }],
    ['empty owner', { accountId, leaseOwner: '', leaseMs: 100 }],
    ['controlled owner', { accountId, leaseOwner: 'worker\u0000id', leaseMs: 100 }],
    ['oversized owner', { accountId, leaseOwner: 'ç'.repeat(81), leaseMs: 100 }],
    ['zero lease', { accountId, leaseOwner: 'worker', leaseMs: 0 }],
    ['unsafe lease', { accountId, leaseOwner: 'worker', leaseMs: Number.MAX_SAFE_INTEGER + 1 }],
    ['oversized lease', { accountId, leaseOwner: 'worker', leaseMs: 3_600_001 }],
    ['invalid provider', { accountId, leaseOwner: 'worker', leaseMs: 100, providerKey: 'UPPER' }]
  ])('rejects an invalid claim request before database access: %s', async (_label, input) => {
    await expect(repository.claimNext(input)).rejects.toThrow();
    expect(databaseMocks.runInTenantTransaction).not.toHaveBeenCalled();
  });

  it.each([
    ['account UUID', { accountId: 'invalid' }],
    ['attempt UUID', { attemptId: 'invalid' }],
    ['encounter UUID', { encounterId: 'invalid' }],
    ['lease UUID', { leaseToken: 'invalid' }],
    ['billing id', { billingRecordId: '' }],
    ['lease owner', { leaseOwner: '' }],
    ['amount', { amountCents: 0 }],
    ['attempt number', { dispatchAttempt: 0 }],
    ['maximum attempts', { maxDispatchAttempts: 0 }],
    ['lease version', { leaseVersion: 0 }],
    ['currency', { currency: 'USD' }],
    ['provider key', { providerKey: 'INVALID' }],
    ['idempotency key', { providerIdempotencyKey: 'different' }],
    ['attempt creation', { createdAt: 'not-a-timestamp' }],
    ['lease expiry format', { leaseExpiresAt: '2026-08-22T13:00:00Z' }],
    ['lease expiry value', { leaseExpiresAt: '2026-99-99T99:99:99.999Z' }]
  ])('rejects an invalid persisted claim before database access: %s', async (_label, overrides) => {
    const invalidClaim = { ...claim, ...overrides } as PixPaymentDispatchClaim;

    await expect(
      repository.completeFailure(invalidClaim, {
        code: 'FAILURE',
        failureClass: 'ambiguous',
        publicMessage: 'ignored',
        retryDelayMs: 0
      })
    ).rejects.toThrow();
    expect(databaseMocks.runInTenantTransaction).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid code', { code: 'invalid-code', failureClass: 'ambiguous', retryDelayMs: 0 }],
    ['invalid class', { code: 'FAILURE', failureClass: 'unknown', retryDelayMs: 0 }],
    ['negative delay', { code: 'FAILURE', failureClass: 'transient', retryDelayMs: -1 }],
    [
      'unsafe delay',
      {
        code: 'FAILURE',
        failureClass: 'transient',
        retryDelayMs: Number.MAX_SAFE_INTEGER + 1
      }
    ]
  ])('rejects invalid failure metadata before database access: %s', async (_label, value) => {
    const failure = { publicMessage: 'untrusted', ...value } as PixPaymentDispatchFailure;

    await expect(repository.completeFailure(claim, failure)).rejects.toThrow();
    expect(databaseMocks.runInTenantTransaction).not.toHaveBeenCalled();
  });

  it('maps a claimed row and passes a provider filter to the database transaction', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [
        {
          account_id: accountId,
          amount_cents: '12550',
          billing_record_id: 'billing-1',
          created_at: new Date(claim.createdAt),
          currency: 'BRL',
          dispatch_attempts: 1,
          encounter_id: encounterId,
          id: attemptId,
          lease_expires_at: new Date('2026-08-22T13:00:00.000Z'),
          lease_owner: 'worker-1',
          lease_token: leaseToken,
          lease_version: '1',
          max_dispatch_attempts: 5,
          provider_idempotency_key: `cvg:pix:create:v1:${attemptId}`,
          provider_key: 'provider-a'
        }
      ]
    });

    await expect(
      repository.claimNext({
        accountId,
        leaseOwner: 'worker-1',
        leaseMs: 100,
        providerKey: 'provider-a'
      })
    ).resolves.toEqual(claim);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FOR UPDATE OF attempt SKIP LOCKED'),
      [accountId, 'worker-1', 100, 'provider-a']
    );
  });

  it('returns null when the claim query has no eligible row', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    await expect(
      repository.claimNext({
        accountId,
        leaseOwner: 'worker-1',
        leaseMs: 100
      })
    ).resolves.toBeNull();
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), [
      accountId,
      'worker-1',
      100,
      null
    ]);
  });

  it.each([
    ['missing active row', [], 0],
    [
      'authoritative mismatch',
      [
        {
          amount_cents: '12551',
          billing_record_id: 'billing-1',
          currency: 'BRL',
          provider_idempotency_key: `cvg:pix:create:v1:${attemptId}`,
          provider_key: 'provider-a'
        }
      ],
      0
    ],
    [
      'fence lost on update',
      [
        {
          amount_cents: '12550',
          billing_record_id: 'billing-1',
          currency: 'BRL',
          provider_idempotency_key: `cvg:pix:create:v1:${attemptId}`,
          provider_key: 'provider-a'
        }
      ],
      0
    ]
  ] as const)(
    'returns false on success completion when %s',
    async (_label, lockedRows, rowCount) => {
      query.mockResolvedValueOnce({ rows: lockedRows });
      if (lockedRows.length > 0 && lockedRows[0]?.amount_cents === '12550') {
        query.mockResolvedValueOnce({ rowCount });
      }

      await expect(repository.completeSuccess(claim, validSuccess())).resolves.toBe(false);
    }
  );

  it('persists a valid success and its pending PIX transaction', async () => {
    const success = validSuccess();
    const expiresAt = new Date(success.expiresAt);
    query
      .mockResolvedValueOnce({
        rows: [
          {
            amount_cents: '12550',
            billing_record_id: 'billing-1',
            currency: 'BRL',
            provider_idempotency_key: `cvg:pix:create:v1:${attemptId}`,
            provider_key: 'provider-a'
          }
        ]
      })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 });

    await expect(repository.completeSuccess(claim, success)).resolves.toBe(true);
    expect(query).toHaveBeenCalledTimes(3);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE encounter_payment_attempts'),
      [
        accountId,
        attemptId,
        'worker-1',
        leaseToken,
        1,
        success.providerTransactionId,
        success.qrCodePayload,
        success.qrCodeBase64,
        expiresAt
      ]
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO pix_transactions'),
      [
        attemptId,
        'provider-a',
        accountId,
        'billing-1',
        attemptId,
        '125.50',
        'BRL',
        `PIX payment attempt ${attemptId}`,
        success.qrCodePayload,
        success.qrCodeBase64,
        expiresAt,
        success.providerTransactionId
      ]
    );
  });

  it.each([
    ['pending_dispatch', 'retry_scheduled', 'transient', 90_000_000, 86_400_000],
    ['dispatch_failed', 'dispatch_failed', 'permanent', 0, 0],
    ['reconciliation_required', 'reconciliation_required', 'ambiguous', 0, 0]
  ] as const)(
    'normalizes and maps the %s failure state',
    async (databaseState, expectedStatus, failureClass, retryDelayMs, expectedDelay) => {
      query
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ state: databaseState }] });

      await expect(
        repository.completeFailure(claim, {
          code: 'SAFE_FAILURE',
          failureClass,
          publicMessage: 'untrusted provider body',
          retryDelayMs
        })
      ).resolves.toBe(expectedStatus);
      expect(query).toHaveBeenNthCalledWith(2, expect.any(String), [
        accountId,
        attemptId,
        'worker-1',
        leaseToken,
        1,
        failureClass,
        'SAFE_FAILURE',
        failureClass === 'transient'
          ? 'PIX provider is temporarily unavailable'
          : failureClass === 'permanent'
            ? 'PIX request was rejected before creation'
            : 'The PIX provider outcome requires reconciliation',
        expectedDelay
      ]);
    }
  );

  it('returns null when failure completion loses its fence', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [] });

    await expect(
      repository.completeFailure(claim, {
        code: 'SAFE_FAILURE',
        failureClass: 'ambiguous',
        publicMessage: 'ignored',
        retryDelayMs: 0
      })
    ).resolves.toBeNull();
  });

  it('returns null before touching the attempt when its billing reservation is missing', async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });

    await expect(
      repository.completeFailure(claim, {
        code: 'SAFE_FAILURE',
        failureClass: 'ambiguous',
        publicMessage: 'ignored',
        retryDelayMs: 0
      })
    ).resolves.toBeNull();
    expect(query).toHaveBeenCalledOnce();
  });
});
