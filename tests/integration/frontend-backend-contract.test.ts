import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { navGroups } from '../../apps/spa/src/navigation';
import { routes } from '../../apps/spa/src/router/routes';

const SERVICE_DIRECTORY = join(process.cwd(), 'apps/spa/src/services');

const backendRoutePatterns = [
  /^\/access-control$/,
  /^\/access-control\/grants$/,
  /^\/access-control\/org-sectors$/,
  /^\/access-control\/org-sectors\/[^/]+$/,
  /^\/access-control\/teams$/,
  /^\/access-control\/teams\/[^/]+$/,
  /^\/access-control\/users\/[^/]+\/effective$/,
  /^\/access-control\/users\/[^/]+\/roles$/,
  /^\/access-control\/users\/[^/]+\/sectors$/,
  /^\/access-control\/users\/[^/]+\/teams$/,
  /^\/api-keys$/,
  /^\/admin\/commercial-dashboard$/,
  /^\/appointments$/,
  /^\/appointments\/[^/]+$/,
  /^\/appointments\/[^/]+\/cancel$/,
  /^\/attachments$/,
  /^\/audit\/events$/,
  /^\/bed-map$/,
  /^\/beds$/,
  /^\/billing$/,
  /^\/billing\/[^/]+$/,
  /^\/billing\/[^/]+\/items$/,
  /^\/billing\/[^/]+\/status$/,
  /^\/billing\/estimate$/,
  /^\/billing\/items$/,
  /^\/counter-sales$/,
  /^\/counter-sales\/[^/]+$/,
  /^\/counter-sales\/[^/]+\/cancel$/,
  /^\/counter-sales\/[^/]+\/close$/,
  /^\/counter-sales\/[^/]+\/items$/,
  /^\/counter-sales\/[^/]+\/items\/[^/]+$/,
  /^\/counter-sales\/[^/]+\/payments$/,
  /^\/counter-sales\/[^/]+\/reopen$/,
  /^\/diagnostics\/orders$/,
  /^\/discharges$/,
  /^\/discharges\/[^/]+$/,
  /^\/encounters$/,
  /^\/encounters\/[^/]+$/,
  /^\/encounters\/[^/]+\/close$/,
  /^\/encounters\/[^/]+\/timeline$/,
  /^\/encounters\/[^/]+\/transition$/,
  /^\/fiscal\/cfop$/,
  /^\/fiscal\/icms$/,
  /^\/fiscal\/icms-matrix$/,
  /^\/fiscal\/ncm$/,
  /^\/fiscal\/nfse$/,
  /^\/fiscal\/nfse\/[^/]+$/,
  /^\/fiscal\/pis-cofins$/,
  /^\/fiscal\/summary$/,
  /^\/fiscal\/tax-preview$/,
  /^\/health$/,
  /^\/inpatient$/,
  /^\/inpatient\/[^/]+\/assign-bed$/,
  /^\/inpatient\/[^/]+\/progress$/,
  /^\/inpatient\/[^/]+\/transfer-bed$/,
  /^\/inpatient\/[^/]+\/update-status$/,
  /^\/inventory$/,
  /^\/inventory\/[^/]+$/,
  /^\/inventory\/consumptions$/,
  /^\/inventory\/lots$/,
  /^\/laboratory\/equipment$/,
  /^\/laboratory\/orders$/,
  /^\/laboratory\/orders\/[^/]+\/result$/,
  /^\/laboratory\/reference-values$/,
  /^\/laboratory\/report-types$/,
  /^\/laboratory\/summary$/,
  /^\/lgpd\/consent$/,
  /^\/lgpd\/consent\/revoke$/,
  /^\/lgpd\/consent\/status$/,
  /^\/lgpd\/requests$/,
  /^\/lgpd\/requests\/complete$/,
  /^\/lgpd\/requests\/reject$/,
  /^\/master-search$/,
  /^\/medical-records$/,
  /^\/medical-records\/entries$/,
  /^\/medical-records\/entries\/[^/]+$/,
  /^\/medical-records\/entries\/[^/]+\/revisions$/,
  /^\/medical-records\/timeline$/,
  /^\/mfa\/disable$/,
  /^\/mfa\/recovery-codes\/regenerate$/,
  /^\/mfa\/setup$/,
  /^\/mfa\/setup\/confirm$/,
  /^\/mfa\/status$/,
  /^\/notifications$/,
  /^\/notifications\/jobs$/,
  /^\/notifications\/process$/,
  /^\/owners$/,
  /^\/owners\/[^/]+$/,
  /^\/patients$/,
  /^\/patients\/[^/]+$/,
  /^\/payments\/pix\/intents$/,
  /^\/prescriptions$/,
  /^\/prescriptions\/[^/]+$/,
  /^\/prescription-executions$/,
  /^\/prescription-executions\/[^/]+$/,
  /^\/prescription-executions\/[^/]+\/execute$/,
  /^\/prescription-executions\/[^/]+\/log$/,
  /^\/prescription-executions\/[^/]+\/resume$/,
  /^\/prescription-executions\/[^/]+\/suspend$/,
  /^\/products$/,
  /^\/products\/[^/]+$/,
  /^\/queue$/,
  /^\/queue\/check-in$/,
  /^\/queue\/[^/]+\/call$/,
  /^\/queue\/[^/]+\/no-show$/,
  /^\/queue\/[^/]+\/start-care$/,
  /^\/quotes$/,
  /^\/quotes\/[^/]+$/,
  /^\/quotes\/[^/]+\/approve$/,
  /^\/quotes\/[^/]+\/cancel$/,
  /^\/quotes\/[^/]+\/convert-to-sale$/,
  /^\/quotes\/[^/]+\/items$/,
  /^\/quotes\/[^/]+\/print$/,
  /^\/quotes\/[^/]+\/reject$/,
  /^\/reports\/administrative-hubs$/,
  /^\/scheduling\/availability$/,
  /^\/scheduling\/overview$/,
  /^\/sectors$/,
  /^\/services$/,
  /^\/services\/[^/]+$/,
  /^\/staff$/,
  /^\/staff\/[^/]+$/,
  /^\/staff\/[^/]+\/toggle-active$/,
  /^\/triage$/,
  /^\/triage\/[^/]+$/,
  /^\/triage\/[^/]+\/history$/,
  /^\/users$/,
  /^\/users\/[^/]+$/,
  /^\/webhooks$/,
  /^\/webhooks\/[^/]+$/,
  /^\/webhooks\/[^/]+\/deliveries$/,
  /^\/webhooks\/whatsapp\/inbound$/
] as const;

