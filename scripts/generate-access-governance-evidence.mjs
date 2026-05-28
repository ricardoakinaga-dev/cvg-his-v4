import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outputDir = process.env.ACCESS_GOVERNANCE_EVIDENCE_DIR ?? 'artifacts/access-governance';

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const sources = {
  accessService: read('packages/modules/access-control/src/index.ts'),
  abac: read('packages/modules/access-control/src/abac.ts'),
  routes: read('apps/api/src/routes/access-control-routes.ts'),
  routeTests: read('apps/api/src/routes/access-control-audit-events.test.ts'),
  openapi: read('apps/api/src/openapi.yaml'),
  spaService: read('apps/spa/src/services/accessControl.ts'),
  spaPage: read('apps/spa/src/pages/access-control/AccessControlPage.vue'),
  spaTests: read('apps/spa/src/pages/access-control/__tests__/AccessControlPage.test.ts'),
  rlsValidator: read('scripts/validate-rls-coverage.ts'),
};

const requiredPermissionModules = [
  'auth',
  'users',
  'staff',
  'access-control',
  'audit',
  'owners',
  'patients',
  'scheduling',
  'encounters',
  'triage',
  'medical-records',
  'inpatient',
  'surgery',
  'diagnostics',
  'billing',
  'inventory',
  'fiscal',
  'notifications',
  'products',
  'services',
  'counter-sales',
  'quotes',
  'webhooks',
  'integrations',
  'api-keys',
  'feature-flags',
];

const criticalRouteFiles = [
  'apps/api/src/routes/access-control-routes.ts',
  'apps/api/src/routes/lgpd-routes.ts',
  'apps/api/src/routes/financial-routes.ts',
  'apps/api/src/routes/inpatient-routes.ts',
  'apps/api/src/routes/inventory-routes.ts',
  'apps/api/src/routes/laboratory-routes.ts',
  'apps/api/src/routes/reports-routes.ts',
  'apps/api/src/routes/commission-routes.ts',
  'apps/api/src/routes/marketing-routes.ts',
  'apps/api/src/routes/counter-sales-routes.ts',
  'apps/api/src/routes/scheduling-routes.ts',
  'apps/api/src/routes/patients-routes.ts',
  'apps/api/src/routes/owners-routes.ts',
];

const checks = [];

function addCheck(area, item, pass, evidence, action = '-') {
  checks.push({ area, item, status: pass ? 'PASS' : 'FAIL', evidence, action });
}

function hasPermissionForModule(moduleName) {
  const normalized = moduleName.replaceAll('-', '[-_]');
  const modulePattern = new RegExp(`module:\\s*['"]${moduleName}['"]`);
  const codePattern = new RegExp(`code:\\s*['"]${normalized}\\.(read|manage|write|admin|execute)['"]`);
  return modulePattern.test(sources.accessService) || codePattern.test(sources.accessService);
}

for (const moduleName of requiredPermissionModules) {
  addCheck(
    'Permission catalog',
    `${moduleName} possui permissao catalogada`,
    hasPermissionForModule(moduleName),
    'packages/modules/access-control/src/index.ts',
    `Adicionar permissao RBAC para ${moduleName}.`,
  );
}

for (const role of ['admin', 'reception', 'nurse', 'veterinarian', 'finance', 'inventory', 'auditor']) {
  addCheck(
    'Role catalog',
    `role ${role}`,
    new RegExp(`code:\\s*['"]${role}['"]`).test(sources.accessService),
    'packages/modules/access-control/src/index.ts',
    `Adicionar role ${role}.`,
  );
}

addCheck(
  'ABAC',
  'motor ABAC versionado',
  /export class AbacPolicyEngine|PolicyEvaluationResult|ResourceAttributes|ActorAttributes/.test(sources.abac),
  'packages/modules/access-control/src/abac.ts',
  'Restaurar motor ABAC.',
);

addCheck(
  'Matrix',
  'servico gera matriz oficial por modulo',
  /getModulePermissionMatrix/.test(sources.accessService) && /coverageStatus/.test(sources.accessService),
  'packages/modules/access-control/src/index.ts',
  'Implementar getModulePermissionMatrix com coverageStatus.',
);

addCheck(
  'Matrix API',
  'endpoint protegido e auditado',
  /\/access-control\/module-permission-matrix/.test(sources.routes) &&
    /rp\(request,\s*['"]access\.read['"]\)/.test(sources.routes) &&
    /read_module_permission_matrix/.test(sources.routes) &&
    /riskLevel:\s*['"]medium['"]/.test(sources.routes),
  'apps/api/src/routes/access-control-routes.ts',
  'Proteger e auditar endpoint de matriz.',
);

addCheck(
  'OpenAPI',
  'contrato da matriz publicado',
  /\/access-control\/module-permission-matrix:/.test(sources.openapi) &&
    /AccessModulePermissionMatrixResponse/.test(sources.openapi),
  'apps/api/src/openapi.yaml',
  'Adicionar rota/schema da matriz ao OpenAPI.',
);

addCheck(
  'SPA',
  'tela consome matriz oficial',
  /getModulePermissionMatrix/.test(sources.spaService) &&
    /enterpriseMatrixRows|coverageLabel|modulePermissionMatrix/.test(sources.spaPage),
  'apps/spa/src/pages/access-control/AccessControlPage.vue',
  'Conectar SPA a matriz oficial.',
);

addCheck(
  'Tests',
  'testes cobrem rota auditada e tela',
  /read_module_permission_matrix|module-permission-matrix/.test(sources.routeTests) &&
    /modulePermissionMatrix|RBAC|ABAC|coverage/i.test(sources.spaTests),
  'apps/api/src/routes/access-control-audit-events.test.ts; apps/spa/src/pages/access-control/__tests__/AccessControlPage.test.ts',
  'Adicionar testes de rota e SPA para matriz.',
);

for (const routeFile of criticalRouteFiles) {
  const routeSource = read(routeFile);
  addCheck(
    'Protected routes',
    `${routeFile} exige principal/permissao`,
    /requirePrincipal|rp\(request/.test(routeSource),
    routeFile,
    'Adicionar requirePrincipal com permissao adequada.',
  );
}

addCheck(
  'RLS cross-check',
  'gate RLS multi-tenant disponivel para cruzamento',
  /tenant table|RLS|policy|account_id/i.test(sources.rlsValidator),
  'scripts/validate-rls-coverage.ts',
  'Manter gate RLS versionado.',
);

const pass = checks.filter((check) => check.status === 'PASS').length;
const fail = checks.filter((check) => check.status === 'FAIL').length;
const score = Math.round((pass / checks.length) * 100);

mkdirSync(join(root, outputDir), { recursive: true });
writeFileSync(
  join(root, outputDir, 'access-governance-evidence.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), score, pass, fail, checks }, null, 2)}\n`,
);

console.log('# Access Governance Evidence');
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
