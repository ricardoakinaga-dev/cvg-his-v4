import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import { AuditService } from '@cvg-his-v2/module-audit';

import {
  HmacLaboratoryProviderSignatureVerifier,
  LABORATORY_PROVIDER_MAX_BODY_BYTES,
  type LaboratoryProviderPayload
} from '../laboratory-provider-ingress.js';
import {
  InMemoryLaboratoryResultImportRepository,
  type LaboratoryResultImportRecord
} from '../laboratory-result-import-repository.js';
import { createInMemoryRuntimeRepositories } from '../runtime-repositories.js';
import {
  assertLaboratoryProviderIngressReadiness,
  handleLaboratoryIntegrationRoutes
} from './laboratory-integration-routes.js';

const ACCOUNT_ID = 'acc_cvg_lab_a';
const OTHER_ACCOUNT_ID = 'acc_cvg_lab_b';
const KEY_ID = 'lab-key-01';
const SECRET = Buffer.alloc(32, 0x42);
const NOW_SECONDS = 1_756_400_000;

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(chunk?: string | Buffer | (() => void), encoding?: BufferEncoding | (() => void), callback?: () => void): this {
    const finalCallback =
      typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    finalCallback?.();
    return this;
  }

  setHeader(): this {
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

class DurableTestLaboratoryResultImportRepository extends InMemoryLaboratoryResultImportRepository {
  override readonly storage = 'durable' as const;
}

function createPayload(overrides: Partial<LaboratoryProviderPayload> = {}): LaboratoryProviderPayload {
  return {
    schemaVersion: '1',
    provider: 'equipment-bridge',
    externalResultId: 'external-result-001',
    orderId: 'order-001',
    equipmentId: 'equipment-001',
    resultSummary: 'Hemoglobina: 7.2',
    observedAt: '2026-08-29T03:33:20.000Z',
    ...overrides
  };
}

function signedRequest(
  rawKey: string,
  payload: LaboratoryProviderPayload,
  options: {
    readonly timestamp?: number;
    readonly keyId?: string;
    readonly contentType?: string;
    readonly contentEncoding?: string;
    readonly rawHeaders?: readonly string[];
  } = {}
): Readable {
  const timestamp = String(options.timestamp ?? NOW_SECONDS);
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = `v1=${createHmac('sha256', SECRET)
    .update(Buffer.from(`v1.${timestamp}.`, 'ascii'))
    .update(rawBody)
    .digest('hex')}`;
  return Object.assign(Readable.from([rawBody]), {
    method: 'POST',
    url: '/integrations/laboratory/equipment-results/imports',
    headers: {
      'x-api-key': rawKey,
      'content-type': options.contentType ?? 'application/json',
      ...(options.contentEncoding ? { 'content-encoding': options.contentEncoding } : {}),
      'x-lab-provider-key-id': options.keyId ?? KEY_ID,
      'x-lab-timestamp': timestamp,
      'x-lab-signature': signature
    },
    ...(options.rawHeaders ? { rawHeaders: [...options.rawHeaders] } : {}),
    socket: { remoteAddress: '127.0.0.1' }
  });
}

function unsignedRequest(rawKey: string, body: Record<string, unknown>): Readable {
  return Object.assign(Readable.from([JSON.stringify(body)]), {
    method: 'POST',
    url: '/integrations/laboratory/equipment-results/imports',
    headers: {
      'x-api-key': rawKey,
      'content-type': 'application/json'
    },
    socket: { remoteAddress: '127.0.0.1' }
  });
}

function getRequest(rawKey: string): Readable {
  return Object.assign(Readable.from([]), {
    method: 'GET',
    url: '/integrations/laboratory/equipment-results/report',
    headers: { 'x-api-key': rawKey },
    socket: { remoteAddress: '127.0.0.1' }
  });
}

function createHandlers(
  apiKeys: ApiKeysService,
  laboratoryResultImports: InMemoryLaboratoryResultImportRepository,
  audit = new AuditService()
) {
  return {
    laboratoryResultImports,
    apiKeys,
    audit,
    nowSeconds: () => NOW_SECONDS,
    laboratoryProviderSignatureVerifier: new HmacLaboratoryProviderSignatureVerifier(
      new Map([[KEY_ID, { accountId: ACCOUNT_ID, secret: SECRET }]])
    )
  };
}

async function createApiKey(accountId: string, permissions: string[] = ['integrations.read', 'laboratory.results.write']) {
  const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
  const created = await apiKeys.create({
    accountId: accountId as never,
    name: `Equipment key ${accountId}`,
    permissions,
    createdBy: 'user_admin'
  });
  return { apiKeys, rawKey: created.rawKey };
}

test('accepts only a signed provider payload and queues it for human review', async () => {
  const { apiKeys, rawKey } = await createApiKey(ACCOUNT_ID);
  const audit = new AuditService();
  const repository = new DurableTestLaboratoryResultImportRepository();
  const response = new MockResponse();

  await handleLaboratoryIntegrationRoutes(
    '/integrations/laboratory/equipment-results/imports',
    signedRequest(rawKey, createPayload()) as never,
    response as never,
    'corr-lab-accept',
    createHandlers(apiKeys, repository, audit)
  );

  assert.equal(response.statusCode, 202);
  const accepted = response.bodyJson<{ status: string; replayed: boolean }>();
  assert.equal(accepted.status, 'pending_human_review');
  assert.equal(accepted.replayed, false);
  const records = await repository.list(ACCOUNT_ID);
  assert.equal(records.length, 1);
  assert.equal(records[0]?.status, 'pending_human_review');
  assert.equal(audit.list().length, 1);
  assert.equal(audit.list()[0]?.action, 'laboratory_provider_result_queued');
  assert.doesNotMatch(audit.list()[0]?.payloadSummary ?? '', /external-result|order-001|equipment-001|Hemoglobina/);
});

test('rejects duplicate security headers, unsupported encoding and oversized bodies', async () => {
  const { apiKeys, rawKey } = await createApiKey(ACCOUNT_ID);
  const repository = new DurableTestLaboratoryResultImportRepository();
  const handlers = createHandlers(apiKeys, repository);

  await assert.rejects(
    handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports',
      signedRequest(rawKey, createPayload(), {
        rawHeaders: ['x-lab-signature', 'first', 'x-lab-signature', 'second']
      }) as never,
      new MockResponse() as never,
      'corr-lab-duplicate-header',
      handlers
    ),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 401 && error.code === 'LABORATORY_PROVIDER_UNAUTHORIZED'
  );

  await assert.rejects(
    handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports',
      signedRequest(rawKey, createPayload(), { contentEncoding: 'gzip' }) as never,
      new MockResponse() as never,
      'corr-lab-encoding',
      handlers
    ),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 400 && error.code === 'LABORATORY_PROVIDER_INVALID_REQUEST'
  );

  const oversized = Object.assign(Readable.from([Buffer.alloc(LABORATORY_PROVIDER_MAX_BODY_BYTES + 1)]), {
    method: 'POST',
    url: '/integrations/laboratory/equipment-results/imports',
    headers: {
      'x-api-key': rawKey,
      'content-type': 'application/json',
      'content-length': String(LABORATORY_PROVIDER_MAX_BODY_BYTES + 1)
    },
    socket: { remoteAddress: '127.0.0.1' }
  });
  await assert.rejects(
    handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports',
      oversized as never,
      new MockResponse() as never,
      'corr-lab-oversized',
      handlers
    ),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 413 && error.code === 'LABORATORY_PROVIDER_INVALID_REQUEST'
  );
  assert.equal((await repository.list(ACCOUNT_ID)).length, 0);
});

