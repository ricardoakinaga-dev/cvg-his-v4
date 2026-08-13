import { readFileSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { createApiServer, type ApiServer } from '../../apps/api/src/server.js';

/**
 * OpenAPI Runtime Contract Tests
 *
 * Validates that:
 * 1. The OpenAPI spec has required structural elements
 * 2. The runtime /openapi.json endpoint serves the complete static contract over HTTP
 * 3. info.version is consistent throughout the spec
 *
 * API_RUNTIME_URL selects an already-running API (for example in CI). When it is
 * absent, the suite starts the real API server on an ephemeral loopback port.
 */

const OPENAPI_SPEC_PATH = 'apps/api/src/openapi.yaml';
const RUNTIME_REQUEST_TIMEOUT_MS = 10_000;
const VALID_HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

type OpenApiOperation = Readonly<{
  operationId?: string;
  tags?: readonly string[];
}>;

type OpenApiDocument = Readonly<{
  openapi: string;
  info: Readonly<{
    title: string;
    version: string;
    [key: string]: unknown;
  }>;
  paths: Readonly<Record<string, Readonly<Record<string, OpenApiOperation>>>>;
  servers?: readonly unknown[];
  tags?: readonly Readonly<{ name: string }>[];
  components?: Readonly<{
    schemas?: Readonly<Record<string, unknown>>;
    securitySchemes?: Readonly<Record<string, unknown>>;
  }>;
  [key: string]: unknown;
}>;

function loadSpec(): OpenApiDocument {
  const content = readFileSync(OPENAPI_SPEC_PATH, 'utf-8');
  return parse(content, { prettyErrors: true }) as OpenApiDocument;
}

function normalizeRuntimeUrl(value: string): string {
  const parsedUrl = new URL(value);

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`API_RUNTIME_URL must use HTTP or HTTPS, received ${parsedUrl.protocol}`);
  }

  if (parsedUrl.search || parsedUrl.hash) {
    throw new Error('API_RUNTIME_URL must not include a query string or fragment');
  }

  return parsedUrl.toString().replace(/\/+$/, '');
}

function requireRuntimeUrl(runtimeUrl: string | undefined): string {
  if (!runtimeUrl) {
    throw new Error('OpenAPI runtime setup completed without a reachable base URL');
  }

  return runtimeUrl;
}

function extractSchemaRefs(value: unknown): readonly string[] {
  if (value === null || typeof value !== 'object') {
    return [];
  }

  const record = value as Readonly<Record<string, unknown>>;
  const matchedRef =
    typeof record.$ref === 'string'
      ? record.$ref.match(/^#\/components\/schemas\/([A-Za-z0-9_]+)$/)?.[1]
      : undefined;
  const nestedValues = Array.isArray(value) ? value : Object.values(record);
  const nestedRefs = nestedValues.flatMap((nestedValue) => extractSchemaRefs(nestedValue));

  return matchedRef ? [matchedRef, ...nestedRefs] : nestedRefs;
}

async function listenOnEphemeralPort(server: ApiServer): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    const rejectOnError = (error: Error) => reject(error);
    server.once('error', rejectOnError);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', rejectOnError);
      resolve();
    });
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('OpenAPI test runtime did not expose a TCP address');
  }

  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: ApiServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

const STATIC_SPEC = loadSpec();

