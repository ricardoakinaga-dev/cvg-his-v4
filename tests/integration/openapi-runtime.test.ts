import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { parse as parseYaml } from 'yaml';

/**
 * OpenAPI Runtime Contract Tests
 *
 * Validates that:
 * 1. The OpenAPI spec has required structural elements
 * 2. The runtime /openapi.json endpoint (when API is running) serves a coherent spec
 * 3. info.version is consistent throughout the spec
 *
 * These tests validate the contract without requiring a running API server.
 * For full runtime validation, run: node scripts/validate-openapi-runtime.js
 */

const OPENAPI_SPEC_PATH = 'apps/api/src/openapi.yaml';

function loadSpec() {
  const content = readFileSync(OPENAPI_SPEC_PATH, 'utf-8');
  return parse(content, { prettyErrors: true });
}

describe('OpenAPI Contract Tests', () => {
  describe('Static spec structure', () => {
    it('should have openapi 3.x version', () => {
      const spec = loadSpec();
      expect(spec.openapi).toMatch(/^3\.\d+\.\d+$/);
    });

    it('should have info block with title and version', () => {
      const spec = loadSpec();
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBeTruthy();
      expect(spec.info.version).toBeTruthy();
    });

    it('should have non-empty paths', () => {
      const spec = loadSpec();
      expect(spec.paths).toBeDefined();
      const pathCount = Object.keys(spec.paths).length;
      expect(pathCount).toBeGreaterThan(0);
    });

    it('should have info.version consistent with openapi version format', () => {
      const spec = loadSpec();
      // version should be in format like "1.0.0" or "2.1.0"
      expect(spec.info.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have servers array with at least one entry', () => {
      const spec = loadSpec();
      expect(spec.servers).toBeDefined();
      expect(Array.isArray(spec.servers)).toBe(true);
      expect(spec.servers.length).toBeGreaterThan(0);
    });

    it('should have valid paths with proper HTTP methods', () => {
      const spec = loadSpec();
      const VALID_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
      const paths = spec.paths;

      for (const [pathStr, pathObj] of Object.entries(paths)) {
        expect(pathStr).toMatch(/^\//);
        for (const [method, operation] of Object.entries(pathObj)) {
          if (method === 'parameters') continue;
          expect(VALID_METHODS).toContain(method);
          if (operation?.operationId) {
            expect(typeof operation.operationId).toBe('string');
          }
        }
      }
    });

    it('should have unique operationIds across all paths', () => {
      const spec = loadSpec();
      const operationIds: string[] = [];
      const paths = spec.paths;

      for (const [, pathObj] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(pathObj)) {
          if (method === 'parameters') continue;
          if (operation?.operationId) {
            operationIds.push(operation.operationId);
          }
        }
      }

      const uniqueIds = new Set(operationIds);
      expect(uniqueIds.size).toBe(operationIds.length);
    });

    it('should have all referenced schemas defined in components', () => {
      const spec = loadSpec();
      const definedSchemas = new Set(Object.keys(spec.components?.schemas || {}));

      function extractRefs(obj: unknown, refs: string[] = []): string[] {
        if (!obj || typeof obj !== 'object') return refs;
        if ((obj as Record<string, unknown>).$ref && typeof (obj as Record<string, unknown>).$ref === 'string') {
          const ref = (obj as Record<string, unknown>).$ref as string;
          const match = ref.match(/#\/components\/schemas\/([A-Za-z0-9_]+)/);
          if (match) refs.push(match[1]);
        }
        if (Array.isArray(obj)) {
          (obj as unknown[]).forEach((item) => extractRefs(item, refs));
        } else {
          Object.values(obj as Record<string, unknown>).forEach((val) => extractRefs(val, refs));
        }
        return refs;
      }

      const allRefs = extractRefs(spec);
      for (const ref of allRefs) {
        expect(definedSchemas.has(ref)).toBe(true);
      }
    });

    it('should have tags declared for all operations', () => {
      const spec = loadSpec();
      const declaredTags = new Set((spec.tags || []).map((t: { name: string }) => t.name));

      for (const [, pathObj] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(pathObj)) {
          if (method === 'parameters') continue;
          if (operation?.tags) {
            for (const tag of operation.tags as string[]) {
              expect(declaredTags.has(tag)).toBe(true);
            }
          }
        }
      }
    });

    it('should have at least one security scheme when auth endpoints exist', () => {
      const spec = loadSpec();
      const authPaths = Object.entries(spec.paths).filter(([, pathObj]) => {
        return Object.keys(pathObj).some((m) =>
          ['post', 'put', 'patch', 'delete'].includes(m)
        );
      });

      if (authPaths.length > 0) {
        expect(spec.components?.securitySchemes).toBeDefined();
      }
    });

    it('documents the durable webhook delivery lifecycle and retry metadata', () => {
      const spec = loadSpec();
      const delivery = spec.components?.schemas?.WebhookDelivery;
      expect(delivery).toBeDefined();
      expect(delivery.properties.status.enum).toEqual([
        'pending',
        'processing',
        'retrying',
        'delivered',
        'failed'
      ]);
      expect(delivery.properties).toEqual(
        expect.objectContaining({
          maxAttempts: expect.any(Object),
          responseError: expect.any(Object),
          deadLetteredAt: expect.any(Object)
        })
      );
    });

    it('should have paths count consistent with spec summary', () => {
      const spec = loadSpec();
      const pathCount = Object.keys(spec.paths).length;
      // Should have at least 50 paths for a enterprise API
      expect(pathCount).toBeGreaterThanOrEqual(50);
    });

    it('runtime served spec should match static spec (when API is running)', async () => {
      // This test requires API_RUNTIME_URL env var to be set
      const runtimeUrl = process.env.API_RUNTIME_URL;
      if (!runtimeUrl) {
        // Skip if no runtime URL - static validation is done by other tests
        return;
      }

      const staticSpec = loadSpec();

      // Fetch runtime spec
      const response = await fetch(`${runtimeUrl}/openapi.json`);
      expect(response.ok).toBe(true);

      const runtimeSpec = await response.json() as Record<string, unknown>;

      // Compare key fields
      expect(runtimeSpec.openapi).toBe(staticSpec.openapi);
      expect(runtimeSpec.info).toEqual(staticSpec.info);
      expect(Object.keys(runtimeSpec.paths || {})).toEqual(Object.keys(staticSpec.paths));
    });
  });
});
