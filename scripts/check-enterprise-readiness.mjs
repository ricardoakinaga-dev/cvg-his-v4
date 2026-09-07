import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateDocumentation } from './validate-documentation.mjs';
import { inspectEnterpriseCi } from './lib/enterprise-ci-evidence.mjs';

const root = process.cwd();

const readText = (path) => readFileSync(join(root, path), 'utf8');
const exists = (path) => existsSync(join(root, path));

const checks = [];

const addCheck = ({ area, item, status, evidence, action = '' }) => {
  checks.push({ area, item, status, evidence, action });
};

const packageJson = JSON.parse(readText('package.json'));
const scripts = packageJson.scripts ?? {};

const vetusParity = spawnSync('node', ['scripts/check-vetus-parity.mjs'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const requiredScripts = [
  ['build', 'Build completo do monorepo'],
  ['typecheck', 'Typecheck completo do monorepo'],
  ['validate:openapi', 'Contrato OpenAPI'],
  ['validate:rls', 'Cobertura RLS multi-tenant'],
  ['governance:access', 'Evidencia RBAC/ABAC por modulo critico'],
  ['governance:audit', 'Evidencia de cobertura de auditoria operacional'],
  ['governance:lgpd', 'Evidencia LGPD DSR, retencao e providers'],
  ['governance:observability', 'Evidencia de observabilidade e SLO operacional'],
  ['security:enterprise', 'Auditoria de segredos e dependencias'],
  ['security:evidence', 'Evidencia de seguranca com SBOM e SAST'],
  ['ops:backup:check', 'Backup/restore operacional'],
  ['ops:restore:drill:fixture', 'Restore drill real local com Postgres descartavel'],
  ['deploy:check', 'Cutover/deploy readiness'],
  ['deploy:rehearsal:local', 'Rehearsal local de cutover com Docker Compose'],
  ['validate:helm', 'Manifestos Helm'],
  ['test:e2e:spa:enterprise', 'E2E SPA Enterprise'],
  ['vetus:parity', 'Contrato estrito de paridade funcional Vetus'],
  ['rc:evidence', 'Pacote de evidencias Release Candidate'],
  ['rc:evidence:strict', 'Pacote de evidencias Release Candidate em modo estrito'],
];

for (const [name, label] of requiredScripts) {
  addCheck({
    area: 'Scripts',
    item: label,
    status: scripts[name] ? 'PASS' : 'FAIL',
    evidence: scripts[name] ? `package.json:${name}` : `Script ausente: ${name}`,
    action: scripts[name] ? '' : `Adicionar script ${name}.`,
  });
}

const enterpriseE2e = scripts['test:e2e:spa:enterprise'] ?? '';
const requiredSpecs = [
  'e2e/spa/master-search-360-reception.spec.ts',
  'e2e/spa/master-search-360-mobile.spec.ts',
  'e2e/spa/enterprise-surfaces-gate.spec.ts',
];

for (const spec of requiredSpecs) {
  addCheck({
    area: 'E2E',
    item: spec,
    status: exists(spec) && enterpriseE2e.includes(spec) ? 'PASS' : 'FAIL',
    evidence: exists(spec)
      ? `Arquivo existe; ${enterpriseE2e.includes(spec) ? 'incluido' : 'nao incluido'} em test:e2e:spa:enterprise`
      : 'Arquivo ausente',
    action: exists(spec) && enterpriseE2e.includes(spec) ? '' : 'Incluir o spec no gate Enterprise.',
  });
}

addCheck({
  area: 'Vetus',
  item: 'Contrato estrito de paridade funcional Vetus',
  status: vetusParity.status === 0 ? 'PASS' : 'FAIL',
  evidence: vetusParity.status === 0
    ? (vetusParity.stdout.match(/Functional parity: VERIFIED/)?.[0] ?? 'pnpm vetus:parity passou')
    : (vetusParity.stderr.trim() || vetusParity.stdout.trim() || 'Falha ao executar matriz Vetus'),
  action: vetusParity.status === 0 ? '' : 'Remover bloqueadores e adicionar provas comportamentais listadas por pnpm vetus:parity:audit.',
});

const ciPath = '.github/workflows/ci.yml';
if (exists(ciPath)) {
  const ci = readText(ciPath);
  const ciEvidence = inspectEnterpriseCi(ci, exists('playwright-spa.config.ts') ? readText('playwright-spa.config.ts') : '', requiredSpecs);
  for (const [index, spec] of requiredSpecs.entries()) {
    addCheck({
      area: 'CI',
      item: `CI executa ${spec}`,
      status: ciEvidence.specs[index] ? 'PASS' : 'FAIL',
      evidence: ciEvidence.specs[index] ? 'Invocacao completa da suite SPA e config incluem o spec (evidencia estatica)' : 'Inclusao do spec nao comprovada pelo comando/config de CI',
      action: ciEvidence.specs[index] ? '' : 'Verificar comando e filtros da configuracao E2E SPA.',
    });
  }
  addCheck({
    area: 'CI',
    item: 'E2E SPA sem continue-on-error',
    status: ciEvidence.blocking ? 'PASS' : 'FAIL',
    evidence: !ciEvidence.blocking
      ? 'Step/job E2E SPA ausente, ambiguo ou permite continue-on-error'
      : 'Bloco Run SPA E2E tests falha o pipeline quando E2E falha',
    action: ciEvidence.blocking ? '' : 'Exigir step/job E2E SPA unico e bloqueante.',
  });
} else {
  addCheck({
    area: 'CI',
    item: 'Workflow CI',
    status: 'FAIL',
    evidence: 'Arquivo .github/workflows/ci.yml ausente',
    action: 'Criar workflow CI.',
  });
}

const documentationErrors = validateDocumentation({ rootDir: root });
addCheck({
  area: 'Documentacao',
  item: 'Governanca da documentacao vigente',
  status: documentationErrors.length === 0 ? 'PASS' : 'FAIL',
  evidence: documentationErrors.length === 0
    ? 'Manifesto vigente, metadados e links validados; nao comprova execucao operacional'
    : documentationErrors.join('; '),
  action: documentationErrors.length === 0 ? '' : 'Corrigir os documentos vigentes e executar pnpm docs:validate.',
});

const lockPath = 'pnpm-lock.yaml';
if (exists(lockPath)) {
  const lock = readText(lockPath);
  const helperLines = lock
    .split('\n')
    .filter((line) => line.includes('vue-component-type-helpers'));
  const hasUnexpectedHelperVersion = helperLines.some((line) => !line.includes('3.2.7'));
  addCheck({
    area: 'Lockfile',
    item: 'vue-component-type-helpers fixado em 3.2.7',
    status: helperLines.length > 0 && !hasUnexpectedHelperVersion ? 'PASS' : 'FAIL',
    evidence: helperLines.length > 0 ? `${helperLines.length} entrada(s) verificadas` : 'Nenhuma entrada encontrada',
    action: helperLines.length > 0 && !hasUnexpectedHelperVersion
      ? ''
      : 'Ajustar pnpm-lock.yaml para manter somente 3.2.7.',
  });
}

const warnItems = [
  ['Homologacao', 'Evidencia de CI remoto verde', 'Confirmar execucao no GitHub Actions apos push.'],
  ['Homologacao', 'Backup/restore em ambiente real', 'Executar pnpm ops:backup:check contra ambiente homolog/staging.'],
  ['Homologacao', 'Deploy/cutover em ambiente real', 'Executar pnpm deploy:check e pnpm validate:helm com valores do ambiente alvo.'],
];

for (const [area, item, action] of warnItems) {
  addCheck({ area, item, status: 'WARN', evidence: 'Depende de ambiente externo ou aceite operacional', action });
}

const scoreWeights = { PASS: 1, WARN: 0.5, FAIL: 0 };
const score = Math.round(
  (checks.reduce((sum, check) => sum + scoreWeights[check.status], 0) / checks.length) * 100,
);

const byStatus = checks.reduce(
  (acc, check) => ({ ...acc, [check.status]: (acc[check.status] ?? 0) + 1 }),
  {},
);

console.log('# Enterprise Readiness Check');
console.log('');
console.log(`Score: ${score}/100`);
console.log(`PASS: ${byStatus.PASS ?? 0} | WARN: ${byStatus.WARN ?? 0} | FAIL: ${byStatus.FAIL ?? 0}`);
console.log('');
console.log('| Area | Item | Status | Evidence | Action |');
console.log('| --- | --- | --- | --- | --- |');
for (const check of checks) {
  console.log(
    `| ${check.area} | ${check.item} | ${check.status} | ${check.evidence} | ${check.action || '-'} |`,
  );
}

if ((byStatus.FAIL ?? 0) > 0) {
  process.exit(1);
}
