import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { handleOpenApiRoutes } from './openapi-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];
  readonly #headers = new Map<string, string>();

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(name: string, value: string): this {
    this.#headers.set(name.toLowerCase(), value);
    return this;
  }

  getHeader(name: string): string | undefined {
    return this.#headers.get(name.toLowerCase());
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

    finalCallback?.();
    return this;
  }

  bodyText(): string {
    return Buffer.concat(this.#chunks).toString('utf8');
  }

  bodyJson<T>(): T {
    return JSON.parse(this.bodyText()) as T;
  }
}

test('handleOpenApiRoutes serves /openapi.json as JSON', () => {
  const response = new MockResponse();

  const handled = handleOpenApiRoutes(
    { method: 'GET', url: '/openapi.json' } as never,
    response as never
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.getHeader('content-type'), 'application/json');
  const payload = response.bodyJson<{ openapi: string; paths: Record<string, unknown> }>();
  assert.equal(payload.openapi, '3.0.3');
  assert.ok(Object.keys(payload.paths).length > 0);
});

test('GET /patients documents both response modes and supported pagination bounds', () => {
  interface JsonSchema {
    $ref?: string;
    oneOf?: JsonSchema[];
    required?: string[];
    minimum?: number;
    maximum?: number;
    default?: number;
  }
  interface OpenApiOperation {
    parameters?: Array<{
      name: string;
      deprecated?: boolean;
      schema?: JsonSchema;
    }>;
    responses: Record<
      string,
      {
        content?: Record<string, { schema?: JsonSchema }>;
      }
    >;
  }

  const response = new MockResponse();
  handleOpenApiRoutes({ method: 'GET', url: '/openapi.json' } as never, response as never);
  const payload = response.bodyJson<{
    paths: Record<string, { get?: OpenApiOperation }>;
    components: { schemas: Record<string, JsonSchema> };
  }>();
  const operation = payload.paths['/patients']?.get;
  assert.ok(operation);

  const parameters = new Map(
    (operation.parameters ?? []).map((parameter) => [parameter.name, parameter])
  );
  assert.equal(parameters.get('page')?.schema?.minimum, 1);
  assert.equal(parameters.get('page')?.schema?.maximum, Number.MAX_SAFE_INTEGER);
  assert.equal(parameters.get('page')?.schema?.default, undefined);
  assert.equal(parameters.get('pageSize')?.schema?.maximum, 200);
  assert.equal(parameters.get('pageSize')?.schema?.default, undefined);
  assert.equal(parameters.get('limit')?.deprecated, true);

  const successSchema = operation.responses['200']?.content?.['application/json']?.schema;
  assert.deepEqual(
    successSchema?.oneOf?.map((schema) => schema.$ref),
    ['#/components/schemas/PatientList', '#/components/schemas/PaginatedPatients']
  );
  assert.equal(
    operation.responses['400']?.content?.['application/json']?.schema?.$ref,
    '#/components/schemas/ErrorResponse'
  );
  assert.deepEqual(payload.components.schemas.PaginatedPatients?.required, [
    'items',
    'page',
    'pageSize',
    'total',
    'totalPages'
  ]);
});

test('GET /patients documents auth, validation, and unexpected errors with the canonical envelope', () => {
  interface JsonSchema {
    $ref?: string;
    required?: string[];
  }
  interface OpenApiOperation {
    responses: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
  }

  const response = new MockResponse();
  handleOpenApiRoutes({ method: 'GET', url: '/openapi.json' } as never, response as never);
  const payload = response.bodyJson<{
    paths: Record<string, { get?: OpenApiOperation }>;
    components: { schemas: Record<string, JsonSchema> };
  }>();
  const operation = payload.paths['/patients']?.get;
  assert.ok(operation);

  for (const status of ['400', '401', '403', '500']) {
    assert.equal(
      operation.responses[status]?.content?.['application/json']?.schema?.$ref,
      '#/components/schemas/ErrorResponse',
      `GET /patients ${status}`
    );
  }
  assert.deepEqual(payload.components.schemas.ErrorResponse?.required, [
    'code',
    'message',
    'correlationId'
  ]);
});

test('attachment OpenAPI documents successful payloads and negative outcomes', () => {
  interface JsonSchema {
    $ref?: string;
    format?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    type?: string;
    items?: JsonSchema;
  }
  interface OpenApiResponse {
    content?: Record<string, { schema?: JsonSchema }>;
  }
  interface OpenApiOperation {
    requestBody?: { content?: Record<string, { schema?: JsonSchema }> };
    responses: Record<string, OpenApiResponse>;
  }

  const response = new MockResponse();
  handleOpenApiRoutes({ method: 'GET', url: '/openapi.json' } as never, response as never);
  const payload = response.bodyJson<{
    paths: Record<string, { get?: OpenApiOperation; post?: OpenApiOperation }>;
    components: { schemas: Record<string, JsonSchema> };
  }>();
  const list = payload.paths['/attachments']?.get;
  const upload = payload.paths['/attachments']?.post;
  const createDownloadUrl = payload.paths['/attachments/{attachmentId}/download-url']?.post;
  const download = payload.paths['/attachments/{attachmentId}/content']?.get;
  assert.ok(list && upload && createDownloadUrl && download);

  const errorRef = (operation: OpenApiOperation, code: string) =>
    operation.responses[code]?.content?.['application/json']?.schema?.$ref;
  const assertErrorResponses = (operation: OpenApiOperation, codes: string[]) => {
    for (const code of codes)
      assert.equal(errorRef(operation, code), '#/components/schemas/ErrorResponse', `${code}`);
  };

  assert.equal(
    list.responses['200']?.content?.['application/json']?.schema?.$ref,
    '#/components/schemas/AttachmentListResponse'
  );
  assert.deepEqual(payload.components.schemas.AttachmentListResponse?.required, ['items']);
  assert.equal(
    payload.components.schemas.AttachmentListResponse?.properties?.items?.items?.$ref,
    '#/components/schemas/Attachment'
  );
  assert.equal(
    upload.requestBody?.content?.['application/json']?.schema?.$ref,
    '#/components/schemas/CreateAttachmentRequest'
  );
  assert.equal(
    upload.responses['201']?.content?.['application/json']?.schema?.$ref,
    '#/components/schemas/Attachment'
  );
  assert.equal(
    createDownloadUrl.responses['200']?.content?.['application/json']?.schema?.$ref,
    '#/components/schemas/AttachmentDownloadUrlResponse'
  );
  assert.equal(
    download.responses['200']?.content?.['application/octet-stream']?.schema?.format,
    'binary'
  );
  assertErrorResponses(list, ['400', '401', '403', '404', '500']);
  assertErrorResponses(upload, ['400', '401', '403', '404', '413', '500']);
  assertErrorResponses(createDownloadUrl, ['401', '403', '404', '409', '500']);
  assertErrorResponses(download, ['401', '403', '404', '409', '500']);
});

test('handleOpenApiRoutes serves /api-docs contract', () => {
  const response = new MockResponse();

  const handled = handleOpenApiRoutes(
    { method: 'GET', url: '/api-docs' } as never,
    response as never
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ endpoints: { openapi: { url: string } } }>();
  assert.equal(payload.endpoints.openapi.url, '/openapi.json');
});
