import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  collectSpaRequests,
  missingDeclaredRequests
} from './frontend-backend-contract.helper.mjs';

import { flattenAllNavItems } from '../../apps/spa/src/navigation';
import { routes } from '../../apps/spa/src/router/routes';

function joinRoutePath(parentPath: string, childPath: string): string {
  if (!childPath) return parentPath || '/';
  if (childPath.startsWith('/')) return childPath;
  if (!parentPath || parentPath === '/') return `/${childPath}`;
  return `${parentPath}/${childPath}`;
}

function collectRouterPaths(): string[] {
  const collected = new Set<string>();

  const visit = (routeRecords: typeof routes, parentPath = '') => {
    for (const route of routeRecords) {
      const fullPath = joinRoutePath(parentPath, route.path);
      collected.add(fullPath);

      if (Array.isArray(route.alias)) {
        for (const alias of route.alias) {
          collected.add(alias);
        }
      } else if (typeof route.alias === 'string') {
        collected.add(route.alias);
      }

      if (route.children) {
        visit(route.children as typeof routes, fullPath);
      }
    }
  };

  visit(routes);
  return [...collected];
}

describe('frontend/backend route contract', () => {
  it('declares every SPA service endpoint and method in canonical OpenAPI (static contract)', () => {
    const { requests, unresolved, forwarding } = collectSpaRequests();
    const openapi = parse(readFileSync(join(process.cwd(), 'apps/api/src/openapi.yaml'), 'utf8'));
    // Runtime dispatch is proved separately by api-routes-db, not by this declaration check.
    expect(unresolved, 'Unresolved service calls require explicit static analysis support').toEqual(
      []
    );
    expect(requests.length).toBeGreaterThan(0);
    // Explicit transport boundaries forward caller-provided URLs or Request objects.
    // Their runtime destination is not asserted by this static declaration gate.
    expect(forwarding.map((entry) => entry.kind).sort()).toEqual([
      'Request object transport',
      'apiRequest transport'
    ]);
    expect(missingDeclaredRequests(requests, openapi)).toEqual([]);
  });

  it('keeps navigation paths resolvable by the SPA router', () => {
    const routerPaths = new Set(collectRouterPaths());
    const navPaths = [...new Set(flattenAllNavItems().map((item) => item.path))];

    const missing = navPaths.filter((path) => !routerPaths.has(path));
    expect(missing).toEqual([]);
  });
});
