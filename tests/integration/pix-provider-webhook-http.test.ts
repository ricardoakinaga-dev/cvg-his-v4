import { createHmac } from 'node:crypto';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { createApiServer } from '../../apps/api/src/server.js';
import type { PixProviderWebhookClaims } from '../../apps/api/src/pix-provider-webhook-payload.js';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const ATTEMPT_ID = '22222222-2222-4222-8222-222222222222';
const KEY_ID = 'local-key-01';
const SECRET = Buffer.alloc(32, 0x42);
const PATH = '/webhooks/pix/synthetic/v1';

const servers: Array<ReturnType<typeof createApiServer>> = [];

function claims(now = Math.floor(Date.now() / 1_000)): PixProviderWebhookClaims {
  return {
    type: 'pix.payment.confirmed.v1',
    accountId: ACCOUNT_ID,
    attemptId: ATTEMPT_ID,
    providerTransactionId: 'tx-http-1',
    amountCents: 1234,
    currency: 'BRL',
    confirmedAt: new Date(now * 1_000).toISOString()
  };
}

function signedHeaders(rawBody: Buffer, eventId = 'event-http-1', now = Math.floor(Date.now() / 1_000)) {
  const signature = createHmac('sha256', SECRET)
    .update(`v1.${now}.${eventId}.`, 'ascii')
    .update(rawBody)
    .digest('hex');
  return {
    'content-type': 'application/json',
    'x-cvg-pix-key-id': KEY_ID,
    'x-cvg-pix-timestamp': String(now),
    'x-cvg-pix-event-id': eventId,
    'x-cvg-pix-signature': `v1=${signature}`
  };
}

async function startServer(overrides: Record<string, unknown> = {}) {
  const persisted: unknown[] = [];
  const server = createApiServer({
    appName: 'pix-http-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 3600,
    pixProviderWebhookSyntheticEnabled: true,
    pixProviderWebhookKeyring: new Map([[KEY_ID, { accountId: ACCOUNT_ID, secret: SECRET }]]),
    pixProviderEventIngressRepository: {
      async persist(input: unknown) {
        persisted.push(input);
        return { status: 'created' as const, eventId: 'receipt-http-1', deliveryId: 'delivery-http-1' };
      }
    },
    ...overrides
  } as never);
  servers.push(server);
  await server.ready;
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return { server, port: address.port, persisted };
}

async function send(input: {
  port: number;
  body: Buffer;
  headers?: Record<string, string | readonly string[]>;
  chunks?: readonly Buffer[];
}) {
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>(
    (resolve, reject) => {
      const req = request({
        host: '127.0.0.1',
        port: input.port,
        method: 'POST',
        path: PATH,
        headers: {
          ...input.headers,
          ...(input.headers?.['content-length'] === undefined
            ? { 'content-length': String(input.body.length) }
            : {})
        }
      }, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8')
          })
        );
      });
      req.on('error', reject);
      const chunks = input.chunks ?? [input.body];
      for (const chunk of chunks) req.write(chunk);
      req.end();
    }
  );
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          if (!server.listening) {
            resolve();
            return;
          }
          server.close(() => resolve());
        })
    )
  );
});

describe('synthetic PIX provider HTTP callback', () => {
  it('authenticates raw chunked bytes, persists before ACK, and does not require a bearer token', async () => {
    const { port, persisted } = await startServer();
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');
    const headers = signedHeaders(rawBody);
    const split = Math.floor(rawBody.length / 2);

    const response = await send({
      port,
      body: rawBody,
      headers,
      chunks: [rawBody.subarray(0, split), rawBody.subarray(split)]
    });

    expect(response.status).toBe(202);
    expect(JSON.parse(response.body)).toMatchObject({
      accepted: true,
    });
    expect(persisted).toHaveLength(1);
    expect((persisted[0] as { rawBody: Buffer }).rawBody.equals(rawBody)).toBe(true);
  });

  it('returns one generic 401 before parsing or persistence for bad signatures', async () => {
    const { port, persisted } = await startServer();
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');
    const headers = { ...signedHeaders(rawBody), 'x-cvg-pix-signature': 'v1=00' };

    const response = await send({ port, body: rawBody, headers });

    expect(response.status).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      code: 'PIX_WEBHOOK_UNAUTHORIZED',
      message: 'Invalid PIX webhook authentication'
    });
    expect(persisted).toHaveLength(0);
  });

  it('rejects a duplicate Content-Type preserved on a real socket', async () => {
    const { port, persisted } = await startServer();
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');
    const response = await send({
      port,
      body: rawBody,
      headers: { ...signedHeaders(rawBody), 'content-type': ['application/json', 'application/json'] }
    });

    expect(response.status).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({ code: 'PIX_WEBHOOK_UNAUTHORIZED' });
    expect(persisted).toHaveLength(0);
  });

  it('returns 400 for an authenticated but invalid payload', async () => {
    const { port, persisted } = await startServer();
    const rawBody = Buffer.from(JSON.stringify({ ...claims(), amountCents: 0 }), 'utf8');

    const response = await send({ port, body: rawBody, headers: signedHeaders(rawBody) });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({
      code: 'PIX_WEBHOOK_INVALID_PAYLOAD',
      message: 'Invalid PIX webhook payload'
    });
    expect(persisted).toHaveLength(0);
  });

  it('rejects declared and streamed bodies above 64 KiB before persistence', async () => {
    const { port, persisted } = await startServer();
    const body = Buffer.alloc(65_537, 0x20);
    const now = Math.floor(Date.now() / 1_000);
    const headers = signedHeaders(body, 'event-large', now);

    const response = await send({
      port,
      body,
      headers: { ...headers, 'content-length': String(body.length) }
    });

    expect(response.status).toBe(413);
    expect(JSON.parse(response.body)).toMatchObject({ code: 'PIX_WEBHOOK_BODY_TOO_LARGE' });
    expect(persisted).toHaveLength(0);
  });

  it('returns 429 and does not consume the body when the ingress limiter blocks', async () => {
    const { port, persisted } = await startServer({
      pixProviderWebhookRateLimiter: {
        async check() {
          return { blocked: true, limit: 1, remaining: 0, reset: Date.now() + 1000, retryAfterMs: 1000 };
        }
      }
    });
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');

    const response = await send({ port, body: rawBody, headers: signedHeaders(rawBody) });

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('1');
    expect(JSON.parse(response.body)).toMatchObject({ code: 'RATE_LIMITED' });
    expect(persisted).toHaveLength(0);
  });
});
