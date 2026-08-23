import { createHmac } from 'node:crypto';
import { request } from 'node:http';
import { connect } from 'node:net';
import type { AddressInfo, Socket } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { createApiServer } from '../../apps/api/src/server.js';
import type { PixProviderWebhookClaims } from '../../apps/api/src/pix-provider-webhook-payload.js';
import { AppError } from '@cvg-his-v2/shared-errors';

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

function signedHeaders(
  rawBody: Buffer,
  eventId = 'event-http-1',
  now = Math.floor(Date.now() / 1_000)
) {
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
        return {
          status: 'created' as const,
          eventId: 'receipt-http-1',
          deliveryId: 'delivery-http-1'
        };
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
  return new Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
  }>((resolve, reject) => {
    const req = request(
      {
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
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8')
          })
        );
      }
    );
    req.on('error', reject);
    const chunks = input.chunks ?? [input.body];
    for (const chunk of chunks) req.write(chunk);
    req.end();
  });
}

async function sendRawSocket(input: {
  port: number;
  request: Buffer;
  abortAfterWrite?: boolean;
}): Promise<{ status: number; body: string; raw: string }> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: '127.0.0.1', port: input.port });
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const raw = Buffer.concat(chunks).toString('utf8');
      const statusMatch = raw.match(/^HTTP\/\d\.\d (\d{3})/);
      const body = raw.includes('\r\n\r\n') ? raw.slice(raw.indexOf('\r\n\r\n') + 4) : '';
      resolve({ status: statusMatch ? Number(statusMatch[1]) : 0, body, raw });
    };
    const timeout = setTimeout(() => {
      socket.destroy();
      finish();
    }, 2_000);
    socket.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    socket.once('end', finish);
    socket.once('close', finish);
    socket.once('error', (error: Error) => {
      if (input.abortAfterWrite) {
        finish();
        return;
      }
      if (!settled) reject(error);
    });
    socket.once('connect', () => {
      socket.write(input.request, () => {
        if (input.abortAfterWrite) {
          socket.destroy();
        } else {
          socket.end();
        }
      });
    });
  });
}

function rawRequest(headers: readonly string[], body: Buffer | string = Buffer.alloc(0)): Buffer {
  const payload = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
  return Buffer.concat([
    Buffer.from(
      `POST ${PATH} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n${headers.join('\r\n')}\r\n\r\n`,
      'ascii'
    ),
    payload
  ]);
}

