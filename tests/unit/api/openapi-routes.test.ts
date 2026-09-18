import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function withMissingOpenApi<T>(callback: () => Promise<T>): Promise<T> {
    const isolatedCwd = mkdtempSync(join(tmpdir(), 'cvg-openapi-missing-'));
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(isolatedCwd);

    try {
      return await callback();
    } finally {
      cwdSpy.mockRestore();
      rmSync(isolatedCwd, { recursive: true, force: true });
    }
  }

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

  it('reuses the cached YAML and parsed OpenAPI specification', async () => {
    const { handleOpenApiRoutes } = await import('../../../apps/api/src/routes/openapi-routes.ts');
    const jsonResponse = new MockResponse();

    expect(
      handleOpenApiRoutes(
        { method: 'GET', url: '/openapi.json' } as never,
        jsonResponse as never
      )
    ).toBe(true);

    const cachedJsonResponse = new MockResponse();
    expect(
      handleOpenApiRoutes(
        { method: 'GET', url: '/openapi.json' } as never,
        cachedJsonResponse as never
      )
    ).toBe(true);
    expect(cachedJsonResponse.bodyJson<{ openapi: string }>().openapi).toBe('3.0.3');

    const yamlResponse = new MockResponse();
    expect(
      handleOpenApiRoutes(
        { method: 'GET', url: '/openapi.yaml' } as never,
        yamlResponse as never
      )
    ).toBe(true);
    expect(yamlResponse.getHeader('content-type')).toBe('text/yaml');
    expect(yamlResponse.body).toContain('openapi: 3.0.3');
  });

  it('falls back to the embedded spec when reading the YAML fails', async () => {
    await withMissingOpenApi(async () => {
      const { handleOpenApiRoutes } = await import('../../../apps/api/src/routes/openapi-routes.ts');
      const response = new MockResponse();

      const handled = handleOpenApiRoutes(
        { method: 'GET', url: '/openapi.json' } as never,
        response as never
      );

      expect(handled).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.bodyJson<{ openapi: string; paths: Record<string, unknown> }>()).toEqual({
        openapi: '3.0.3',
        info: {
          title: 'CVG HIS API',
          version: '1.0.0',
          description: 'CVG Hospital Information System REST API'
        },
        servers: [{ url: '/', description: 'Local development' }],
        paths: {}
      });
    });
  });

  it('returns 500 for /openapi.yaml when the source file is unavailable', async () => {
    await withMissingOpenApi(async () => {
      const { handleOpenApiRoutes } = await import('../../../apps/api/src/routes/openapi-routes.ts');
      const response = new MockResponse();

      const handled = handleOpenApiRoutes(
        { method: 'GET', url: '/openapi.yaml' } as never,
        response as never
      );

      expect(handled).toBe(true);
      expect(response.statusCode).toBe(500);
      expect(response.body).toBe('OpenAPI spec not available');
    });
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