function normalizeServicePath(path: string): string {
  return path
    .replace(/\$\{buildQuery\([\s\S]*?\)\}/g, '')
    .replace(/\$\{params\}/g, '')
    .replace(/\$\{query \?.*$/, '')
    .replace(/\$\{suffix\}/g, '')
    .replace(/\$\{search\.toString\(\)\}/g, '')
    .replace(/\$\{[^}]+\}/g, '{param}')
    .replace(/\?.*$/, '')
    .replace(/\{param\}/g, 'sample');
}

function collectSpaServicePaths(): string[] {
  const servicePaths = new Set<string>();

  for (const fileName of readdirSync(SERVICE_DIRECTORY)) {
    if (!fileName.endsWith('.ts') || fileName === 'api.ts') {
      continue;
    }

    const source = readFileSync(join(SERVICE_DIRECTORY, fileName), 'utf8');
    const apiRequestMatches = source.matchAll(
      /apiRequest(?:<[^>]*>)?\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/g
    );

    for (const match of apiRequestMatches) {
      const candidate = match[1] ?? match[2] ?? match[3];
      if (!candidate) continue;
      servicePaths.add(normalizeServicePath(candidate));
    }

    const fetchMatches = source.matchAll(/fetch\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/g);
    for (const match of fetchMatches) {
      const candidate = match[1] ?? match[2] ?? match[3];
      if (!candidate) continue;
      const apiIndex = candidate.indexOf('/api/');
      if (apiIndex >= 0) {
        servicePaths.add(normalizeServicePath(candidate.slice(apiIndex + 4)));
      }
    }
  }

  return [...servicePaths].sort();
}

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
  it('keeps every SPA service endpoint backed by a backend route', () => {
    const missing = collectSpaServicePaths().filter(
      (path) => !backendRoutePatterns.some((pattern) => pattern.test(path))
    );

    expect(missing).toEqual([]);
  });

  it('keeps navigation paths resolvable by the SPA router', () => {
    const routerPaths = new Set(collectRouterPaths());
    const navPaths = navGroups.flatMap((group) =>
      group.sections.flatMap((section) => section.items.map((item) => item.path))
    );

    expect(new Set(navPaths).size).toBe(navPaths.length);

    const missing = navPaths.filter((path) => !routerPaths.has(path));
    expect(missing).toEqual([]);
  });
});
