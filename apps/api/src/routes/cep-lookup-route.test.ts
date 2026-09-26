import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { handleCepLookupRoute } from './cep-lookup-route.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;

  constructor(method: string, url: string) {
    super();
    this.method = method;
    this.url = url;
  }

  _read(): void {
    this.push(null);
  }
}

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

async function invokeRoute(
  method: string,
  requestUrl: string,
  fetcher: typeof fetch
): Promise<{ readonly handled: boolean; readonly response: MockResponse }> {
  const request = new MockRequest(method, requestUrl);
  const response = new MockResponse();
  const handled = await handleCepLookupRoute(
    new URL(request.url, 'http://localhost').pathname,
    new URL(request.url, 'http://localhost'),
    request as never,
    response as never,
    'corr-cep-lookup',
    { fetcher }
  );
  return { handled, response };
}

test('CEP lookup validates a missing query before calling the external client', async () => {
  let fetchCalled = false;
  const { handled, response } = await invokeRoute('GET', '/cep/lookup', async () => {
    fetchCalled = true;
    throw new Error('unexpected fetch');
  });

  assert.equal(handled, true);
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.bodyJson(), {
    code: 'VALIDATION_ERROR',
    message: 'CEP parameter required',
    correlationId: 'corr-cep-lookup'
  });
  assert.equal(fetchCalled, false);
});

test('CEP lookup strips non-digits and rejects a value that is not eight digits', async () => {
  let fetchCalled = false;
  const { handled, response } = await invokeRoute('GET', '/cep/lookup?cep=12.345-67', async () => {
    fetchCalled = true;
    throw new Error('unexpected fetch');
  });

  assert.equal(handled, true);
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.bodyJson(), {
    code: 'VALIDATION_ERROR',
    message: 'CEP must have 8 digits',
    correlationId: 'corr-cep-lookup'
  });
  assert.equal(fetchCalled, false);
});

test('CEP lookup requests the normalized code with the existing five-second timeout', async () => {
  let receivedInput: string | URL | Request | undefined;
  let receivedSignal: AbortSignal | null | undefined;
  const { handled, response } = await invokeRoute(
    'GET',
    '/cep/lookup?cep=01.010-000',
    async (input, init) => {
      receivedInput = input;
      receivedSignal = init?.signal;
      return {
        json: async () => ({
          cep: '01010-000',
          logradouro: 'Praça da Sé',
          complemento: 'lado ímpar',
          bairro: 'Sé',
          localidade: 'São Paulo',
          uf: 'SP',
          ibge: '3550308'
        })
      } as Response;
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(receivedInput, 'https://viacep.com.br/ws/01010000/json/');
  assert.ok(receivedSignal instanceof AbortSignal);
  assert.deepEqual(response.bodyJson(), {
    cep: '01010-000',
    street: 'Praça da Sé',
    complement: 'lado ímpar',
    district: 'Sé',
    city: 'São Paulo',
    state: 'SP',
    ibge: '3550308',
    found: true
  });
});

test('CEP lookup maps ViaCEP not-found and upstream failures to the existing envelopes', async () => {
  const notFound = await invokeRoute('GET', '/cep/lookup?cep=01010000', async () => {
    return { json: async () => ({ erro: true }) } as Response;
  });
  assert.equal(notFound.response.statusCode, 404);
  assert.deepEqual(notFound.response.bodyJson(), {
    code: 'NOT_FOUND',
    message: 'CEP not found',
    correlationId: 'corr-cep-lookup'
  });

  const unavailable = await invokeRoute('GET', '/cep/lookup?cep=01010000', async () => {
    throw new Error('upstream unavailable');
  });
  assert.equal(unavailable.response.statusCode, 502);
  assert.deepEqual(unavailable.response.bodyJson(), {
    code: 'SERVICE_UNAVAILABLE',
    message: 'CEP service unavailable',
    correlationId: 'corr-cep-lookup'
  });
});

test('CEP lookup leaves other paths and methods unhandled', async () => {
  const routePath = await invokeRoute('GET', '/cep/lookup/extra?cep=01010000', async () => {
    throw new Error('unexpected fetch');
  });
  const routeMethod = await invokeRoute('POST', '/cep/lookup?cep=01010000', async () => {
    throw new Error('unexpected fetch');
  });

  assert.equal(routePath.handled, false);
  assert.equal(routeMethod.handled, false);
});