test('replays the exact signed payload and rejects a changed payload without mutation', async () => {
  const { apiKeys, rawKey } = await createApiKey(ACCOUNT_ID);
  const repository = new DurableTestLaboratoryResultImportRepository();
  const handlers = createHandlers(apiKeys, repository);
  const first = createPayload();

  const firstResponse = new MockResponse();
  await handleLaboratoryIntegrationRoutes(
    '/integrations/laboratory/equipment-results/imports',
    signedRequest(rawKey, first) as never,
    firstResponse as never,
    'corr-lab-first',
    handlers
  );
  const firstRecord = (await repository.list(ACCOUNT_ID))[0];

  const replayResponse = new MockResponse();
  await handleLaboratoryIntegrationRoutes(
    '/integrations/laboratory/equipment-results/imports',
    signedRequest(rawKey, first) as never,
    replayResponse as never,
    'corr-lab-replay',
    handlers
  );
  assert.equal(replayResponse.statusCode, 200);
  assert.equal(replayResponse.bodyJson<{ replayed: boolean }>().replayed, true);
  assert.deepEqual((await repository.list(ACCOUNT_ID))[0], firstRecord);

  await assert.rejects(
    handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports',
      signedRequest(rawKey, createPayload({ resultSummary: 'Hemoglobina: 8.1' })) as never,
      new MockResponse() as never,
      'corr-lab-conflict',
      handlers
    ),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 409 && error.code === 'LABORATORY_PROVIDER_INGRESS_CONFLICT'
  );
  assert.equal((await repository.list(ACCOUNT_ID)).length, 1);
});

