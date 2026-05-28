import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outputDir = process.env.LGPD_GOVERNANCE_EVIDENCE_DIR ?? 'artifacts/lgpd-governance';

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const sources = {
  service: read('packages/modules/lgpd/src/service.ts'),
  serviceTests: read('packages/modules/lgpd/src/lgpd.test.ts'),
  index: read('packages/modules/lgpd/src/index.ts'),
  runtime: read('apps/api/src/runtime.ts'),
  routes: read('apps/api/src/routes/lgpd-routes.ts'),
  routeTests: read('apps/api/src/routes/lgpd-routes.test.ts'),
  spaService: read('apps/spa/src/services/lgpd.ts'),
  spaPage: read('apps/spa/src/pages/lgpd/LgpdHubPage.vue'),
  spaTests: read('apps/spa/src/pages/lgpd/__tests__/LgpdHubPage.test.ts'),
};

const requiredProviders = ['owners', 'patients', 'encounters', 'financial', 'laboratory', 'attachments'];
const retentionDataTypes = [
  'owner_profile',
  'patient_profile',
  'clinical_encounters',
  'financial_records',
  'laboratory_results',
  'clinical_attachments',
];

const checks = [];

function addCheck(area, item, pass, evidence, action = '-') {
  checks.push({ area, item, status: pass ? 'PASS' : 'FAIL', evidence, action });
}

for (const provider of requiredProviders) {
  addCheck(
    'Export providers',
    `${provider} conectado ao export LGPD`,
    new RegExp(`${provider}:\\s*\\(async`).test(sources.runtime) &&
      new RegExp(`source:\\s*['"][^'"]+Service['"]`).test(sources.runtime),
    'apps/api/src/runtime.ts',
    `Conectar provider ${provider} no LgpdService do runtime.`,
  );
}

addCheck(
  'Export providers',
  'LgpdService aceita providers configurados server-side',
  /readonly dataProviders\?: Record<string, LgpdDataProvider>/.test(sources.service) &&
    /this\.\#dataProviders/.test(sources.service),
  'packages/modules/lgpd/src/service.ts',
  'Adicionar providers server-side ao LgpdService.',
);

addCheck(
  'Export providers',
  'exportacao registra evidencia de provider coletado/falho',
  /providerEvidence/.test(sources.service) &&
    /collectedProviderCount/.test(sources.service) &&
    /failedProviderCount/.test(sources.service),
  'packages/modules/lgpd/src/service.ts',
  'Persistir evidencia por fonte na exportacao.',
);

for (const dataType of retentionDataTypes) {
  addCheck(
    'Retention',
    `${dataType} possui janela/disposicao`,
    sources.service.includes(dataType) && /retentionWindow/.test(sources.service),
    'packages/modules/lgpd/src/service.ts',
    `Adicionar politica de retencao para ${dataType}.`,
  );
}

addCheck(
  'Retention',
  'DSR deletion/anonymization aplica politica de retencao',
  /buildErasureDisposition/.test(sources.service) &&
    /retention_window_enforced/.test(sources.service) &&
    /physicalPurgeEligible/.test(sources.service),
  'packages/modules/lgpd/src/service.ts',
  'Gerar resultado operacional de expurgo/anonimizacao com retencao.',
);

addCheck(
  'API',
  'rotas LGPD protegidas e auditadas',
  /requirePrincipal\(request, 'lgpd\.requests\.manage'\)/.test(sources.routes) &&
    /personal_data_exported/.test(sources.routes) &&
    /dsr_completed/.test(sources.routes),
  'apps/api/src/routes/lgpd-routes.ts',
  'Proteger e auditar exportacao/conclusao DSR.',
);

addCheck(
  'SPA',
  'servico SPA transporta resultJson da DSR',
  /resultJson\?: Record<string, unknown> \| null/.test(sources.spaService),
  'apps/spa/src/services/lgpd.ts',
  'Adicionar resultJson no contrato SPA.',
);

addCheck(
  'SPA',
  'tela exibe evidencia de retencao por tipo de dado',
  /selectedDsrRetentionEvidence/.test(sources.spaPage) &&
    /retentionLabel/.test(sources.spaPage) &&
    /dispositionLabel/.test(sources.spaPage),
  'apps/spa/src/pages/lgpd/LgpdHubPage.vue',
  'Adicionar painel de detalhe da DSR com retencao.',
);

addCheck(
  'Tests',
  'testes cobrem providers e retencao no servico',
  /uses configured enterprise data providers/.test(sources.serviceTests) &&
    /retention_window_enforced/.test(sources.serviceTests),
  'packages/modules/lgpd/src/lgpd.test.ts',
  'Cobrir providers configurados e expurgo com retencao.',
);

addCheck(
  'Tests',
  'testes cobrem detalhe de retencao na SPA',
  /renders retention evidence in the DSR detail panel/.test(sources.spaTests),
  'apps/spa/src/pages/lgpd/__tests__/LgpdHubPage.test.ts',
  'Cobrir painel de detalhe LGPD.',
);

addCheck(
  'Exports',
  'tipos de provider/retencao exportados pelo modulo',
  /LgpdDataProvider/.test(sources.index) && /LgpdRetentionEvidence/.test(sources.index),
  'packages/modules/lgpd/src/index.ts',
  'Exportar tipos LGPD enterprise.',
);

const pass = checks.filter((check) => check.status === 'PASS').length;
const fail = checks.filter((check) => check.status === 'FAIL').length;
const score = Math.round((pass / checks.length) * 100);

mkdirSync(join(root, outputDir), { recursive: true });
writeFileSync(
  join(root, outputDir, 'lgpd-governance-evidence.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), score, pass, fail, checks }, null, 2)}\n`,
);

console.log('# LGPD Governance Evidence');
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
