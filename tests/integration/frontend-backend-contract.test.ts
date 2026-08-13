import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { navGroups } from '../../apps/spa/src/navigation';
import { routes } from '../../apps/spa/src/router/routes';

const SERVICE_DIRECTORY = join(process.cwd(), 'apps/spa/src/services');
const OPENAPI_PATH = join(process.cwd(), 'apps/api/src/openapi.yaml');

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
  /^\/appointment-types$/,
  /^\/appointment-types\/[^/]+$/,
  /^\/appointments$/,
  /^\/appointments\/[^/]+$/,
  /^\/appointments\/[^/]+\/cancel$/,
  /^\/appointments\/[^/]+\/start-encounter$/,
  /^\/attachments$/,
  /^\/audit\/events$/,
  /^\/availability$/,
  /^\/availability\/[^/]+$/,
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
  /^\/cost-centers-catalog$/,
  /^\/cost-centers-catalog\/[^/]+$/,
  /^\/diagnostics\/orders$/,
  /^\/discharges$/,
  /^\/discharges\/[^/]+$/,
  /^\/encounters$/,
  /^\/encounters\/[^/]+$/,
  /^\/encounters\/[^/]+\/close$/,
  /^\/encounters\/[^/]+\/financial-close$/,
  /^\/encounters\/[^/]+\/financial-summary$/,
  /^\/encounters\/[^/]+\/summary$/,
  /^\/encounters\/[^/]+\/timeline$/,
  /^\/encounters\/[^/]+\/transition$/,
  /^\/expenses-catalog$/,
  /^\/expenses-catalog\/[^/]+$/,
  /^\/exam-orders$/,
  /^\/exam-orders\/[^/]+$/,
  /^\/exam-results$/,
  /^\/exam-results\/[^/]+$/,
  /^\/financial\/reconciliation\/cards$/,
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
  /^\/loyalty\/redemptions$/,
  /^\/loyalty\/summary$/,
  /^\/master-search$/,
  /^\/medical-records$/,
  /^\/medical-records\/entries$/,
  /^\/medical-records\/entries\/[^/]+$/,
  /^\/medical-records\/entries\/[^/]+\/revisions$/,
  /^\/medical-records\/timeline$/,
  /^\/ml\/anomalies\/laboratory-results$/,
  /^\/ml\/forecasting\/demand$/,
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
  /^\/owners\/[^/]+\/summary$/,
  /^\/patients$/,
  /^\/patients\/[^/]+$/,
  /^\/patients\/[^/]+\/summary$/,
  /^\/payments\/pix\/intents$/,
  /^\/pos-sync\/jobs$/,
  /^\/pos-sync\/jobs\/[^/]+$/,
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
  /^\/price-tables$/,
  /^\/price-tables\/[^/]+$/,
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
  /^\/scheduling\/recommendations\/duration$/,
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
  /^\/webhooks\/whatsapp\/inbound$/,
  /^\/breeds$/,
  /^\/breeds\/[^/]+$/,
  /^\/clinical-handoffs$/,
  /^\/clinical-handoffs\/send-to-reception$/,
  /^\/clinical-handoffs\/[^/]+\/(acknowledge|return-to-clinic|send-to-finance)$/,
  /^\/clinical-handoffs\/[^/]+\/pending$/,
  /^\/clinical-handoffs\/[^/]+\/pending\/[^/]+\/resolve$/,
  /^\/coat-colors$/,
  /^\/coat-colors\/[^/]+$/,
  /^\/company-sectors$/,
  /^\/company-sectors\/[^/]+$/,
  /^\/customer-groups$/,
  /^\/customer-groups\/[^/]+$/,
  /^\/manufacturers$/,
  /^\/manufacturers\/[^/]+$/,
  /^\/measurement-units$/,
  /^\/measurement-units\/[^/]+$/,
  /^\/prescriptions\/[^/]+\/document$/,
  /^\/product-groups$/,
  /^\/product-groups\/[^/]+$/,
  /^\/queue\/[^/]+\/transfer$/,
  /^\/responsibility-terms$/,
  /^\/responsibility-terms\/[^/]+$/,
  /^\/species$/,
  /^\/species\/[^/]+$/,
  /^\/vaccines-dewormers\/reminders\/email$/,
  /^\/vaccines-dewormers\/[^/]+$/,
  /^\/vaccines-dewormers\/[^/]+\/email$/,
  /^\/warehouses$/,
  /^\/warehouses\/[^/]+$/
] as const;

function normalizeServicePath(path: string): string {
  return path
    .replace(/\$\{buildQuery\([\s\S]*?\)\}/g, '')
    .replace(/\$\{buildWebhookQuery\([\s\S]*?\)\}/g, '')
    .replace(/\$\{params\}/g, '')
    .replace(/\$\{query\}/g, '')
    .replace(/\$\{query \?.*$/, '')
    .replace(/\$\{suffix\}/g, '')
    .replace(/\$\{search\.toString\(\)\}/g, '')
    .replace(/\$\{[^}]+\}/g, '{param}')
    .replace(/\$\{.*$/, '')
    .replace(/\?.*$/, '')
    .replace(/\{param\}/g, 'sample');
}

function collectOpenApiRoutePatterns(): RegExp[] {
  const source = readFileSync(OPENAPI_PATH, 'utf8');
  return [...source.matchAll(/^  (\/[^:\n]+):\s*$/gm)].map((match) => {
    const parameterized = (match[1] ?? '').replace(/\{[^}]+\}/g, '__PARAM__');
    const escaped = parameterized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped.replaceAll('__PARAM__', '[^/]+')}$`);
  });
}

const openApiRoutePatterns = collectOpenApiRoutePatterns();

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
      (path) =>
        !backendRoutePatterns.some((pattern) => pattern.test(path)) &&
        !openApiRoutePatterns.some((pattern) => pattern.test(path))
    );

    expect(missing).toEqual([]);
  });

  it('keeps navigation paths resolvable and each section free of duplicate entries', () => {
    const routerPaths = new Set(collectRouterPaths());
    const navPaths = navGroups.flatMap((group) =>
      group.sections.flatMap((section) => section.items.map((item) => item.path))
    );

    for (const group of navGroups) {
      for (const section of group.sections) {
        const sectionPaths = section.items.map((item) => item.path);
        expect(new Set(sectionPaths).size).toBe(sectionPaths.length);
      }
    }

    const missing = navPaths.filter((path) => !routerPaths.has(path));
    expect(missing).toEqual([]);
  });
});