describe('OpenAPI Contract Tests', () => {
  describe('Static spec structure', () => {
    it('should have openapi 3.x version', () => {
      expect(STATIC_SPEC.openapi).toMatch(/^3\.\d+\.\d+$/);
    });

    it('should have info block with title and version', () => {
      expect(STATIC_SPEC.info).toBeDefined();
      expect(STATIC_SPEC.info.title).toBeTruthy();
      expect(STATIC_SPEC.info.version).toBeTruthy();
    });

    it('should have non-empty paths', () => {
      expect(STATIC_SPEC.paths).toBeDefined();
      const pathCount = Object.keys(STATIC_SPEC.paths).length;
      expect(pathCount).toBeGreaterThan(0);
    });

    it('should have info.version consistent with openapi version format', () => {
      // version should be in format like "1.0.0" or "2.1.0"
      expect(STATIC_SPEC.info.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have servers array with at least one entry', () => {
      expect(STATIC_SPEC.servers).toBeDefined();
      expect(Array.isArray(STATIC_SPEC.servers)).toBe(true);
      expect(STATIC_SPEC.servers?.length).toBeGreaterThan(0);
    });

    it('should have valid paths with proper HTTP methods', () => {
      for (const [pathStr, pathObj] of Object.entries(STATIC_SPEC.paths)) {
        expect(pathStr).toMatch(/^\//);
        for (const [method, operation] of Object.entries(pathObj)) {
          if (method === 'parameters') continue;
          expect(VALID_HTTP_METHODS).toContain(method);
          if (operation?.operationId) {
            expect(typeof operation.operationId).toBe('string');
          }
        }
      }
    });

    it('should have unique operationIds across all paths', () => {
      const operationIds = Object.values(STATIC_SPEC.paths).flatMap((path) =>
        Object.entries(path)
          .filter(([method]) => method !== 'parameters')
          .map(([, operation]) => operation.operationId)
          .filter((operationId): operationId is string => operationId !== undefined)
      );

      const uniqueIds = new Set(operationIds);
      expect(uniqueIds.size).toBe(operationIds.length);
    });

    it('should have all referenced schemas defined in components', () => {
      const definedSchemas = new Set(Object.keys(STATIC_SPEC.components?.schemas || {}));
      const allRefs = extractSchemaRefs(STATIC_SPEC);
      for (const ref of allRefs) {
        expect(definedSchemas.has(ref)).toBe(true);
      }
    });

    it('should have tags declared for all operations', () => {
      const declaredTags = new Set((STATIC_SPEC.tags || []).map((tag) => tag.name));

      for (const [, pathObj] of Object.entries(STATIC_SPEC.paths)) {
        for (const [method, operation] of Object.entries(pathObj)) {
          if (method === 'parameters') continue;
          if (operation?.tags) {
            for (const tag of operation.tags) {
              expect(declaredTags.has(tag)).toBe(true);
            }
          }
        }
      }
    });

    it('should have at least one security scheme when auth endpoints exist', () => {
      const authPaths = Object.entries(STATIC_SPEC.paths).filter(([, pathObj]) => {
        return Object.keys(pathObj).some((m) => ['post', 'put', 'patch', 'delete'].includes(m));
      });

      if (authPaths.length > 0) {
        expect(STATIC_SPEC.components?.securitySchemes).toBeDefined();
      }
    });

    it('should have paths count consistent with spec summary', () => {
      const pathCount = Object.keys(STATIC_SPEC.paths).length;
      // Should have at least 50 paths for a enterprise API
      expect(pathCount).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Runtime served contract', () => {
    let ownedRuntimeServer: ApiServer | undefined;
    let runtimeUrl: string | undefined;

    beforeAll(async () => {
      const configuredRuntimeUrl = process.env.API_RUNTIME_URL?.trim();

      if (configuredRuntimeUrl) {
        runtimeUrl = normalizeRuntimeUrl(configuredRuntimeUrl);
      } else {
        ownedRuntimeServer = createApiServer({
          appName: 'openapi-runtime-contract-test',
          environment: 'test',
          version: STATIC_SPEC.info.version,
          authSecret: 'openapi-runtime-contract-test-only',
          accessTokenTtlSeconds: 900,
          refreshTokenTtlSeconds: 604_800,
          pixMockMode: true,
          emailMockMode: true,
          smsMockMode: true,
          googleCalendarMockMode: true,
          runtimeDistributedStateEnabled: false,
          allowInMemoryCatalogFallback: true
        });
        await ownedRuntimeServer.ready;
        runtimeUrl = await listenOnEphemeralPort(ownedRuntimeServer);
      }
    });

    afterAll(async () => {
      if (ownedRuntimeServer?.listening) {
        await closeServer(ownedRuntimeServer);
      }
    });

    it('serves the complete static OpenAPI document through the real HTTP runtime', async () => {
      const endpoint = `${requireRuntimeUrl(runtimeUrl)}/openapi.json`;
      const response = await fetch(endpoint, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(RUNTIME_REQUEST_TIMEOUT_MS)
      });
      const responseBody = await response.text();

      expect(
        response.status,
        `GET ${endpoint} returned ${response.status}: ${responseBody.slice(0, 500)}`
      ).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/^application\/json\b/i);
      expect(response.headers.get('x-request-id')).toBeTruthy();

      const runtimeSpec = JSON.parse(responseBody) as OpenApiDocument;
      expect(runtimeSpec).toEqual(STATIC_SPEC);
    });
  });
});