test('binds the provider signature to the API-key tenant and keeps tenants isolated', async () => {
  const first = await createApiKey(ACCOUNT_ID);
  const second = await createApiKey(OTHER_ACCOUNT_ID);
  const repository = new DurableTestLaboratoryResultImportRepository();
  const handlers = createHandlers(first.apiKeys, repository);

  await handleLaboratoryIntegrationRoutes(
    '/integrations/laboratory/equipment-results/imports',
    signedRequest(first.rawKey, createPayload({ externalResultId: 'shared-external' })) as never,
    new MockResponse() as never,
    'corr-lab-tenant-a',
    handlers
  );

  await assert.rejects(
    handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports',
      signedRequest(second.rawKey, createPayload({ externalResultId: 'shared-external' })) as never,
      new MockResponse() as never,
      'corr-lab-tenant-b',
      {
        ...createHandlers(second.apiKeys, repository),
        laboratoryProviderSignatureVerifier: new HmacLaboratoryProviderSignatureVerifier(
          new Map([[KEY_ID, { accountId: ACCOUNT_ID, secret: SECRET }]])
        )
      } as never
    ),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 401 && error.code === 'LABORATORY_PROVIDER_UNAUTHORIZED'
  );
  assert.equal((await repository.list(ACCOUNT_ID)).length, 1);
  assert.equal((await repository.list(OTHER_ACCOUNT_ID)).length, 0);
});

test('rejects legacy unsigned payloads, missing durable storage and generic permissions', async () => {
  const { apiKeys, rawKey } = await createApiKey(ACCOUNT_ID);
  const repository = new InMemoryLaboratoryResultImportRepository();
  const handlers = createHandlers(apiKeys, repository);

  await assert.rejects(
    handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports',
      unsignedRequest(rawKey, {
        externalResultId: 'legacy-001',
        orderId: 'order-001',
        equipmentId: 'equipment-001',
        resultSummary: 'legacy'
      }) as never,
      new MockResponse() as never,
      'corr-lab-legacy',
      handlers
    ),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 503 && error.code === 'LABORATORY_PROVIDER_INGRESS_UNAVAILABLE'
  );

  const generic = await createApiKey(ACCOUNT_ID, ['integrations.read', 'notifications.manage']);
  await assert.rejects(
    handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports',
      unsignedRequest(generic.rawKey, {}) as never,
      new MockResponse() as never,
      'corr-lab-permission',
      createHandlers(generic.apiKeys, new DurableTestLaboratoryResultImportRepository())
    ),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 403 && error.code === 'FORBIDDEN'
  );
});