function chunkedRequest(headers: readonly string[], chunks: readonly Buffer[]): Buffer {
  const prefix = Buffer.from(
    `POST ${PATH} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\nTransfer-Encoding: chunked\r\n${headers.join('\r\n')}\r\n\r\n`,
    'ascii'
  );
  const encodedChunks = chunks.flatMap((chunk) => [
    Buffer.from(`${chunk.length.toString(16)}\r\n`, 'ascii'),
    chunk,
    Buffer.from('\r\n', 'ascii')
  ]);
  return Buffer.concat([prefix, ...encodedChunks, Buffer.from('0\r\n\r\n', 'ascii')]);
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
      accepted: true
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

  it('maps repository conflicts to an opaque boundary response', async () => {
    const { port, persisted } = await startServer({
      pixProviderEventIngressRepository: {
        async persist(input: unknown) {
          persisted.push(input);
          throw new AppError(
            'PIX_PROVIDER_ATTEMPT_CONFLICT',
            'internal attempt 7f4d cannot be reused',
            409
          );
        }
      }
    });
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');
    const response = await send({ port, body: rawBody, headers: signedHeaders(rawBody) });
    const body = JSON.parse(response.body) as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(body).toMatchObject({ code: 'PIX_WEBHOOK_CONFLICT' });
    expect(body.message).toBe('PIX webhook cannot be accepted');
    expect(response.body).not.toContain('PIX_PROVIDER_ATTEMPT_CONFLICT');
    expect(response.body).not.toContain('7f4d');
    expect(persisted).toHaveLength(1);
  });

  it('rejects a duplicate Content-Type preserved on a real socket', async () => {
    const { port, persisted } = await startServer();
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');
    const response = await send({
      port,
      body: rawBody,
      headers: {
        ...signedHeaders(rawBody),
        'content-type': ['application/json', 'application/json']
      }
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
          return {
            blocked: true,
            limit: 1,
            remaining: 0,
            reset: Date.now() + 1000,
            retryAfterMs: 1000
          };
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

  it('accepts real chunked framing and ignores browser-only bearer, API-key and origin headers', async () => {
    const { port, persisted } = await startServer();
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');
    const headers = signedHeaders(rawBody);
    const headerLines = [
      'Content-Type: application/json',
      `Authorization: Bearer invalid-${'x'.repeat(40)}`,
      'X-API-Key: invalid-api-key',
      `X-Account-ID: ${ACCOUNT_ID}`,
      'Origin: https://untrusted.example',
      ...Object.entries(headers)
        .filter(([name]) => name !== 'content-type')
        .map(([name, value]) => `${name}: ${value}`)
    ];
    const split = Math.max(1, Math.floor(rawBody.length / 3));
    const response = await sendRawSocket({
      port,
      request: chunkedRequest(headerLines, [
        rawBody.subarray(0, split),
        rawBody.subarray(split, split * 2),
        rawBody.subarray(split * 2)
      ])
    });

    expect(response.status).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ accepted: true });
    expect(persisted).toHaveLength(1);
  });

  it('rejects declared bodies above 64 KiB before consuming a socket body', async () => {
    const { port, persisted } = await startServer();
    const response = await sendRawSocket({
      port,
      request: rawRequest([
        'Content-Type: application/json',
        'Content-Length: 65537',
        'X-CVG-Pix-Key-Id: local-key-01',
        'X-CVG-Pix-Timestamp: 0000000000',
        'X-CVG-Pix-Event-Id: oversized',
        'X-CVG-Pix-Signature: v1=0000000000000000000000000000000000000000000000000000000000000000'
      ])
    });

    expect(response.status).toBe(413);
    expect(JSON.parse(response.body)).toMatchObject({ code: 'PIX_WEBHOOK_BODY_TOO_LARGE' });
    expect(persisted).toHaveLength(0);
  });

  it('rejects Content-Length shorter than the signed bytes without persistence', async () => {
    const { port, persisted } = await startServer();
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');
    const headers = signedHeaders(rawBody);
    const response = await sendRawSocket({
      port,
      request: rawRequest(
        [
          'Content-Type: application/json',
          `Content-Length: 2`,
          ...Object.entries(headers)
            .filter(([name]) => name !== 'content-type')
            .map(([name, value]) => `${name}: ${value}`)
        ],
        rawBody
      )
    });

    expect(response.status).toBe(400);
    // Node's HTTP parser rejects the truncated Content-Length before the
    // application receives a complete request, so no JSON boundary error is
    // available to assert here.
    expect(response.body).toBe('');
    expect(persisted).toHaveLength(0);
  });

  it('rejects duplicate critical headers from raw socket framing', async () => {
    const { port, persisted } = await startServer();
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');
    const headers = signedHeaders(rawBody);
    const response = await sendRawSocket({
      port,
      request: rawRequest(
        [
          'Content-Type: application/json',
          'Content-Type: application/json',
          `Content-Length: ${rawBody.length}`,
          ...Object.entries(headers)
            .filter(([name]) => name !== 'content-type')
            .map(([name, value]) => `${name}: ${value}`)
        ],
        rawBody
      )
    });

    expect(response.status).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({ code: 'PIX_WEBHOOK_UNAUTHORIZED' });
    expect(persisted).toHaveLength(0);
  });

  it('does not persist or ACK when the socket aborts before the body completes', async () => {
    const { port, persisted } = await startServer();
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');
    const headers = signedHeaders(rawBody);
    const partialRequest = rawRequest(
      [
        'Content-Type: application/json',
        `Content-Length: ${rawBody.length}`,
        ...Object.entries(headers)
          .filter(([name]) => name !== 'content-type')
          .map(([name, value]) => `${name}: ${value}`)
      ],
      rawBody.subarray(0, Math.floor(rawBody.length / 2))
    );
    const response = await sendRawSocket({ port, request: partialRequest, abortAfterWrite: true });

    expect(response.status).toBe(0);
    expect(persisted).toHaveLength(0);
  });

  it('holds the ACK until durable persistence resolves', async () => {
    let resolvePersist!: () => void;
    const persistGate = new Promise<void>((resolve) => {
      resolvePersist = resolve;
    });
    const { port, persisted } = await startServer({
      pixProviderEventIngressRepository: {
        async persist(input: unknown) {
          persisted.push(input);
          await persistGate;
          return {
            status: 'created' as const,
            eventId: 'receipt-http-1',
            deliveryId: 'delivery-http-1'
          };
        }
      }
    });
    const rawBody = Buffer.from(JSON.stringify(claims()), 'utf8');
    let settled = false;
    const responsePromise = send({ port, body: rawBody, headers: signedHeaders(rawBody) }).then(
      (response) => {
        settled = true;
        return response;
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(settled).toBe(false);
    expect(persisted).toHaveLength(1);
    resolvePersist();
    const response = await responsePromise;
    expect(response.status).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ accepted: true });
  });
});
