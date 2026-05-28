import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outputDir =
  process.env.OBSERVABILITY_GOVERNANCE_EVIDENCE_DIR ?? 'artifacts/observability-governance';

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const sources = {
  slos: read('apps/api/src/slos.ts'),
  metrics: read('apps/api/src/metrics.ts'),
  healthRoutes: read('apps/api/src/routes/health-routes.ts'),
  openapiRoutes: read('apps/api/src/routes/openapi-routes.ts'),
  openapi: read('apps/api/src/openapi.yaml'),
  serverTests: read('apps/api/src/server.test.ts'),
  spaHealthService: read('apps/spa/src/services/health.ts'),
  apiClientPage: read('apps/spa/src/pages/api-client/ApiClientPage.vue'),
  dashboard: read('apps/spa/src/pages/DashboardPage.vue'),
  enterpriseTests: read('apps/spa/src/pages/__tests__/EnterpriseSurfaces.test.ts'),
  dashboardTests: read('apps/spa/src/pages/__tests__/DashboardPage.test.ts'),
  rcEvidence: read('scripts/generate-enterprise-rc-evidence.mjs'),
};

const checks = [];

function addCheck(area, item, pass, evidence, action = '-') {
  checks.push({ area, item, status: pass ? 'PASS' : 'FAIL', evidence, action });
}

for (const sloId of ['api-availability', 'api-latency-p95', 'api-error-rate']) {
  addCheck(
    'SLO catalog',
    `${sloId} definido`,
    sources.slos.includes(`id: '${sloId}'`),
    'apps/api/src/slos.ts',
    `Adicionar SLO ${sloId}.`,
  );
}

addCheck(
  'SLO engine',
  'snapshot calcula status, budget e burn rate',
  /overallStatus/.test(sources.slos) &&
    /errorBudgetPercent/.test(sources.slos) &&
    /burnRate/.test(sources.slos),
  'apps/api/src/slos.ts',
  'Restaurar calculo de SLO operacional.',
);

addCheck(
  'Prometheus',
  'gauges de SLO publicados',
  /app_slo_status/.test(sources.metrics) &&
    /app_slo_error_budget_percent/.test(sources.metrics) &&
    /app_slo_burn_rate/.test(sources.metrics),
  'apps/api/src/metrics.ts',
  'Publicar gauges de SLO em /metrics.',
);

addCheck(
  'API',
  'endpoints /slos e /health/slos expostos',
  /url === '\/slos'/.test(sources.healthRoutes) &&
    /url === '\/health\/slos'/.test(sources.healthRoutes),
  'apps/api/src/routes/health-routes.ts',
  'Expor SLOs na familia health.',
);

addCheck(
  'OpenAPI',
  'contrato SLO publicado em OpenAPI e api-docs',
  /\/slos:/.test(sources.openapi) &&
    /\/health\/slos:/.test(sources.openapi) &&
    /SloComplianceReport/.test(sources.openapi) &&
    /\/slos/.test(sources.openapiRoutes),
  'apps/api/src/openapi.yaml; apps/api/src/routes/openapi-routes.ts',
  'Publicar contrato SLO.',
);

addCheck(
  'SPA',
  'Cliente API consome painel de SLO',
  /getSloReport/.test(sources.spaHealthService) &&
    /SLO e or[açc]amento de erro/.test(sources.apiClientPage),
  'apps/spa/src/pages/api-client/ApiClientPage.vue',
  'Exibir SLO no Cliente API.',
);

addCheck(
  'Dashboard',
  'Dashboard Premium exibe SLO e foco operacional',
  /enterpriseSloStatusLabel/.test(sources.dashboard) &&
    /slo-critical/.test(sources.dashboard) &&
    /SLO operacional/.test(sources.dashboard),
  'apps/spa/src/pages/DashboardPage.vue',
  'Expor SLO no dashboard premium.',
);

addCheck(
  'Tests',
  'testes cobrem API, SPA e Dashboard',
    /SLO endpoint exposes compliance/.test(sources.serverTests) &&
    /app_slo_status/.test(sources.serverTests) &&
    /\/api\/slos/.test(sources.enterpriseTests) &&
    /SLO degradado/.test(sources.dashboardTests),
  'apps/api/src/server.test.ts; apps/spa/src/pages/__tests__/EnterpriseSurfaces.test.ts; apps/spa/src/pages/__tests__/DashboardPage.test.ts',
  'Adicionar testes de observabilidade.',
);

addCheck(
  'Release gate',
  'RC evidence executa governanca de observabilidade',
  /governance:observability/.test(sources.rcEvidence),
  'scripts/generate-enterprise-rc-evidence.mjs',
  'Adicionar pnpm governance:observability ao pacote RC.',
);

const pass = checks.filter((check) => check.status === 'PASS').length;
const fail = checks.filter((check) => check.status === 'FAIL').length;
const score = Math.round((pass / checks.length) * 100);

mkdirSync(join(root, outputDir), { recursive: true });
writeFileSync(
  join(root, outputDir, 'observability-governance-evidence.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), score, pass, fail, checks }, null, 2)}\n`,
);

console.log('# Observability Governance Evidence');
console.log('');
console.log(`Score: ${score}/100`);
console.log(`PASS: ${pass} | FAIL: ${fail}`);
console.log('');
console.log('| Area | Item | Status | Evidence | Action |');
console.log('| --- | --- | --- | --- | --- |');
for (const check of checks) {
  console.log(`| ${check.area} | ${check.item} | ${check.status} | ${check.evidence} | ${check.action} |`);
}

if (fail > 0) {
  process.exit(1);
}
