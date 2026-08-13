import { describe, expect, it, vi } from 'vitest';

class MockResponse {
  statusCode = 200;
  readonly headers = new Map<string, string>();
  body = '';

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }

  end(payload?: string): this {
    this.body = payload ?? '';
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(this.body) as T;
  }
}

describe('openapi-routes', () => {
  it('serves API docs metadata from /api-docs', async () => {
    const { handleOpenApiRoutes } = await import('../../../apps/api/src/routes/openapi-routes.ts');
    const response = new MockResponse();

    const handled = handleOpenApiRoutes(
      { method: 'GET', url: '/api-docs' } as never,
      response as never
    );

    expect(handled).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.getHeader('content-type')).toBe('application/json');
    expect(
      response.bodyJson<{ endpoints: { openapi: { url: string } } }>().endpoints.openapi.url
    ).toBe('/openapi.json');
  });

  it('tries the next source candidate when the first OpenAPI file is unavailable', async () => {
    const { handleOpenApiRoutes } = await import('../../../apps/api/src/routes/openapi-routes.ts');
    const response = new MockResponse();
    const readFile = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('missing-first-openapi-candidate');
      })
      .mockReturnValue('openapi: 3.0.3\ninfo:\n  title: CVG HIS API\n  version: 1.0.0\npaths: {}\n');

    const handled = handleOpenApiRoutes(
      { method: 'GET', url: '/openapi.json' } as never,
      response as never,
      { readFile: readFile as never }
    );

    expect(handled).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.bodyJson<{ openapi: string; paths: Record<string, unknown> }>()).toEqual({
      openapi: '3.0.3',
      info: { title: 'CVG HIS API', version: '1.0.0' },
      paths: {}
    });
    expect(readFile).toHaveBeenCalledTimes(2);
  });

  it('returns 500 for /openapi.yaml when every source file is unavailable', async () => {
    const { handleOpenApiRoutes } = await import('../../../apps/api/src/routes/openapi-routes.ts');
    const response = new MockResponse();
    const readFile = vi.fn(() => {
      throw new Error('missing-openapi');
    });

    const handled = handleOpenApiRoutes(
      { method: 'GET', url: '/openapi.yaml' } as never,
      response as never,
      { readFile: readFile as never }
    );

    expect(handled).toBe(true);
    expect(response.statusCode).toBe(500);
    expect(response.body).toBe('OpenAPI spec not available');
    expect(readFile).toHaveBeenCalledTimes(4);
  });

  it('ignores non-GET requests', async () => {
    const { handleOpenApiRoutes } = await import('../../../apps/api/src/routes/openapi-routes.ts');
    const response = new MockResponse();

    const handled = handleOpenApiRoutes(
      { method: 'POST', url: '/openapi.json' } as never,
      response as never
    );

    expect(handled).toBe(false);
    expect(response.body).toBe('');
  });
});
