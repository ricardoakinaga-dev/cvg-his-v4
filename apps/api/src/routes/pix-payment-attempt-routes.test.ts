import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { AppError, AuthenticationError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import type {
  EncounterPixPaymentAttemptRecord,
  RequestEncounterPixPaymentInput
} from '../encounter-pix-payment-attempt-repository.js';
import { handlePixPaymentAttemptRoutes } from './pix-payment-attempt-routes.js';

const accountId = '00000000-0000-0000-0000-000000000001';
const encounterId = '00000000-0000-0000-0000-000000000002';
const actorUserId = '00000000-0000-0000-0000-000000000003';
const attemptId = '00000000-0000-0000-0000-000000000004';
const otherAccountId = '00000000-0000-0000-0000-000000000005';
const billingRecordId = 'billing-pix-attempt-1';
const createdAt = '2026-08-22T12:00:00.000Z';
const updatedAt = '2026-08-22T12:01:00.000Z';

const pendingAttempt: EncounterPixPaymentAttemptRecord = Object.freeze({
  id: attemptId,
  accountId,
  encounterId,
  billingRecordId,
  requestedByUserId: actorUserId,
  paymentMethod: 'pix',
  providerKey: 'local-pix',
  state: 'pending_dispatch',
  amountCents: 12_550,
  currency: 'BRL',
  providerIdempotencyKey: `cvg:pix:create:v1:${attemptId}`,
  providerTransactionId: null,
  qrCodePayload: null,
  qrCodeBase64: null,
  expiresAt: null,
  lastErrorCode: null,
  lastErrorPublicMessage: null,
  dispatchAttempts: 0,
  maxDispatchAttempts: 5,
  nextAttemptAt: null,
  version: 1,
  createdAt,
  updatedAt
});

const retryingAttempt: EncounterPixPaymentAttemptRecord = Object.freeze({
  ...pendingAttempt,
  lastErrorCode: 'PIX_PROVIDER_TEMPORARY_UNAVAILABLE',
  lastErrorPublicMessage: 'PIX indisponível temporariamente',
  dispatchAttempts: 1,
  nextAttemptAt: '2026-08-22T12:02:00.000Z',
  version: 2,
  updatedAt: '2026-08-22T12:01:30.000Z'
});

const pendingPublicDto = Object.freeze({
  id: attemptId,
  encounterId,
  billingRecordId,
  state: 'pending_dispatch',
  amountCents: 12_550,
  currency: 'BRL',
  qrCodePayload: null,
  qrCodeBase64: null,
  expiresAt: null,
  error: null,
  createdAt,
  updatedAt
});

const retryingPublicDto = Object.freeze({
  ...pendingPublicDto,
  error: Object.freeze({
    code: 'PIX_PROVIDER_TEMPORARY_UNAVAILABLE',
    message: 'PIX indisponível temporariamente'
  }),
  updatedAt: '2026-08-22T12:01:30.000Z'
});

class MockResponse extends Writable {
  public statusCode = 200;
  readonly headers = new Map<string, string>();
  #chunks: readonly Buffer[] = Object.freeze([]);

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: () => void): void {
    const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.#chunks = Object.freeze([...this.#chunks, next]);
    callback();
  }

  override end(chunk?: string | Buffer | (() => void)): this {
    if (chunk !== undefined && typeof chunk !== 'function') {
      const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      this.#chunks = Object.freeze([...this.#chunks, next]);
    }
    if (typeof chunk === 'function') chunk();
    return this;
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function principal(): AuthenticatedPrincipal {
  return Object.freeze({
    user: Object.freeze({
      id: actorUserId as never,
      accountId: accountId as never,
      username: 'finance',
      email: 'finance@example.com',
      displayName: 'Financeiro',
      status: 'active',
      createdAt,
      updatedAt
    }),
    session: Object.freeze({
      sessionId: 'session-pix-attempt' as never,
      userId: actorUserId as never,
      accountId: accountId as never,
      createdAt,
      expiresAt: '2026-08-23T12:00:00.000Z',
      authTime: createdAt,
      refreshExpiresAt: '2026-08-29T12:00:00.000Z',
      active: true
    }),
    access: Object.freeze({
      roleCodes: Object.freeze(['finance']),
      permissionCodes: Object.freeze(['billing.read', 'billing.manage']),
      capabilities: Object.freeze([])
    })
  });
}

function postRequest(
  body: unknown = Object.freeze({}),
  ...idempotencyKeyArguments: readonly unknown[]
): never {
  const resolvedIdempotencyKey =
    idempotencyKeyArguments.length === 0 ? 'pix-attempt-request-1' : idempotencyKeyArguments[0];
  const headers: Readonly<Record<string, unknown>> =
    resolvedIdempotencyKey === undefined
      ? Object.freeze({ 'x-account-id': otherAccountId })
      : Object.freeze({
          'idempotency-key': resolvedIdempotencyKey,
          'x-account-id': otherAccountId
        });
  return {
    method: 'POST',
    headers,
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function getRequest(): never {
  return {
    method: 'GET',
    headers: Object.freeze({ 'x-account-id': otherAccountId })
  } as never;
}

function assertNoInternalFields(payload: Readonly<Record<string, unknown>>): void {
  const forbiddenFields = Object.freeze([
    'accountId',
    'requestedByUserId',
    'providerIdempotencyKey',
    'providerTransactionId',
    'providerKey',
    'requestKeyHash',
    'dispatchAttempts',
    'maxDispatchAttempts',
    'nextAttemptAt',
    'leaseOwner',
    'leaseToken',
    'leaseVersion',
    'version',
    'lastErrorCode',
    'lastErrorPublicMessage'
  ]);
  for (const field of forbiddenFields) assert.equal(field in payload, false, field);
}

test('PIX attempt POST derives authority from the principal and returns a safe accepted resource', async () => {
  let permissions: readonly string[] = Object.freeze([]);
  let inputs: readonly RequestEncounterPixPaymentInput[] = Object.freeze([]);
  const response = new MockResponse();

  const handled = await handlePixPaymentAttemptRoutes(
    `/encounters/${encounterId}/payments/pix-attempts`,
    postRequest(Object.freeze({})),
    response as never,
    {
      command: {
        async execute(input: RequestEncounterPixPaymentInput) {
          inputs = Object.freeze([...inputs, Object.freeze({ ...input })]);
          return pendingAttempt;
        }
      },
      repository: {},
      audit: { write: () => {} },
      correlationId: 'corr-pix-create',
      providerKey: 'local-pix',
      requirePrincipal(_request: unknown, permissionCode: string) {
        permissions = Object.freeze([...permissions, permissionCode]);
        return principal();
      }
    } as never
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 202);
  assert.equal(response.headers.get('location'), `/payments/pix-attempts/${attemptId}`);
  assert.deepEqual(permissions, ['billing.manage']);
  assert.deepEqual(inputs, [
    {
      accountId,
      actorUserId,
      encounterId,
      providerKey: 'local-pix',
      requestKey: 'pix-attempt-request-1'
    }
  ]);

  const payload = response.bodyJson<Readonly<Record<string, unknown>>>();
  assert.deepEqual(payload, pendingPublicDto);
  assertNoInternalFields(payload);
});

test('PIX attempt POST requires one bounded opaque Idempotency-Key before command execution', async () => {
  const invalidKeys = Object.freeze([
    undefined,
    '',
    '   ',
    Object.freeze(['duplicate', 'header']),
    'x'.repeat(256),
    'contains\u0000control'
  ]);

  for (const key of invalidKeys) {
    let executed = false;
    await assert.rejects(
      () =>
        handlePixPaymentAttemptRoutes(
          `/encounters/${encounterId}/payments/pix-attempts`,
          postRequest(Object.freeze({}), key),
          new MockResponse() as never,
          {
            command: {
              async execute() {
                executed = true;
                return pendingAttempt;
              }
            },
            repository: {},
            audit: { write: () => {} },
            correlationId: 'corr-pix-idempotency',
            providerKey: 'local-pix',
            requirePrincipal: () => principal()
          } as never
        ),
      ValidationError
    );
    assert.equal(executed, false);
  }
});

test('PIX attempt POST accepts only an empty object and rejects monetary, provider and tenant spoofing', async () => {
  const invalidBodies: readonly unknown[] = Object.freeze([
    null,
    Object.freeze([]),
    Object.freeze({ amount: 125.5 }),
    Object.freeze({ amountCents: 12_550 }),
    Object.freeze({ providerKey: 'mock' }),
    Object.freeze({ accountId: otherAccountId }),
    Object.freeze({ tenantId: otherAccountId }),
    Object.freeze({ unknown: true })
  ]);

  for (const body of invalidBodies) {
    let executed = false;
    await assert.rejects(
      () =>
        handlePixPaymentAttemptRoutes(
          `/encounters/${encounterId}/payments/pix-attempts`,
          postRequest(body),
          new MockResponse() as never,
          {
            command: {
              async execute() {
                executed = true;
                return pendingAttempt;
              }
            },
            repository: {},
            audit: { write: () => {} },
            correlationId: 'corr-pix-body',
            providerKey: 'local-pix',
            requirePrincipal: () => principal()
          } as never
        ),
      ValidationError
    );
    assert.equal(executed, false);
  }
});

test('PIX attempt GET is tenant-scoped, requires billing.read and returns only public polling fields without write amplification', async () => {
  let permissions: readonly string[] = Object.freeze([]);
  let repositoryCalls: readonly (readonly [string, string])[] = Object.freeze([]);
  let auditEvents: readonly unknown[] = Object.freeze([]);
  const response = new MockResponse();

  const handled = await handlePixPaymentAttemptRoutes(
    `/payments/pix-attempts/${attemptId}`,
    getRequest(),
    response as never,
    {
      command: {
        async execute() {
          return pendingAttempt;
        }
      },
      repository: {
        async findById(...args: readonly [string, string]) {
          repositoryCalls = Object.freeze([...repositoryCalls, Object.freeze(args)]);
          return retryingAttempt;
        }
      },
      audit: {
        write(event: unknown) {
          auditEvents = Object.freeze([...auditEvents, Object.freeze({ ...(event as object) })]);
        }
      },
      correlationId: 'corr-pix-read',
      providerKey: 'local-pix',
      requirePrincipal(_request: unknown, permissionCode: string) {
        permissions = Object.freeze([...permissions, permissionCode]);
        return principal();
      }
    } as never
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(permissions, ['billing.read']);
  assert.deepEqual(repositoryCalls, [[accountId, attemptId]]);

  const payload = response.bodyJson<Readonly<Record<string, unknown>>>();
  assert.deepEqual(payload, retryingPublicDto);
  assertNoInternalFields(payload);
  assert.equal(JSON.stringify(payload).includes(actorUserId), false);
  assert.equal(JSON.stringify(payload).includes(`cvg:pix:create:v1:${attemptId}`), false);

  assert.equal(auditEvents.length, 0);
});

test('PIX attempt GET maps a cross-tenant miss to the same opaque 404', async () => {
  let repositoryCalls: readonly (readonly [string, string])[] = Object.freeze([]);

  await assert.rejects(
    () =>
      handlePixPaymentAttemptRoutes(
        `/payments/pix-attempts/${attemptId}`,
        getRequest(),
        new MockResponse() as never,
        {
          command: {},
          repository: {
            async findById(...args: readonly [string, string]) {
              repositoryCalls = Object.freeze([...repositoryCalls, Object.freeze(args)]);
              return null;
            }
          },
          audit: { write: () => {} },
          correlationId: 'corr-pix-missing',
          providerKey: 'local-pix',
          requirePrincipal: () => principal()
        } as never
      ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'PIX_PAYMENT_ATTEMPT_NOT_FOUND' &&
      error.statusCode === 404 &&
      !error.message.includes(otherAccountId)
  );

  assert.deepEqual(repositoryCalls, [[accountId, attemptId]]);
});

test('PIX attempt polling is rate limited per authenticated tenant principal before database access', async () => {
  let repositoryCalls = 0;
  const response = new MockResponse();

  const handled = await handlePixPaymentAttemptRoutes(
    `/payments/pix-attempts/${attemptId}`,
    getRequest(),
    response as never,
    {
      command: {
        async execute() {
          return pendingAttempt;
        }
      },
      repository: {
        async findById() {
          repositoryCalls += 1;
          return retryingAttempt;
        }
      },
      providerKey: 'local-pix',
      rateLimiter: {
        async check(input) {
          assert.deepEqual(input, {
            accountId,
            userId: actorUserId,
            route: 'GET /payments/pix-attempts/:id'
          });
          return {
            blocked: true,
            limit: 120,
            remaining: 0,
            reset: 123_456,
            retryAfterMs: 5_001
          };
        }
      },
      requirePrincipal: () => principal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers.get('retry-after'), '6');
  assert.equal(response.headers.get('x-ratelimit-limit'), '120');
  assert.equal(response.bodyJson<{ code: string }>().code, 'RATE_LIMITED');
  assert.equal(repositoryCalls, 0);
});

test('PIX attempt routes validate path UUIDs before invoking their domain dependencies', async () => {
  let commandCalls = 0;
  let repositoryCalls = 0;
  const routeHandlers = {
    command: {
      async execute() {
        commandCalls += 1;
        return pendingAttempt;
      }
    },
    repository: {
      async findById() {
        repositoryCalls += 1;
        return pendingAttempt;
      }
    },
    audit: { write: () => {} },
    correlationId: 'corr-pix-uuid',
    providerKey: 'local-pix',
    requirePrincipal: () => principal()
  } as never;

  await assert.rejects(
    () =>
      handlePixPaymentAttemptRoutes(
        '/encounters/not-a-uuid/payments/pix-attempts',
        postRequest(),
        new MockResponse() as never,
        routeHandlers
      ),
    ValidationError
  );
  await assert.rejects(
    () =>
      handlePixPaymentAttemptRoutes(
        '/payments/pix-attempts/not-a-uuid',
        getRequest(),
        new MockResponse() as never,
        routeHandlers
      ),
    ValidationError
  );

  assert.equal(commandCalls, 0);
  assert.equal(repositoryCalls, 0);
});

test('PIX attempt routes authenticate before revealing UUID validation details', async () => {
  let authenticationCalls = 0;
  const routeHandlers = {
    command: {},
    repository: {},
    audit: { write: () => {} },
    correlationId: 'corr-pix-auth-order',
    providerKey: 'local-pix',
    requirePrincipal() {
      authenticationCalls += 1;
      throw new AuthenticationError();
    }
  } as never;

  await assert.rejects(
    () =>
      handlePixPaymentAttemptRoutes(
        '/payments/pix-attempts/not-a-uuid',
        getRequest(),
        new MockResponse() as never,
        routeHandlers
      ),
    AuthenticationError
  );
  await assert.rejects(
    () =>
      handlePixPaymentAttemptRoutes(
        '/encounters/not-a-uuid/payments/pix-attempts',
        postRequest(),
        new MockResponse() as never,
        routeHandlers
      ),
    AuthenticationError
  );
  assert.equal(authenticationCalls, 2);
});

test('unrelated routes are ignored without requiring authentication', async () => {
  let authenticated = false;
  const handled = await handlePixPaymentAttemptRoutes(
    '/encounters',
    getRequest(),
    new MockResponse() as never,
    {
      command: {},
      repository: {},
      audit: { write: () => {} },
      correlationId: 'corr-pix-unrelated',
      providerKey: 'local-pix',
      requirePrincipal() {
        authenticated = true;
        return principal();
      }
    } as never
  );

  assert.equal(handled, false);
  assert.equal(authenticated, false);
});