test('reports pending review separately and never auto-releases a failed legacy record', async () => {
  const { apiKeys, rawKey } = await createApiKey(ACCOUNT_ID);
  const repository = new DurableTestLaboratoryResultImportRepository();
  await repository.create({
    externalResultId: 'legacy-failed',
    orderId: 'order-legacy',
    accountId: ACCOUNT_ID,
    equipmentId: 'equipment-legacy',
    providerCode: 'equipment-bridge',
    schemaVersion: 'legacy',
    signatureKeyId: 'legacy',
    payloadFingerprint: '0'.repeat(64),
    observedAt: '2026-08-29T03:33:20.000Z',
    status: 'failed',
    importedAt: '2026-08-29T03:33:20.000Z',
    resultSummary: 'legacy result',
    failureReason: 'legacy failure',
    attemptCount: 1,
    lastAttemptAt: '2026-08-29T03:33:20.000Z'
  } satisfies LaboratoryResultImportRecord);

  const reportResponse = new MockResponse();
  await handleLaboratoryIntegrationRoutes(
    '/integrations/laboratory/equipment-results/report',
    getRequest(rawKey) as never,
    reportResponse as never,
    'corr-lab-report',
    createHandlers(apiKeys, repository)
  );
  assert.deepEqual(reportResponse.bodyJson<{ summary: Record<string, number> }>().summary, {
    total: 1,
    pendingHumanReview: 0,
    imported: 0,
    failed: 1
  });

  await assert.rejects(
    handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports/legacy-failed/retry',
      Object.assign(Readable.from([]), {
        method: 'POST',
        url: '/integrations/laboratory/equipment-results/imports/legacy-failed/retry',
        headers: { 'x-api-key': rawKey },
        socket: { remoteAddress: '127.0.0.1' }
      }) as never,
      new MockResponse() as never,
      'corr-lab-retry',
      createHandlers(apiKeys, repository)
    ),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 409 && error.code === 'LABORATORY_RETRY_REQUIRES_HUMAN_REVIEW'
  );
});

test('does not acknowledge a queued result when awaited audit persistence fails', async () => {
  const { apiKeys, rawKey } = await createApiKey(ACCOUNT_ID);
  const repository = new DurableTestLaboratoryResultImportRepository();
  const audit = new AuditService({
    auditRepository: {
      async create(): Promise<void> {
        throw new Error('audit storage unavailable');
      },
      async list() {
        return [];
      },
      async findById() {
        return null;
      }
    }
  });

  await assert.rejects(
    handleLaboratoryIntegrationRoutes(
      '/integrations/laboratory/equipment-results/imports',
      signedRequest(rawKey, createPayload({ externalResultId: 'audit-failure-result' })) as never,
      new MockResponse() as never,
      'corr-lab-audit-failure',
      createHandlers(apiKeys, repository, audit)
    ),
    (error: { statusCode?: number; code?: string }) =>
      error.statusCode === 503 && error.code === 'LABORATORY_PROVIDER_AUDIT_UNAVAILABLE'
  );

  const stored = await repository.findByExternalResultId('audit-failure-result', ACCOUNT_ID);
  assert.equal(stored?.status, 'pending_human_review');
  assert.equal(audit.list().length, 0);
});

test('bootstrap readiness rejects configured ingress without durable storage or in production-like envs', () => {
  const keyring = new Map([[KEY_ID, { accountId: ACCOUNT_ID, secret: SECRET }]]);
  const ephemeral = new InMemoryLaboratoryResultImportRepository();
  const durable = new DurableTestLaboratoryResultImportRepository();

  assert.throws(
    () =>
      assertLaboratoryProviderIngressReadiness({
        environment: 'development',
        keyring,
        repository: ephemeral
      }),
    /durable ingress repository/
  );
  assert.throws(
    () =>
      assertLaboratoryProviderIngressReadiness({
        environment: 'production',
        keyring,
        repository: durable
      }),
    /cannot mount the local laboratory provider ingress/
  );
  assert.doesNotThrow(() =>
    assertLaboratoryProviderIngressReadiness({
      environment: 'development',
      keyring,
      repository: durable
    })
  );
});
