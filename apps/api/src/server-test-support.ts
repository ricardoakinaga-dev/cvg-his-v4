import { Readable, Writable } from 'node:stream';

import assert from 'node:assert/strict';
import { WorkflowTaskService } from '@cvg-his-v2/module-workflows';
import { createApiServer } from './server.js';

export type ApiTestServer = ReturnType<typeof createApiServer>;

export class MockResponse extends Writable {
  public statusCode = 200;
  public readonly headers = new Map<string, string>();
  readonly #chunks: Buffer[] = [];
  readonly #finished: Promise<void>;
  #resolveFinished!: () => void;

  constructor() {
    super();
    this.#finished = new Promise<void>((resolve) => {
      this.#resolveFinished = resolve;
    });
  }

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }

  writeHead(statusCode: number, headers?: Record<string, string>): this {
    this.statusCode = statusCode;
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        this.setHeader(key, value);
      }
    }
    return this;
  }

  override end(
    chunk?: string | Buffer | (() => void),
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ): this {
    const finalCallback =
      typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;

    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    this.#resolveFinished();
    finalCallback?.();
    return this;
  }

  async waitForEnd(): Promise<void> {
    await this.#finished;
  }

  bodyText(): string {
    return Buffer.concat(this.#chunks).toString('utf8');
  }

  bodyJson<T>(): T {
    return JSON.parse(this.bodyText()) as T;
  }
}

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string>;
  public readonly socket: { remoteAddress: string; encrypted: boolean };
  readonly #body: Buffer;
  #sent = false;

  constructor(input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  }) {
    super();
    this.method = input.method;
    this.url = input.url;
    this.headers = input.headers ?? {};
    this.socket = {
      remoteAddress: '127.0.0.1',
      encrypted: this.headers['x-forwarded-proto'] === 'https'
    };
    this.#body = Buffer.from(input.body ?? '', 'utf8');
  }

  _read(): void {
    if (this.#sent) {
      this.push(null);
      return;
    }

    this.#sent = true;
    if (this.#body.length > 0) {
      this.push(this.#body);
    }
    this.push(null);
  }
}

export function createServerUnderTest(
  overrides: Partial<Parameters<typeof createApiServer>[0]> = {}
) {
  return createApiServer({
    appName: 'api-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'test-secret',
    metricsAuthToken: 'test-metrics-token',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    workflowTaskService: new WorkflowTaskService(),
    whatsappWebhookSecret: 'test-webhook-secret',
    featureFlags: {
      providerName: 'test',
      enabledKeys: ['notifications.whatsapp.inbound_actions.enabled'],
      decisions: {
        'notifications.whatsapp.inbound_actions.enabled': {
          key: 'notifications.whatsapp.inbound_actions.enabled',
          enabled: true,
          provider: 'test',
          reason: 'test-default',
          evaluatedAt: new Date('2026-04-15T00:00:00.000Z').toISOString(),
          definition: {} as never,
          context: { environment: 'test' } as never
        }
      },
      authOidcEnabled: false,
      authWebauthnEnabled: false,
      runtimeDistributedStateEnabled: false,
      fiscalBackofficeEnabled: false,
      notificationsWhatsappRemindersEnabled: false,
      notificationsWhatsappInboundActionsEnabled: true,
      provider: {
        name: 'test',
        evaluate: async () => ({
          key: 'notifications.whatsapp.inbound_actions.enabled',
          enabled: true,
          provider: 'test',
          reason: 'test-default',
          evaluatedAt: new Date('2026-04-15T00:00:00.000Z').toISOString(),
          definition: {} as never,
          context: { environment: 'test' } as never
        })
      }
    } as never,
    ...overrides
  });
}

export async function performRequest(
  server: ApiTestServer,
  input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }
) {
  const request = new MockRequest({
    method: input.method,
    url: input.url,
    headers: input.headers,
    body: input.body ? JSON.stringify(input.body) : undefined
  });
  const response = new MockResponse();

  server.emit('request', request as never, response as never);
  await response.waitForEnd();

  return response;
}

export async function login(server: ApiTestServer, username: string, password: string) {
  const response = await performRequest(server, {
    method: 'POST',
    url: '/auth/login',
    headers: {
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { username, password }
  });

  assert.equal(response.statusCode, 200);
  return response.bodyJson<{ accessToken: string }>().accessToken;
}
