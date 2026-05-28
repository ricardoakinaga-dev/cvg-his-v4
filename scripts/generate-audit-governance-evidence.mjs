import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outputDir = process.env.AUDIT_GOVERNANCE_EVIDENCE_DIR ?? 'artifacts/audit-governance';

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const sources = {
  auditService: read('packages/modules/audit/src/index.ts'),
  auditTests: read('packages/modules/audit/src/audit.test.ts'),
  routes: read('apps/api/src/routes/access-control-routes.ts'),
  routeTests: read('apps/api/src/routes/access-control-audit-events.test.ts'),
  openapi: read('apps/api/src/openapi.yaml'),
  spaService: read('apps/spa/src/services/audit.ts'),
  spaPage: read('apps/spa/src/pages/audit/AuditPage.vue'),
  spaTests: read('apps/spa/src/pages/audit/__tests__/AuditPage.test.ts'),
  dashboard: read('apps/spa/src/pages/DashboardPage.vue'),
  rcEvidence: read('scripts/generate-enterprise-rc-evidence.mjs'),
};

const requiredAuditRequirements = [
  'auth-login-failed',
  'auth-session-revoked',
  'access-matrix-read',
  'lgpd-personal-export',
  'lgpd-dsr-completed',
  'audit-read',
  'inventory-adjustment',
  'laboratory-result-released',
  'reports-delivery-alerts-read',
];

const checks = [];

function addCheck(area, item, pass, evidence, action = '-') {
  checks.push({ area, item, status: pass ? 'PASS' : 'FAIL', evidence, action });
}

for (const requirement of requiredAuditRequirements) {
  addCheck(
    'Coverage matrix',
    `${requirement} esta na matriz critica`,
    sources.auditService.includes(`id: '${requirement}'`),
    'packages/modules/audit/src/index.ts',
    `Adicionar requisito ${requirement} em DEFAULT_OPERATIONAL_AUDIT_REQUIREMENTS.`,
  );
}

addCheck(
  'Coverage engine',
  'calcula cobertura, pendencias e evidencia por evento',
  /getOperationalCoverageReport/.test(sources.auditService) &&
    /coveredRequirements/.test(sources.auditService) &&
    /missingRequirements/.test(sources.auditService) &&
    /evidenceEventId/.test(sources.auditService),
  'packages/modules/audit/src/index.ts',
  'Restaurar motor de cobertura operacional.',
);

addCheck(
  'API',
  'endpoint operacional protegido e autoauditado',
  /\/audit\/operational-coverage/.test(sources.routes) &&
    /operational_coverage_read/.test(sources.routes) &&
    /audit\.read/.test(sources.routes),
  'apps/api/src/routes/access-control-routes.ts',
  'Proteger e auditar leitura da cobertura operacional.',
);

addCheck(
  'OpenAPI',
  'contrato de cobertura publicado',
  /\/audit\/operational-coverage:/.test(sources.openapi) &&
    /OperationalAuditCoverageReport/.test(sources.openapi) &&
    /OperationalAuditCoverageItem/.test(sources.openapi),
  'apps/api/src/openapi.yaml',
  'Publicar rota/schema da cobertura operacional.',
);

addCheck(
  'SPA',
  'servico e tela exibem cobertura e requisitos pendentes',
  /getOperationalCoverage/.test(sources.spaService) &&
    /coverageRequirements/.test(sources.spaPage) &&
    /coveragePercent/.test(sources.spaPage),
  'apps/spa/src/pages/audit/AuditPage.vue',
  'Conectar painel de auditoria ao endpoint de cobertura.',
);

addCheck(
  'Dashboard',
  'dashboard executivo consome cobertura de auditoria',
  /enterpriseOverview\.audit/.test(sources.dashboard) &&
    /coveragePercent/.test(sources.dashboard) &&
    /audit-covered/.test(sources.dashboard),
  'apps/spa/src/pages/DashboardPage.vue',
  'Expor cobertura operacional no dashboard premium.',
);

addCheck(
  'Tests',
  'testes cobrem motor, rota e SPA',
  /builds an operational audit coverage report/.test(sources.auditTests) &&
    /report_schedule_delivery_alerts_read/.test(sources.auditTests) &&
    /operational-coverage/.test(sources.routeTests) &&
    /coverageReport/.test(sources.spaTests),
  'packages/modules/audit/src/audit.test.ts; apps/api/src/routes/access-control-audit-events.test.ts; apps/spa/src/pages/audit/__tests__/AuditPage.test.ts',
  'Adicionar testes para cobertura operacional.',
);

addCheck(
  'Release gate',
  'RC evidence executa governanca de auditoria',
  /governance:audit/.test(sources.rcEvidence),
  'scripts/generate-enterprise-rc-evidence.mjs',
  'Adicionar pnpm governance:audit ao pacote RC.',
);

const pass = checks.filter((check) => check.status === 'PASS').length;
const fail = checks.filter((check) => check.status === 'FAIL').length;
const score = Math.round((pass / checks.length) * 100);

mkdirSync(join(root, outputDir), { recursive: true });
writeFileSync(
  join(root, outputDir, 'audit-governance-evidence.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), score, pass, fail, checks }, null, 2)}\n`,
);

console.log('# Audit Governance Evidence');
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
